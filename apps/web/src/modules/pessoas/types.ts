export type Tipo = 'Dono' | 'Funcionário' | 'Recolhe'

export type Pessoa = {
  id: number
  nome: string
  tipo: Tipo
  pct: string | null
  cambistas: string[]
  status: 'Ativo' | 'Inativo'
  obs: string
}

export type DrawerMode = 'add' | 'view' | 'edit'
export type DrawerTab = 'dados' | 'vinculos'
