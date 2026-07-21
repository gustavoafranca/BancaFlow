import type { AccountRoleName } from '@/shared/api/auth.client'

// Rótulo de exibição do papel da conta — usado pelo shell (navbar) e, na Fase
// 6, por `perfil`/`configuracoes`. Puramente de apresentação: a autorização
// real continua no backend/domínio (`web-frontend-boundaries`).
const ROLE_LABELS: Record<AccountRoleName, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  USER: 'Operador',
}

export function roleLabel(role: AccountRoleName): string {
  return ROLE_LABELS[role]
}
