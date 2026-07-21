import { Result, ValueObject, ValueObjectConfig } from '@bancaflow/shared';
import { TENANCY_ERRORS } from '../../shared/errors/tenancy.errors';

export interface CodigoBancaValue {
  raw: string;
  normalized: string;
}

export class CodigoBanca extends ValueObject<CodigoBancaValue, ValueObjectConfig> {
  // Começa/termina com [a-z0-9], 3 a 30 caracteres, permite hífen no meio.
  private static readonly FORMAT = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;
  private static readonly RESERVED: string[] = ['www', 'api', 'admin', 'app', 'status'];

  private constructor(value: CodigoBancaValue, config?: ValueObjectConfig) {
    super(value, config);
  }

  /** Cópia defensiva: nunca expõe o objeto interno por referência. */
  get value(): CodigoBancaValue {
    return { raw: this._value.raw, normalized: this._value.normalized };
  }

  get raw(): string {
    return this.value.raw;
  }

  get normalized(): string {
    return this.value.normalized;
  }

  static create(value: string, config?: ValueObjectConfig): CodigoBanca {
    const result = CodigoBanca.tryCreate(value, config);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(value: string, config?: ValueObjectConfig): Result<CodigoBanca> {
    const raw = (value ?? '').trim();
    const normalized = raw.toLowerCase();

    if (!CodigoBanca.FORMAT.test(normalized)) {
      return Result.fail(TENANCY_ERRORS.CODIGO_INVALID);
    }

    if (CodigoBanca.RESERVED.includes(normalized)) {
      return Result.fail(TENANCY_ERRORS.CODIGO_RESERVED);
    }

    return Result.ok(new CodigoBanca({ raw, normalized }, config));
  }
}
