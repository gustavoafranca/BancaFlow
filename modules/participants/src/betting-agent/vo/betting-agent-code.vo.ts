import { Result, ValueObject, ValueObjectConfig } from '@bancaflow/shared';
import { PARTICIPANTS_ERRORS } from '../../shared/errors/participants.errors';

/**
 * Código/talão do Cambista. Texto contendo somente dígitos, com trim externo e
 * zeros à esquerda preservados (`"001"` permanece `"001"`). NUNCA é convertido
 * para número. Imutável e único por Banca (constraint `(bancaId, code)` no banco).
 */
export class BettingAgentCode extends ValueObject<string, ValueObjectConfig> {
  private static readonly DIGITS_ONLY = /^\d+$/;

  private constructor(value: string, config?: ValueObjectConfig) {
    super(value, config);
  }

  get value(): string {
    return this._value;
  }

  static create(value: string, config?: ValueObjectConfig): BettingAgentCode {
    const result = BettingAgentCode.tryCreate(value, config);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(value: string, config?: ValueObjectConfig): Result<BettingAgentCode> {
    const normalized = (value ?? '').trim();

    if (!normalized || !BettingAgentCode.DIGITS_ONLY.test(normalized)) {
      return Result.fail(PARTICIPANTS_ERRORS.INVALID_CODE);
    }

    return Result.ok(new BettingAgentCode(normalized, config));
  }
}
