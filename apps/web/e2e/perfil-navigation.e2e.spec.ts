import { execSync } from 'node:child_process'
import path from 'node:path'
import { test, expect } from '@playwright/test'

// e2e/browser real da navegação `align-profile-settings-experience`: menu da
// conta -> "Meu Perfil" -> `/perfil`. Reaproveita o mesmo tenant isolado e
// seguro (`pw-e2e`, via `seed-e2e-playwright.ts`) já usado por
// `login-to-dashboard.e2e.spec.ts` — a jornada validada aqui é independente
// do código de Banca; `farizeu.localhost` (Banca de seed geral de
// desenvolvimento) não é destruído/recriado por este runner (ver
// design.md, Decisão 6, desta change).
const USERNAME = 'e2euser'
const PASSWORD = 'E2ePlaywright@123'

// Mesmo padrão de `login-to-dashboard.e2e.spec.ts`: recria o tenant/conta de
// teste do zero antes de cada teste (seed idempotente e destrutivo, travado
// por `assertSafeToSeed` em NODE_ENV dev/test + ALLOW_E2E_SEED=true +
// DATABASE_URL local).
test.beforeEach(() => {
  execSync('npm run seed:e2e', {
    cwd: path.join(__dirname, '../../backend'),
    stdio: 'inherit',
    env: { ...process.env, ALLOW_E2E_SEED: 'true' },
  })
})

test('menu da conta -> Meu Perfil navega para /perfil com dados autoritativos do usuário de teste', async ({
  page,
}) => {
  // Confirma que o tenant de teste resolve antes de prosseguir — se
  // `available` não fosse `true`, o restante do teste falharia de forma
  // menos óbvia (redirect para /unavailable).
  const tenantContext = await page.request.get('/api/tenant-context')
  expect(tenantContext.ok()).toBe(true)
  expect(await tenantContext.json()).toEqual({ available: true })

  await page.goto('/login')

  await page.getByLabel('Usuário').fill(USERNAME)
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()

  // O seed do Playwright cria a conta com `mustChangePassword: true` —
  // completa a troca obrigatória antes de alcançar a área privada, igual ao
  // fluxo já provado por `login-to-dashboard.e2e.spec.ts`.
  await expect(page).toHaveURL(/\/trocar-senha$/)
  const NEW_PASSWORD = 'NovaSenhaForte@456'
  await page.getByLabel('Nova senha', { exact: true }).fill(NEW_PASSWORD)
  await page.getByLabel('Confirmar nova senha').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  // Abre o menu da conta e ativa "Meu Perfil" — prova a navegação real do
  // shell (`app-navbar.tsx`), não um mock de `next/link`.
  await page.getByRole('button', { name: /Playwright Owner/ }).click()
  await page.getByRole('link', { name: 'Meu Perfil' }).click()

  await expect(page).toHaveURL(/\/perfil$/)
  // Nunca caiu em `/unavailable` (host sem tenant válido) nem permaneceu em
  // `/dashboard`/`/login` — a asserção de URL acima já cobre isso
  // deterministicamente, mas o teste também confirma que não há o cabeçalho
  // genérico de tenant indisponível na página alcançada.
  await expect(page.getByRole('heading', { name: /endereço indisponível/i })).toHaveCount(0)

  // Dado autoritativo do usuário de teste, vindo de `GET /api/auth/me`
  // (não fabricado pelo Web): nome real do seed e papel OWNER exibidos na
  // subseção Informações de `/perfil`.
  await expect(page.getByLabel('Nome Completo')).toHaveValue('Playwright Owner')
  await expect(page.getByText('Proprietário').first()).toBeVisible()
})
