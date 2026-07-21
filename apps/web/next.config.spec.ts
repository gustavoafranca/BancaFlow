// Verificação da config de infraestrutura (task 36.3), sem precisar de um
// servidor Next.js real de pé nem de um backend em :4000.
//
// NOTA: cheguei a tentar usar `unstable_getResponseFromNextConfig` +
// `getRewrittenUrl` de `next/experimental/testing/server` (documentado em
// `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`,
// seção "Unit testing (experimental)", para testar `rewrites()` sem servidor
// real). Na prática, esse utilitário (nesta versão do Next.js) constrói a URL
// reescrita via `new URL(pathname, `${protocol}//${hostname}`)` — DESCARTANDO
// a porta do destino (`shared/lib/router/utils/prepare-destination.js` +
// `experimental/testing/server/config-testing-utils.js`) — então
// `http://localhost:4000/api/...` virava `http://localhost/api/...` no teste,
// mesmo com a config correta. É uma limitação/bug do utilitário experimental,
// não do nosso `next.config.ts`. Por isso o teste abaixo chama `rewrites()`
// diretamente e valida o array retornado — determinístico e sem depender
// dessa utilidade experimental.
//
// Verificação manual (com o Web em dev e o backend real em :4000):
//   1. `npm run dev -w apps/backend` (sobe o backend em http://localhost:4000)
//   2. `npm run dev -w apps/web` (sobe o Web em http://localhost:3000)
//   3. `curl -i -H "Host: farizeu.bancaflow.com.br" http://localhost:3000/api/auth/login \
//        -X POST -H "content-type: application/json" -d '{"username":"x","password":"y"}'`
//   4. Confirmar que a requisição chega ao backend (ex.: log do Nest) e que o
//      backend resolveu `codigoBanca = "farizeu"` a partir do `Host` recebido
//      (equivalente ao `X-Forwarded-Host` sob `TRUST_PROXY_HOST=true`).
describe('next.config rewrites', () => {
  afterEach(() => {
    delete process.env.BACKEND_INTERNAL_URL
  })

  it('reescreve /api/:path* para o backend usando o default http://localhost:4000', async () => {
    let nextConfig!: typeof import('./next.config').default
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      nextConfig = require('./next.config').default
    })

    const rewrites = await nextConfig.rewrites?.()
    const list = Array.isArray(rewrites) ? rewrites : []

    expect(list).toEqual([
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
    ])
  })

  it('respeita BACKEND_INTERNAL_URL quando definida', async () => {
    process.env.BACKEND_INTERNAL_URL = 'http://backend-internal:9999'

    let nextConfig!: typeof import('./next.config').default
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      nextConfig = require('./next.config').default
    })

    const rewrites = await nextConfig.rewrites?.()
    const list = Array.isArray(rewrites) ? rewrites : []

    expect(list).toEqual([
      {
        source: '/api/:path*',
        destination: 'http://backend-internal:9999/api/:path*',
      },
    ])
  })
})
