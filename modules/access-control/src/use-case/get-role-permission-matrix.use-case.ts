import { AccountRoleType, Result, UseCase } from '@bancaflow/shared';
import { ACCESS_CONTROL_ERRORS } from '../errors/access-control.errors';
import { hasPermission } from '../has-permission';
import { PERMISSION_CATALOG } from '../permission-catalog';
import { ROLE_PERMISSION_MAP } from '../role-permission-map';
import type { RolePermissionMatrixDto } from '../dto/role-permission-matrix.dto';

export interface GetRolePermissionMatrixInput {
  actorRole: AccountRoleType;
}

const ALL_ROLES: readonly AccountRoleType[] = ['OWNER', 'ADMIN', 'USER'];

export class GetRolePermissionMatrixUseCase
  implements UseCase<GetRolePermissionMatrixInput, RolePermissionMatrixDto>
{
  async execute(data: GetRolePermissionMatrixInput): Promise<Result<RolePermissionMatrixDto>> {
    if (!hasPermission(data.actorRole, 'access-control.role-permissions.read')) {
      return Result.fail(ACCESS_CONTROL_ERRORS.FORBIDDEN);
    }

    return Result.ok({
      capabilities: PERMISSION_CATALOG.map((capability) => ({
        capability: capability.capability,
        label: capability.label,
        order: capability.order,
        permissions: capability.permissions.map((permission) => ({
          key: permission.key,
          label: permission.label,
          description: permission.description,
          order: permission.order,
          roles: ALL_ROLES.filter((role) => ROLE_PERMISSION_MAP[role].includes(permission.key)),
        })),
      })),
    });
  }
}
