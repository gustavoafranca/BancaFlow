import type { Config } from 'jest'
import nextJest from 'next/jest.js'

// Setup recomendado pela doc local do Next.js 16 para App Router
// (`node_modules/next/dist/docs/01-app/02-guides/testing/jest.md`): usar
// `next/jest`, que configura automaticamente o transform via SWC, mocka CSS/
// imagens/`next/font`, carrega `.env` e o `next.config.ts` do próprio projeto.
const createJestConfig = nextJest({
  dir: './',
})

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // `e2e/**` usa o runner do Playwright (`test`/`expect` próprios, browser
  // real) — não são testes Jest e quebrariam sob jsdom.
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/e2e/'],
  // `next/jest` NÃO lê `paths` do `tsconfig.json` automaticamente (confirmado
  // empiricamente e coerente com a seção "Optional: Handling Absolute Imports
  // and Module Path Aliases" da doc local de Jest): o alias `@/*` precisa ser
  // replicado manualmente aqui, espelhando `tsconfig.json` (`"@/*": ["./src/*"]`).
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

export default createJestConfig(config)
