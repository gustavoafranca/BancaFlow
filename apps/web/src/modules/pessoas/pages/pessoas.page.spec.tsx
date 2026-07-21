import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { PessoasPage } from './pessoas.page'
import { PESSOAS, ALL_CAMBISTAS } from '../data/pessoas.sample'

function renderPage() {
  return render(
    <ThemeProvider>
      <PessoasPage />
    </ThemeProvider>,
  )
}

describe('PessoasPage', () => {
  it('renderiza a listagem de pessoas de amostra', () => {
    renderPage()
    expect(screen.getByText('Pessoas e Vínculos')).toBeInTheDocument()
    expect(screen.getByText('Antônio Ferreira')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('abre o drawer de visualização ao clicar em uma pessoa', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText('Antônio Ferreira'))
    expect(screen.getByText('Visualização')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Antônio Ferreira')).toHaveAttribute('readonly')
  })

  it('abre o drawer de adição em branco ao clicar em "Adicionar Pessoa"', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /Adicionar Pessoa/ }))
    expect(screen.getByText('Nova Pessoa')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Nome da pessoa')).not.toHaveAttribute('readonly')
  })

  it('"Editar" sai do modo visualização e libera os campos para edição', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText('Antônio Ferreira'))
    expect(screen.getByDisplayValue('Antônio Ferreira')).toHaveAttribute('readonly')

    await user.click(screen.getByRole('button', { name: /^editar$/i }))
    expect(screen.getByDisplayValue('Antônio Ferreira')).not.toHaveAttribute('readonly')
    expect(screen.queryByText('Visualização')).not.toBeInTheDocument()
  })

  it('mostra o status Ativo/Inativo com o mesmo componente de badge usado em Contas de Usuário', () => {
    renderPage()
    const inativa = PESSOAS.find((p) => p.status === 'Inativo')!
    const row = screen.getByText(inativa.nome).closest<HTMLElement>('div[style*="grid"]')!
    expect(within(row).getByText('Inativo')).toBeInTheDocument()
  })

  it('exibe o percentual de participação apenas para Dono/Recolhe', async () => {
    const user = userEvent.setup()
    renderPage()
    const dono = PESSOAS.find((p) => p.tipo === 'Dono')!
    await user.click(screen.getByText(dono.nome))
    expect(screen.getByDisplayValue(dono.pct!)).toBeInTheDocument()

    const funcionario = PESSOAS.find((p) => p.tipo === 'Funcionário')!
    await user.click(screen.getByRole('button', { name: 'Fechar painel' }))
    await user.click(screen.getByText(funcionario.nome))
    expect(screen.queryByLabelText(/percentual de participação/i)).not.toBeInTheDocument()
  })

  it('Tipo e Status usam o Selection Button Group (radiogroup), desabilitado em visualização e ativo em edição', async () => {
    const user = userEvent.setup()
    renderPage()
    const dono = PESSOAS.find((p) => p.tipo === 'Dono')!
    await user.click(screen.getByText(dono.nome))
    const drawer = screen.getByRole('dialog')

    expect(within(drawer).getByRole('radio', { name: 'Dono' })).toHaveAttribute('data-state', 'checked')
    expect(within(drawer).getByRole('radio', { name: 'Funcionário' })).toBeDisabled()
    expect(within(drawer).getByRole('radio', { name: 'Ativo' })).toHaveAttribute('data-state', 'checked')
    expect(within(drawer).getByRole('radio', { name: 'Inativo' })).toBeDisabled()

    // `DrawerBody` remonta (key por `drawerMode`) ao entrar em edição — reconsultar após o clique.
    await user.click(within(drawer).getByRole('button', { name: /^editar$/i }))
    expect(within(drawer).getByRole('radio', { name: 'Funcionário' })).not.toBeDisabled()
    await user.click(within(drawer).getByRole('radio', { name: 'Funcionário' }))
    expect(within(drawer).getByRole('radio', { name: 'Funcionário' })).toHaveAttribute('data-state', 'checked')

    await user.click(within(drawer).getByRole('radio', { name: 'Inativo' }))
    expect(within(drawer).getByRole('radio', { name: 'Inativo' })).toHaveAttribute('data-state', 'checked')
  })

  it('aba Vínculos permite alternar cambistas vinculados durante a edição', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /Adicionar Pessoa/ }))
    const drawer = screen.getByRole('dialog')

    await user.click(within(drawer).getByRole('tab', { name: 'Vínculos' }))
    expect(within(drawer).getByText('0 cambista(s) vinculado(s)')).toBeInTheDocument()

    await user.click(within(drawer).getByText(ALL_CAMBISTAS[0]!.name))
    expect(within(drawer).getByText('1 cambista(s) vinculado(s)')).toBeInTheDocument()

    await user.click(within(drawer).getByText(ALL_CAMBISTAS[0]!.name))
    expect(within(drawer).getByText('0 cambista(s) vinculado(s)')).toBeInTheDocument()
  })
})
