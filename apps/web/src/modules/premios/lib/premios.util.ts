import type { Turno } from '../types'

export { formatCurrencyAbs as fmt } from '@/shared/lib/format.util'

const pad2 = (n: number) => String(n).padStart(2, '0')
export const todayStr = () => {
  const d = new Date()
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}
export const nowStr = () => {
  const d = new Date()
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** Cores de chip de turno (seleção de filtro/form) — ver nota equivalente em `modules/acerto/lib/acerto.util.ts`. */
export const TURNO_BG: Record<Turno, string> = {
  'Manhã': 'rgba(245,166,35,0.14)',
  'Tarde': 'rgba(91,143,212,0.14)',
  'Noite': 'rgba(130,90,210,0.14)',
}
export const TURNO_COL: Record<Turno, string> = {
  'Manhã': '#C8880A',
  'Tarde': '#5B8FD4',
  'Noite': '#7A5CD4',
}
