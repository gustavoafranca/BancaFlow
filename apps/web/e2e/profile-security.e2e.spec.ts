import { execSync } from 'node:child_process'
import path from 'node:path'
import { test, expect } from '@playwright/test'

// e2e/browser real da aba Segurança de `/perfil` (`enable-profile-security-management`):
// duas sessões reais (dois contextos de browser), identificação da sessão
// atual, revogação de outra sessão com efeito real (a sessão revogada perde
// acesso), e troca voluntária de senha mantendo a sessão atual autenticada.
// Mesmo tenant isolado e descartável `pw-e2e.localhost` já usado por
// `login-to-dashboard.e2e.spec.ts`/`perfil-navigation.e2e.spec.ts` — não
// depende do código de Banca e não afeta `farizeu.localhost`.
const USERNAME = 'e2euser'
const PASSWORD = 'E2ePlaywright@123'
const NEW_PASSWORD = 'NovaSenhaForte@456'
const VOLUNTARY_NEW_PASSWORD = 'OutraSenhaForte@789'

test.beforeEach(() => {
  execSync('npm run seed:e2e', {
    cwd: path.join(__dirname, '../../backend'),
    stdio: 'inherit',
    env: { ...process.env, ALLOW_E2E_SEED: 'true' },
  })
})

/** Login completo (com troca obrigatória de senha, exigida pelo seed) até `/dashboard`, na página informada. */
async function loginCompletingMandatoryChange(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Usuário').fill(USERNAME)
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/trocar-senha$/)
  await page.getByLabel('Nova senha', { exact: true }).fill(NEW_PASSWORD)
  await page.getByLabel('Confirmar nova senha').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

/** Login direto (sem troca obrigatória — já concluída em outra sessão) até `/dashboard`. */
async function loginWithPassword(page: import('@playwright/test').Page, password: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Usuário').fill(USERNAME)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test('duas sessões reais: identifica a sessão atual, revoga a outra, e a sessão revogada perde acesso', async ({
  browser,
}) => {
  // Contexto A: primeiro login, completa a troca obrigatória de senha (exigida
  // pelo seed) — única sessão nesse momento, então nada é revogado por ela.
  const contextA = await browser.newContext()
  const pageA = await contextA.newPage()
  await loginCompletingMandatoryChange(pageA)

  // Contexto B: segundo login real, já com a nova senha — cria a segunda
  // sessão ativa da mesma conta, sem afetar a sessão do contexto A.
  const contextB = await browser.newContext()
  const pageB = await contextB.newPage()
  await loginWithPassword(pageB, NEW_PASSWORD)

  // Abre a aba Segurança no contexto A e confirma as duas sessões reais.
  await pageA.goto('/perfil')
  await pageA.getByRole('tab', { name: 'Segurança' }).click()
  await expect(pageA.getByText('Sessão atual')).toBeVisible()
  const revokeButton = pageA.getByRole('button', { name: 'Encerrar sessão' })
  await expect(revokeButton).toHaveCount(1)

  // Revoga a sessão do contexto B a partir do contexto A, com confirmação.
  await revokeButton.click()
  const dialog = pageA.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Encerrar sessão' }).click()
  await expect(dialog).toBeHidden()

  // Após o refetch autoritativo, só a sessão atual permanece.
  await expect(pageA.getByRole('button', { name: 'Encerrar sessão' })).toHaveCount(0)
  await expect(pageA.getByText('Nenhuma outra sessão ativa além desta.')).toBeVisible()

  // A sessão revogada (contexto B) realmente perde acesso: uma navegação
  // seguinte é redirecionada para /login (com aviso de sessão expirada, via
  // `fetchWithRefresh` → `redirectToLoginExpired()`) pelo backend
  // (autoritativo), não apenas removida da lista do contexto A.
  await pageB.goto('/dashboard')
  await expect(pageB).toHaveURL(/\/login/)

  await contextA.close()
  await contextB.close()
})

test('troca voluntária de senha: sucesso mantém a sessão atual e a senha antiga deixa de funcionar', async ({
  page,
}) => {
  await loginCompletingMandatoryChange(page)

  await page.goto('/perfil')
  await page.getByRole('tab', { name: 'Segurança' }).click()

  await page.getByLabel('Senha Atual').fill(NEW_PASSWORD)
  await page.getByLabel('Nova Senha', { exact: true }).fill(VOLUNTARY_NEW_PASSWORD)
  await page.getByLabel('Confirmar Nova Senha').fill(VOLUNTARY_NEW_PASSWORD)
  await page.getByRole('button', { name: 'Atualizar Senha' }).click()

  await expect(page.getByText('Senha atualizada. As demais sessões foram encerradas.')).toBeVisible()

  // A sessão atual permanece autenticada — nenhum redirecionamento para
  // login, sem precisar de refresh manual (o backend já reemitiu o cookie).
  await page.reload()
  await expect(page).toHaveURL(/\/perfil$/)
  await expect(page.getByRole('tab', { name: 'Segurança' })).toBeVisible()

  // A senha antiga não funciona mais; a nova sim.
  await page.context().clearCookies()
  await page.waitForLoadState('networkidle')
  await page.goto('/login')
  await page.getByLabel('Usuário').fill(USERNAME)
  await page.getByLabel('Senha', { exact: true }).fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('Usuário ou senha inválidos.')).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByLabel('Usuário').fill(USERNAME)
  await page.getByLabel('Senha', { exact: true }).fill(VOLUNTARY_NEW_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('senha atual incorreta na troca voluntária exibe mensagem específica, sem deslogar', async ({ page }) => {
  await loginCompletingMandatoryChange(page)

  await page.goto('/perfil')
  await page.getByRole('tab', { name: 'Segurança' }).click()

  await page.getByLabel('Senha Atual').fill('senha-completamente-errada')
  await page.getByLabel('Nova Senha', { exact: true }).fill(VOLUNTARY_NEW_PASSWORD)
  await page.getByLabel('Confirmar Nova Senha').fill(VOLUNTARY_NEW_PASSWORD)
  await page.getByRole('button', { name: 'Atualizar Senha' }).click()

  await expect(page.getByText('A senha atual informada está incorreta.')).toBeVisible()
  // Nunca confundido com sessão expirada: a página permanece em /perfil.
  await expect(page).toHaveURL(/\/perfil$/)
})
