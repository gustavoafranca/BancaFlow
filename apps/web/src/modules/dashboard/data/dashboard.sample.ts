import type { RecentEntryRow, SystemStatusItem } from '../types'

// Dados de amostra (MVP sem persistência real do dashboard ainda) — extraídos
// fielmente da tela original, sem alterar os valores exibidos.
export const RECENT: RecentEntryRow[] = [
  { name: 'Carlos Mendes', initials: 'CM', avatarBg: 'linear-gradient(135deg,#005533,#00A860)', time: '14:32', type: 'Venda', typeBg: 'rgba(0,199,115,0.12)', typeC: '#00C773', value: 'R$ 340,00', valC: '#00C773', status: 'Pago', stBg: 'rgba(0,199,115,0.12)', stC: '#00C773' },
  { name: 'Ana Paula', initials: 'AP', avatarBg: 'linear-gradient(135deg,#1a4a7a,#3a82c4)', time: '13:15', type: 'Venda', typeBg: 'rgba(0,199,115,0.12)', typeC: '#00C773', value: 'R$ 220,00', valC: '#00C773', status: 'Pago', stBg: 'rgba(0,199,115,0.12)', stC: '#00C773' },
  { name: 'Roberto Lima', initials: 'RL', avatarBg: 'linear-gradient(135deg,#4a2a00,#c47a20)', time: '12:48', type: 'Débito', typeBg: 'rgba(224,85,85,0.1)', typeC: '#E05555', value: 'R$ 150,00', valC: '#E05555', status: 'Pendente', stBg: 'rgba(245,166,35,0.12)', stC: '#F5A623' },
  { name: 'Sandra Ramos', initials: 'SR', avatarBg: 'linear-gradient(135deg,#3a1a6a,#8a4ac4)', time: '11:20', type: 'Venda', typeBg: 'rgba(0,199,115,0.12)', typeC: '#00C773', value: 'R$ 480,00', valC: '#00C773', status: 'Pago', stBg: 'rgba(0,199,115,0.12)', stC: '#00C773' },
  { name: 'Marcos Duarte', initials: 'MD', avatarBg: 'linear-gradient(135deg,#1a3a4a,#2a7a8a)', time: '10:05', type: 'Débito', typeBg: 'rgba(224,85,85,0.1)', typeC: '#E05555', value: 'R$ 95,00', valC: '#E05555', status: 'Pendente', stBg: 'rgba(245,166,35,0.12)', stC: '#F5A623' },
]

export const SYSTEM_STATUS: SystemStatusItem[] = [
  { label: 'Servidor', status: 'Online', color: '#00C773', pulse: true },
  { label: 'API Pagamentos', status: 'Online', color: '#00C773', pulse: true },
  { label: 'Backup', status: 'Sincronizando', color: '#F5A623', pulse: false },
]
