import { hasPermission, type PermissionKey } from '@bancaflow/access-control';
import type { AccountRoleType, PermissionChecker } from '@bancaflow/identity';
import { Injectable } from '@nestjs/common';

/**
 * Adapter do composition root: implementa a porta `PermissionChecker` de
 * Identity delegando para a porta pública `hasPermission` de
 * `modules/access-control` — Identity não importa `@bancaflow/access-control`
 * diretamente em seus casos de uso, apenas a porta que define.
 */
@Injectable()
export class AccessControlPermissionChecker implements PermissionChecker {
  hasPermission(
    actorRole: AccountRoleType,
    permissionKey: PermissionKey,
  ): boolean {
    return hasPermission(actorRole, permissionKey);
  }
}
