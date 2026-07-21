import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { CambistasPage } from './cambistas.page'

function renderPage() {
  return render(
    <ThemeProvider>
      <CambistasPage />
    </ThemeProvider>,
  )
}

describe('CambistasPage', () => {
  it('renderiza a tabela semântica com todos os cambistas de amostra', () => {
    renderPage()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: /Carlos Mendes/ })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(7) // 1 header + 6 cambistas
  })

  it('exibe os cards de estatística (total/ativos/inativos/talões)', () => {
    renderPage()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Ativos')).toBeInTheDocument()
    expect(screen.getByText('Inativos')).toBeInTheDocument()
    // 5 ativos, 1 inativo dentre os 6 de amostra.
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('status "Ativo"/"Inativo" usa a primitive Badge com variantes distintas', () => {
    renderPage()
    const ativos = screen.getAllByText('Ativo')
    const inativos = screen.getAllByText('Inativo')
    expect(ativos.length).toBeGreaterThan(0)
    expect(inativos.length).toBeGreaterThan(0)
    expect(ativos[0]?.className).toContain('text-primary')
    expect(inativos[0]?.className).toContain('text-[#E05555]')
  })

  it('busca é um Input acessível com placeholder', () => {
    renderPage()
    expect(
      screen.getByPlaceholderText('Buscar por nome, apelido ou talão...'),
    ).toBeInTheDocument()
  })
})
