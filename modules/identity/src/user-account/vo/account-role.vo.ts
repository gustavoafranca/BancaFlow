import { AccountRoleType, Result, ValueObject, ValueObjectConfig } from '@bancaflow/shared';

export type { AccountRoleType } from '@bancaflow/shared';

export class AccountRole extends ValueObject<AccountRoleType, ValueObjectConfig> {
  private static readonly INVALID_ACCOUNT_ROLE = 'IDENTITY.INVALID_ACCOUNT_ROLE';

  static readonly OWNER: AccountRoleType = 'OWNER';
  static readonly ADMIN: AccountRoleType = 'ADMIN';
  static readonly USER: AccountRoleType = 'USER';

  private static readonly VALUES: AccountRoleType[] = ['OWNER', 'ADMIN', 'USER'];

  private constructor(value: AccountRoleType, config?: ValueObjectConfig) {
    super(value, config);
  }

  get value(): AccountRoleType {
    return this._value;
  }

  get isOwner(): boolean {
    return this.value === 'OWNER';
  }

  get isAdmin(): boolean {
    return this.value === 'ADMIN';
  }

  get canManageAccounts(): boolean {
    return this.value === 'OWNER' || this.value === 'ADMIN';
  }

  static create(value: string, config?: ValueObjectConfig): AccountRole {
    const result = AccountRole.tryCreate(value, config);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(value: string, config?: ValueObjectConfig): Result<AccountRole> {
    try {
      const normalized = value?.trim().toUpperCase() as AccountRoleType;
      if (!AccountRole.VALUES.includes(normalized)) {
        throw new Error(AccountRole.INVALID_ACCOUNT_ROLE);
      }
      return Result.ok(new AccountRole(normalized, config));
    } catch (error: any) {
      return Result.fail(error.message);
    }
  }
}
