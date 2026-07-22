import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { UsuariosSection } from './usuarios-section'
import {
  listUserAccounts,
  getUserAccount,
  createUserAccount,
  updateUserAccount,
  changeAccountRole,
  toggleAccountStatus,
  resetAccountPassword,
  listAccountSessions,
  revokeAccountSession,
} from '../data/accounts.client'

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

const mockedList = listUserAccounts as jest.MockedFunction<typeof listUserAccounts>
const mockedGet = getUserAccount as jest.MockedFunction<typeof getUserAccount>
const mockedCreate = createUserAccount as jest.MockedFunction<typeof createUserAccount>
const mockedUpdate = updateUserAccount as jest.MockedFunction<typeof updateUserAccount>
const mockedChangeRole = changeAccountRole as jest.MockedFunction<typeof changeAccountRole>
const mockedToggleStatus = toggleAccountStatus as jest.MockedFunction<typeof toggleAccountStatus>
const mockedResetPassword = resetAccountPassword as jest.MockedFunction<typeof resetAccountPassword>
const mockedListSessions = listAccountSessions as jest.MockedFunction<typeof listAccountSessions>
const mockedRevokeSession = revokeAccountSession as jest.MockedFunction<typeof revokeAccountSession>

const ADMIN_ROW = {
  userId: 'admin-1',
  username: 'admin1',
  name: 'Admin One Silva',
  email: null,
  role: 'ADMIN' as const,
  status: 'ACTIVE' as const,
  createdAt: '2026-07-01T10:00:00.000Z',
}
const USER_ROW = {
  userId: 'user-1',
  username: 'user1',
  name: 'User One Silva',
  email: 'user1@example.com',
  role: 'USER' as const,
  status: 'BLOCKED' as const,
  createdAt: '2026-07-02T10:00:00.000Z',
}

function page(data: (typeof ADMIN_ROW | typeof USER_ROW)[], total = data.length) {
  return { status: 'success' as const, data: { data, meta: { page: 1, pageSize: 20, total, totalPages: 1 } } }
}

function detailOf(row: typeof ADMIN_ROW | typeof USER_ROW, extra: { mustChangePassword?: boolean; version?: number } = {}) {
  return {
    status: 'success' as const,
    data: { ...row, mustChangePassword: extra.mustChangePassword ?? false, version: extra.version ?? 1 },
  }
}

function renderSection() {
  return render(
    <ThemeProvider>
      <UsuariosSection />
    </ThemeProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedListSessions.mockResolvedValue({ status: 'success', data: [] })
})

describe('UsuariosSection — listagem', () => {
  it('mostra indicador de carregamento enquanto a listagem está pendente', () => {
    mockedList.mockReturnValue(new Promise(() => {}))
    renderSection()
    expect(screen.getByRole('status')).toHaveTextContent(/carregando usuários/i)
  })

  it('lista as contas reais retornadas por listUserAccounts()', async () => {
    mockedList.mockResolvedValue(page([ADMIN_ROW, USER_ROW]))
    renderSection()

    expect(await screen.findByText('Admin One Silva')).toBeInTheDocument()
    expect(screen.getByText('User One Silva')).toBeInTheDocument()
    expect(screen.getByText('admin1')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('Bloqueado')).toBeInTheDocument()
  })

  it('mostra estado vazio quando não há contas', async () => {
    mockedList.mockResolvedValue(page([]))
    renderSection()
    expect(await screen.findByText(/nenhuma conta encontrada/i)).toBeInTheDocument()
  })

  it('estado sem permissão (403) é distinto do estado de erro técnico', async () => {
    mockedList.mockResolvedValue({ status: 'forbidden' })
    renderSection()
    expect(await screen.findByRole('alert')).toHaveTextContent(/não tem permissão/i)
  })

  it('erro ao carregar mostra "Tentar novamente" que recarrega', async () => {
    mockedList.mockResolvedValueOnce({ status: 'error' }).mockResolvedValueOnce(page([ADMIN_ROW]))
    const user = userEvent.setup()
    renderSection()

    expect(await screen.findByText(/não foi possível carregar os usuários/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }))
    expect(await screen.findByText('Admin One Silva')).toBeInTheDocument()
  })

  it('busca repassa o termo digitado para listUserAccounts()', async () => {
    mockedList.mockResolvedValue(page([ADMIN_ROW, USER_ROW]))
    const user = userEvent.setup()
    renderSection()
    await screen.findByText('Admin One Silva')

    await user.type(screen.getByRole('textbox', { name: /buscar por nome ou usuário/i }), 'admin1')
    await waitFor(() =>
      expect(mockedList).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'admin1' })),
    )
  })

  it('filtro por papel (Select compartilhado) repassa o valor para listUserAccounts()', async () => {
    mockedList.mockResolvedValue(page([ADMIN_ROW, USER_ROW]))
    const user = userEvent.setup()
    renderSection()
    await screen.findByText('Admin One Silva')

    await user.click(screen.getByRole('combobox', { name: /filtrar por papel/i }))
    await user.click(await screen.findByRole('option', { name: 'Administrador' }))
    await waitFor(() => expect(mockedList).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'ADMIN' })))
  })
})

describe('UsuariosSection — linha clicável/teclável abre o drawer de detalhe', () => {
  it('clique na linha abre o drawer com o detalhe da conta', async () => {
    mockedList.mockResolvedValue(page([USER_ROW]))
    mockedGet.mockResolvedValue(detailOf(USER_ROW, { version: 3 }))
    const user = userEvent.setup()
    renderSection()
    const row = await screen.findByRole('row', { name: /abrir detalhes de user one silva/i })

    await user.click(row)

    expect(mockedGet).toHaveBeenCalledWith('user-1')
    const drawer = await screen.findByRole('dialog')
    expect(within(drawer).getByRole('heading', { name: 'User One Silva' })).toBeInTheDocument()
    expect(row).toHaveAttribute('aria-current', 'true')
  })

  it('Enter/Espaço no foco da linha também abre o drawer', async () => {
    mockedList.mockResolvedValue(page([ADMIN_ROW]))
    mockedGet.mockResolvedValue(detailOf(ADMIN_ROW))
    const user = userEvent.setup()
    renderSection()
    const row = await screen.findByRole('row', { name: /abrir detalhes de admin one silva/i })

    row.focus()
    await user.keyboard('{Enter}')

    expect(mockedGet).toHaveBeenCalledWith('admin-1')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  // Fechar via Escape é comportamento do Drawer compartilhado, coberto uma
  // única vez em `shared/components/ui/drawer.spec.tsx` — não duplicado aqui
  // (`web-frontend-testing`: "Consuming pages do not duplicate drawer
  // behavior coverage").

  it('abre em modo visualização (campos somente leitura, badge "Visualização") e permite entrar em edição', async () => {
    mockedList.mockResolvedValue(page([USER_ROW]))
    mockedGet.mockResolvedValue(detailOf(USER_ROW, { version: 3 }))
    const user = userEvent.setup()
    renderSection()
    await user.click(await screen.findByRole('row', { name: /abrir detalhes/i }))
    const drawer = await screen.findByRole('dialog')

    expect(within(drawer).getByText('Visualização')).toBeInTheDocument()
    expect(within(drawer).queryByLabelText(/^nome$/i)).not.toBeInTheDocument()
    expect(within(drawer).getAllByText('User One Silva').length).toBeGreaterThanOrEqual(2) // título do drawer + campo Nome
    expect(within(drawer).getByRole('button', { name: /^editar$/i })).toBeInTheDocument()

    await user.click(within(drawer).getByRole('button', { name: /^editar$/i }))
    expect(within(drawer).getByLabelText(/^nome$/i)).toBeInTheDocument()
    expect(within(drawer).queryByText('Visualização')).not.toBeInTheDocument()

    // Cancelar (não "Fechar") descarta a edição e volta para o modo visualização sem fechar o painel.
    const nameInput = within(drawer).getByLabelText(/^nome$/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Nome Alterado')
    expect(within(drawer).queryByRole('button', { name: /^fechar$/i })).not.toBeInTheDocument()
    await user.click(within(drawer).getByRole('button', { name: /^cancelar$/i }))

    expect(within(drawer).getByText('Visualização')).toBeInTheDocument()
    expect(within(drawer).getAllByText('User One Silva').length).toBeGreaterThanOrEqual(2)
  })
})

describe('UsuariosSection — criação em drawer', () => {
  it('cria uma conta usando o Select compartilhado de papel e exibe a senha temporária uma única vez, com ação de copiar', async () => {
    mockedList.mockResolvedValue(page([]))
    mockedCreate.mockResolvedValue({
      status: 'success',
      data: { userId: 'new-1', username: 'novo', role: 'USER', temporaryPassword: 'Corujaformigasapofoguetetigre-47!' },
    })
    const user = userEvent.setup()
    renderSection()
    await screen.findByText(/nenhuma conta encontrada/i)

    await user.click(screen.getByRole('button', { name: /novo usuário/i }))
    const createDrawer = await screen.findByRole('dialog')
    await user.type(within(createDrawer).getByLabelText(/^usuário$/i), 'novo')
    await user.type(within(createDrawer).getByLabelText(/^nome$/i), 'Novo Usuario Silva')
    await user.click(within(createDrawer).getByRole('button', { name: /^salvar$/i }))

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'novo', name: 'Novo Usuario Silva', role: 'USER' }),
      ),
    )
    expect(await screen.findByText('Corujaformigasapofoguetetigre-47!')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copiar/i })).toBeInTheDocument()
    expect(mockedList).toHaveBeenCalledTimes(2)
  })

  it('permite escolher o papel ADMIN via Select compartilhado na criação', async () => {
    mockedList.mockResolvedValue(page([]))
    mockedCreate.mockResolvedValue({
      status: 'success',
      data: { userId: 'new-2', username: 'novoadmin', role: 'ADMIN', temporaryPassword: 'x' },
    })
    const user = userEvent.setup()
    renderSection()
    await screen.findByText(/nenhuma conta encontrada/i)

    await user.click(screen.getByRole('button', { name: /novo usuário/i }))
    const createDrawer = await screen.findByRole('dialog')
    await user.type(within(createDrawer).getByLabelText(/^usuário$/i), 'novoadmin')
    await user.type(within(createDrawer).getByLabelText(/^nome$/i), 'Novo Admin Silva')
    await user.click(within(createDrawer).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Administrador (ADMIN)' }))
    await user.click(within(createDrawer).getByRole('button', { name: /^salvar$/i }))

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ role: 'ADMIN' })))
  })
})

describe('UsuariosSection — detalhe/edição/papel/status/senha/sessões dentro do drawer', () => {
  it('edita dados salvando dentro do próprio drawer de detalhe', async () => {
    mockedList.mockResolvedValue(page([USER_ROW]))
    mockedGet.mockResolvedValue(detailOf(USER_ROW, { version: 3 }))
    mockedUpdate.mockResolvedValue({ status: 'success' })
    const user = userEvent.setup()
    renderSection()
    await user.click(await screen.findByRole('row', { name: /abrir detalhes/i }))
    await user.click(await screen.findByRole('button', { name: /^editar$/i }))

    const nameInput = await screen.findByDisplayValue('User One Silva')
    await user.clear(nameInput)
    await user.type(nameInput, 'User One Souza')
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }))

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ name: 'User One Souza', version: 3 }),
      ),
    )
  })

  it('Papel é seleção (Selection Button Group): escolher Administrador pede confirmação em modal aninhado', async () => {
    mockedList.mockResolvedValue(page([USER_ROW]))
    mockedGet.mockResolvedValue(detailOf(USER_ROW))
    mockedChangeRole.mockResolvedValue({ status: 'success', data: { role: 'ADMIN' } })
    const user = userEvent.setup()
    renderSection()
    await user.click(await screen.findByRole('row', { name: /abrir detalhes/i }))

    const roleGroup = screen.getByRole('radiogroup', { name: 'Papel' })
    expect(within(roleGroup).getByRole('radio', { name: 'Operador' })).toHaveAttribute('data-state', 'checked')
    await user.click(within(roleGroup).getByRole('radio', { name: 'Administrador' }))
    expect(mockedChangeRole).not.toHaveBeenCalled() // seleção só abre confirmação, não muda direto

    const confirmDialog = await screen.findByRole('dialog')
    await user.click(within(confirmDialog).getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(mockedChangeRole).toHaveBeenCalledWith('user-1', 'ADMIN'))
    expect(mockedList).toHaveBeenCalledTimes(2)
  })

  it('Status é seleção (Selection Button Group) com as 3 opções reais do backend; escolher Bloqueado exige confirmação', async () => {
    mockedList.mockResolvedValue(page([ADMIN_ROW]))
    mockedGet.mockResolvedValue(detailOf(ADMIN_ROW))
    mockedToggleStatus.mockResolvedValue({ status: 'success', data: { status: 'BLOCKED' } })
    const user = userEvent.setup()
    renderSection()
    await user.click(await screen.findByRole('row', { name: /abrir detalhes/i }))

    const statusGroup = screen.getByRole('radiogroup', { name: 'Status' })
    expect(within(statusGroup).getByRole('radio', { name: 'Ativo' })).toHaveAttribute('data-state', 'checked')
    expect(within(statusGroup).getByRole('radio', { name: 'Inativo' })).toBeInTheDocument()
    expect(within(statusGroup).getByRole('radio', { name: 'Bloqueado' })).toBeInTheDocument()

    await user.click(within(statusGroup).getByRole('radio', { name: 'Bloqueado' }))
    expect(mockedToggleStatus).not.toHaveBeenCalled()

    const confirmDialog = await screen.findByRole('dialog')
    await user.click(within(confirmDialog).getByRole('button', { name: /confirmar/i }))
    await waitFor(() => expect(mockedToggleStatus).toHaveBeenCalledWith('admin-1', 'block'))
  })

  it('redefinição de senha exibe a senha temporária uma única vez, copiável, e previne duplo clique', async () => {
    mockedList.mockResolvedValue(page([ADMIN_ROW]))
    mockedGet.mockResolvedValue(detailOf(ADMIN_ROW))
    let resolveReset: (value: Awaited<ReturnType<typeof resetAccountPassword>>) => void = () => {}
    mockedResetPassword.mockReturnValue(
      new Promise((resolve) => {
        resolveReset = resolve
      }),
    )
    const user = userEvent.setup()
    renderSection()
    await user.click(await screen.findByRole('row', { name: /abrir detalhes/i }))

    await user.click(screen.getByRole('button', { name: /redefinir senha/i }))
    const dialogs = await screen.findAllByRole('dialog')
    const confirmDialog = dialogs[dialogs.length - 1]!
    const confirmButton = within(confirmDialog).getByRole('button', { name: /confirmar/i })
    await user.click(confirmButton)
    await user.click(confirmButton) // segundo clique enquanto processa: deve ser ignorado

    resolveReset({ status: 'success', data: { temporaryPassword: 'Reset@98765' } })
    expect(await screen.findByText('Reset@98765')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copiar/i })).toBeInTheDocument()
    expect(mockedResetPassword).toHaveBeenCalledTimes(1)
  })

  it('sessões ativas aparecem dentro do drawer e a revogação individual exige confirmação', async () => {
    mockedList.mockResolvedValue(page([ADMIN_ROW]))
    mockedGet.mockResolvedValue(detailOf(ADMIN_ROW))
    mockedListSessions.mockResolvedValue({
      status: 'success',
      data: [
        {
          sessionId: 'sess-1',
          createdAt: '2026-07-19T10:00:00.000Z',
          expiresAt: '2026-07-26T10:00:00.000Z',
          isCurrent: false,
          deviceInfo: 'Chrome/Linux',
        },
      ],
    })
    mockedRevokeSession.mockResolvedValue('success')
    const user = userEvent.setup()
    renderSection()
    await user.click(await screen.findByRole('row', { name: /abrir detalhes/i }))

    expect(await screen.findByText('Chrome/Linux')).toBeInTheDocument()
    const revokeButton = screen.getByRole('button', { name: /encerrar sessão/i })
    expect(revokeButton.className).toContain('bg-destructive')
    await user.click(revokeButton)

    const dialogs = await screen.findAllByRole('dialog')
    const confirmDialog = dialogs[dialogs.length - 1]!
    await user.click(within(confirmDialog).getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(mockedRevokeSession).toHaveBeenCalledWith('admin-1', 'sess-1'))
    expect(mockedListSessions).toHaveBeenCalledTimes(2)
  })
})
