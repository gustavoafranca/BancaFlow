import type { AccountRoleType } from '@bancaflow/shared';
import type { PermissionKey } from '../permission-key';

export interface RolePermissionEntryDto {
  key: PermissionKey;
  label: string;
  description: string;
  order: number;
  roles: AccountRoleType[];
}

export interface RolePermissionCapabilityDto {
  capability: string;
  label: string;
  order: number;
  permissions: RolePermissionEntryDto[];
}

export interface RolePermissionMatrixDto {
  capabilities: RolePermissionCapabilityDto[];
}
