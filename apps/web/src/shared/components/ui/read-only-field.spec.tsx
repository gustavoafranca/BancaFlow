import { render, screen } from '@testing-library/react'
import { ReadOnlyField } from './read-only-field'

describe('ReadOnlyField', () => {
  it('renderiza rótulo e valor', () => {
    render(<ReadOnlyField label="Código" value="001" />)
    expect(screen.getByText('Código')).toBeInTheDocument()
    expect(screen.getByText('001')).toBeInTheDocument()
  })

  it('aceita ReactNode como valor', () => {
    render(<ReadOnlyField label="Status" value={<span data-testid="custom">Ativo</span>} />)
    expect(screen.getByTestId('custom')).toBeInTheDocument()
  })
})
