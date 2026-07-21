import { render, screen } from '@testing-library/react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from './table'

describe('Table', () => {
  it('renderiza como <table> semântico, acessível via role table/rowgroup/row/cell', () => {
    render(
      <Table>
        <TableCaption>Lista de pessoas</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Ana</TableCell>
            <TableCell>R$ 100,00</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Nome' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Ana' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(2)
  })
})
