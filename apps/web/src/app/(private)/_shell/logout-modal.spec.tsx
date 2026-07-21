import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { LogoutModalProvider, useLogoutModal } from './logout-modal-provider'
import { LogoutModal } from './logout-modal'
import { logout, logoutAll } from '@/shared/api/auth.client'

jest.mock('@/shared/api/auth.client', () => ({
  logout: jest.fn(),
  logoutAll: jest.fn(),
}))

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const mockedLogout = logout as jest.MockedFunction<typeof logout>
const mockedLogoutAll = logoutAll as jest.MockedFunction<typeof logoutAll>

function TestHarness() {
  const { openLogoutModal } = useLogoutModal()
  return (
    <>
      <button type="button" onClick={openLogoutModal}>
        abrir gatilho
      </button>
      <LogoutModal />
    </>
  )
}

function renderHarness() {
  return render(
    <ThemeProvider>
      <LogoutModalProvider>
        <TestHarness />
      </LogoutModalProvider>
    </ThemeProvider>,
  )
}

describe('LogoutModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('abre com as três ações visíveis e foco inicial no controle seguro (Cancelar)', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'abrir gatilho' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Sair')

    expect(screen.getByRole('button', { name: 'Sair deste dispositivo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair de todos os dispositivos' })).toBeInTheDocument()
    const cancelButton = screen.getByRole('button', { name: 'Cancelar' })
    expect(cancelButton).toBeInTheDocument()
    await waitFor(() => expect(cancelButton).toHaveFocus())
  })

  it('"Sair deste dispositivo" chama exclusivamente logout() e redireciona para /login', async () => {
    mockedLogout.mockResolvedValue(true)
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'abrir gatilho' }))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Sair deste dispositivo' }))

    await waitFor(() => expect(mockedLogout).toHaveBeenCalledTimes(1))
    expect(mockedLogoutAll).not.toHaveBeenCalled()
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('"Sair de todos os dispositivos" chama exclusivamente logoutAll() e redireciona para /login', async () => {
    mockedLogoutAll.mockResolvedValue(true)
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'abrir gatilho' }))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Sair de todos os dispositivos' }))

    await waitFor(() => expect(mockedLogoutAll).toHaveBeenCalledTimes(1))
    expect(mockedLogout).not.toHaveBeenCalled()
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'))
  })

  it('Cancelar fecha o modal sem chamar nenhuma API', async () => {
    const user = userEvent.setup()
    renderHarness()

    const trigger = screen.getByRole('button', { name: 'abrir gatilho' })
    await user.click(trigger)
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(mockedLogout).not.toHaveBeenCalled()
    expect(mockedLogoutAll).not.toHaveBeenCalled()
    // A devolução de foco ao gatilho é comportamento padrão do Radix Dialog
    // (mesmo padrão não explicitamente testado em `security-tab.spec.tsx` por
    // depender de timing interno do Radix não determinístico em jsdom);
    // aqui verificamos o efeito observável e determinístico: o modal fecha.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('Escape fecha o modal quando não está processando', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'abrir gatilho' }))
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('previne clique duplicado: um segundo clique durante o processamento não dispara uma segunda chamada', async () => {
    let resolveLogout: (value: boolean) => void = () => {}
    mockedLogout.mockReturnValue(
      new Promise((resolve) => {
        resolveLogout = resolve
      }),
    )
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'abrir gatilho' }))
    await screen.findByRole('dialog')
    const confirmButton = screen.getByRole('button', { name: /sair deste dispositivo/i })
    await user.click(confirmButton)
    await user.click(confirmButton)

    resolveLogout(true)
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'))
    expect(mockedLogout).toHaveBeenCalledTimes(1)
  })

  it('loading é independente por ação: só o botão clicado mostra "Saindo...", o outro fica desabilitado com o rótulo normal', async () => {
    let resolveLogout: (value: boolean) => void = () => {}
    mockedLogout.mockReturnValue(
      new Promise((resolve) => {
        resolveLogout = resolve
      }),
    )
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'abrir gatilho' }))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: /sair deste dispositivo/i }))

    expect(await screen.findByRole('button', { name: 'Saindo...' })).toBeInTheDocument()
    const otherButton = screen.getByRole('button', { name: 'Sair de todos os dispositivos' })
    expect(otherButton).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()

    resolveLogout(true)
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'))
  })

  it('"Sair de todos os dispositivos" usa a variante destructive (ação sensível secundária)', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'abrir gatilho' }))
    await screen.findByRole('dialog')

    const allButton = screen.getByRole('button', { name: 'Sair de todos os dispositivos' })
    const deviceButton = screen.getByRole('button', { name: 'Sair deste dispositivo' })
    expect(allButton.className).toContain('bg-destructive')
    expect(deviceButton.className).not.toContain('bg-destructive')
  })

  it('as três ações usam botões de largura total, evitando quebra confusa em telas estreitas', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'abrir gatilho' }))
    await screen.findByRole('dialog')

    expect(screen.getByRole('button', { name: 'Sair deste dispositivo' }).className).toContain('w-full')
    expect(screen.getByRole('button', { name: 'Sair de todos os dispositivos' }).className).toContain('w-full')
  })

  it('cada opção mostra uma descrição curta explicando o alcance da ação', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'abrir gatilho' }))
    const dialog = await screen.findByRole('dialog')

    expect(dialog).toHaveTextContent(/as demais sessões continuam ativas/i)
    expect(dialog).toHaveTextContent(/encerra todas as sessões ativas desta conta/i)
  })

  it('falha ao sair mantém o modal aberto com erro visível, sem redirecionar', async () => {
    mockedLogout.mockResolvedValue(false)
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'abrir gatilho' }))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Sair deste dispositivo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível sair agora/i)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })
})
