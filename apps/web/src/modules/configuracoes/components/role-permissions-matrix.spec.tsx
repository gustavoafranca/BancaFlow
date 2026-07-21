import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { RolePermissionsMatrix } from './role-permissions-matrix'
import { getRolePermissions, type RolePermissionMatrix } from '../data/access-control.client'

jest.mock('../data/access-control.client', () => ({
  getRolePermissions: jest.fn(),
}))

const mockedGetRolePermissions = getRolePermissions as jest.MockedFunction<typeof getRolePermissions>

const MATRIX: RolePermissionMatrix = {
  capabilities: [
    {
      capability: 'identity',
      label: 'Identidade e conta',
      order: 1,
      permissions: [
        {
          key: 'identity.accounts.toggle-status',
          label: 'Ativar/desativar/bloquear conta',
          description: 'Alterar o status de uma conta de terceiro da mesma Banca',
          order: 1,
          roles: ['OWNER'],
        },
      ],
    },
    {
      capability: 'participants',
      label: 'Cambistas',
      order: 2,
      permissions: [
        {
          key: 'participants.betting-agents.create',
          label: 'Cadastrar Cambista',
          description: 'Criar um novo Cambista na própria Banca',
          order: 1,
          roles: ['OWNER', 'ADMIN'],
        },
      ],
    },
  ],
}

function renderMatrix() {
  return render(
    <ThemeProvider>
      <RolePermissionsMatrix />
    </ThemeProvider>,
  )
}

describe('RolePermissionsMatrix', () => {
  afterEach(() => jest.clearAllMocks())

  it('mostra loading enquanto a matriz carrega', () => {
    mockedGetRolePermissions.mockReturnValue(new Promise(() => {}))
    renderMatrix()
    expect(screen.getByRole('status')).toHaveTextContent(/carregando/i)
  })

  it('mostra o estado forbidden quando o backend nega (USER)', async () => {
    mockedGetRolePermissions.mockResolvedValue({ status: 'forbidden' })
    renderMatrix()
    expect(await screen.findByText(/apenas o proprietário/i)).toBeInTheDocument()
  })

  it('mostra erro com ação de tentar novamente, que recarrega a matriz', async () => {
    const user = userEvent.setup()
    mockedGetRolePermissions.mockResolvedValueOnce({ status: 'error' }).mockResolvedValueOnce({ status: 'success', data: MATRIX })
    renderMatrix()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /tentar novamente/i }))

    expect(await screen.findByText('Ativar/desativar/bloquear conta')).toBeInTheDocument()
    expect(mockedGetRolePermissions).toHaveBeenCalledTimes(2)
  })

  it('mostra catálogo vazio quando não há capabilities', async () => {
    mockedGetRolePermissions.mockResolvedValue({ status: 'success', data: { capabilities: [] } })
    renderMatrix()
    expect(await screen.findByText(/nenhuma permissão cadastrada/i)).toBeInTheDocument()
  })

  it('agrupa por capability em grupos recolhíveis, com apenas o primeiro aberto', async () => {
    mockedGetRolePermissions.mockResolvedValue({ status: 'success', data: MATRIX })
    renderMatrix()

    const identityTrigger = await screen.findByRole('button', { name: /identidade e conta/i })
    const participantsTrigger = screen.getByRole('button', { name: /cambistas/i })

    expect(identityTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(participantsTrigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Ativar/desativar/bloquear conta')).toBeVisible()
    expect(screen.queryByText('Cadastrar Cambista')).not.toBeInTheDocument()
  })

  it('expande outro grupo ao clicar/teclar em seu cabeçalho', async () => {
    const user = userEvent.setup()
    mockedGetRolePermissions.mockResolvedValue({ status: 'success', data: MATRIX })
    renderMatrix()
    const participantsTrigger = await screen.findByRole('button', { name: /cambistas/i })

    participantsTrigger.focus()
    await user.keyboard('{Enter}')

    expect(participantsTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByText('Cadastrar Cambista')).toBeInTheDocument()
  })

  it('exibe label/description em português, nunca a PermissionKey técnica crua', async () => {
    mockedGetRolePermissions.mockResolvedValue({ status: 'success', data: MATRIX })
    renderMatrix()

    expect(await screen.findByText('Ativar/desativar/bloquear conta')).toBeInTheDocument()
    expect(screen.getByText('Alterar o status de uma conta de terceiro da mesma Banca')).toBeInTheDocument()
    expect(screen.queryByText('identity.accounts.toggle-status')).not.toBeInTheDocument()
  })

  it('mostra a legenda permitido/não autorizado e a explicação de papéis fixos', async () => {
    mockedGetRolePermissions.mockResolvedValue({ status: 'success', data: MATRIX })
    renderMatrix()
    await screen.findByText('Ativar/desativar/bloquear conta')

    expect(screen.getByText('Permitido')).toBeInTheDocument()
    expect(screen.getByText('Não autorizado')).toBeInTheDocument()
    expect(screen.getByText(/papéis fixos/i)).toBeInTheDocument()
  })

  it('marca OWNER como autorizado e ADMIN/USER como não autorizado para uma permissão exclusiva de OWNER', async () => {
    mockedGetRolePermissions.mockResolvedValue({ status: 'success', data: MATRIX })
    renderMatrix()
    await screen.findByText('Ativar/desativar/bloquear conta')

    expect(screen.getByLabelText('Proprietário autorizado')).toBeInTheDocument()
    expect(screen.getByLabelText('Administrador não autorizado')).toBeInTheDocument()
    expect(screen.getByLabelText('Operador não autorizado')).toBeInTheDocument()
  })
})
