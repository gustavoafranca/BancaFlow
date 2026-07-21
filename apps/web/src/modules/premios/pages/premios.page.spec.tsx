import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { CurrentUserProvider } from '@/shared/session/current-user-provider'
import { PremiosPage } from './premios.page'
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
      <CurrentUserProvider><PremiosPage /></CurrentUserProvider>
    </ThemeProvider>,
  )
}

describe('PremiosPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
  })

  it('renderiza o feed de prêmios de amostra e o formulário', () => {
    renderPage()
    expect(screen.getByText('Novo Prêmio / Reclamação')).toBeInTheDocument()
    expect(screen.getByText('Prêmios e Reclamações')).toBeInTheDocument()
  })

  it('registrar um novo prêmio usa o nome do usuário autenticado como "criado por" (não hardcoded)', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Novo Prêmio / Reclamação')

    await user.type(screen.getByPlaceholderText('Nome, apelido ou nº do talão...'), 'Carlos')
    await user.click(screen.getAllByText('Carlos Mendes')[0]!)
    await user.type(screen.getByPlaceholderText('0,00'), '50')
    await user.click(screen.getByRole('button', { name: /^Salvar$/ }))

    // A nova linha do feed mostra o primeiro nome do usuário autenticado
    // (registros de amostra pré-existentes de outros criadores, como "João
    // Silva", são históricos e continuam exibidos normalmente).
    expect(await screen.findByText('Owner')).toBeInTheDocument()
  })

  it('botão Salvar fica desabilitado (gating) sem cambista selecionado', () => {
    renderPage()
    const salvarBtn = screen.getByRole('button', { name: /^Salvar$/ })
    expect(salvarBtn).toHaveStyle({ cursor: 'not-allowed' })
  })
})
