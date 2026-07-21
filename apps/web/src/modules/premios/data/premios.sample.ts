import type { Cambista, Premio } from '../types'

// Dados de amostra (MVP sem persistência real de prêmios/débitos ainda) —
// extraídos fielmente da tela original, sem alterar os valores exibidos.
// `criadoPor`/`validadoPor` aqui são registros HISTÓRICOS já existentes na
// amostra (quem criou/validou no passado) — diferente do usuário autenticado
// ATUAL, que a página obtém via `useCurrentUser()` para novas ações.
export const DEBITOS: Record<number, number> = { 1: 120, 2: 0, 3: 350, 6: 80, 7: 0 }

export const CAMBISTAS: Cambista[] = [
  { id: 1, nome: 'Carlos Mendes', apelido: 'Carlão', talao: '101', dono: null, avatarBg: 'linear-gradient(135deg,#005533,#00A860)' },
  { id: 2, nome: 'Ana Paula', apelido: 'Aninha', talao: '102', dono: null, avatarBg: 'linear-gradient(135deg,#1a4a7a,#3a82c4)' },
  { id: 3, nome: 'Marcos Duarte', apelido: 'Marquim', talao: '103', dono: 'Maria Dono', avatarBg: 'linear-gradient(135deg,#1a3a4a,#2a7a8a)' },
  { id: 6, nome: 'Pedro Costa', apelido: 'Pedrão', talao: '105', dono: null, avatarBg: 'linear-gradient(135deg,#4a1a1a,#c44a4a)' },
  { id: 7, nome: 'Fernanda Gomes', apelido: 'Fer', talao: '106', dono: 'Maria Dono', avatarBg: 'linear-gradient(135deg,#3a2a00,#c49020)' },
]

export const BASE_PREMIOS: Premio[] = [
  { id: 1, dataRef: '27/06/2026', turno: 'Manhã', cambistaId: 1, valor: 150, tipo: 'Milhar 1º', situacao: 'validado', tratamento: 'acertar', valorAbatido: 0, saldoGerado: 0, considerarAcerto: true, descricao: 'Prêmio sena conferido depois do turno', criadoPor: 'João Silva', criadoEm: '27/06/2026 08:30', validadoPor: 'Maria Costa', validadoEm: '27/06/2026 09:00', obsVld: 'Confirmado com talão físico' },
  { id: 2, dataRef: '26/06/2026', turno: 'Noite', cambistaId: 2, valor: 80, tipo: 'Centena', situacao: 'pendente', tratamento: 'registrar', valorAbatido: 0, saldoGerado: 0, considerarAcerto: false, descricao: 'Ganhador reclamou no próximo turno', criadoPor: 'João Silva', criadoEm: '27/06/2026 10:00', validadoPor: null, validadoEm: null, obsVld: '' },
  { id: 3, dataRef: '25/06/2026', turno: 'Tarde', cambistaId: 3, valor: 320, tipo: 'Milhar seca', situacao: 'pago', tratamento: 'acertar', valorAbatido: 0, saldoGerado: 0, considerarAcerto: true, descricao: 'Prêmio pago no acerto da noite', criadoPor: 'Maria Costa', criadoEm: '26/06/2026 14:00', validadoPor: 'João Silva', validadoEm: '26/06/2026 14:30', obsVld: 'Conferido OK, pago em dinheiro' },
  { id: 4, dataRef: '25/06/2026', turno: 'Manhã', cambistaId: 6, valor: 45, tipo: 'Passe', situacao: 'nao_procedente', tratamento: 'registrar', valorAbatido: 0, saldoGerado: 0, considerarAcerto: false, descricao: 'Erro de conferência, talão não confere', criadoPor: 'João Silva', criadoEm: '25/06/2026 09:00', validadoPor: 'João Silva', validadoEm: '25/06/2026 11:00', obsVld: 'Talão analisado, não procede' },
  { id: 5, dataRef: '24/06/2026', turno: 'Manhã', cambistaId: 7, valor: 200, tipo: 'Terno', situacao: 'cancelado', tratamento: 'registrar', valorAbatido: 0, saldoGerado: 0, considerarAcerto: false, descricao: 'Duplo registro por engano', criadoPor: 'Maria Costa', criadoEm: '24/06/2026 08:45', validadoPor: null, validadoEm: null, obsVld: '' },
  { id: 6, dataRef: '27/06/2026', turno: 'Tarde', cambistaId: 3, valor: 55, tipo: 'Dezena', situacao: 'pago', tratamento: 'abater', valorAbatido: 55, saldoGerado: 0, considerarAcerto: false, descricao: 'Abateu parte do débito do cambista', criadoPor: 'João Silva', criadoEm: '27/06/2026 13:10', validadoPor: 'João Silva', validadoEm: '27/06/2026 13:15', obsVld: '' },
]
