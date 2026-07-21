export type Turno = 'manha' | 'tarde' | 'noite'

export type Cambista = {
  id: number
  nome: string
  apelido: string
  talao: string
  pct: number | null
  avatarBg: string
}

export type Despesa = { valor: number; descricao: string }

export type Entry = {
  id: number
  turno: Turno
  cambistaId: number
  venda: number
  dinheiro: number
  obs: string
  hora: string
  data: string
  operador: string
  despesa: Despesa | null
}
