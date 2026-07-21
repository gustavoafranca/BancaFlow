export type Dono = { nome: string; avatarBg: string }

export type CambistaStatus = 'Ativo' | 'Inativo'

export type Cambista = {
  id: number
  nome: string
  apelido: string
  talao: string
  donoId: string
  status: CambistaStatus
  pct: number | null
  sal: number | null
}
