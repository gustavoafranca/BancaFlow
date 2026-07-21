import type { AccountStatusName, ToggleAccountStatusAction } from '../data/accounts.client'

// Rótulos/ações de apresentação do status de conta — compartilhados entre a
// tabela (`usuarios-section.tsx`) e o drawer de detalhe (`user-account-drawer.tsx`),
// para não duplicar o mapeamento em dois lugares.
//
// Exceção deliberada à padronização "status apenas Ativo/Inativo"
// (`standardize-frontend-drawer-and-settings-nav`, tarefa 5.2): Conta de
// Usuário mantém os 3 estados autoritativos do backend — `ACTIVE`/
// `INACTIVE`/`BLOCKED`, com check constraint no banco
// (`openspec/specs/user-account-management/spec.md`) — sem alteração de
// schema/migration. A regra binária de status se aplica aos domínios sem
// esse estado de bloqueio no backend (Pessoas, Cambistas, Turnos e futuros
// cadastros); onde bloqueio existir fora daqui, deve ser ação independente
// (`Bloquear`/`Desbloquear`), não um terceiro valor de status na UI.

export const STATUS_LABEL: Record<AccountStatusName, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  BLOCKED: 'Bloqueado',
}

export const STATUS_BADGE_VARIANT: Record<AccountStatusName, 'success' | 'neutral' | 'danger'> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  BLOCKED: 'danger',
}

export const STATUS_ACTION_LABEL: Record<ToggleAccountStatusAction, string> = {
  activate: 'Ativar',
  deactivate: 'Desativar',
  block: 'Bloquear',
  unblock: 'Desbloquear',
}

// Opções do Selection Button Group de Status (ajuste solicitado antes do
// archive de `standardize-frontend-drawer-and-settings-nav`): status é
// SELEÇÃO entre os 3 estados reais do backend, não botões de ação avulsos.
// Ordem fixa Ativo/Inativo/Bloqueado, cores reaproveitando `STATUS_BADGE_VARIANT`.
export const STATUS_SELECTION_OPTIONS: { value: AccountStatusName; label: string; variant: 'success' | 'neutral' | 'danger' }[] = [
  { value: 'ACTIVE', label: STATUS_LABEL.ACTIVE, variant: STATUS_BADGE_VARIANT.ACTIVE },
  { value: 'INACTIVE', label: STATUS_LABEL.INACTIVE, variant: STATUS_BADGE_VARIANT.INACTIVE },
  { value: 'BLOCKED', label: STATUS_LABEL.BLOCKED, variant: STATUS_BADGE_VARIANT.BLOCKED },
]

/**
 * Ação a disparar ao selecionar `target` a partir de `current`. `null` quando
 * `target` já é o status atual (seleção redundante — Radix não dispara
 * `onValueChange` nesse caso, mas o helper cobre defensivamente). `unblock`
 * é usado especificamente na transição Bloqueado→Ativo (mesmo efeito de
 * domínio de `activate`, rótulo de confirmação mais claro nesse caso);
 * `activate` cobre Inativo→Ativo. Nenhuma transição é bloqueada pelo
 * Backend (`toggle-account-status.dto.ts` aceita as 4 ações independente do
 * status atual, só nega por papel/permissão) — as 3 opções ficam sempre
 * habilitadas.
 */
export function actionForTargetStatus(
  current: AccountStatusName,
  target: AccountStatusName,
): ToggleAccountStatusAction | null {
  if (target === current) return null
  if (target === 'ACTIVE') return current === 'BLOCKED' ? 'unblock' : 'activate'
  if (target === 'INACTIVE') return 'deactivate'
  return 'block'
}
