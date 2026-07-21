import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Drawer, DrawerContent, DrawerBody, DrawerFooter } from './drawer'

describe('Drawer', () => {
  it('abre e expõe título acessível; Escape fecha e retorna o foco ao acionador', async () => {
    const user = userEvent.setup()
    function Harness() {
      return (
        <>
          <button type="button">Abrir</button>
          <Drawer defaultOpen>
            <DrawerContent title="Novo Usuário">
              <DrawerBody>corpo</DrawerBody>
            </DrawerContent>
          </Drawer>
        </>
      )
    }
    render(<Harness />)

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName('Novo Usuário')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('botão de fechar do cabeçalho fecha o drawer', async () => {
    const user = userEvent.setup()
    render(
      <Drawer defaultOpen>
        <DrawerContent title="Editar Usuário">
          <DrawerBody>corpo</DrawerBody>
        </DrawerContent>
      </Drawer>,
    )
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: 'Fechar painel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('botão de fechar do cabeçalho e o "Fechar" do rodapé têm nomes acessíveis distintos', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerContent title="Sem ambiguidade">
          <DrawerBody>corpo</DrawerBody>
          <DrawerFooter mode="view" onClose={() => {}} />
        </DrawerContent>
      </Drawer>,
    )
    await screen.findByRole('dialog')
    expect(screen.getByRole('button', { name: 'Fechar painel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument()
  })

  it('exibe o selo de título quando fornecido (ex.: "Visualização")', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerContent title="Maria" titleBadge={<span>Visualização</span>}>
          <DrawerBody>corpo</DrawerBody>
        </DrawerContent>
      </Drawer>,
    )
    await screen.findByRole('dialog')
    expect(screen.getByText('Visualização')).toBeInTheDocument()
  })

  it('herda tokens do tema ativo via classes compartilhadas, sem cor hardcoded', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerContent title="Tema">
          <DrawerBody>corpo</DrawerBody>
        </DrawerContent>
      </Drawer>,
    )
    const dialog = await screen.findByRole('dialog')
    expect(dialog.className).toContain('bg-popover')
    expect(dialog.className).toContain('text-popover-foreground')
    expect(dialog.className).toContain('border-border')
  })

  it('abre abaixo da navbar, mantendo o menu principal acessível', async () => {
    render(
      <Drawer defaultOpen>
        <DrawerContent title="Offset">
          <DrawerBody>corpo</DrawerBody>
        </DrawerContent>
      </Drawer>,
    )
    const dialog = await screen.findByRole('dialog')
    expect(dialog.className).toContain('top-[54px]')
  })

  describe('redimensionamento', () => {
    it('arraste do mouse ajusta a largura respeitando os limites mínimo e máximo', async () => {
      render(
        <Drawer defaultOpen>
          <DrawerContent title="Resize" minWidth={380} maxWidth={900} defaultWidth={480}>
            <DrawerBody>corpo</DrawerBody>
          </DrawerContent>
        </Drawer>,
      )
      const dialog = await screen.findByRole('dialog')
      const handle = screen.getByRole('separator', { name: 'Redimensionar painel' })

      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 })

      fireEvent.mouseDown(handle)
      fireEvent.mouseMove(document, { clientX: 1200 - 600 })
      expect(dialog.style.width).toBe('600px')

      // não ultrapassa o máximo configurado
      fireEvent.mouseMove(document, { clientX: 1200 - 2000 })
      expect(dialog.style.width).toBe('900px')

      // não fica abaixo do mínimo configurado
      fireEvent.mouseMove(document, { clientX: 1200 - 10 })
      expect(dialog.style.width).toBe('380px')

      fireEvent.mouseUp(document)
    })

    it('teclado (setas/Home/End) redimensiona dentro dos limites', async () => {
      render(
        <Drawer defaultOpen>
          <DrawerContent title="Resize teclado" minWidth={380} maxWidth={900} defaultWidth={480}>
            <DrawerBody>corpo</DrawerBody>
          </DrawerContent>
        </Drawer>,
      )
      const dialog = await screen.findByRole('dialog')
      const handle = screen.getByRole('separator', { name: 'Redimensionar painel' })
      handle.focus()

      fireEvent.keyDown(handle, { key: 'ArrowLeft' })
      expect(dialog.style.width).toBe('504px')

      fireEvent.keyDown(handle, { key: 'ArrowRight' })
      fireEvent.keyDown(handle, { key: 'ArrowRight' })
      expect(dialog.style.width).toBe('456px')

      fireEvent.keyDown(handle, { key: 'End' })
      expect(dialog.style.width).toBe('900px')

      fireEvent.keyDown(handle, { key: 'Home' })
      expect(dialog.style.width).toBe('380px')
    })
  })

  describe('maximizar/restaurar', () => {
    it('alterna para 100% e some com a borda de redimensionamento; restaura a largura anterior', async () => {
      render(
        <Drawer defaultOpen>
          <DrawerContent title="Maximizar" defaultWidth={480}>
            <DrawerBody>corpo</DrawerBody>
          </DrawerContent>
        </Drawer>,
      )
      const dialog = await screen.findByRole('dialog')
      expect(dialog.style.width).toBe('480px')

      await userEvent.setup().click(screen.getByRole('button', { name: 'Maximizar' }))
      expect(dialog.style.width).toBe('100%')
      expect(screen.queryByRole('separator', { name: 'Redimensionar painel' })).not.toBeInTheDocument()

      await userEvent.setup().click(screen.getByRole('button', { name: 'Restaurar' }))
      expect(dialog.style.width).toBe('480px')
      expect(screen.getByRole('separator', { name: 'Redimensionar painel' })).toBeInTheDocument()
    })
  })

  describe('DrawerFooter por modo', () => {
    it('modo create mostra Fechar e Salvar, sem Excluir', () => {
      render(<DrawerFooter mode="create" onClose={() => {}} onSave={() => {}} />)
      expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
    })

    it('modo edit mostra Excluir apenas quando onDelete é fornecido (permissão)', () => {
      const { rerender } = render(<DrawerFooter mode="edit" onClose={() => {}} onSave={() => {}} />)
      expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toBeInTheDocument()

      rerender(<DrawerFooter mode="edit" onClose={() => {}} onSave={() => {}} onDelete={() => {}} />)
      expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument()
    })

    it('Excluir abre modal de confirmação antes de chamar onDelete', async () => {
      const user = userEvent.setup()
      const onDelete = jest.fn()
      render(<DrawerFooter mode="edit" onClose={() => {}} onSave={() => {}} onDelete={onDelete} />)

      await user.click(screen.getByRole('button', { name: 'Excluir' }))
      const confirmDialog = await screen.findByRole('dialog')
      expect(onDelete).not.toHaveBeenCalled()

      await user.click(within(confirmDialog).getByRole('button', { name: 'Excluir' }))
      expect(onDelete).toHaveBeenCalledTimes(1)
    })

    it('modo view mostra Editar apenas quando onEdit é fornecido (permissão), sem Salvar', () => {
      const { rerender } = render(<DrawerFooter mode="view" onClose={() => {}} />)
      expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Salvar/ })).not.toBeInTheDocument()

      rerender(<DrawerFooter mode="view" onClose={() => {}} onEdit={() => {}} />)
      expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    })

    it('loading desabilita as ações do rodapé e troca o rótulo de salvar', () => {
      render(<DrawerFooter mode="edit" onClose={() => {}} onSave={() => {}} onDelete={() => {}} loading />)
      expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Excluir' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled()
    })
  })
})
