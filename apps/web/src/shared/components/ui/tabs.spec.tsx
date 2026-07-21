import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

function SampleTabs() {
  return (
    <Tabs defaultValue="usuarios">
      <TabsList aria-label="Configurações">
        <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        <TabsTrigger value="perfis">Perfis de acesso</TabsTrigger>
      </TabsList>
      <TabsContent value="usuarios">Conteúdo de Usuários</TabsContent>
      <TabsContent value="perfis">Conteúdo de Perfis</TabsContent>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('renderiza a aba default como ativa e mostra seu painel', () => {
    render(<SampleTabs />)
    expect(screen.getByRole('tab', { name: 'Usuários' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Conteúdo de Usuários')).toBeVisible()
    expect(screen.queryByText('Conteúdo de Perfis')).not.toBeInTheDocument()
  })

  it('troca de aba ao clicar', async () => {
    const user = userEvent.setup()
    render(<SampleTabs />)

    await user.click(screen.getByRole('tab', { name: 'Perfis de acesso' }))

    expect(screen.getByRole('tab', { name: 'Perfis de acesso' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Conteúdo de Perfis')).toBeVisible()
    expect(screen.queryByText('Conteúdo de Usuários')).not.toBeInTheDocument()
  })

  it('navega entre abas pelo teclado (seta direita) e ativa por padrão', async () => {
    const user = userEvent.setup()
    render(<SampleTabs />)

    screen.getByRole('tab', { name: 'Usuários' }).focus()
    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('tab', { name: 'Perfis de acesso' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Perfis de acesso' })).toHaveAttribute('aria-selected', 'true')
  })
})
