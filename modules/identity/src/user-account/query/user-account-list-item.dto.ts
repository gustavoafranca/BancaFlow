import type { AccountRoleType } from '@bancaflow/shared';
import type { AccountStatusType } from '../vo/account-status.vo';

export interface UserAccountListItemDto {
  userId: string;
  username: string;
  name: string;
  email: string | null;
  role: AccountRoleType;
  status: AccountStatusType;
  createdAt: Date;
}
