import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { CurrentUserProvider } from '@/shared/session/current-user-provider'
import { PermissionsProvider } from '@/shared/session/permissions-provider'
import { ConfiguracoesLayout } from './configuracoes-layout'
import { UsuariosPage } from './usuarios.page'
import { getCurrentUser } from '@/shared/api/auth.client'
import { getMyPermissions } from '@/shared/api/permissions.client'
import { listUserAccounts } from '../data/accounts.client'

jest.mock('@/shared/api/auth.client', () => ({
  getCurrentUser: jest.fn(),
  updateOwnProfile: jest.fn(),
  listSessions: jest.fn(),
  revokeSession: jest.fn(),
  changePassword: jest.fn(),
}))

jest.mock('@/shared/api/permissions.client', () => ({
  getMyPermissions: jest.fn(),
}))

jest.mock('../data/accounts.client', () => ({
  listUserAccounts: jest.fn(),
  getUserAccount: jest.fn(),
  createUserAccount: jest.fn(),
  updateUserAccount: jest.fn(),
  changeAccountRole: jest.fn(),
  toggleAccountStatus: jest.fn(),
  resetAccountPassword: jest.fn(),
  listAccountSessions: jest.fn(),
  revokeAccountSession: jest.fn(),
}))

let mockPathname = '/configuracoes/usuarios'
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>
const mockedGetMyPermissions = getMyPermissions as jest.MockedFunction<typeof getMyPermissions>
const mockedListUserAccounts = listUserAccounts as jest.MockedFunction<typeof listUserAccounts>

const OWNER_CONTEXT = {
  userId: 'user-1',
  username: 'owner',
  name: 'Owner Silva',
  email: 'owner@banca.com',
  role: 'OWNER' as const,
  version: 1,
  banca: { bancaId: 'banca-1', codigoBanca: 'farizeu', name: 'Banca Real' },
}
const ADMIN_CONTEXT = { ...OWNER_CONTEXT, username: 'admin', name: 'Admin Silva', role: 'ADMIN' as const }

const OWNER_PERMISSIONS = {
  status: 'success' as const,
  data: {
    role: 'OWNER' as const,
    permissions: [
      { key: 'identity.accounts.list', label: 'Listar contas' },
      { key: 'access-control.role-permissions.read', label: 'Consultar matriz de permissões' },
    ],
  },
}

const NO_ACCOUNT_ADMIN_PERMISSIONS = {
  status: 'success' as const,
  data: { role: 'ADMIN' as const, permissions: [] },
}

const EMPTY_ACCOUNTS_PAGE = {
  status: 'success' as const,
  data: { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } },
}

function renderLayout(children: React.ReactNode) {
  return render(
    <ThemeProvider>
      <CurrentUserProvider>
        <PermissionsProvider>
          <ConfiguracoesLayout>{children}</ConfiguracoesLayout>
        </PermissionsProvider>
      </CurrentUserProvider>
    </ThemeProvider>,
  )
}

describe('ConfiguracoesLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPathname = '/configuracoes/usuarios'
    mockedListUserAccounts.mockResolvedValue(EMPTY_ACCOUNTS_PAGE)
  })

  it('OWNER vê a sidebar (Usuários e Perfis de acesso) e o conteúdo da sub-rota', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: OWNER_CONTEXT })
    mockedGetMyPermissions.mockResolvedValue(OWNER_PERMISSIONS)
    renderLayout(<UsuariosPage />)

    expect(await screen.findByRole('link', { name: 'Usuários' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Perfis de acesso' })).toBeInTheDocument()
    expect(screen.getByText('Usuários', { selector: 'h1' })).toBeInTheDocument()
  })

  it('destaca o item da sidebar correspondente à rota atual', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: OWNER_CONTEXT })
    mockedGetMyPermissions.mockResolvedValue(OWNER_PERMISSIONS)
    mockPathname = '/configuracoes/perfis'
    renderLayout(<div>conteúdo</div>)

    expect(await screen.findByRole('link', { name: 'Perfis de acesso' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Usuários' })).not.toHaveAttribute('aria-current')
  })

  it('ADMIN sem a permissão vê o estado "sem permissão", sem sidebar nem conteúdo da rota', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: ADMIN_CONTEXT })
    mockedGetMyPermissions.mockResolvedValue(NO_ACCOUNT_ADMIN_PERMISSIONS)
    renderLayout(<div>conteúdo protegido</div>)

    expect(await screen.findByText(/não tem permissão para acessar Configurações/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument()
    expect(screen.queryByText('conteúdo protegido')).not.toBeInTheDocument()
    expect(mockedListUserAccounts).not.toHaveBeenCalled()
  })

  it('Turnos, Configuração do Jogo, Segurança e Auditoria não aparecem na sidebar (capability inexistente)', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: OWNER_CONTEXT })
    mockedGetMyPermissions.mockResolvedValue(OWNER_PERMISSIONS)
    renderLayout(<div />)

    await screen.findByRole('link', { name: 'Usuários' })
    expect(screen.queryByText(/turnos/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/configuração do jogo/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/auditoria/i)).not.toBeInTheDocument()
  })
})
