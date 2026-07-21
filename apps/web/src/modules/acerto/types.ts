import type { ThemeColors } from '@/shared/theme/theme-provider'
import type { Turno } from '@/shared/lib/turno.util'

export type Pessoa = {
  id: number
  nome: string
  apelido: string
  tipo: string
  talao: string | null
  avatarBg: string
  typeBg: string
  typeC: string
}

export type Despesa = { valor: number; desc: string; tipo: string; incluir: boolean }
export type Ajuste = {
  valor: number
  desc: string
  status: 'validado' | 'pendente'
  validadoPor: string | null
  data: string
}
export type EntryTipo = 'lancamento' | 'despesa' | 'ajuste' | 'pagamento' | 'credito' | 'debito'
export type Entry = {
  id: number
  data: string
  turno: Turno
  pessoaId: number
  tipo: EntryTipo
  valor: number
  impacto: number
  desc: string
  hora: string
  operador: string
  despesas: Despesa[]
  ajustes: Ajuste[]
}

export type LastAcerto = {
  pessoa: string
  saldoAnterior: string
  valorAcerto: string
  saldoFinal: string
  saldoOk: boolean
  formaPag: string
  obs: string
}

/** Paleta estendida (inputBg/inputBorder não estão no tema compartilhado). */
export type Ext = ThemeColors & { inputBg: string; inputBorder: string }
export function ext(c: ThemeColors, dark: boolean): Ext {
  return {
    ...c,
    inputBg: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    inputBorder: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
  }
}
