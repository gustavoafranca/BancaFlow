import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@/shared/theme/theme-provider'
import { DashboardPage } from './dashboard.page'

function renderPage() {
  return render(
    <ThemeProvider>
      <DashboardPage />
    </ThemeProvider>,
  )
}

describe('DashboardPage', () => {
  it('renderiza os KPIs principais', () => {
    renderPage()
    expect(screen.getByText('Total Vendido Hoje')).toBeInTheDocument()
    expect(screen.getByText('R$ 12.847,50')).toBeInTheDocument()
    expect(screen.getByText('Caixa Atual')).toBeInTheDocument()
  })

  it('renderiza a tabela de últimos lançamentos como <table> semântico', () => {
    renderPage()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: /Carlos Mendes/ })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(6) // 1 header + 5 lançamentos
  })

  it('renderiza o status do sistema a partir dos dados de amostra', () => {
    renderPage()
    expect(screen.getByText('Servidor')).toBeInTheDocument()
    expect(screen.getByText('Sincronizando')).toBeInTheDocument()
  })
})
