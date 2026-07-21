export type Situacao = 'pendente' | 'validado' | 'nao_procedente' | 'pago' | 'cancelado'
export type Tratamento = 'registrar' | 'acertar' | 'abater'
export type Turno = 'Manhã' | 'Tarde' | 'Noite'
export type DrawerTab = 'dados' | 'validacao' | 'historico'

export type Cambista = {
  id: number
  nome: string
  apelido: string
  talao: string
  dono: string | null
  avatarBg: string
}

export type Premio = {
  id: number
  dataRef: string
  turno: Turno
  cambistaId: number
  valor: number
  tipo: string
  situacao: Situacao
  tratamento: Tratamento
  valorAbatido: number
  saldoGerado: number
  considerarAcerto: boolean
  descricao: string
  criadoPor: string
  criadoEm: string
  validadoPor: string | null
  validadoEm: string | null
  obsVld: string
}

export type SitMeta = { label: string; c: string; bg: string; bd: string; icon: React.ReactNode }
export type TratMeta = { label: string; c: string; bg: string; bd: string }

export type RowVM = {
  premio: Premio
  cambista: Cambista | undefined
  sit: SitMeta
  trat: TratMeta
}
