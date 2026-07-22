import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhoneInput, formatBrazilianPhone } from './phone-input'

function ControlledPhoneInput() {
  const [value, setValue] = useState('')
  return <PhoneInput aria-label="telefone" value={value} onChange={setValue} />
}

describe('formatBrazilianPhone', () => {
  it('formata progressivamente conforme a quantidade de dígitos', () => {
    expect(formatBrazilianPhone('')).toBe('')
    expect(formatBrazilianPhone('11')).toBe('(11')
    expect(formatBrazilianPhone('1133')).toBe('(11) 33')
    expect(formatBrazilianPhone('113334')).toBe('(11) 3334')
  })

  it('formata telefone fixo (10 dígitos) como (XX) XXXX-XXXX', () => {
    expect(formatBrazilianPhone('1133334444')).toBe('(11) 3333-4444')
  })

  it('formata celular (11 dígitos) como (XX) XXXXX-XXXX', () => {
    expect(formatBrazilianPhone('11999998888')).toBe('(11) 99999-8888')
  })

  it('ignora caracteres não numéricos e trunca em 11 dígitos', () => {
    expect(formatBrazilianPhone('(11) 99999-8888 extra 999')).toBe('(11) 99999-8888')
  })
})

describe('PhoneInput', () => {
  it('exibe a máscara mas expõe somente dígitos via onChange', async () => {
    const user = userEvent.setup()
    render(<ControlledPhoneInput />)
    const input = screen.getByLabelText('telefone')

    await user.type(input, '11999998888')

    expect(input).toHaveValue('(11) 99999-8888')
  })

  it('normaliza telefone fixo de 10 dígitos', async () => {
    const user = userEvent.setup()
    render(<ControlledPhoneInput />)
    const input = screen.getByLabelText('telefone')

    await user.type(input, '1133334444')

    expect(input).toHaveValue('(11) 3333-4444')
  })

  it('usa inputMode="tel"', () => {
    render(<ControlledPhoneInput />)
    expect(screen.getByLabelText('telefone')).toHaveAttribute('inputMode', 'tel')
  })
})
