import { render } from '@testing-library/react'
import { IconSearch, IconCheck, IconX, IconTrash, IconHome } from './icons'

describe('shared icons', () => {
  it('renderiza como <svg> com o size default (18) quando nenhum é informado', () => {
    const { container } = render(<IconSearch />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('width', '18')
    expect(svg).toHaveAttribute('height', '18')
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
  })

  it('aceita size customizado por uso (diferente do antigo padrão pré-instanciado)', () => {
    const { container } = render(<IconCheck size={12} />)
    expect(container.querySelector('svg')).toHaveAttribute('width', '12')
  })

  it('propaga props extras do SVG (ex.: className, aria-hidden)', () => {
    const { container } = render(<IconX className="text-red-500" aria-hidden="true" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('text-red-500')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it.each([IconTrash, IconHome])('cada ícone consolidado renderiza sem lançar', (Icon) => {
    expect(() => render(<Icon />)).not.toThrow()
  })
})
