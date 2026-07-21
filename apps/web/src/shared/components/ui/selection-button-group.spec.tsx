import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SelectionButtonGroup, type SelectionButtonOption } from './selection-button-group'

const OPTIONS: SelectionButtonOption[] = [
  { value: 'dono', label: 'Dono', variant: 'success' },
  { value: 'funcionario', label: 'Funcionário', variant: 'info' },
  { value: 'recolhe', label: 'Recolhe', variant: 'warning' },
]

function Controlled({
  initial = 'funcionario',
  onValueChange,
  options = OPTIONS,
  disabled,
}: {
  initial?: string
  onValueChange?: (v: string) => void
  options?: SelectionButtonOption[]
  disabled?: boolean
}) {
  return (
    <SelectionButtonGroup
      aria-label="Tipo"
      value={initial}
      onValueChange={(v) => onValueChange?.(v)}
      options={options}
      disabled={disabled}
    />
  )
}

describe('SelectionButtonGroup', () => {
  it('expõe semântica de radiogroup/radio, com apenas uma opção marcada', () => {
    render(<Controlled />)
    const group = screen.getByRole('radiogroup', { name: 'Tipo' })
    expect(group).toBeInTheDocument()

    expect(screen.getByRole('radio', { name: 'Funcionário' })).toHaveAttribute('data-state', 'checked')
    expect(screen.getByRole('radio', { name: 'Dono' })).toHaveAttribute('data-state', 'unchecked')
    expect(screen.getByRole('radio', { name: 'Recolhe' })).toHaveAttribute('data-state', 'unchecked')
  })

  it('clicar em outra opção chama onValueChange com o novo valor', async () => {
    const user = userEvent.setup()
    const onValueChange = jest.fn()
    render(<Controlled onValueChange={onValueChange} />)

    await user.click(screen.getByRole('radio', { name: 'Dono' }))
    expect(onValueChange).toHaveBeenCalledWith('dono')
  })

  it('navegação por teclado (setas) move o foco entre as opções', async () => {
    const user = userEvent.setup()
    render(<Controlled />)

    screen.getByRole('radio', { name: 'Funcionário' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Recolhe' })).toHaveFocus()
  })

  it('disabled no grupo desabilita todas as opções e impede seleção', async () => {
    const user = userEvent.setup()
    const onValueChange = jest.fn()
    render(<Controlled onValueChange={onValueChange} disabled />)

    const donoOption = screen.getByRole('radio', { name: 'Dono' })
    expect(donoOption).toBeDisabled()
    await user.click(donoOption)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('uma opção individual pode ficar desabilitada sem desabilitar o grupo (transição de status não permitida)', async () => {
    const user = userEvent.setup()
    const onValueChange = jest.fn()
    render(
      <Controlled
        onValueChange={onValueChange}
        options={[
          { value: 'ativo', label: 'Ativo', variant: 'success' },
          { value: 'inativo', label: 'Inativo', variant: 'neutral' },
          { value: 'bloqueado', label: 'Bloqueado', variant: 'danger', disabled: true },
        ]}
        initial="ativo"
      />,
    )

    const bloqueadoOption = screen.getByRole('radio', { name: 'Bloqueado' })
    expect(bloqueadoOption).toBeDisabled()
    await user.click(bloqueadoOption)
    expect(onValueChange).not.toHaveBeenCalled()

    await user.click(screen.getByRole('radio', { name: 'Inativo' }))
    expect(onValueChange).toHaveBeenCalledWith('inativo')
  })
})
