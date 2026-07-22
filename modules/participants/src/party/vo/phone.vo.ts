import { Result, ValueObject, ValueObjectConfig } from '@bancaflow/shared';
import { PARTICIPANTS_ERRORS } from '../../shared/errors/participants.errors';

/**
 * Telefone brasileiro normalizado. A entrada é reduzida a dígitos (removendo
 * máscara, espaços e um eventual código de país `55`); o valor normalizado
 * (10 dígitos para fixo com DDD, 11 para celular com DDD) é usado para exibição
 * e para a detecção heurística de duplicidade por telefone. Não existe `Phone`
 * genérico em `@bancaflow/shared`.
 */
export class Phone extends ValueObject<string, ValueObjectConfig> {
  private constructor(value: string, config?: ValueObjectConfig) {
    super(value, config);
  }

  get value(): string {
    return this._value;
  }

  static create(value: string, config?: ValueObjectConfig): Phone {
    const result = Phone.tryCreate(value, config);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(value: string, config?: ValueObjectConfig): Result<Phone> {
    let digits = (value ?? '').replace(/\D/g, '');

    // Remove código de país do Brasil quando presente (12/13 dígitos com "55").
    if (digits.length > 11 && digits.startsWith('55')) {
      digits = digits.slice(2);
    }

    if (digits.length !== 10 && digits.length !== 11) {
      return Result.fail(PARTICIPANTS_ERRORS.INVALID_PHONE);
    }

    return Result.ok(new Phone(digits, config));
  }
}
