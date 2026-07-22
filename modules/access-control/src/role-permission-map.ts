import type { AccountRoleType } from '@bancaflow/shared';
import { PERMISSION_KEYS, type PermissionKey } from './permission-key';

/**
 * Mapeamento fixo papel → conjunto de permissões, definido em código-fonte,
 * idêntico para todas as Bancas. Política de domínio imutável, não agregado.
 *
 * Nesta versão, administração de contas de terceiro e leitura da matriz
 * completa são exclusivas de OWNER — ADMIN não administra usuários nem
 * permissões (decisão de escopo de `enable-tenant-user-administration`,
 * que reverte o que `establish-authoritative-role-permissions` havia
 * concedido a ADMIN para essas três chaves).
 */
export const ROLE_PERMISSION_MAP: Readonly<Record<AccountRoleType, readonly PermissionKey[]>> = {
  OWNER: [...PERMISSION_KEYS],
  ADMIN: [
    'identity.profile.read-own',
    'identity.profile.update-own',
    'identity.password.change-own',
    'participants.betting-agents.create',
    'participants.betting-agents.update',
    'participants.betting-agents.list',
    'participants.betting-agents.read',
  ],
  USER: [
    'identity.profile.read-own',
    'identity.profile.update-own',
    'identity.password.change-own',
    'participants.betting-agents.list',
    'participants.betting-agents.read',
  ],
};
