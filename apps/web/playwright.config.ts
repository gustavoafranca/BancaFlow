import { defineConfig, devices } from '@playwright/test'

// E2E de browser real (web-frontend-testing: "o fluxo login → troca
// obrigatória → dashboard SHALL ser coberto por teste E2E/browser"). Não
// orquestra backend/DB/seed automaticamente — ver `e2e/README.md` para os
// pré-requisitos (postgres + backend + seed + frontend já no ar). Isso evita
// acoplar o test runner a subir múltiplos serviços com estado (DB real), o
// que tende a ser mais frágil do que documentar o pré-requisito.
const baseURL = process.env.E2E_BASE_URL ?? 'http://pw-e2e.localhost:3000'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
