import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

function ControlledSelect({
  onValueChange,
  disabled,
  invalid,
}: {
  onValueChange?: (value: string) => void
  disabled?: boolean
  invalid?: boolean
}) {
  const [value, setValue] = useState<string>('')
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        setValue(v)
        onValueChange?.(v)
      }}
      disabled={disabled}
      name="papel"
    >
      <SelectTrigger aria-labelledby="papel-label" aria-invalid={invalid} aria-describedby={invalid ? 'papel-error' : undefined}>
        <SelectValue placeholder="Selecione um papel" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="OWNER">Proprietário</SelectItem>
        <SelectItem value="ADMIN">Administrador</SelectItem>
        <SelectItem value="USER">Usuário</SelectItem>
      </SelectContent>
    </Select>
  )
}

describe('Select', () => {
  it('exibe o placeholder quando não há valor selecionado', () => {
    render(<ControlledSelect />)
    expect(screen.getByText('Selecione um papel')).toBeInTheDocument()
  })

  it('abre ao clicar no trigger e lista as opções', async () => {
    const user = userEvent.setup()
    render(<ControlledSelect />)

    await user.click(screen.getByRole('combobox'))
    expect(await screen.findByRole('option', { name: 'Administrador' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Proprietário' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Usuário' })).toBeInTheDocument()
  })

  it('seleciona uma opção via mouse e chama onValueChange', async () => {
    const user = userEvent.setup()
    const onValueChange = jest.fn()
    render(<ControlledSelect onValueChange={onValueChange} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Administrador' }))

    expect(onValueChange).toHaveBeenCalledWith('ADMIN')
    expect(await screen.findByText('Administrador')).toBeInTheDocument()
  })

  it('navega e seleciona por teclado (Enter)', async () => {
    const user = userEvent.setup()
    const onValueChange = jest.fn()
    render(<ControlledSelect onValueChange={onValueChange} />)

    const trigger = screen.getByRole('combobox')
    trigger.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('option', { name: 'Proprietário' })).toBeInTheDocument()

    await user.keyboard('{ArrowDown}{Enter}')
    expect(onValueChange).toHaveBeenCalledWith('ADMIN')
  })

  it('respeita disabled', () => {
    render(<ControlledSelect disabled />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('propaga aria-invalid/aria-describedby para o trigger', () => {
    render(<ControlledSelect invalid />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(trigger).toHaveAttribute('aria-describedby', 'papel-error')
  })
})
