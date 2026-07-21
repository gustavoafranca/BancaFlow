import { execSync } from 'node:child_process'
import path from 'node:path'
import { test, expect } from '@playwright/test'

// e2e/browser real do fluxo login → troca obrigatória → dashboard
// (`web-frontend-testing`, requisito "Login to mandatory change to
// dashboard is exercised end to end"). Diferente do teste de componente em
// `apps/web/src/app/login-to-dashboard-flow.spec.tsx` (que mocka
// `auth.client`/`next/navigation` e renderiza telas isoladas), este teste
// usa um navegador real contra um servidor Next + backend + Postgres reais:
// exercita cookies HttpOnly de verdade, o rewrite `/api/:path*` do
// `next.config.ts`, o `proxy.ts` e a resolução de tenant por Host.
//
// Pré-requisitos (ver e2e/README.md): Postgres + backend + seed
// (`npm run seed:e2e` em apps/backend) + frontend já no ar, apontando para o
// host `pw-e2e.localhost` (resolve para 127.0.0.1 nativamente em
// Chromium/Firefox — RFC 6761 — sem precisar editar `/etc/hosts`).
const USERNAME = 'e2euser'
const PASSWORD = 'E2ePlaywright@123'
const NEW_PASSWORD = 'NovaSenhaForte@456'

// Recria a banca/usuário de teste do zero antes de CADA teste — o fluxo
// muda a senha e `mustChangePassword` de verdade (efeito colateral real no
// Postgres), então os testes desta suíte não são independentes sem isso.
// `ALLOW_E2E_SEED=true` confirma explicitamente a intenção de rodar o seed
// destrutivo (ver guard em `apps/backend/scripts/seed-e2e-playwright.ts`) —
// rodar esta suíte de E2E É a confirmação; o script ainda falha fechado se
// `NODE_ENV`/`DATABASE_URL` não apontarem para um ambiente local de teste.
test.beforeEach(() => {
  execSync('npm run seed:e2e', {
    cwd: path.join(__dirname, '../../backend'),
    stdio: 'inherit',
    env: { ...process.env, ALLOW_E2E_SEED: 'true' },
  })
})

test('login com troca obrigatória de senha termina no dashboard, sem refresh manual', async ({
  page,
}) => {
  await page.goto('/login')

  await page.getByLabel('Usuário').fill(USERNAME)
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()

  // mustChangePassword=true (seed) -> redireciona para /trocar-senha, nunca
  // direto para /dashboard.
  await expect(page).toHaveURL(/\/trocar-senha$/)

  await page.getByLabel('Nova senha', { exact: true }).fill(NEW_PASSWORD)
  await page.getByLabel('Confirmar nova senha').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()

  // O backend reemite o access token (mustChangePassword=false) na própria
  // resposta da troca — chega em /dashboard sem nenhuma chamada manual a
  // /api/auth/refresh (prova exatamente o que o teste de componente mockado
  // não consegue provar: o cookie real que o browser recebeu é o que decide
  // a navegação seguinte).
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('Playwright Owner')).toBeVisible()

  // Cookie de sessão real, HttpOnly, presente após o fluxo completo.
  const cookies = await page.context().cookies()
  const accessCookie = cookies.find((c) => c.name === 'access_token')
  expect(accessCookie).toBeDefined()
  expect(accessCookie?.httpOnly).toBe(true)
})

test('sessão persiste após reload em /dashboard (cookie real, não estado de memória)', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByLabel('Usuário').fill(USERNAME)
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/trocar-senha$/)
  await page.getByLabel('Nova senha', { exact: true }).fill(NEW_PASSWORD)
  await page.getByLabel('Confirmar nova senha').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.reload()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('Playwright Owner')).toBeVisible()
})
