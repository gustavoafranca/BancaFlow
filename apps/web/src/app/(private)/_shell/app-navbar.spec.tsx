import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppNavbar } from './app-navbar'
import { LogoutModalProvider } from './logout-modal-provider'
import { LogoutModal } from './logout-modal'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { CurrentUserProvider } from '@/shared/session/current-user-provider'
import { PermissionsProvider } from '@/shared/session/permissions-provider'
import { getCurrentUser, logout, logoutAll } from '@/shared/api/auth.client'
import { getMyPermissions } from '@/shared/api/permissions.client'

jest.mock('@/shared/api/auth.client', () => ({
  getCurrentUser: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
}))

jest.mock('@/shared/api/permissions.client', () => ({
  getMyPermissions: jest.fn(),
}))

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element -- mock de next/image em teste, não código de produção.
    <img {...props} alt={props.alt} />
  ),
}))

// `next/link` sem um `AppRouterContext` real não dispara `onNavigate`
// (cai para navegação nativa de âncora, que o jsdom não implementa) — o mock
// reproduz o comportamento real de um `<a>`: clique E ativação nativa por
// teclado (`Enter` num elemento focado dispara `click` no próprio jsdom/
// browser, sem handler de teclado explícito) chamam `onNavigate`, provando
// que o dropdown fecha na mesma interação em ambos os casos.
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    onNavigate,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { onNavigate?: () => void }) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault()
        onNavigate?.()
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}))

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>
const mockedLogout = logout as jest.MockedFunction<typeof logout>
const mockedLogoutAll = logoutAll as jest.MockedFunction<typeof logoutAll>
const mockedGetMyPermissions = getMyPermissions as jest.MockedFunction<typeof getMyPermissions>

const CONTEXT = {
  userId: 'user-1',
  username: 'owner',
  name: 'Owner Silva',
  email: 'owner@banca.com',
  role: 'OWNER' as const,
  version: 1,
  banca: { bancaId: 'banca-1', codigoBanca: 'farizeu', name: 'Banca São Jorge' },
}

function renderNavbar() {
  return render(
    <ThemeProvider>
      <CurrentUserProvider>
        <PermissionsProvider>
          <LogoutModalProvider>
            <AppNavbar />
            <LogoutModal />
          </LogoutModalProvider>
        </PermissionsProvider>
      </CurrentUserProvider>
    </ThemeProvider>,
  )
}

describe('AppNavbar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedLogout.mockResolvedValue(true)
    mockedLogoutAll.mockResolvedValue(true)
    // Por padrão, o OWNER de `CONTEXT` possui a permissão de administração de
    // contas — testes que precisam do cenário sem a permissão sobrescrevem.
    mockedGetMyPermissions.mockResolvedValue({
      status: 'success',
      data: { role: 'OWNER', permissions: [{ key: 'identity.accounts.list', label: 'Listar contas' }] },
    })
  })

  it('exibe nome, papel e banca REAIS no cabeçalho, e e-mail no dropdown (sem identidade hardcoded)', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    const user = userEvent.setup()
    renderNavbar()

    expect(await screen.findByText('Owner Silva')).toBeInTheDocument()
    expect(screen.getByText('Proprietário')).toBeInTheDocument()
    expect(screen.getByText('Banca São Jorge')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Owner Silva/ }))
    expect(screen.getByText('owner@banca.com')).toBeInTheDocument()

    // A identidade antiga fabricada não aparece mais em lugar nenhum.
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument()
    expect(screen.queryByText(/bancasaojorge\.com/)).not.toBeInTheDocument()
  })

  it('não mostra nome/banca fabricados enquanto GET /api/auth/me ainda não resolveu', () => {
    mockedGetCurrentUser.mockReturnValue(new Promise(() => {})) // nunca resolve
    mockedGetMyPermissions.mockReturnValue(new Promise(() => {})) // nunca resolve
    renderNavbar()

    expect(screen.queryByText('João Silva')).not.toBeInTheDocument()
    expect(screen.queryByText('Banca São Jorge')).not.toBeInTheDocument()
  })

  it('há uma única ação "Sair" no dropdown, que abre o modal único de logout (sem chamar a API diretamente)', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    const user = userEvent.setup()
    renderNavbar()
    await screen.findByText('Owner Silva')

    await user.click(screen.getByRole('button', { name: /Owner Silva/ }))
    expect(screen.getAllByText('Sair')).toHaveLength(1)
    expect(screen.queryByText('Sair de todos os dispositivos')).not.toBeInTheDocument()

    await user.click(screen.getByText('Sair'))

    expect(mockedLogout).not.toHaveBeenCalled()
    expect(mockedLogoutAll).not.toHaveBeenCalled()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('"Meu Perfil" navega para /perfil e fecha o dropdown ao clicar', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    const user = userEvent.setup()
    renderNavbar()
    await screen.findByText('Owner Silva')

    await user.click(screen.getByRole('button', { name: /Owner Silva/ }))
    const profileLink = screen.getByRole('link', { name: /Meu Perfil/ })
    expect(profileLink).toHaveAttribute('href', '/perfil')

    await user.click(profileLink)
    expect(screen.queryByText('owner@banca.com')).not.toBeInTheDocument()
  })

  it('"Meu Perfil" é navegável por teclado: foco + Enter aciona o link e fecha o dropdown', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    const user = userEvent.setup()
    renderNavbar()
    await screen.findByText('Owner Silva')

    await user.click(screen.getByRole('button', { name: /Owner Silva/ }))
    const profileLink = screen.getByRole('link', { name: /Meu Perfil/ })
    profileLink.focus()
    expect(profileLink).toHaveFocus()

    // Envia Enter de verdade (não chama `onNavigate` nem nenhuma função
    // interna diretamente) — `userEvent.keyboard` reproduz a ativação nativa
    // de um `<a>` focado, disparando o mesmo evento de clique que o mouse.
    await user.keyboard('{Enter}')

    // Mesma prova usada no teste de clique por mouse: o dropdown fechou na
    // mesma interação (e-mail do cabeçalho do dropdown não está mais visível).
    expect(screen.queryByText('owner@banca.com')).not.toBeInTheDocument()
  })

  it('"Configurações" é um link navegável para quem tem a permissão de administração de contas', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    const user = userEvent.setup()
    renderNavbar()
    await screen.findByText('Owner Silva')

    await user.click(screen.getByRole('button', { name: /Owner Silva/ }))
    const configLink = await screen.findByRole('link', { name: /Configurações/ })
    expect(configLink).toHaveAttribute('href', '/configuracoes')

    await user.click(configLink)
    expect(screen.queryByText('owner@banca.com')).not.toBeInTheDocument()
  })

  it('"Configurações" fica ausente do menu (não apenas desabilitado) para quem não tem a permissão', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    mockedGetMyPermissions.mockResolvedValue({
      status: 'success',
      data: { role: 'ADMIN', permissions: [] },
    })
    const user = userEvent.setup()
    renderNavbar()
    await screen.findByText('Owner Silva')

    await user.click(screen.getByRole('button', { name: /Owner Silva/ }))
    expect(screen.queryByText('Configurações')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Configurações/ })).not.toBeInTheDocument()
  })

  it('alterna o tema via a primitive ThemeToggle compartilhada', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    const user = userEvent.setup()
    renderNavbar()

    const toggle = screen.getByRole('button', { name: 'Alternar tema' })
    await user.click(toggle)
    // Não lança e o botão continua presente após alternar (dark<->light).
    expect(screen.getByRole('button', { name: 'Alternar tema' })).toBeInTheDocument()
  })
})
