import { execSync } from 'node:child_process'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'

// E2E de browser real (tarefa 9.4, `refine-tenant-user-administration-experience`):
// prova, contra Postgres + backend + Next reais, os dois fluxos mais
// sensíveis desta change — logout local/global com hierarquia destrutiva, e
// administração de usuários em drawer (criação com senha temporária,
// detalhe/papel/status). O componente mockado (`logout-modal.spec.tsx`,
// `usuarios-section.spec.tsx`) já cobre a lógica isolada; isto prova cookies
// reais, sessões reais e o catálogo de permissões real ponta a ponta.
//
// Pré-requisitos (ver e2e/README.md): Postgres + backend + seed
// (`npm run seed:e2e`) + frontend já no ar, host `pw-e2e.localhost`.
const USERNAME = 'e2euser'
const PASSWORD = 'E2ePlaywright@123'
const NEW_PASSWORD = 'NovaSenhaForte@456'

test.beforeEach(() => {
  execSync('npm run seed:e2e', {
    cwd: path.join(__dirname, '../../backend'),
    stdio: 'inherit',
    env: { ...process.env, ALLOW_E2E_SEED: 'true' },
  })
})

async function loginAndCompleteMandatoryChange(page: Page): Promise<void> {
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

async function openLogoutModal(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Playwright Owner/ }).click()
  await page.getByText('Sair').click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

test.describe('Logout unificado — destrutivo e alinhado', () => {
  test('"Sair deste dispositivo" encerra apenas a sessão atual e redireciona para /login', async ({ page }) => {
    await loginAndCompleteMandatoryChange(page)
    await openLogoutModal(page)

    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeFocused()
    await page.getByRole('button', { name: 'Sair deste dispositivo' }).click()

    await expect(page).toHaveURL(/\/login$/)

    // Sessão real revogada — acessar /dashboard direto redireciona de volta.
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('"Sair de todos os dispositivos" encerra também a sessão de outro dispositivo/contexto', async ({ browser }) => {
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    await loginAndCompleteMandatoryChange(pageA)
    // segundo dispositivo: login direto (senha já trocada pelo primeiro).
    await pageB.goto('/login')
    await pageB.getByLabel('Usuário').fill(USERNAME)
    await pageB.getByLabel('Senha', { exact: true }).fill(NEW_PASSWORD)
    await pageB.getByRole('button', { name: 'Entrar' }).click()
    await expect(pageB).toHaveURL(/\/dashboard$/)

    await openLogoutModal(pageA)
    await pageA.getByRole('button', { name: 'Sair de todos os dispositivos' }).click()
    await expect(pageA).toHaveURL(/\/login$/)

    await pageB.goto('/dashboard')
    // `?expired=1` é o mesmo redirecionamento usado pelo middleware de sessão
    // expirada/revogada — não precisa ser distinto de um logout comum aqui.
    await expect(pageB).toHaveURL(/\/login(\?.*)?$/)

    await contextA.close()
    await contextB.close()
  })

  test('cancelar fecha o modal sem encerrar nenhuma sessão', async ({ page }) => {
    await loginAndCompleteMandatoryChange(page)
    await openLogoutModal(page)

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()

    await page.reload()
    await expect(page).toHaveURL(/\/dashboard$/)
  })
})

test.describe('Administração de usuários — criação e detalhe em drawer', () => {
  test('OWNER cria um usuário, vê a senha temporária uma única vez e consulta o detalhe em drawer', async ({ page }) => {
    await loginAndCompleteMandatoryChange(page)

    // "Configurações" fica dentro do dropdown de perfil da navbar (não no
    // menu lateral) — precisa abrir o dropdown antes de clicar no link.
    await page.getByRole('button', { name: /Playwright Owner/ }).click()
    await page.getByRole('link', { name: /Configurações/ }).click()
    // `/configuracoes` redireciona para a primeira seção da sidebar interna
    // (`settings-area-navigation`), que substituiu a navegação por abas.
    await expect(page).toHaveURL(/\/configuracoes\/usuarios$/)
    await expect(page.getByRole('link', { name: 'Usuários' })).toHaveAttribute('aria-current', 'page')

    await page.getByRole('button', { name: /novo usuário/i }).click()
    const createDrawer = page.getByRole('dialog')
    await expect(createDrawer).toBeVisible()

    const suffix = Date.now().toString().slice(-6)
    const username = `e2e.criado.${suffix}`
    await createDrawer.getByLabel(/^usuário$/i).fill(username)
    await createDrawer.getByLabel(/^nome$/i).fill('Usuario Criado Silva')

    // Abre e fecha o Select de Papel (aninhado dentro do drawer) por Escape,
    // sem selecionar nada, e confirma que o resto da página CONTINUA
    // clicável depois — regressão real de navegador contra o bug de dois
    // `FocusScope`/`DismissableLayer` aninhados de módulos `@radix-ui/*`
    // duplicados (um resolvido pelo pacote de `Select`, outro pelo de
    // `Dialog`) deixando `document.body` com `pointer-events: none`
    // permanente após o fechamento. Corrigido fixando um único conjunto de
    // versões via `overrides` no `package.json` raiz — este teste é o
    // guardrail contra a duplicação voltar a existir.
    await createDrawer.getByRole('combobox').click()
    await expect(page.getByRole('option', { name: 'Administrador (ADMIN)' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(createDrawer).toBeVisible()

    // Rodapé do Drawer canônico usa "Salvar" (padrão para todo modo de
    // criação), não mais "Criar conta" (`canonical-drawer`).
    await createDrawer.getByRole('button', { name: /^salvar$/i }).click()

    // Senha temporária exibida uma única vez, em formato humano (5
    // palavras-2 dígitos-1 símbolo — decisão D1), com ação de copiar.
    const passwordDialog = page.getByRole('dialog').filter({ hasText: 'Conta criada' })
    await expect(passwordDialog).toBeVisible()
    const temporaryPasswordText = await passwordDialog.locator('code').innerText()
    expect(temporaryPasswordText).toMatch(/^[A-Z][a-z]+(-[a-z]+){4}-[2-9]{2}[!@#$%&*?]$/)
    await expect(passwordDialog.getByRole('button', { name: /copiar/i })).toBeVisible()
    await passwordDialog.getByRole('button', { name: 'Fechar' }).click()
    await expect(passwordDialog).toBeHidden()

    // Linha clicável abre o drawer de detalhe com o mesmo usuário.
    await page.getByRole('row', { name: new RegExp(`abrir detalhes de usuario criado silva`, 'i') }).click()
    const detailDrawer = page.getByRole('dialog')
    await expect(detailDrawer.getByRole('heading', { name: 'Usuario Criado Silva' })).toBeVisible()
    await expect(detailDrawer.getByText(`@${username}`)).toBeVisible()

    // Troca de papel exige confirmação em modal aninhado sobre o drawer.
    await detailDrawer.getByRole('button', { name: /tornar admin/i }).click()
    const confirmDialog = page.getByRole('dialog').filter({ hasText: 'Trocar papel' })
    await expect(confirmDialog).toBeVisible()
    await confirmDialog.getByRole('button', { name: 'Confirmar' }).click()
    await expect(confirmDialog).toBeHidden()
    await expect(detailDrawer.getByText('Administrador')).toBeVisible()

    await detailDrawer.getByRole('button', { name: 'Fechar' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
  })
})
