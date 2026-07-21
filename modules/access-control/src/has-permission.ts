import type { AccountRoleType } from '@bancaflow/shared';
import { ROLE_PERMISSION_MAP } from './role-permission-map';
import type { PermissionKey } from './permission-key';

/**
 * Porta única de checagem de autorização por papel/ação. Função total e pura:
 * nunca lança, pois `permissionKey` já é restrita ao catálogo fechado pelo tipo
 * `PermissionKey` — validação de valores não tipados é responsabilidade de
 * `parsePermissionKey`, nunca desta função.
 */
export function hasPermission(actorRole: AccountRoleType, permissionKey: PermissionKey): boolean {
  return ROLE_PERMISSION_MAP[actorRole].includes(permissionKey);
}
