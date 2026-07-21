import type { Entry, Pessoa } from '../types'

// Dados de amostra (MVP sem persistência real de acerto ainda) — extraídos
// fielmente da tela original, sem alterar os valores exibidos.
export const PESSOAS: Pessoa[] = [
  { id: 1, nome: 'Carlos Mendes', apelido: 'Carlão', tipo: 'Cambista', talao: '101', avatarBg: 'linear-gradient(135deg,#005533,#00A860)', typeBg: 'rgba(0,199,115,0.13)', typeC: '#00C773' },
  { id: 2, nome: 'Ana Paula', apelido: 'Aninha', tipo: 'Cambista', talao: '102', avatarBg: 'linear-gradient(135deg,#1a4a7a,#3a82c4)', typeBg: 'rgba(0,199,115,0.13)', typeC: '#00C773' },
  { id: 3, nome: 'Marcos Duarte', apelido: 'Marquim', tipo: 'Cambista', talao: '103', avatarBg: 'linear-gradient(135deg,#1a3a4a,#2a7a8a)', typeBg: 'rgba(0,199,115,0.13)', typeC: '#00C773' },
  { id: 4, nome: 'Roberto Dias', apelido: 'Beto', tipo: 'Funcionário', talao: null, avatarBg: 'linear-gradient(135deg,#3a1a5a,#8a4aaa)', typeBg: 'rgba(122,92,212,0.13)', typeC: '#7A5CD4' },
  { id: 5, nome: 'Eduardo Silva', apelido: 'Edu', tipo: 'Motoboy', talao: null, avatarBg: 'linear-gradient(135deg,#4a2a1a,#c48a3a)', typeBg: 'rgba(245,166,35,0.13)', typeC: '#C8880A' },
  { id: 6, nome: 'Pedro Costa', apelido: 'Pedrão', tipo: 'Cambista', talao: '105', avatarBg: 'linear-gradient(135deg,#4a1a1a,#c44a4a)', typeBg: 'rgba(0,199,115,0.13)', typeC: '#00C773' },
  { id: 7, nome: 'Fernanda Gomes', apelido: 'Fer', tipo: 'Cambista', talao: '106', avatarBg: 'linear-gradient(135deg,#3a2a00,#c49020)', typeBg: 'rgba(0,199,115,0.13)', typeC: '#00C773' },
  { id: 8, nome: 'José Recolhe', apelido: 'Zé', tipo: 'Recolhe', talao: null, avatarBg: 'linear-gradient(135deg,#1a3a1a,#3a8a3a)', typeBg: 'rgba(91,143,212,0.13)', typeC: '#5B8FD4' },
  { id: 9, nome: 'Maria Dono', apelido: 'Dona Mara', tipo: 'Dono', talao: null, avatarBg: 'linear-gradient(135deg,#2a1a3a,#6a3a8a)', typeBg: 'rgba(224,85,85,0.13)', typeC: '#E05555' },
]

export const BASE_ENTRIES: Entry[] = [
  { id: 1, data: '27/06/2026', turno: 'manha', pessoaId: 1, tipo: 'lancamento', valor: 340, impacto: -120, desc: 'Turno manhã 27/06', hora: '08:32', operador: 'João Silva', despesas: [{ valor: 16, desc: 'Transporte', tipo: 'Transporte', incluir: true }, { valor: 8, desc: 'Gasolina', tipo: 'Combustível', incluir: false }], ajustes: [] },
  { id: 2, data: '27/06/2026', turno: 'manha', pessoaId: 2, tipo: 'lancamento', valor: 220, impacto: -60, desc: 'Turno manhã 27/06', hora: '09:15', operador: 'João Silva', despesas: [], ajustes: [{ valor: 30, desc: 'Prêmio Sena não pago', status: 'validado', validadoPor: 'João Silva', data: '27/06/2026' }] },
  { id: 3, data: '27/06/2026', turno: 'tarde', pessoaId: 3, tipo: 'lancamento', valor: 510, impacto: 0, desc: 'Turno tarde 27/06', hora: '13:48', operador: 'Maria Costa', despesas: [], ajustes: [] },
  { id: 4, data: '27/06/2026', turno: 'tarde', pessoaId: 6, tipo: 'lancamento', valor: 280, impacto: -52, desc: 'Turno tarde 27/06', hora: '14:22', operador: 'João Silva', despesas: [{ valor: 8.5, desc: 'Água e lanche', tipo: 'Alimentação', incluir: true }], ajustes: [{ valor: 20, desc: 'Prêmio esquecido', status: 'pendente', validadoPor: null, data: '27/06/2026' }] },
  { id: 5, data: '27/06/2026', turno: 'noite', pessoaId: 1, tipo: 'lancamento', valor: 420, impacto: -126, desc: 'Turno noite 27/06', hora: '20:15', operador: 'João Silva', despesas: [], ajustes: [] },
  { id: 6, data: '27/06/2026', turno: 'noite', pessoaId: 7, tipo: 'lancamento', valor: 195, impacto: -25, desc: 'Turno noite 27/06', hora: '21:30', operador: 'Maria Costa', despesas: [{ valor: 12, desc: 'Material', tipo: 'Outros', incluir: true }], ajustes: [{ valor: 45, desc: 'Prêmio 25/06', status: 'pendente', validadoPor: null, data: '25/06/2026' }] },
  { id: 7, data: '26/06/2026', turno: 'tarde', pessoaId: 4, tipo: 'despesa', valor: 120, impacto: -120, desc: 'Salário semanal Roberto', hora: '15:00', operador: 'João Silva', despesas: [], ajustes: [] },
  { id: 8, data: '26/06/2026', turno: 'noite', pessoaId: 5, tipo: 'despesa', valor: 80, impacto: -80, desc: 'Combustível motoboy', hora: '22:00', operador: 'João Silva', despesas: [], ajustes: [] },
  { id: 9, data: '25/06/2026', turno: 'manha', pessoaId: 1, tipo: 'pagamento', valor: 200, impacto: 200, desc: 'Pagamento parcial Carlos', hora: '09:00', operador: 'João Silva', despesas: [], ajustes: [] },
  { id: 10, data: '25/06/2026', turno: 'tarde', pessoaId: 8, tipo: 'credito', valor: 50, impacto: 50, desc: 'Crédito recolhe Zé', hora: '14:00', operador: 'Maria Costa', despesas: [], ajustes: [] },
  { id: 11, data: '25/06/2026', turno: 'tarde', pessoaId: 9, tipo: 'debito', valor: 300, impacto: -300, desc: 'Débito retirada dono', hora: '16:00', operador: 'João Silva', despesas: [], ajustes: [] },
  { id: 12, data: '24/06/2026', turno: 'manha', pessoaId: 2, tipo: 'ajuste', valor: 45, impacto: -45, desc: 'Ajuste prêmio não pago 22/06', hora: '08:00', operador: 'João Silva', despesas: [], ajustes: [] },
]
