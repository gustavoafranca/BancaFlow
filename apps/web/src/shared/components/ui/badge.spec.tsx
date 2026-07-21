import { render, screen } from '@testing-library/react'
import { Badge } from './badge'

describe('Badge', () => {
  it('variante default (neutral) renderiza texto', () => {
    render(<Badge>Ativo</Badge>)
    expect(screen.getByText('Ativo').className).toContain('bg-secondary')
  })

  it.each([
    ['success', 'text-primary'],
    ['warning', 'text-[#C8880A]'],
    ['info', 'text-[#5B8FD4]'],
    ['purple', 'text-[#7A5CD4]'],
    ['danger', 'text-[#E05555]'],
  ] as const)('variante %s aplica a cor esperada', (variant, expectedClass) => {
    render(<Badge variant={variant}>x</Badge>)
    expect(screen.getByText('x').className).toContain(expectedClass)
  })
})
