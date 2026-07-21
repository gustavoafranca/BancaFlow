import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChangePasswordForm } from './change-password-form'
import { mandatoryPasswordChange } from '@/shared/api/auth.client'

// `mandatoryPasswordChange` é a única chamada esperada neste fluxo OBRIGATÓRIO
// (nunca `changePassword`, que exige `currentPassword` e é o fluxo voluntário).
jest.mock('@/shared/api/auth.client', () => ({
  mandatoryPasswordChange: jest.fn(),
}))

const pushMock = jest.fn()
const refreshMock = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

const mockedMandatoryPasswordChange = mandatoryPasswordChange as jest.MockedFunction<
  typeof mandatoryPasswordChange
>

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('submissão com senha forte chama mandatoryPasswordChange({ newPassword }) e navega para /dashboard', async () => {
    mockedMandatoryPasswordChange.mockResolvedValue({ status: 'success' })
    const user = userEvent.setup()

    render(<ChangePasswordForm />)

    await user.type(screen.getByLabelText('Nova senha'), 'Senha@Forte123')
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'Senha@Forte123')
    await user.click(screen.getByRole('button', { name: /salvar nova senha/i }))

    await waitFor(() => {
      expect(mockedMandatoryPasswordChange).toHaveBeenCalledWith({
        newPassword: 'Senha@Forte123',
      })
    })
    // Body contém SOMENTE `newPassword` — nunca um flag de autorização vindo do client.
    expect(mockedMandatoryPasswordChange).toHaveBeenCalledTimes(1)
    expect(mockedMandatoryPasswordChange.mock.calls[0]?.[0]).toEqual({
      newPassword: 'Senha@Forte123',
    })

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard')
    })
    expect(refreshMock).toHaveBeenCalled()
  })

  it('senha fraca não bate no schema local: não envia requisição e mostra erro acessível', async () => {
    const user = userEvent.setup()

    render(<ChangePasswordForm />)

    await user.type(screen.getByLabelText('Nova senha'), 'fraca')
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'fraca')
    await user.click(screen.getByRole('button', { name: /salvar nova senha/i }))

    // `role="alert"` não computa "accessible name" a partir do conteúdo (não é
    // uma role "name from content" no accname spec) — por isso localizamos
    // pela role e conferimos o texto separadamente, em vez de usar a opção
    // `name` de `findByRole`.
    const error = await screen.findByRole('alert')
    expect(error).toHaveTextContent(/senha deve ter ao menos 8 caracteres/i)
    expect(mockedMandatoryPasswordChange).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('falha do backend (status invalid) mostra mensagem de erro genérica, sem navegar', async () => {
    mockedMandatoryPasswordChange.mockResolvedValue({ status: 'invalid' })
    const user = userEvent.setup()

    render(<ChangePasswordForm />)

    await user.type(screen.getByLabelText('Nova senha'), 'Senha@Forte123')
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'Senha@Forte123')
    await user.click(screen.getByRole('button', { name: /salvar nova senha/i }))

    const error = await screen.findByRole('alert')
    expect(error).toHaveTextContent(/não atende aos requisitos de segurança/i)
    expect(pushMock).not.toHaveBeenCalled()
  })
})
