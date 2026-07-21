/**
 * @jest-environment node
 *
 * A rota raiz `/` é um Server Component que decide o destino via `cookies()` +
 * `redirect()`. Ambos são mockados: `redirect` lança (como no runtime real do
 * Next) para interromper a execução, e afirmamos o caminho de destino.
 */
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ACCESS_TOKEN_COOKIE } from '@/shared/session/session.types'
import RootPage from './page'

jest.mock('next/headers', () => ({ cookies: jest.fn() }))
jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

function makeToken(mustChangePassword: boolean): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'user-1',
      bancaId: 'banca-1',
      sessionId: 'session-1',
      role: 'OWNER',
      mustChangePassword,
    }),
  ).toString('base64url')
  return `${header}.${payload}.signature`
}

function mockCookie(token?: string): void {
  ;(cookies as jest.Mock).mockResolvedValue({
    get: (name: string) => (token && name === ACCESS_TOKEN_COOKIE ? { value: token } : undefined),
  })
}

describe('rota raiz /', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sem sessão -> redireciona para /login', async () => {
    mockCookie(undefined)
    await expect(RootPage()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('cookie ilegível -> redireciona para /login', async () => {
    mockCookie('not-a-valid-jwt')
    await expect(RootPage()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('sessão válida com mustChangePassword=true -> redireciona para /trocar-senha', async () => {
    mockCookie(makeToken(true))
    await expect(RootPage()).rejects.toThrow('NEXT_REDIRECT:/trocar-senha')
    expect(redirect).toHaveBeenCalledWith('/trocar-senha')
  })

  it('sessão válida normal -> redireciona para /dashboard', async () => {
    mockCookie(makeToken(false))
    await expect(RootPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(redirect).toHaveBeenCalledWith('/dashboard')
  })
})
