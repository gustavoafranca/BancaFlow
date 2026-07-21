/**
 * @jest-environment node
 *
 * Duas razões para o ambiente `node` (em vez do `jsdom` padrão do projeto):
 *
 * 1. Precisamos de `Response` real (globals Web Fetch), ausente no `jsdom`
 *    do Jest por padrão — ver nota equivalente em `src/proxy.spec.ts`.
 * 2. `redirectToLoginExpired()` chama `window.location.assign(...)`. No
 *    `jsdom` do Jest, `window.location` é uma propriedade "unforgeable" (por
 *    spec, replicada fielmente pelo jsdom): não pode ser deletada,
 *    reatribuída nem contornada com `jest.spyOn`/`Object.defineProperty`
 *    (confirmado empiricamente: todas essas abordagens falham ou são
 *    ignoradas silenciosamente). No ambiente `node`, `window` simplesmente
 *    não existe por padrão — podemos, então, definir nosso próprio objeto
 *    `window` de teste em `globalThis`, sem essa restrição.
 */
import type { fetchWithRefresh, redirectToLoginExpired, refreshSession } from './refresh-on-expire'

type ModuleUnderTest = {
  fetchWithRefresh: typeof fetchWithRefresh
  redirectToLoginExpired: typeof redirectToLoginExpired
  refreshSession: typeof refreshSession
}

// `refresh-on-expire.ts` mantém um lock (`inFlight`) em variável de módulo
// para coalescer chamadas concorrentes de refresh. Para não vazar esse estado
// entre testes (o lock só é liberado num `setTimeout(0)` após o `finally`),
// cada teste importa uma instância ISOLADA do módulo via `jest.isolateModules`.
function loadModule(): ModuleUnderTest {
  let mod!: ModuleUnderTest
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('./refresh-on-expire') as ModuleUnderTest
  })
  return mod
}

function jsonResponse(status: number): Response {
  return new Response(null, { status })
}

function mockWindowAssign(): jest.Mock {
  const assignMock = jest.fn()
  ;(globalThis as unknown as { window: unknown }).window = {
    location: { assign: assignMock },
  }
  return assignMock
}

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window
})

describe('fetchWithRefresh', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('em 401, dispara silent refresh (POST /api/auth/refresh) e repete a chamada original com sucesso', async () => {
    const { fetchWithRefresh } = loadModule()
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401)) // chamada original -> 401
      .mockResolvedValueOnce(jsonResponse(200)) // POST /api/auth/refresh -> ok
      .mockResolvedValueOnce(jsonResponse(200)) // chamada original repetida -> ok

    const response = await fetchWithRefresh('/api/some-resource', { method: 'GET' })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/some-resource')
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/auth/refresh')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' })
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/some-resource')
    expect(response.status).toBe(200)
  })

  it('não repete nem tenta refresh quando a chamada original não é 401', async () => {
    const { fetchWithRefresh } = loadModule()
    fetchMock.mockResolvedValueOnce(jsonResponse(200))

    const response = await fetchWithRefresh('/api/some-resource')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(200)
  })

  it('se o refresh falhar, redireciona para /login?expired=1 e não repete a chamada original', async () => {
    const { fetchWithRefresh } = loadModule()
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401)) // chamada original -> 401
      .mockResolvedValueOnce(jsonResponse(401)) // POST /api/auth/refresh -> falha

    const assignMock = mockWindowAssign()

    const response = await fetchWithRefresh('/api/some-resource')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(assignMock).toHaveBeenCalledWith('/login?expired=1')
    expect(response.status).toBe(401)
  })
})

describe('refreshSession', () => {
  it('faz coalescing de chamadas concorrentes numa única requisição', async () => {
    const { refreshSession } = loadModule()
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200))
    global.fetch = fetchMock as unknown as typeof fetch

    const [first, second] = await Promise.all([refreshSession(), refreshSession()])

    expect(first).toBe(true)
    expect(second).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('redirectToLoginExpired', () => {
  it('redireciona o browser para /login?expired=1', () => {
    const { redirectToLoginExpired } = loadModule()
    const assignMock = mockWindowAssign()

    redirectToLoginExpired()

    expect(assignMock).toHaveBeenCalledWith('/login?expired=1')
  })

  it('não faz nada quando `window` não existe (contexto server-side)', () => {
    const { redirectToLoginExpired } = loadModule()

    expect(() => redirectToLoginExpired()).not.toThrow()
  })
})
