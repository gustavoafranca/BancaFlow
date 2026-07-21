import { Result, ValueObject, ValueObjectConfig } from '@bancaflow/shared';

export interface UsernameValue {
  raw: string;
  normalized: string;
}

export class Username extends ValueObject<UsernameValue, ValueObjectConfig> {
  private static readonly INVALID_USERNAME = 'IDENTITY.INVALID_USERNAME';
  private static readonly FORMAT = /^[a-z0-9._-]{3,30}$/;

  private constructor(value: UsernameValue, config?: ValueObjectConfig) {
    super(value, config);
  }

  get value(): UsernameValue {
    return { raw: this._value.raw, normalized: this._value.normalized };
  }

  get raw(): string {
    return this.value.raw;
  }

  get normalized(): string {
    return this.value.normalized;
  }

  static create(value: string, config?: ValueObjectConfig): Username {
    const result = Username.tryCreate(value, config);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(value: string, config?: ValueObjectConfig): Result<Username> {
    try {
      const raw = (value ?? '').trim();
      const normalized = raw.toLowerCase();
      if (!Username.FORMAT.test(normalized)) {
        throw new Error(Username.INVALID_USERNAME);
      }
      return Result.ok(new Username({ raw, normalized }, config));
    } catch (error: any) {
      return Result.fail(error.message);
    }
  }
}
