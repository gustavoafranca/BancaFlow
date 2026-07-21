import { Result, ValueObject, ValueObjectConfig } from '@bancaflow/shared';

export type AccountStatusType = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export class AccountStatus extends ValueObject<AccountStatusType, ValueObjectConfig> {
  private static readonly INVALID_ACCOUNT_STATUS = 'IDENTITY.INVALID_ACCOUNT_STATUS';

  static readonly ACTIVE: AccountStatusType = 'ACTIVE';
  static readonly INACTIVE: AccountStatusType = 'INACTIVE';
  static readonly BLOCKED: AccountStatusType = 'BLOCKED';

  private static readonly VALUES: AccountStatusType[] = ['ACTIVE', 'INACTIVE', 'BLOCKED'];

  private constructor(value: AccountStatusType, config?: ValueObjectConfig) {
    super(value, config);
  }

  get value(): AccountStatusType {
    return this._value;
  }

  get isActive(): boolean {
    return this.value === 'ACTIVE';
  }

  static create(value: string, config?: ValueObjectConfig): AccountStatus {
    const result = AccountStatus.tryCreate(value, config);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(value: string, config?: ValueObjectConfig): Result<AccountStatus> {
    try {
      const normalized = value?.trim().toUpperCase() as AccountStatusType;
      if (!AccountStatus.VALUES.includes(normalized)) {
        throw new Error(AccountStatus.INVALID_ACCOUNT_STATUS);
      }
      return Result.ok(new AccountStatus(normalized, config));
    } catch (error: any) {
      return Result.fail(error.message);
    }
  }
}
