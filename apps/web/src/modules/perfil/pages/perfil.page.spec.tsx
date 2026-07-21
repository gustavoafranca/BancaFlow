import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { CurrentUserProvider } from '@/shared/session/current-user-provider'
import { PerfilPage } from './perfil.page'
import { getCurrentUser, updateOwnProfile, listSessions } from '@/shared/api/auth.client'

jest.mock('@/shared/api/auth.client', () => ({
  getCurrentUser: jest.fn(),
  updateOwnProfile: jest.fn(),
  listSessions: jest.fn(),
  revokeSession: jest.fn(),
  changePassword: jest.fn(),
}))

const mockedGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>
const mockedUpdateOwnProfile = updateOwnProfile as jest.MockedFunction<typeof updateOwnProfile>
const mockedListSessions = listSessions as jest.MockedFunction<typeof listSessions>

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
      <CurrentUserProvider>
        <PerfilPage />
      </CurrentUserProvider>
    </ThemeProvider>,
  )
}

describe('PerfilPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('exibe nome, username, e-mail, papel e banca REAIS vindos de GET /api/auth/me (sem identidade hardcoded)', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    renderPage()

    expect(await screen.findByDisplayValue('Owner Silva')).toBeInTheDocument()
    expect(screen.getAllByText('Proprietário').length).toBeGreaterThan(0)
    expect(screen.getByText(/@owner/)).toBeInTheDocument()
    expect(screen.getByDisplayValue('owner@banca.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Banca Real')).toBeInTheDocument()

    expect(screen.queryByText('João Silva')).not.toBeInTheDocument()
    expect(screen.queryByText('Administrador')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('Banca São Jorge')).not.toBeInTheDocument()
    expect(screen.queryByText('Nível 5')).not.toBeInTheDocument()
  })

  it('não exibe "Membro desde", "Último acesso" nem estatísticas fixas fabricadas', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    renderPage()
    await screen.findByDisplayValue('Owner Silva')

    expect(screen.queryByText(/Membro desde/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Último acesso/)).not.toBeInTheDocument()
    expect(screen.queryByText('Ações hoje')).not.toBeInTheDocument()
    expect(screen.queryByText('Sessões ativas')).not.toBeInTheDocument()
    expect(screen.queryByText('Dias online')).not.toBeInTheDocument()
  })

  it('não exibe a aba Atividade nem o toggle de 2FA fabricado; a aba Segurança navega para conteúdo real', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    mockedListSessions.mockResolvedValue({ status: 'success', data: [] })
    const user = userEvent.setup()
    renderPage()
    await screen.findByDisplayValue('Owner Silva')

    expect(screen.queryByRole('button', { name: /Atividade/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Autenticação em Dois Fatores')).not.toBeInTheDocument()
    expect(screen.queryByText('Histórico de Acesso')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Segurança/ }))
    expect(await screen.findByText('Sessões Ativas')).toBeInTheDocument()
    expect(screen.getByText('Alterar Senha')).toBeInTheDocument()
    expect(screen.queryByText('Autenticação em Dois Fatores')).not.toBeInTheDocument()
    expect(screen.queryByText('Histórico de Acesso')).not.toBeInTheDocument()
  })

  it('a aba Segurança renderiza sessões reais vindas de listSessions(), sem dado de amostra', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    mockedListSessions.mockResolvedValue({
      status: 'success',
      data: [
        {
          sessionId: 'current-session',
          createdAt: '2026-07-19T10:00:00.000Z',
          expiresAt: '2026-07-26T10:00:00.000Z',
          isCurrent: true,
          deviceInfo: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0',
        },
        {
          sessionId: 'other-session',
          createdAt: '2026-07-18T09:00:00.000Z',
          expiresAt: '2026-07-25T09:00:00.000Z',
          isCurrent: false,
        },
      ],
    })
    const user = userEvent.setup()
    renderPage()
    await screen.findByDisplayValue('Owner Silva')

    await user.click(screen.getByRole('tab', { name: /Segurança/ }))
    expect(await screen.findByText('Sessão atual')).toBeInTheDocument()
    expect(screen.getByText('Chrome no Windows')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Encerrar sessão' })).toBeInTheDocument()
    // Nenhum dado de amostra do antigo `perfil.sample.ts` (ex.: "iPhone 14 — Safari 17").
    expect(screen.queryByText(/iPhone 14/)).not.toBeInTheDocument()
  })

  it('não mostra dados fabricados enquanto GET /api/auth/me ainda não resolveu', () => {
    mockedGetCurrentUser.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('Banca São Jorge')).not.toBeInTheDocument()
  })

  it('mostra um indicador de carregamento explícito na subseção Informações enquanto o perfil carrega', () => {
    mockedGetCurrentUser.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent(/carregando/i)
  })

  it('mostra erro explícito com "Tentar novamente" quando o carregamento inicial falha, e recupera ao clicar', async () => {
    mockedGetCurrentUser
      .mockResolvedValueOnce({ status: 'error' })
      .mockResolvedValueOnce({ status: 'success', data: CONTEXT })
    const user = userEvent.setup()
    renderPage()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar seu perfil/i)

    await user.click(screen.getByRole('button', { name: /Tentar novamente/ }))
    expect(await screen.findByDisplayValue('Owner Silva')).toBeInTheDocument()
  })

  it('modo de edição habilita os campos de nome/e-mail; Username/Banca continuam somente leitura', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    const user = userEvent.setup()
    renderPage()
    await screen.findByDisplayValue('Owner Silva')

    await user.click(screen.getByRole('button', { name: /Editar Perfil/ }))
    expect(screen.getByDisplayValue('Owner Silva')).not.toHaveAttribute('readonly')
    expect(screen.getByDisplayValue('owner@banca.com')).not.toHaveAttribute('readonly')
    expect(screen.getByDisplayValue('owner')).toHaveAttribute('readonly')
    expect(screen.getByDisplayValue('Banca Real')).toHaveAttribute('readonly')
  })

  it('não exibe um campo de telefone fabricado na subseção Informações', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    renderPage()
    await screen.findByDisplayValue('Owner Silva')
    expect(screen.queryByDisplayValue('(11) 99999-0000')).not.toBeInTheDocument()
    expect(screen.queryByText('Telefone')).not.toBeInTheDocument()
  })

  it('salva com sucesso: chama updateOwnProfile com o version atual, refaz GET /api/auth/me e volta ao modo leitura', async () => {
    mockedGetCurrentUser
      .mockResolvedValueOnce({ status: 'success', data: CONTEXT })
      // O backend já persistiu a mudança quando o Web refaz o GET — o Web nunca fabrica esse estado localmente.
      .mockResolvedValueOnce({ status: 'success', data: { ...CONTEXT, name: 'Novo Nome Silva', version: 2 } })
    mockedUpdateOwnProfile.mockResolvedValue({ status: 'success' })
    const user = userEvent.setup()
    renderPage()
    await screen.findByDisplayValue('Owner Silva')

    await user.click(screen.getByRole('button', { name: /Editar Perfil/ }))
    const nameInput = screen.getByDisplayValue('Owner Silva')
    await user.clear(nameInput)
    await user.type(nameInput, 'Novo Nome Silva')

    await user.click(screen.getByRole('button', { name: /Salvar Alterações/ }))

    await waitFor(() =>
      expect(mockedUpdateOwnProfile).toHaveBeenCalledWith({
        name: 'Novo Nome Silva',
        email: 'owner@banca.com',
        version: 1,
      }),
    )
    // Após sucesso, refaz GET /api/auth/me (refreshCurrentUser) — nunca fabrica o estado localmente.
    await waitFor(() => expect(mockedGetCurrentUser).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByDisplayValue('Novo Nome Silva')).toHaveAttribute('readonly'))
    expect(screen.getByRole('status')).toHaveTextContent(/atualizado com sucesso/i)
  })

  it('PATCH funciona mas o refresh seguinte falha: NÃO encerra a edição, bloqueia reenvio e permite "Tentar novamente"', async () => {
    mockedGetCurrentUser
      .mockResolvedValueOnce({ status: 'success', data: CONTEXT })
      // GET pós-PATCH falha (rede/401/500) — o Web não pode considerar a edição concluída sem o estado autoritativo.
      .mockResolvedValueOnce({ status: 'error' })
      .mockResolvedValueOnce({ status: 'success', data: { ...CONTEXT, name: 'Novo Nome Silva', version: 2 } })
    mockedUpdateOwnProfile.mockResolvedValue({ status: 'success' })
    const user = userEvent.setup()
    renderPage()
    await screen.findByDisplayValue('Owner Silva')

    await user.click(screen.getByRole('button', { name: /Editar Perfil/ }))
    const nameInput = screen.getByDisplayValue('Owner Silva')
    await user.clear(nameInput)
    await user.type(nameInput, 'Novo Nome Silva')
    await user.click(screen.getByRole('button', { name: /Salvar Alterações/ }))

    // Continua em modo de edição (não fabrica a conclusão da edição).
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/salvas, mas não foi possível recarregar/i)
    expect(screen.getByDisplayValue('Novo Nome Silva')).not.toHaveAttribute('readonly')

    // O botão principal vira "Tentar novamente" — nunca reenvia o PATCH com uma version possivelmente desatualizada.
    expect(mockedUpdateOwnProfile).toHaveBeenCalledTimes(1)
    const retryButtons = screen.getAllByRole('button', { name: /Tentar novamente/ })
    await user.click(retryButtons[0]!)

    await waitFor(() => expect(mockedGetCurrentUser).toHaveBeenCalledTimes(3))
    // updateOwnProfile nunca foi chamado de novo — só o GET foi reexecutado.
    expect(mockedUpdateOwnProfile).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByDisplayValue('Novo Nome Silva')).toHaveAttribute('readonly'))
  })

  it('move o foco para o alerta quando um erro/conflito aparece (acessibilidade)', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    mockedUpdateOwnProfile.mockResolvedValue({ status: 'conflict' })
    const user = userEvent.setup()
    renderPage()
    await screen.findByDisplayValue('Owner Silva')

    await user.click(screen.getByRole('button', { name: /Editar Perfil/ }))
    await user.click(screen.getByRole('button', { name: /Salvar Alterações/ }))

    const alert = await screen.findByRole('alert')
    await waitFor(() => expect(alert).toHaveFocus())
  })

  it('nome inválido exibe erro de validação e não chama updateOwnProfile', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    const user = userEvent.setup()
    renderPage()
    await screen.findByDisplayValue('Owner Silva')

    await user.click(screen.getByRole('button', { name: /Editar Perfil/ }))
    const nameInput = screen.getByDisplayValue('Owner Silva')
    await user.clear(nameInput)
    await user.type(nameInput, 'X')

    await user.click(screen.getByRole('button', { name: /Salvar Alterações/ }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(mockedUpdateOwnProfile).not.toHaveBeenCalled()
  })

  it('conflito de versão (409): exibe mensagem, refaz GET /api/auth/me e mantém o modo de edição para nova tentativa', async () => {
    mockedGetCurrentUser.mockResolvedValue({ status: 'success', data: CONTEXT })
    mockedUpdateOwnProfile.mockResolvedValue({ status: 'conflict' })
    const user = userEvent.setup()
    renderPage()
    await screen.findByDisplayValue('Owner Silva')

    await user.click(screen.getByRole('button', { name: /Editar Perfil/ }))
    const nameInput = screen.getByDisplayValue('Owner Silva')
    await user.clear(nameInput)
    await user.type(nameInput, 'Nome Concorrente')

    await user.click(screen.getByRole('button', { name: /Salvar Alterações/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/atualizados por outra sessão/i)
    await waitFor(() => expect(mockedGetCurrentUser).toHaveBeenCalledTimes(2))
    // Continua em modo de edição para a nova tentativa.
    expect(screen.getByRole('button', { name: /Salvar Alterações/ })).toBeInTheDocument()
  })
})
