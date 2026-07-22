import { Result, ValueObject, ValueObjectConfig } from '@bancaflow/shared';
import { PARTICIPANTS_ERRORS } from '../../shared/errors/participants.errors';
import { normalizeSearchText } from '../../shared/utils/normalize-text.util';

export interface CityValue {
  display: string;
  normalized: string;
}

/**
 * Cidade. Preserva o valor de exibição (trim + espaços internos colapsados) e
 * expõe um valor normalizado (minúsculas, sem acentos, espaços colapsados) para
 * busca/agrupamento analítico.
 */
export class City extends ValueObject<CityValue, ValueObjectConfig> {
  private constructor(value: CityValue, config?: ValueObjectConfig) {
    super(value, config);
  }

  get value(): CityValue {
    return { display: this._value.display, normalized: this._value.normalized };
  }

  get display(): string {
    return this._value.display;
  }

  get normalized(): string {
    return this._value.normalized;
  }

  static create(value: string, config?: ValueObjectConfig): City {
    const result = City.tryCreate(value, config);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(value: string, config?: ValueObjectConfig): Result<City> {
    const display = (value ?? '').trim().replace(/\s+/g, ' ');
    if (!display) {
      return Result.fail(PARTICIPANTS_ERRORS.INVALID_ADDRESS);
    }

    const normalized = normalizeSearchText(display);

    return Result.ok(new City({ display, normalized }, config));
  }
}
