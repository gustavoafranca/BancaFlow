import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { SecurityTab } from './security-tab'
import { listSessions, revokeSession } from '@/shared/api/auth.client'

jest.mock('@/shared/api/auth.client', () => ({
  listSessions: jest.fn(),
  revokeSession: jest.fn(),
  changePassword: jest.fn(),
}))

const mockedListSessions = listSessions as jest.MockedFunction<typeof listSessions>
const mockedRevokeSession = revokeSession as jest.MockedFunction<typeof revokeSession>

const CURRENT = {
  sessionId: 'current-session',
  createdAt: '2026-07-19T10:00:00.000Z',
  expiresAt: '2026-07-26T10:00:00.000Z',
  isCurrent: true,
  deviceInfo: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0',
}
const OTHER = {
  sessionId: 'other-session',
  createdAt: '2026-07-18T09:00:00.000Z',
  expiresAt: '2026-07-25T09:00:00.000Z',
  isCurrent: false,
  deviceInfo: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1',
}

function renderTab() {
  return render(
    <ThemeProvider>
      <SecurityTab />
    </ThemeProvider>,
  )
}

describe('SecurityTab', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('mostra indicador de carregamento enquanto listSessions() está pendente', () => {
    mockedListSessions.mockReturnValue(new Promise(() => {}))
    renderTab()
    expect(screen.getByRole('status')).toHaveTextContent(/carregando sessões/i)
  })

  it('lista sessões reais retornadas por listSessions(), sessão atual marcada e sem ação própria', async () => {
    mockedListSessions.mockResolvedValue({ status: 'success', data: [CURRENT, OTHER] })
    renderTab()

    expect(await screen.findByText('Chrome no Windows')).toBeInTheDocument()
    expect(screen.getByText('Safari no iPhone')).toBeInTheDocument()
    expect(screen.getByText('Sessão atual')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Encerrar sessão' })).toBeInTheDocument()
    // Nenhum dado de amostra do antigo perfil.sample.ts.
    expect(screen.queryByText(/iPhone 14 — Safari 17/)).not.toBeInTheDocument()
  })

  it('mostra estado vazio quando só existe a sessão atual', async () => {
    mockedListSessions.mockResolvedValue({ status: 'success', data: [CURRENT] })
    renderTab()

    await screen.findByText('Sessão atual')
    expect(screen.getByText(/nenhuma outra sessão ativa/i)).toBeInTheDocument()
  })

  it('erro ao carregar sessões mostra mensagem com "Tentar novamente" que recarrega', async () => {
    mockedListSessions
      .mockResolvedValueOnce({ status: 'error' })
      .mockResolvedValueOnce({ status: 'success', data: [CURRENT] })
    const user = userEvent.setup()
    renderTab()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar suas sessões/i)

    await user.click(screen.getByRole('button', { name: /tentar novamente/i }))
    expect(await screen.findByText('Sessão atual')).toBeInTheDocument()
  })

  it('revogar outra sessão pede confirmação, chama revokeSession() e recarrega a lista autoritativa', async () => {
    mockedListSessions
      .mockResolvedValueOnce({ status: 'success', data: [CURRENT, OTHER] })
      .mockResolvedValueOnce({ status: 'success', data: [CURRENT] })
    mockedRevokeSession.mockResolvedValue({ status: 'success' })
    const user = userEvent.setup()
    renderTab()

    await screen.findByText('Safari no iPhone')
    await user.click(screen.getByRole('button', { name: 'Encerrar sessão' }))

    const dialog = await screen.findByRole('dialog')
    const confirmButtons = screen.getAllByRole('button', { name: 'Encerrar sessão' })
    await user.click(confirmButtons[confirmButtons.length - 1]!)

    await waitFor(() => expect(mockedRevokeSession).toHaveBeenCalledWith('other-session'))
    await waitFor(() => expect(mockedListSessions).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByText('Safari no iPhone')).not.toBeInTheDocument())
    expect(dialog).not.toBeInTheDocument()
  })

  it('sessão já ausente no refetch (already gone) não gera erro visível', async () => {
    mockedListSessions
      .mockResolvedValueOnce({ status: 'success', data: [CURRENT, OTHER] })
      .mockResolvedValueOnce({ status: 'success', data: [CURRENT] })
    mockedRevokeSession.mockResolvedValue({ status: 'not_found' })
    const user = userEvent.setup()
    renderTab()

    await screen.findByText('Safari no iPhone')
    await user.click(screen.getByRole('button', { name: 'Encerrar sessão' }))
    await screen.findByRole('dialog')
    const confirmButtons = screen.getAllByRole('button', { name: 'Encerrar sessão' })
    await user.click(confirmButtons[confirmButtons.length - 1]!)

    await waitFor(() => expect(mockedListSessions).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('Safari no iPhone')).not.toBeInTheDocument()
  })

  it('falha ao revogar exibe mensagem de erro', async () => {
    mockedListSessions.mockResolvedValue({ status: 'success', data: [CURRENT, OTHER] })
    mockedRevokeSession.mockResolvedValue({ status: 'error' })
    const user = userEvent.setup()
    renderTab()

    await screen.findByText('Safari no iPhone')
    await user.click(screen.getByRole('button', { name: 'Encerrar sessão' }))
    await screen.findByRole('dialog')
    const confirmButtons = screen.getAllByRole('button', { name: 'Encerrar sessão' })
    await user.click(confirmButtons[confirmButtons.length - 1]!)

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível encerrar a sessão/i)
  })
})
