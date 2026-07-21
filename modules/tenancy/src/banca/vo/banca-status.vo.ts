import { Result, ValueObject, ValueObjectConfig } from '@bancaflow/shared';
import { TENANCY_ERRORS } from '../../shared/errors/tenancy.errors';

export type BancaStatusType = 'ACTIVE' | 'INACTIVE';

export class BancaStatus extends ValueObject<BancaStatusType, ValueObjectConfig> {
  static readonly ACTIVE: BancaStatusType = 'ACTIVE';
  static readonly INACTIVE: BancaStatusType = 'INACTIVE';

  private static readonly VALUES: BancaStatusType[] = ['ACTIVE', 'INACTIVE'];

  private constructor(value: BancaStatusType, config?: ValueObjectConfig) {
    super(value, config);
  }

  get value(): BancaStatusType {
    return this._value;
  }

  get isActive(): boolean {
    return this.value === 'ACTIVE';
  }

  static create(value: string, config?: ValueObjectConfig): BancaStatus {
    const result = BancaStatus.tryCreate(value, config);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(value: string, config?: ValueObjectConfig): Result<BancaStatus> {
    const normalized = value?.trim().toUpperCase() as BancaStatusType;
    if (!BancaStatus.VALUES.includes(normalized)) {
      return Result.fail(TENANCY_ERRORS.STATUS_INVALID);
    }
    return Result.ok(new BancaStatus(normalized, config));
  }
}
