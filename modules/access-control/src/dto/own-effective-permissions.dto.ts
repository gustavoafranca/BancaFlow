import type { AccountRoleType } from '@bancaflow/shared';
import type { PermissionKey } from '../permission-key';

export interface OwnEffectivePermissionEntryDto {
  key: PermissionKey;
  label: string;
}

export interface OwnEffectivePermissionsDto {
  role: AccountRoleType;
  permissions: OwnEffectivePermissionEntryDto[];
}
