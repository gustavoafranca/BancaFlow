import * as React from 'react'
import { Input, type InputProps } from './input'

/** Máscara BR progressiva: `(XX`, `(XX) XXXX`, `(XX) XXXX-XXXX` (fixo), `(XX) XXXXX-XXXX` (celular). */
export function formatBrazilianPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export interface PhoneInputProps
  extends Omit<InputProps, 'value' | 'onChange' | 'type' | 'inputMode'> {
  /** Valor normalizado — somente dígitos (até 11), nunca a string mascarada. */
  value: string
  /** Recebe somente dígitos; a máscara é recalculada a cada tecla apenas para exibição. */
  onChange: (digits: string) => void
}

/**
 * Telefone BR com máscara de exibição — componente controlado (`value`/
 * `onChange` em dígitos), integrável a React Hook Form via `Controller` (o
 * validador `v` local só cobre campos escalares simples, então listas de
 * telefone continuam fora do schema RHF, como já era em `betting-agent.schema.ts`).
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, ...props }, ref) => (
    <Input
      {...props}
      ref={ref}
      type="tel"
      inputMode="tel"
      value={formatBrazilianPhone(value)}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 11))}
    />
  ),
)
PhoneInput.displayName = 'PhoneInput'
