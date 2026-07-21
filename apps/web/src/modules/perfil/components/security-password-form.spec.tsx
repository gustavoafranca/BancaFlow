import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { SecurityPasswordForm } from './security-password-form'
import { changePassword } from '@/shared/api/auth.client'

jest.mock('@/shared/api/auth.client', () => ({
  changePassword: jest.fn(),
}))

const mockedChangePassword = changePassword as jest.MockedFunction<typeof changePassword>

function renderForm(onSuccess = jest.fn()) {
  render(
    <ThemeProvider>
      <SecurityPasswordForm onSuccess={onSuccess} />
    </ThemeProvider>,
  )
  return onSuccess
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, values: {
  current?: string
  next?: string
  confirm?: string
}) {
  if (values.current !== undefined) await user.type(screen.getByLabelText('Senha Atual'), values.current)
  if (values.next !== undefined) await user.type(screen.getByLabelText('Nova Senha'), values.next)
  if (values.confirm !== undefined) await user.type(screen.getByLabelText('Confirmar Nova Senha'), values.confirm)
  await user.click(screen.getByRole('button', { name: /atualizar senha/i }))
}

describe('SecurityPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sucesso: chama changePassword com currentPassword/newPassword, limpa os campos e chama onSuccess', async () => {
    mockedChangePassword.mockResolvedValue({ status: 'success' })
    const user = userEvent.setup()
    const onSuccess = renderForm()

    await fillAndSubmit(user, { current: 'old-pass', next: 'NovaSenhaForte@123', confirm: 'NovaSenhaForte@123' })

    await waitFor(() =>
      expect(mockedChangePassword).toHaveBeenCalledWith({
        currentPassword: 'old-pass',
        newPassword: 'NovaSenhaForte@123',
      }),
    )
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('status')).toHaveTextContent(/senha atualizada/i)
    await waitFor(() => expect(screen.getByLabelText('Senha Atual')).toHaveValue(''))
    expect(screen.getByLabelText('Nova Senha')).toHaveValue('')
    expect(screen.getByLabelText('Confirmar Nova Senha')).toHaveValue('')
  })

  it('senha atual incorreta: exibe mensagem específica, distinta de erro genérico', async () => {
    mockedChangePassword.mockResolvedValue({ status: 'wrong_current_password' })
    const user = userEvent.setup()
    renderForm()

    await fillAndSubmit(user, { current: 'senha-errada', next: 'NovaSenhaForte@123', confirm: 'NovaSenhaForte@123' })

    expect(await screen.findByRole('alert')).toHaveTextContent(/senha atual informada está incorreta/i)
  })

  it('nova senha fraca é bloqueada localmente, sem enviar requisição', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillAndSubmit(user, { current: 'old-pass', next: 'fraca', confirm: 'fraca' })

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(mockedChangePassword).not.toHaveBeenCalled()
  })

  it('confirmação divergente é bloqueada localmente, sem enviar requisição', async () => {
    const user = userEvent.setup()
    renderForm()

    await fillAndSubmit(user, { current: 'old-pass', next: 'NovaSenhaForte@123', confirm: 'OutraSenha@456' })

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(mockedChangePassword).not.toHaveBeenCalled()
  })

  it('falha técnica não limpa os campos nem finge sucesso', async () => {
    mockedChangePassword.mockResolvedValue({ status: 'error' })
    const user = userEvent.setup()
    const onSuccess = renderForm()

    await fillAndSubmit(user, { current: 'old-pass', next: 'NovaSenhaForte@123', confirm: 'NovaSenhaForte@123' })

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível trocar a senha/i)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Senha Atual')).toHaveValue('old-pass')
  })

  it('bloqueia submissão duplicada enquanto a requisição está em andamento', async () => {
    let resolvePromise: (value: { status: 'success' }) => void
    mockedChangePassword.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve
      }),
    )
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Senha Atual'), 'old-pass')
    await user.type(screen.getByLabelText('Nova Senha'), 'NovaSenhaForte@123')
    await user.type(screen.getByLabelText('Confirmar Nova Senha'), 'NovaSenhaForte@123')

    const submitButton = screen.getByRole('button', { name: /atualizar senha/i })
    await user.click(submitButton)
    expect(submitButton).toBeDisabled()

    resolvePromise!({ status: 'success' })
    await waitFor(() => expect(mockedChangePassword).toHaveBeenCalledTimes(1))
  })
})
