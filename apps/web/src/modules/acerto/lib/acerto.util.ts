import type { EntryTipo } from '../types'
import type { Turno } from '@/shared/lib/turno.util'

// Reexporta os helpers compartilhados sob os nomes já usados neste módulo —
// consolidados na Fase 4 (`shared/lib/format.util.ts`); mesmo comportamento,
// mesma fonte. `fmt`/`fmtSaldo`/`initialsOf` eram idênticos aos equivalentes de
// `acerto/_components/shared.tsx` antes da migração.
export { formatCurrencyAbs as fmt, formatSignedCurrency as fmtSaldo, initials as initialsOf } from '@/shared/lib/format.util'

/**
 * Cores de chip de turno (seleção de filtro) — diferente da `Badge` (pílula
 * estática): aqui a cor muda conforme selecionado/não selecionado, então
 * permanece local ao módulo. O texto do turno vem de `TURNO_LABELS` (shared).
 */
export const TURNO_BG: Record<Turno, string> = {
  manha: 'rgba(245,166,35,0.14)',
  tarde: 'rgba(91,143,212,0.14)',
  noite: 'rgba(130,90,210,0.14)',
}
export const TURNO_COL: Record<Turno, string> = { manha: '#C8880A', tarde: '#5B8FD4', noite: '#7A5CD4' }

export const FORMA_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  transferencia: 'Transferência',
  fiado: 'Fiado',
  descontar: 'Descontar depois',
  outros: 'Outros',
}

export type TipoMeta = { label: string; bg: string; c: string; bd: string }
export function tipoMetaFor(tipo: EntryTipo, green: string): TipoMeta {
  const m: Record<EntryTipo, TipoMeta> = {
    lancamento: { label: 'Lançamento', bg: 'rgba(0,199,115,0.12)', c: green, bd: 'rgba(0,199,115,0.24)' },
    despesa: { label: 'Despesa', bg: 'rgba(245,166,35,0.12)', c: '#C8880A', bd: 'rgba(245,166,35,0.28)' },
    ajuste: { label: 'Ajuste', bg: 'rgba(122,92,212,0.12)', c: '#7A5CD4', bd: 'rgba(122,92,212,0.28)' },
    pagamento: { label: 'Pagamento', bg: 'rgba(91,143,212,0.12)', c: '#5B8FD4', bd: 'rgba(91,143,212,0.28)' },
    credito: { label: 'Crédito', bg: 'rgba(91,143,212,0.12)', c: '#5B8FD4', bd: 'rgba(91,143,212,0.28)' },
    debito: { label: 'Débito', bg: 'rgba(224,85,85,0.12)', c: '#E05555', bd: 'rgba(224,85,85,0.28)' },
  }
  return m[tipo]
}

function fmtDate(d: Date): string {
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear()
}
export function todayStr(): string {
  return fmtDate(new Date())
}
export function offsetDate(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return fmtDate(d)
}
export function offsetMonth(n: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  return fmtDate(d)
}
export function fmtNow(): string {
  const d = new Date()
  return (
    String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear() +
    ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
  )
}
