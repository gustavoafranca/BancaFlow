/**
 * @jest-environment node
 *
 * `/login` é um Server Component: um usuário já autenticado é redirecionado
 * para fora do login. Mockamos `cookies()` e `redirect()` (que lança, como no
 * runtime real do Next). O caminho anônimo apenas renderiza a tela e não é
 * exercitado aqui (coberto por testes de componente).
 */
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ACCESS_TOKEN_COOKIE } from '@/shared/session/session.types'
import LoginPage from './page'

jest.mock('next/headers', () => ({ cookies: jest.fn() }))
jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))
// `LoginLayout` é client component e só importa para o caminho anônimo; mock
// simples evita puxar a árvore de UI no ambiente node deste teste.
jest.mock('./_components/login-layout', () => ({ LoginLayout: () => null }))

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

const emptyParams = Promise.resolve({})
const expiredParams = Promise.resolve({ expired: '1' })

describe('rota /login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('usuário autenticado normal -> redireciona para /dashboard', async () => {
    mockCookie(makeToken(false))
    await expect(LoginPage({ searchParams: emptyParams })).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(redirect).toHaveBeenCalledWith('/dashboard')
  })

  it('usuário autenticado com troca obrigatória -> redireciona para /trocar-senha', async () => {
    mockCookie(makeToken(true))
    await expect(LoginPage({ searchParams: emptyParams })).rejects.toThrow('NEXT_REDIRECT:/trocar-senha')
    expect(redirect).toHaveBeenCalledWith('/trocar-senha')
  })

  it('usuário anônimo -> não redireciona (renderiza o login)', async () => {
    mockCookie(undefined)
    await expect(LoginPage({ searchParams: emptyParams })).resolves.not.toThrow()
    expect(redirect).not.toHaveBeenCalled()
  })

  // `expired=1`: sessão revogada/expirada sinalizada pelo silent refresh.
  // Mesmo com um cookie ainda parseável (corrida/cache), `/login` NÃO deve
  // bounce de volta para `/dashboard` — evita o loop login <-> dashboard
  // reportado na revisão (o backend já limpou os cookies nessa falha).
  it('expired=1 com cookie ainda parseável -> NÃO redireciona, renderiza o login (evita loop)', async () => {
    mockCookie(makeToken(false))
    await expect(LoginPage({ searchParams: expiredParams })).resolves.not.toThrow()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('expired=1 sem cookie -> não redireciona (renderiza o login)', async () => {
    mockCookie(undefined)
    await expect(LoginPage({ searchParams: expiredParams })).resolves.not.toThrow()
    expect(redirect).not.toHaveBeenCalled()
  })
})
