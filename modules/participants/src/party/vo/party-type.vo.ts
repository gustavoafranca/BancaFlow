import { Result, ValueObject, ValueObjectConfig } from '@bancaflow/shared';
import { PARTICIPANTS_ERRORS } from '../../shared/errors/participants.errors';

export type PartyTypeValue = 'PERSON' | 'ORGANIZATION';

/**
 * Tipo de Party. Neste incremento (D29) somente `PERSON` é aceita; `ORGANIZATION`
 * é rejeitada e fica para um incremento posterior.
 */
export class PartyType extends ValueObject<PartyTypeValue, ValueObjectConfig> {
  static readonly PERSON: PartyTypeValue = 'PERSON';

  private constructor(value: PartyTypeValue, config?: ValueObjectConfig) {
    super(value, config);
  }

  get value(): PartyTypeValue {
    return this._value;
  }

  static create(value: string, config?: ValueObjectConfig): PartyType {
    const result = PartyType.tryCreate(value, config);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(value: string, config?: ValueObjectConfig): Result<PartyType> {
    const normalized = (value ?? '').trim().toUpperCase();
    if (normalized !== 'PERSON') {
      return Result.fail(PARTICIPANTS_ERRORS.INVALID_PARTY_TYPE);
    }
    return Result.ok(new PartyType('PERSON', config));
  }
}
