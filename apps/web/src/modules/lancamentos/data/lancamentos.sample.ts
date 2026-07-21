import type { Cambista, Entry } from '../types'

// Reexporta os helpers compartilhados sob os nomes já usados neste módulo —
// consolidados na Fase 4 (`shared/lib/format.util.ts`/`turno.util.ts`); mesmo
// comportamento, mesma fonte, nenhum call-site precisa mudar.
export { formatCurrency as fmt, initials } from '@/shared/lib/format.util'
export { TURNO_LABELS } from '@/shared/lib/turno.util'

// Dados de amostra (MVP sem persistência real de lançamentos ainda) —
// extraídos fielmente da tela original, sem alterar os valores exibidos.
export const CAMBISTAS: Cambista[] = [
  { id: 1, nome: 'Carlos Mendes', apelido: 'Carlão', talao: '101', pct: 30, avatarBg: 'linear-gradient(135deg,#005533,#00A860)' },
  { id: 2, nome: 'Ana Paula', apelido: 'Aninha', talao: '102', pct: 25, avatarBg: 'linear-gradient(135deg,#1a4a7a,#3a82c4)' },
  { id: 3, nome: 'Marcos Duarte', apelido: 'Marquim', talao: '103', pct: null, avatarBg: 'linear-gradient(135deg,#1a3a4a,#2a7a8a)' },
  { id: 5, nome: 'Pedro Costa', apelido: 'Pedrão', talao: '105', pct: 20, avatarBg: 'linear-gradient(135deg,#4a1a1a,#c44a4a)' },
  { id: 6, nome: 'Fernanda Gomes', apelido: 'Fer', talao: '106', pct: null, avatarBg: 'linear-gradient(135deg,#3a2a00,#c49020)' },
]

// Data de referência do feed (amostra). O formulário abre nesta data para
// mostrar os lançamentos já existentes.
export const FEED_DATE = '27/06/2026'

export const INITIAL_ENTRIES: Entry[] = [
  { id: 1, turno: 'manha', cambistaId: 1, venda: 340, dinheiro: 230, obs: '', hora: '08:32', data: FEED_DATE, operador: 'João Silva', despesa: null },
  { id: 2, turno: 'manha', cambistaId: 2, venda: 220, dinheiro: 170, obs: 'Conferir depois', hora: '09:15', data: FEED_DATE, operador: 'João Silva', despesa: { valor: 15, descricao: 'Transporte' } },
  { id: 3, turno: 'tarde', cambistaId: 3, venda: 510, dinheiro: 510, obs: '', hora: '13:48', data: FEED_DATE, operador: 'Maria Costa', despesa: null },
  { id: 4, turno: 'tarde', cambistaId: 5, venda: 280, dinheiro: 224, obs: '', hora: '14:22', data: FEED_DATE, operador: 'João Silva', despesa: { valor: 8.5, descricao: 'Água' } },
]

export const TURNO_BADGE_BG: Record<Entry['turno'], string> = {
  manha: 'rgba(245,166,35,0.14)',
  tarde: 'rgba(91,143,212,0.14)',
  noite: 'rgba(130,90,210,0.14)',
}
export const TURNO_BADGE_C: Record<Entry['turno'], string> = { manha: '#C8880A', tarde: '#5B8FD4', noite: '#7A5CD4' }
export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export const camSub = (cam: Cambista) =>
  [cam.apelido, cam.pct ? `${cam.pct}% comissão` : 'sem comissão'].filter(Boolean).join(' · ')

export const fmtCents = (c: number) =>
  (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const displayCents = (c: number) => (c > 0 ? fmtCents(c) : '0,00')

export const cashKey = (cents: number, key: string): number | null => {
  if (/^[0-9]$/.test(key)) return Math.min(cents * 10 + parseInt(key, 10), 9999999)
  if (key === 'Backspace') return Math.floor(cents / 10)
  return null
}

export const parsePaste = (text: string): number => {
  const n = parseFloat(String(text).replace(/\./g, '').replace(',', '.')) || 0
  return Math.min(Math.round(Math.abs(n) * 100), 9999999)
}
