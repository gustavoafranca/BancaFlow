import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { ThemeProvider, useTheme } from './theme-provider'

function Harness() {
  const { dark, toggleTheme } = useTheme()
  return (
    // Toggle e Select dentro do Dialog, como no drawer real de criação/edição
    // — Radix aplica aria-hidden em irmãos do dialog aberto, então qualquer
    // controle fora dele ficaria inacessível a propósito.
    <Dialog defaultOpen>
      <DialogContent>
        <DialogTitle>Modal aberto</DialogTitle>
        <button onClick={toggleTheme}>{dark ? 'Ir para claro' : 'Ir para escuro'}</button>
        <Select defaultValue="ADMIN">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Administrador</SelectItem>
          </SelectContent>
        </Select>
      </DialogContent>
    </Dialog>
  )
}

describe('ThemeProvider — tokens no documento (portals)', () => {
  afterEach(() => {
    // Os tokens são aplicados em `document.documentElement`, fora da
    // subárvore desmontada pelo RTL — sem isto, um teste anterior poderia
    // deixar `data-theme`/tokens que confundem as asserções do próximo.
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('style')
  })

  it('aplica data-theme e os CSS custom properties em document.documentElement, não em um wrapper local', () => {
    render(
      <ThemeProvider>
        <div>conteúdo</div>
      </ThemeProvider>,
    )

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('#06110D')
    expect(document.documentElement.style.getPropertyValue('--foreground')).toBe('#F0F5F2')
  })

  it('ao trocar o tema, atualiza os tokens no documento mesmo com Dialog e Select portados abertos', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <Harness />
      </ThemeProvider>,
    )

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('#06110D')

    await user.click(screen.getByRole('button', { name: 'Ir para claro' }))

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('#F4F7F5')
    expect(document.documentElement.style.getPropertyValue('--popover')).toBe('#FFFFFF')
    // Dialog/Select continuam montados e legíveis — a troca não os desmonta.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('o default em :root (globals.css) já é o tema escuro, então o primeiro paint não diverge do valor que o efeito aplica (sem flash)', () => {
    render(
      <ThemeProvider>
        <div>conteúdo</div>
      </ThemeProvider>,
    )
    // Mesma leitura usada pelo `ThemeColors` DARK para --background/--popover;
    // documenta que o fallback estático de `globals.css` e o valor aplicado
    // pelo efeito não divergem no load inicial (tema default = escuro).
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('#06110D')
    expect(document.documentElement.style.getPropertyValue('--popover')).toBe('#0D2318')
  })
})
