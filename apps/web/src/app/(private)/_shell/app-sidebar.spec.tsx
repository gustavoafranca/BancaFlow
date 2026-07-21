import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppSidebar } from './app-sidebar'
import { LogoutModalProvider } from './logout-modal-provider'
import { LogoutModal } from './logout-modal'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { logout, logoutAll } from '@/shared/api/auth.client'

jest.mock('@/shared/api/auth.client', () => ({
  logout: jest.fn(),
  logoutAll: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: jest.fn() }),
}))

const mockedLogout = logout as jest.MockedFunction<typeof logout>
const mockedLogoutAll = logoutAll as jest.MockedFunction<typeof logoutAll>

function renderSidebar() {
  return render(
    <ThemeProvider>
      <LogoutModalProvider>
        <AppSidebar />
        <LogoutModal />
      </LogoutModalProvider>
    </ThemeProvider>,
  )
}

describe('AppSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renderiza os itens de navegação principais', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /cambistas/i })).toBeInTheDocument()
  })

  it('"Sair" abre o mesmo modal único de logout, sem chamar a API diretamente', async () => {
    const user = userEvent.setup()
    renderSidebar()

    await user.click(screen.getByRole('button', { name: 'Sair' }))

    expect(mockedLogout).not.toHaveBeenCalled()
    expect(mockedLogoutAll).not.toHaveBeenCalled()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair deste dispositivo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair de todos os dispositivos' })).toBeInTheDocument()
  })
})
