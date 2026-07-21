import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('variante default renderiza como <button> com classes de tamanho default', () => {
    render(<Button>Ok</Button>)
    const btn = screen.getByRole('button', { name: 'Ok' })
    expect(btn.tagName).toBe('BUTTON')
    expect(btn.className).toContain('h-10')
  })

  it('variante brand + size full reproduz o CTA das telas de auth (gradiente, rounded-11px, full width)', () => {
    render(
      <Button variant="brand" size="full">
        Entrar
      </Button>,
    )
    const btn = screen.getByRole('button', { name: 'Entrar' })
    expect(btn.className).toContain('bf-btn-primary')
    expect(btn.className).toContain('rounded-[11px]')
    expect(btn.className).toContain('text-white')
    expect(btn.className).toContain('h-11')
    expect(btn.className).toContain('w-full')
    expect(btn.className).toContain('disabled:opacity-70')
  })

  it('disabled aplica opacity e pointer-events-none', () => {
    render(<Button disabled>Salvando...</Button>)
    const btn = screen.getByRole('button', { name: 'Salvando...' })
    expect(btn).toBeDisabled()
    expect(btn.className).toContain('disabled:pointer-events-none')
  })

  it('variante destructive usa os tokens canônicos de fundo/texto/foco e aceita disabled/tamanhos', () => {
    render(
      <Button variant="destructive" size="sm">
        Excluir
      </Button>,
    )
    const btn = screen.getByRole('button', { name: 'Excluir' })
    expect(btn.className).toContain('bg-destructive')
    expect(btn.className).toContain('text-destructive-foreground')
    expect(btn.className).toContain('hover:opacity-90')
    expect(btn.className).toContain('focus-visible:ring-destructive-border')
    expect(btn.className).toContain('h-9')
  })

  it('variante destructive + disabled aplica opacity e pointer-events-none como as demais variantes', () => {
    render(
      <Button variant="destructive" disabled>
        Excluir
      </Button>,
    )
    const btn = screen.getByRole('button', { name: 'Excluir' })
    expect(btn).toBeDisabled()
    expect(btn.className).toContain('disabled:pointer-events-none')
    expect(btn.className).toContain('disabled:opacity-50')
  })

  it('asChild renderiza o filho (Slot) em vez de <button>', () => {
    render(
      <Button asChild>
        <a href="/x">Link</a>
      </Button>,
    )
    const link = screen.getByRole('link', { name: 'Link' })
    expect(link.tagName).toBe('A')
  })
})
