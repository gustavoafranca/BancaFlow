import type { AccountRoleType } from '@bancaflow/shared';
import type { PermissionKey } from '@bancaflow/access-control';

/**
 * Porta de checagem de permissão consumida por Identity, seguindo o mesmo
 * padrão de dependência injetada usado por `Clock`/`SessionRepository`
 * (em vez de importar a função `hasPermission` diretamente em cada caso de
 * uso) — permite substituição em teste e evolução do adapter sem alterar
 * os casos de uso. Implementada no composition root (`apps/backend`) por um
 * adapter que delega para `hasPermission` de `@bancaflow/access-control`.
 */
export interface PermissionChecker {
  hasPermission(actorRole: AccountRoleType, permissionKey: PermissionKey): boolean;
}
