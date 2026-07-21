/**
 * @jest-environment node
 *
 * `next/server` (NextRequest/NextResponse) depende dos globais Web Fetch
 * (`Request`/`Response`/`Headers`) que o ambiente `jsdom` do Jest NÃO expõe
 * por padrão. O ambiente `node` do Jest (Node 18+) os expõe nativamente —
 * confirmado empiricamente e coerente com o runtime real do proxy (Node.js,
 * não Edge, por padrão nesta versão do Next.js).
 */
import { NextRequest } from 'next/server'
import { proxy } from './proxy'
import { ACCESS_TOKEN_COOKIE } from '@/shared/session/session.types'
import type { AccountRole } from '@/shared/session/session.types'

// Constrói um `NextRequest` real (não é mockável trivialmente com objetos
// simples — confirmado em
// `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`,
// seção "Unit testing (experimental)": `new NextRequest(url)` + chamada direta
// de `proxy(request)`).
function buildRequest(pathname: string, token?: string, host?: string): NextRequest {
  const headers = new Headers()
  if (token) {
    headers.set('cookie', `${ACCESS_TOKEN_COOKIE}=${token}`)
  }
  if (host) {
    headers.set('host', host)
  }
  return new NextRequest(new URL(pathname, 'http://localhost:3000'), { headers })
}

// Payload JWT mínimo (header/payload/signature), sem assinatura real: `proxy`
// só faz um parse leve do payload (ver `parseAccessToken`); a validação
// criptográfica é autoritativa no backend.
function makeToken(claims: {
  mustChangePassword: boolean
  sub?: string
  bancaId?: string
  sessionId?: string
  role?: AccountRole
}): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      sub: claims.sub ?? 'user-1',
      bancaId: claims.bancaId ?? 'banca-1',
      sessionId: claims.sessionId ?? 'session-1',
      role: claims.role ?? 'OWNER',
      mustChangePassword: claims.mustChangePassword,
    }),
  ).toString('base64url')
  return `${header}.${payload}.signature`
}

describe('proxy', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    // Por padrão, tenant disponível — os testes de sessão/senha abaixo não
    // são sobre o host, então o mock deixa a checagem de tenant passar.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ available: true }),
    }) as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('sem cookie de access token, acessando /dashboard -> redireciona para /login', async () => {
    const request = buildRequest('/dashboard')
    const response = await proxy(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/login')
  })

  it('sem cookie, acessando /trocar-senha -> redireciona para /login (sem acesso anônimo)', async () => {
    const request = buildRequest('/trocar-senha')
    const response = await proxy(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/login')
  })

  it('com cookie e mustChangePassword=true, acessando /dashboard -> redireciona para /trocar-senha', async () => {
    const token = makeToken({ mustChangePassword: true })
    const request = buildRequest('/dashboard', token)
    const response = await proxy(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/trocar-senha')
  })

  it('com cookie e mustChangePassword=false, acessando /trocar-senha -> redireciona para /dashboard', async () => {
    const token = makeToken({ mustChangePassword: false })
    const request = buildRequest('/trocar-senha', token)
    const response = await proxy(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard')
  })

  it('com cookie e mustChangePassword=false, acessando /dashboard -> passa sem redirect (sem loop)', async () => {
    const token = makeToken({ mustChangePassword: false })
    const request = buildRequest('/dashboard', token)
    const response = await proxy(request)

    // `NextResponse.next()` não é um redirect: sem header `location` e sem
    // status 3xx de redirecionamento.
    expect(response.headers.get('location')).toBeNull()
    expect(response.status).toBe(200)
  })

  it('cookie presente porém ilegível -> trata como ausência de sessão e redireciona para /login', async () => {
    const request = buildRequest('/dashboard', 'not-a-valid-jwt')
    const response = await proxy(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/login')
  })

  // Regressão: com o matcher agora cobrindo `/login` (Fase 8), sem o caso
  // especial abaixo um usuário anônimo em `/login` seria "redirecionado" para
  // `/login` — mesmo destino da origem, um loop de verdade (o browser
  // re-solicitaria a mesma URL indefinidamente).
  it('sem cookie, acessando /login -> NÃO redireciona (evita loop /login -> /login)', async () => {
    const request = buildRequest('/login')
    const response = await proxy(request)

    expect(response.headers.get('location')).toBeNull()
    expect(response.status).toBe(200)
  })

  it('cookie ilegível, acessando /login -> NÃO redireciona (evita loop /login -> /login)', async () => {
    const request = buildRequest('/login', 'not-a-valid-jwt')
    const response = await proxy(request)

    expect(response.headers.get('location')).toBeNull()
    expect(response.status).toBe(200)
  })

  // --- Host sem tenant válido (D6) ---

  it('tenant-context indica available=false -> reescreve para /unavailable (mesmo sem sessão)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ available: false }),
    }) as unknown as typeof fetch

    const request = buildRequest('/dashboard')
    const response = await proxy(request)

    // Rewrite preserva a URL original (nunca um redirect) — não vaza a
    // existência da página `/unavailable` na barra de endereço do browser.
    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:3000/unavailable',
    )
  })

  it('tenant-context indica available=false na raiz `/` -> reescreve para /unavailable', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ available: false }),
    }) as unknown as typeof fetch

    const request = buildRequest('/')
    const response = await proxy(request)

    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:3000/unavailable',
    )
  })

  it('endpoint de tenant-context indisponível (erro de rede) -> fail-open, segue o fluxo normal', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error')) as unknown as typeof fetch

    const request = buildRequest('/dashboard')
    const response = await proxy(request)

    // Sem sessão, mas o host não foi bloqueado: cai no fluxo de auth normal.
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/login')
  })

  it('tenant-context responde não-2xx -> fail-open, segue o fluxo normal', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch

    const token = makeToken({ mustChangePassword: false })
    const request = buildRequest('/dashboard', token)
    const response = await proxy(request)

    expect(response.headers.get('location')).toBeNull()
    expect(response.status).toBe(200)
  })

  // Regressão encontrada via e2e de browser real (Playwright): `request.url`
  // reflete o endereço em que o servidor Next está ligado (ex.:
  // `localhost:3000`), NÃO o `Host` que o browser enviou (ex.:
  // `farizeu.bancaflow.com.br`). O `Host` do browser precisa chegar ao
  // backend via `X-Forwarded-Host` (mesma fronteira de confiança já usada
  // por login), nunca como destino de rede do fetch — ver teste de SSRF
  // abaixo, que é a regressão de segurança em cima desta mesma correção.
  it('consulta tenant-context via BACKEND_INTERNAL_URL, repassando o Host do browser como X-Forwarded-Host', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ available: true }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const request = buildRequest('/dashboard', undefined, 'farizeu.bancaflow.com.br')
    await proxy(request)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = fetchMock.mock.calls[0]!
    expect(calledUrl).toBe('http://localhost:4000/api/tenant-context')
    expect((calledInit as RequestInit).headers).toEqual({
      'x-forwarded-host': 'farizeu.bancaflow.com.br',
    })
  })

  // SSRF (P1, encontrado em revisão): o `Host` do browser é entrada NÃO
  // CONFIÁVEL. A versão anterior fazia `target.host = host`, usando esse
  // valor como destino de REDE do fetch — um `Host: 127.0.0.1:4000` (ou
  // qualquer endereço interno) fazia o servidor conectar lá. O destino de
  // rede tem que ser SEMPRE `BACKEND_INTERNAL_URL` (variável de ambiente,
  // nunca entrada do cliente), não importa o que o `Host` diga.
  it('Host malicioso (endereço interno) NUNCA vira destino de rede do fetch (SSRF)', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ available: true }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const request = buildRequest('/dashboard', undefined, '127.0.0.1:4000')
    await proxy(request)

    const [calledUrl] = fetchMock.mock.calls[0]!
    expect(calledUrl).toBe('http://localhost:4000/api/tenant-context')
    expect(calledUrl).not.toContain('127.0.0.1:4000/api/tenant-context')
  })

  it('Host público sem porta não escapa do BACKEND_INTERNAL_URL configurado', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ available: true }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const request = buildRequest('/dashboard', undefined, 'tenant.bancaflow.com.br')
    await proxy(request)

    const [calledUrl] = fetchMock.mock.calls[0]!
    expect(calledUrl).toBe('http://localhost:4000/api/tenant-context')
  })
})
