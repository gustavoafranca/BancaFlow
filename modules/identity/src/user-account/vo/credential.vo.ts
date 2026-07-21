import { Result, ValueObject, ValueObjectConfig } from '@bancaflow/shared';

export interface CredentialData {
  passwordHash: string;
  passwordChangedAt: Date;
  mustChangePassword: boolean;
}

export class Credential extends ValueObject<CredentialData, ValueObjectConfig> {
  private static readonly INVALID_CREDENTIAL = 'IDENTITY.INVALID_CREDENTIAL';

  private constructor(value: CredentialData, config?: ValueObjectConfig) {
    super(value, config);
  }

  get value(): CredentialData {
    return {
      passwordHash: this._value.passwordHash,
      passwordChangedAt: new Date(this._value.passwordChangedAt.getTime()),
      mustChangePassword: this._value.mustChangePassword,
    };
  }

  get passwordHash(): string {
    return this.value.passwordHash;
  }

  get passwordChangedAt(): Date {
    return new Date(this.value.passwordChangedAt.getTime());
  }

  get mustChangePassword(): boolean {
    return this.value.mustChangePassword;
  }

  withNewHash(hash: string, mustChangePassword: boolean, changedAt: Date): Credential {
    return Credential.create({
      passwordHash: hash,
      passwordChangedAt: changedAt,
      mustChangePassword,
    });
  }

  static create(value: CredentialData, config?: ValueObjectConfig): Credential {
    const result = Credential.tryCreate(value, config);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(value: CredentialData, config?: ValueObjectConfig): Result<Credential> {
    try {
      const hash = value?.passwordHash?.trim() ?? '';
      if (!hash) {
        throw new Error(Credential.INVALID_CREDENTIAL);
      }
      const changedAt = value.passwordChangedAt ? new Date(value.passwordChangedAt.getTime()) : new Date();
      return Result.ok(
        new Credential(
          {
            passwordHash: hash,
            passwordChangedAt: changedAt,
            mustChangePassword: value.mustChangePassword ?? false,
          },
          config,
        ),
      );
    } catch (error: any) {
      return Result.fail(error.message);
    }
  }
}
