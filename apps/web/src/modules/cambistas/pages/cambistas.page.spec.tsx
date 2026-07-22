import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { CambistasPage } from './cambistas.page'
import { list, getById, create, update, setStatus } from '../data/betting-agent.client'
import type { BettingAgentDetail, BettingAgentListItem, PaginatedResult } from '../data/betting-agent.client'
import { useHasPermission } from '@/shared/session/use-permissions'

jest.mock('../data/betting-agent.client', () => ({
  list: jest.fn(),
  getById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  setStatus: jest.fn(),
}))

jest.mock('@/shared/session/use-permissions', () => ({
  useHasPermission: jest.fn(),
}))

const mockedList = list as jest.MockedFunction<typeof list>
const mockedGet = getById as jest.MockedFunction<typeof getById>
const mockedCreate = create as jest.MockedFunction<typeof create>
const mockedUpdate = update as jest.MockedFunction<typeof update>
const mockedSetStatus = setStatus as jest.MockedFunction<typeof setStatus>
const mockedUseHasPermission = useHasPermission as jest.MockedFunction<typeof useHasPermission>

function page(data: BettingAgentListItem[], total = data.length): PaginatedResult<BettingAgentListItem> {
  return { data, meta: { page: 1, pageSize: 20, total, totalPages: Math.max(1, Math.ceil(total / 20)) } }
}

const AGENT: BettingAgentListItem = {
  id: 'ag-1',
  code: '001',
  status: 'ACTIVE',
  name: 'Carlos Mendes',
  nickname: 'Carlão',
  createdAt: '2026-07-01T10:00:00.000Z',
}

const AGENT_DETAIL: BettingAgentDetail = {
  id: 'ag-1',
  code: '001',
  status: 'ACTIVE',
  party: {
    id: 'p-1',
    name: 'Carlos Mendes',
    nickname: 'Carlão',
    contacts: [{ phone: '11900000001', label: 'Celular' }],
    address: { street: 'Rua A', number: '10', neighborhood: 'Centro', city: 'São Paulo', effectiveFrom: '2026-07-01T10:00:00.000Z', effectiveTo: null },
  },
  policy: {
    type: 'PERCENTAGE_ON_SALES',
    percentage: 10,
    weeklyFixedAmountCents: null,
    effectiveFrom: '2026-07-01T10:00:00.000Z',
    effectiveTo: null,
  },
  createdAt: '2026-07-01T10:00:00.000Z',
}

function renderPage() {
  return render(
    <ThemeProvider>
      <CambistasPage />
    </ThemeProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedUseHasPermission.mockReturnValue(true)
})

describe('CambistasPage — estados de listagem', () => {
  it('mostra loading e depois a lista real', async () => {
    mockedList.mockResolvedValue({ status: 'success', data: page([AGENT]) })
    renderPage()
    expect(screen.getByText(/Carregando Cambistas/)).toBeInTheDocument()
    expect(await screen.findByRole('cell', { name: 'Carlos Mendes' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '001' })).toBeInTheDocument()
  })

  it('mostra estado vazio', async () => {
    mockedList.mockResolvedValue({ status: 'success', data: page([]) })
    renderPage()
    expect(await screen.findByText(/Nenhum Cambista cadastrado ainda/)).toBeInTheDocument()
  })

  it('mostra erro com botão de tentar novamente', async () => {
    mockedList.mockResolvedValue({ status: 'error' })
    renderPage()
    expect(await screen.findByText(/Não foi possível carregar/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeInTheDocument()
  })

  it('busca dispara nova listagem com o termo (via teclado/Enter)', async () => {
    mockedList.mockResolvedValue({ status: 'success', data: page([]) })
    renderPage()
    await screen.findByText(/Nenhum Cambista/)

    const input = screen.getByLabelText('Buscar por código, nome ou apelido')
    await userEvent.type(input, '001{Enter}')

    await waitFor(() =>
      expect(mockedList).toHaveBeenLastCalledWith(expect.objectContaining({ search: '001' })),
    )
  })
})

describe('CambistasPage — modo add (cadastro)', () => {
  it('conflito de código exibe mensagem inline sem perder os dados', async () => {
    mockedList.mockResolvedValue({ status: 'success', data: page([]) })
    mockedCreate.mockResolvedValue({ status: 'code_conflict' })
    renderPage()
    await screen.findByText(/Nenhum Cambista/)

    await userEvent.click(screen.getByRole('button', { name: /Adicionar Cambista/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Código / Talão'), '001')
    await userEvent.type(within(dialog).getByLabelText('Percentual (%)'), '10')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cadastrar' }))

    expect(await within(dialog).findByText(/já está em uso nesta Banca/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Código / Talão')).toHaveValue('001')
  })

  it('alerta de possível duplicidade é confirmável e reenvia com confirmação', async () => {
    mockedList.mockResolvedValue({ status: 'success', data: page([]) })
    mockedCreate
      .mockResolvedValueOnce({
        status: 'possible_duplicate',
        candidates: [{ bettingAgentId: 'x', code: '002', displayName: 'João' }],
      })
      .mockResolvedValueOnce({ status: 'created', bettingAgentId: 'ag-2', code: '003' })
    renderPage()
    await screen.findByText(/Nenhum Cambista/)

    await userEvent.click(screen.getByRole('button', { name: /Adicionar Cambista/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Código / Talão'), '003')
    await userEvent.type(within(dialog).getByLabelText('Percentual (%)'), '10')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cadastrar' }))

    expect(await within(dialog).findByText(/Possível duplicidade encontrada/)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: /Cadastrar mesmo assim/ }))

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenLastCalledWith(
        expect.objectContaining({ confirmPossibleDuplicate: true }),
      )
    })
  })

  it('navega entre as abas Cadastro/Endereço/Contato por teclado', async () => {
    mockedList.mockResolvedValue({ status: 'success', data: page([]) })
    renderPage()
    await screen.findByText(/Nenhum Cambista/)

    await userEvent.click(screen.getByRole('button', { name: /Adicionar Cambista/ }))
    const dialog = await screen.findByRole('dialog')

    const cadastroTab = within(dialog).getByRole('tab', { name: 'Cadastro' })
    cadastroTab.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(within(dialog).getByRole('tab', { name: 'Endereço' })).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}')
    expect(within(dialog).getByRole('tab', { name: 'Contato' })).toHaveFocus()
  })
})

describe('CambistasPage — modo view/edit (detalhe)', () => {
  it('clicar em uma linha abre o detalhe em modo visualização (consulta por id)', async () => {
    mockedList.mockResolvedValue({ status: 'success', data: page([AGENT]) })
    mockedGet.mockResolvedValue({ status: 'success', data: AGENT_DETAIL })
    renderPage()
    await userEvent.click(await screen.findByRole('cell', { name: 'Carlos Mendes' }))

    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('ag-1'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Carlos Mendes' })).toBeInTheDocument()
    expect(within(dialog).getByText('Código 001')).toBeInTheDocument()
    // Modo visualização: campos somente leitura, sem botão Salvar.
    expect(within(dialog).queryByLabelText('Nome (opcional)')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Editar' })).toBeInTheDocument()
  })

  it('edita nome/apelido e salva, voltando para o modo visualização', async () => {
    mockedList.mockResolvedValue({ status: 'success', data: page([AGENT]) })
    mockedGet.mockResolvedValue({ status: 'success', data: AGENT_DETAIL })
    mockedUpdate.mockResolvedValue({ status: 'success', data: { bettingAgentId: 'ag-1', partyId: 'p-1' } })
    renderPage()
    await userEvent.click(await screen.findByRole('cell', { name: 'Carlos Mendes' }))
    const dialog = await screen.findByRole('dialog')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Editar' }))
    const nameInput = within(dialog).getByLabelText('Nome (opcional)')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Carlos Alberto')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar Alterações' }))

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith(
        'ag-1',
        expect.objectContaining({ name: 'Carlos Alberto' }),
      ),
    )
    expect(await within(dialog).findByRole('button', { name: 'Editar' })).toBeInTheDocument()
  })

  it('altera o status via seleção e reflete no Badge da linha e nos cards', async () => {
    mockedList
      .mockResolvedValueOnce({ status: 'success', data: page([AGENT]) })
      .mockResolvedValue({ status: 'success', data: page([{ ...AGENT, status: 'INACTIVE' }]) })
    mockedGet.mockResolvedValue({ status: 'success', data: AGENT_DETAIL })
    mockedSetStatus.mockResolvedValue({ status: 'success', data: { bettingAgentId: 'ag-1', status: 'INACTIVE' } })
    renderPage()
    await userEvent.click(await screen.findByRole('cell', { name: 'Carlos Mendes' }))
    const dialog = await screen.findByRole('dialog')

    await userEvent.click(within(dialog).getByRole('radio', { name: 'Inativo' }))

    await waitFor(() => expect(mockedSetStatus).toHaveBeenCalledWith('ag-1', 'INACTIVE'))
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2))
  })

  it('exibe mensagem de telefone inválido e não chama update ao salvar', async () => {
    mockedList.mockResolvedValue({ status: 'success', data: page([AGENT]) })
    mockedGet.mockResolvedValue({ status: 'success', data: AGENT_DETAIL })
    renderPage()
    await userEvent.click(await screen.findByRole('cell', { name: 'Carlos Mendes' }))
    const dialog = await screen.findByRole('dialog')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Editar' }))
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Contato' }))
    const phoneInput = within(dialog).getByLabelText('Telefone 1')
    await userEvent.clear(phoneInput)
    await userEvent.type(phoneInput, '123')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar Alterações' }))

    expect(await within(dialog).findByText(/Telefone inválido/)).toBeInTheDocument()
    expect(mockedUpdate).not.toHaveBeenCalled()
  })
})

describe('CambistasPage — permissões', () => {
  it('esconde "Adicionar Cambista" sem permissão de criar', async () => {
    mockedUseHasPermission.mockReturnValue(false)
    mockedList.mockResolvedValue({ status: 'success', data: page([]) })
    renderPage()
    await screen.findByText(/Nenhum Cambista/)
    expect(screen.queryByRole('button', { name: /Adicionar Cambista/ })).not.toBeInTheDocument()
  })

  it('esconde "Editar" e o controle de status sem permissão de atualizar', async () => {
    mockedUseHasPermission.mockReturnValue(false)
    mockedList.mockResolvedValue({ status: 'success', data: page([AGENT]) })
    mockedGet.mockResolvedValue({ status: 'success', data: AGENT_DETAIL })
    renderPage()
    await userEvent.click(await screen.findByRole('cell', { name: 'Carlos Mendes' }))
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('radiogroup', { name: 'Status do Cambista' })).not.toBeInTheDocument()
  })
})
