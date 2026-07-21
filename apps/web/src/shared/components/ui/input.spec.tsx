import { render, screen } from '@testing-library/react'
import { Input } from './input'

describe('Input', () => {
  it('variante default aplica classes base do design system', () => {
    render(<Input aria-label="campo" />)
    const input = screen.getByLabelText('campo')
    expect(input.className).toContain('h-10')
    expect(input.className).toContain('border-input')
  })

  it('variante brand sem ícone usa px-3 (ex.: campos de troca de senha)', () => {
    render(<Input aria-label="nova senha" variant="brand" type="password" />)
    const input = screen.getByLabelText('nova senha')
    expect(input.className).toContain('px-3')
    expect(input.className).not.toContain('pl-9')
  })

  it('variante brand com leftIcon aplica pl-9 pr-[38px] e renderiza o ícone posicionado', () => {
    render(
      <Input
        aria-label="usuário"
        variant="brand"
        leftIcon={<span data-testid="icon">i</span>}
      />,
    )
    const input = screen.getByLabelText('usuário')
    expect(input.className).toContain('pl-9')
    expect(input.className).toContain('pr-[38px]')
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('variante brand dark=true e dark=false aplicam paletas diferentes', () => {
    const { rerender } = render(<Input aria-label="senha" variant="brand" dark type="password" />)
    expect(screen.getByLabelText('senha').className).toContain('border-[#17352B]')

    rerender(<Input aria-label="senha" variant="brand" dark={false} type="password" />)
    expect(screen.getByLabelText('senha').className).toContain('border-[#D3E2D9]')
  })

  it('variante default com leftIcon também aplica pl-9 pr-[38px] (ex.: busca em tabelas)', () => {
    render(
      <Input aria-label="buscar" leftIcon={<span data-testid="icon">i</span>} />,
    )
    const input = screen.getByLabelText('buscar')
    expect(input.className).toContain('pl-9')
    expect(input.className).toContain('pr-[38px]')
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('rightSlot renderiza o elemento posicionado à direita', () => {
    render(
      <Input
        aria-label="senha"
        variant="brand"
        leftIcon={<span>i</span>}
        rightSlot={<button type="button">olho</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'olho' })).toBeInTheDocument()
  })
})
