import {
  initials,
  formatCurrency,
  formatCurrencyAbs,
  formatSignedCurrency,
  formatCentsToReais,
} from './format.util'

describe('format.util', () => {
  it('initials extrai até 2 letras maiúsculas do nome', () => {
    expect(initials('João Silva')).toBe('JS')
    expect(initials('Maria')).toBe('M')
    expect(initials('Ana Paula Costa')).toBe('AP')
  })

  it('formatCurrency preserva o sinal nativo do toLocaleString (comportamento de lancamentos)', () => {
    expect(formatCurrency(1234.5)).toBe('R$ 1.234,50')
    expect(formatCurrency(-5)).toBe('R$ -5,00')
    expect(formatCurrency(0)).toBe('R$ 0,00')
  })

  it('formatCurrencyAbs sempre retorna magnitude positiva (comportamento de acerto)', () => {
    expect(formatCurrencyAbs(-42.3)).toBe('R$ 42,30')
    expect(formatCurrencyAbs(42.3)).toBe('R$ 42,30')
  })

  it('formatSignedCurrency prefixa +/- antes do símbolo (comportamento de fmtSaldo)', () => {
    expect(formatSignedCurrency(10)).toBe('+R$ 10,00')
    expect(formatSignedCurrency(-10)).toBe('-R$ 10,00')
    expect(formatSignedCurrency(0)).toBe('+R$ 0,00')
  })

  it('formatCentsToReais converte centavos inteiros para string R$', () => {
    expect(formatCentsToReais(12345)).toBe('123,45')
    expect(formatCentsToReais(0)).toBe('0,00')
  })
})
