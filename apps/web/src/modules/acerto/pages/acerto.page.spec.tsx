import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { CurrentUserProvider } from '@/shared/session/current-user-provider'
import { AcertoPage } from './acerto.page'
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
      <CurrentUserProvider><AcertoPage /></CurrentUserProvider>
    </ThemeProvider>,
  )
}

describe('AcertoPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
  })

  it('renderiza o título, o saldo e o botão de ação', async () => {
    renderPage()
    expect(screen.getByText('Acerto')).toBeInTheDocument()
    expect(screen.getByText('Saldo Atual')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Realizar Acerto/ })).toBeEnabled()
    // Aguarda o hook de sessão resolver antes do teste terminar (evita warning de act()).
    await waitFor(() => expect(mockedGetCurrentUser).toHaveBeenCalled())
  })

  it('confirmar um acerto exibe o comprovante com operador e banca REAIS da sessão (não hardcoded)', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /Realizar Acerto/ }))
    // Drawer aberto: preenche valor e forma de pagamento.
    const valorInput = screen.getByPlaceholderText('0,00')
    await user.type(valorInput, '50')
    const formaSelect = screen.getByDisplayValue('Selecionar forma...')
    await user.selectOptions(formaSelect, 'dinheiro')

    await user.click(screen.getByRole('button', { name: /Confirmar Acerto/ }))

    expect(await screen.findByText('Acerto Registrado!')).toBeInTheDocument()
    await screen.findByText((content) => content.includes('Owner Silva'))
    expect(screen.getByText('BANCA REAL')).toBeInTheDocument()
    expect(screen.queryByText(/João Silva/)).not.toBeInTheDocument()
    expect(screen.queryByText('BANCA SÃO JORGE')).not.toBeInTheDocument()
  })
})
