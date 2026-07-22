import { hasPermission, type PermissionKey } from '@bancaflow/access-control';
import type { AccountRoleType, PermissionChecker } from '@bancaflow/shared';
import { Injectable } from '@nestjs/common';

/**
 * Adapter compartilhado do composition root: implementa a porta genérica
 * `PermissionChecker<PermissionKey>` de `@bancaflow/shared` delegando para a
 * porta pública `hasPermission` de `@bancaflow/access-control`. Nenhum módulo
 * de domínio (Identity, Participants, ...) importa `@bancaflow/access-control`
 * em seus casos de uso, apenas a porta que este adapter implementa.
 */
@Injectable()
export class AccessControlPermissionChecker implements PermissionChecker<PermissionKey> {
  hasPermission(
    actorRole: AccountRoleType,
    permissionKey: PermissionKey,
  ): boolean {
    return hasPermission(actorRole, permissionKey);
  }
}
