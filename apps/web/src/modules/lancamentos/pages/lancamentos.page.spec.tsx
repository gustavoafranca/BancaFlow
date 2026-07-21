import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { CurrentUserProvider } from '@/shared/session/current-user-provider'
import { LancamentosPage } from './lancamentos.page'
import { getCurrentUser } from '@/shared/api/auth.client'

jest.mock('@/shared/api/auth.client', () => ({
  getCurrentUser: jest.fn(),
}))

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>

const CONTEXT = {
  userId: 'user-1',
  username: 'owner',
  name: 'Owner Silva',
  email: 'owner@banca.com',
  role: 'OWNER' as const,
  version: 1,
  banca: { bancaId: 'banca-1', codigoBanca: 'farizeu', name: 'Banca Real' },
}

function renderPage() {
  return render(
    <ThemeProvider>
      <CurrentUserProvider><LancamentosPage /></CurrentUserProvider>
    </ThemeProvider>,
  )
}

describe('LancamentosPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
  })

  it('renderiza o formulário de lançamento e o feed de amostra', async () => {
    renderPage()
    expect(screen.getByText('Lançamento')).toBeInTheDocument()
    expect(screen.getByText(/Feed · /)).toBeInTheDocument()
    await waitFor(() => expect(mockedGetCurrentUser).toHaveBeenCalled())
  })

  it('botão Salvar fica desabilitado (gating) sem cambista/valores', async () => {
    renderPage()
    const salvarBtn = screen.getByRole('button', { name: /^Salvar/ })
    expect(salvarBtn).toHaveStyle({ cursor: 'not-allowed' })
    await waitFor(() => expect(mockedGetCurrentUser).toHaveBeenCalled())
  })

  it('registrar um lançamento usa o usuário autenticado como operador (não hardcoded)', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Lançamento')

    await user.type(screen.getByPlaceholderText('Nº, nome ou apelido...'), 'Carlos')
    await user.click(screen.getAllByText('101 · Carlos Mendes')[0]!)

    const [vendaInput, dinheiroInput] = screen.getAllByPlaceholderText('0,00')
    await user.type(vendaInput!, '100')
    await user.type(dinheiroInput!, '100')

    const salvarBtn = screen.getByRole('button', { name: /^Salvar/ })
    expect(salvarBtn).toHaveStyle({ cursor: 'pointer' })
    await user.click(salvarBtn)

    expect(await screen.findByTitle(new RegExp(`Por: ${CONTEXT.name}`))).toBeInTheDocument()
  })
})
