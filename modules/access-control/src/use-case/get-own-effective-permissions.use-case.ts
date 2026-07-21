import { AccountRoleType, Result, UseCase } from '@bancaflow/shared';
import { PERMISSION_CATALOG_ENTRIES } from '../permission-catalog';
import { ROLE_PERMISSION_MAP } from '../role-permission-map';
import type { OwnEffectivePermissionsDto } from '../dto/own-effective-permissions.dto';

export interface GetOwnEffectivePermissionsInput {
  actorRole: AccountRoleType;
}

export class GetOwnEffectivePermissionsUseCase
  implements UseCase<GetOwnEffectivePermissionsInput, OwnEffectivePermissionsDto>
{
  async execute(data: GetOwnEffectivePermissionsInput): Promise<Result<OwnEffectivePermissionsDto>> {
    const own = new Set(ROLE_PERMISSION_MAP[data.actorRole]);
    return Result.ok({
      role: data.actorRole,
      permissions: PERMISSION_CATALOG_ENTRIES.filter((entry) => own.has(entry.key)).map((entry) => ({
        key: entry.key,
        label: entry.label,
      })),
    });
  }
}
