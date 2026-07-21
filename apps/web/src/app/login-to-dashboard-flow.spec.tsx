import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './login/_components/login-form'
import { ChangePasswordForm } from './trocar-senha/change-password-form'
import { login, mandatoryPasswordChange } from '@/shared/api/auth.client'

/**
 * Characterization do fluxo login → troca obrigatória → dashboard (tasks.md
 * §3.2/§6.2, requisito `web-frontend-testing`: "Login to mandatory change to
 * dashboard is exercised end to end").
 *
 * Não há Playwright/Cypress neste projeto (só Jest + Testing Library) — não
 * introduzimos essa infra silenciosamente numa change que já tem escopo grande.
 * Em vez disso, este teste exercita as DUAS telas reais (mesmos componentes
 * client renderizados em produção) encadeadas, mockando somente a borda HTTP
 * (`auth.client`) e `next/navigation`, e afirma a sequência exata de navegação
 * que o `proxy.ts`/`(private)/layout.tsx` espera: sucesso com
 * `mustChangePassword=true` → `/trocar-senha` → troca bem-sucedida → `/dashboard`,
 * sem passo manual de refresh de token.
 */
jest.mock('@/shared/api/auth.client', () => ({
  login: jest.fn(),
  mandatoryPasswordChange: jest.fn(),
}))

const pushMock = jest.fn()
const refreshMock = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

const mockedLogin = login as jest.MockedFunction<typeof login>
const mockedMandatoryPasswordChange = mandatoryPasswordChange as jest.MockedFunction<
  typeof mandatoryPasswordChange
>

describe('Fluxo login → troca obrigatória → dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('login com mustChangePassword=true navega para /trocar-senha; troca bem-sucedida navega para /dashboard', async () => {
    mockedLogin.mockResolvedValue({ status: 'success', mustChangePassword: true })
    const user = userEvent.setup()

    const { unmount } = render(<LoginForm dark={false} />)

    await user.type(screen.getByLabelText('Usuário'), 'owner')
    await user.type(screen.getByLabelText('Senha'), 'Senha@Forte123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await screen.findByRole('button', { name: /entrar/i })
    expect(mockedLogin).toHaveBeenCalledWith({ username: 'owner', password: 'Senha@Forte123' })
    expect(pushMock).toHaveBeenCalledWith('/trocar-senha')
    expect(refreshMock).toHaveBeenCalledTimes(1)

    // O redirecionamento real para /trocar-senha é feito pelo servidor
    // (proxy.ts / layout do grupo privado) a partir do cookie já atualizado;
    // aqui simulamos a navegação renderizando a próxima tela do fluxo.
    unmount()
    pushMock.mockClear()
    refreshMock.mockClear()

    mockedMandatoryPasswordChange.mockResolvedValue({ status: 'success' })
    render(<ChangePasswordForm />)

    await user.type(screen.getByLabelText('Nova senha'), 'OutraSenha@456')
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'OutraSenha@456')
    await user.click(screen.getByRole('button', { name: /salvar nova senha/i }))

    await screen.findByRole('button', { name: /salvar nova senha/i })
    expect(mockedMandatoryPasswordChange).toHaveBeenCalledWith({
      newPassword: 'OutraSenha@456',
    })
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it('login sem troca obrigatória navega direto para /dashboard, sem passar por /trocar-senha', async () => {
    mockedLogin.mockResolvedValue({ status: 'success', mustChangePassword: false })
    const user = userEvent.setup()

    render(<LoginForm dark={false} />)

    await user.type(screen.getByLabelText('Usuário'), 'owner')
    await user.type(screen.getByLabelText('Senha'), 'Senha@Forte123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await screen.findByRole('button', { name: /entrar/i })
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
    expect(pushMock).not.toHaveBeenCalledWith('/trocar-senha')
    expect(mockedMandatoryPasswordChange).not.toHaveBeenCalled()
  })
})
