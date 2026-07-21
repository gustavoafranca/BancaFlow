import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
  DialogBody,
  DialogHeader,
  DialogFooter,
} from './dialog'

describe('Dialog', () => {
  it('abre ao clicar no trigger e expõe título/descrição acessíveis', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger>Abrir</DialogTrigger>
        <DialogContent>
          <DialogTitle>Confirmar ação</DialogTitle>
          <DialogDescription>Detalhes da ação.</DialogDescription>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('Confirmar ação')).toBeInTheDocument()
    expect(dialog).toHaveAccessibleName('Confirmar ação')
  })

  it('fecha via DialogClose', async () => {
    const user = userEvent.setup()
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Título</DialogTitle>
          <DialogClose>Fechar</DialogClose>
        </DialogContent>
      </Dialog>,
    )

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('DialogBody ocupa o espaço rolável entre header e footer, mantendo-os fixos', async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhe</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p>Conteúdo potencialmente mais alto que a viewport</p>
          </DialogBody>
          <DialogFooter>
            <button type="button">Fechar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    )
    await screen.findByRole('dialog')
    const body = screen.getByText('Conteúdo potencialmente mais alto que a viewport').parentElement!
    expect(body.className).toContain('flex-1')
    expect(body.className).toContain('overflow-y-auto')
  })
})
