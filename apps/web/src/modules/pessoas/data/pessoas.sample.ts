import type { Pessoa, Tipo } from '../types'

// Dados de amostra (MVP sem persistência real de pessoas ainda) — extraídos
// fielmente da tela original, sem alterar os valores exibidos.
export const ALL_CAMBISTAS = [
  { name: 'Carlos Mendes', initials: 'CM', avatarBg: 'linear-gradient(135deg,#005533,#00A860)' },
  { name: 'Ana Paula', initials: 'AP', avatarBg: 'linear-gradient(135deg,#1a4a7a,#3a82c4)' },
  { name: 'Marcos Duarte', initials: 'MD', avatarBg: 'linear-gradient(135deg,#1a3a4a,#2a7a8a)' },
  { name: 'Sandra Ramos', initials: 'SR', avatarBg: 'linear-gradient(135deg,#3a1a6a,#8a4ac4)' },
  { name: 'Pedro Costa', initials: 'PC', avatarBg: 'linear-gradient(135deg,#4a1a1a,#c44a4a)' },
  { name: 'Fernanda Gomes', initials: 'FG', avatarBg: 'linear-gradient(135deg,#3a2a00,#c49020)' },
]

export const AVATAR_BY_TIPO: Record<Tipo, string> = {
  Dono: 'linear-gradient(135deg,#005533,#00C773)',
  Funcionário: 'linear-gradient(135deg,#1a3a6a,#4a7ac4)',
  Recolhe: 'linear-gradient(135deg,#5a3a00,#c47a10)',
}

export const PESSOAS: Pessoa[] = [
  { id: 1, nome: 'Antônio Ferreira', tipo: 'Dono', pct: '40%', cambistas: ['Carlos Mendes', 'Ana Paula'], status: 'Ativo', obs: '' },
  { id: 2, nome: 'Beatriz Santos', tipo: 'Funcionário', pct: null, cambistas: ['Carlos Mendes'], status: 'Ativo', obs: 'Responsável pelo caixa' },
  { id: 3, nome: 'Roberto Lima', tipo: 'Recolhe', pct: '15%', cambistas: ['Marcos Duarte', 'Sandra Ramos'], status: 'Ativo', obs: '' },
  { id: 4, nome: 'Claudia Moura', tipo: 'Funcionário', pct: null, cambistas: [], status: 'Inativo', obs: 'Afastada temporariamente' },
  { id: 5, nome: 'Paulo Augusto', tipo: 'Dono', pct: '30%', cambistas: ['Ana Paula', 'Sandra Ramos'], status: 'Ativo', obs: '' },
  { id: 6, nome: 'Lucas Fernandes', tipo: 'Recolhe', pct: '10%', cambistas: ['Pedro Costa', 'Fernanda Gomes'], status: 'Ativo', obs: 'Turno da manhã' },
]
