import type { Cambista, Dono } from '../types'

// Dados de amostra (MVP sem persistência real de cambistas ainda) — extraídos
// fielmente da tela original, sem alterar os valores exibidos.
export const DONOS: Record<string, Dono> = {
  banca: { nome: 'Banca São Jorge', avatarBg: 'linear-gradient(135deg,#005533,#00C773)' },
  antonio: { nome: 'Antônio Ferreira', avatarBg: 'linear-gradient(135deg,#005533,#00A860)' },
  paulo: { nome: 'Paulo Augusto', avatarBg: 'linear-gradient(135deg,#003366,#0066CC)' },
}

export const AVATAR_GRADS = [
  'linear-gradient(135deg,#005533,#00A860)',
  'linear-gradient(135deg,#1a4a7a,#3a82c4)',
  'linear-gradient(135deg,#1a3a4a,#2a7a8a)',
  'linear-gradient(135deg,#3a1a6a,#8a4ac4)',
  'linear-gradient(135deg,#4a1a1a,#c44a4a)',
  'linear-gradient(135deg,#3a2a00,#c49020)',
]

export const CAMBISTAS: Cambista[] = [
  { id: 1, nome: 'Carlos Mendes', apelido: 'Carlão', talao: '101', donoId: 'antonio', status: 'Ativo', pct: 30, sal: null },
  { id: 2, nome: 'Ana Paula', apelido: 'Aninha', talao: '102', donoId: 'antonio', status: 'Ativo', pct: 25, sal: null },
  { id: 3, nome: 'Marcos Duarte', apelido: 'Marquim', talao: '103', donoId: 'paulo', status: 'Ativo', pct: null, sal: 800 },
  { id: 4, nome: 'Sandra Ramos', apelido: '—', talao: '104', donoId: 'paulo', status: 'Inativo', pct: null, sal: null },
  { id: 5, nome: 'Pedro Costa', apelido: 'Pedrão', talao: '105', donoId: 'banca', status: 'Ativo', pct: 20, sal: 500 },
  { id: 6, nome: 'Fernanda Gomes', apelido: 'Fer', talao: '106', donoId: 'banca', status: 'Ativo', pct: null, sal: 1200 },
]
