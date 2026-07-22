import { Result, ValueObject, ValueObjectConfig } from '@bancaflow/shared';
import { PARTICIPANTS_ERRORS } from '../../shared/errors/participants.errors';
import { normalizeSearchText } from '../../shared/utils/normalize-text.util';

export interface NeighborhoodValue {
  display: string;
  normalized: string;
}

/**
 * Bairro. Preserva o valor de exibição (trim + espaços internos colapsados) e
 * expõe um valor normalizado (minúsculas, sem acentos, espaços colapsados) para
 * busca/agrupamento analítico — `"Centro"` e `" centro "` produzem o mesmo
 * `normalized` mas mantêm exibições distintas.
 */
export class Neighborhood extends ValueObject<NeighborhoodValue, ValueObjectConfig> {
  private constructor(value: NeighborhoodValue, config?: ValueObjectConfig) {
    super(value, config);
  }

  get value(): NeighborhoodValue {
    return { display: this._value.display, normalized: this._value.normalized };
  }

  get display(): string {
    return this._value.display;
  }

  get normalized(): string {
    return this._value.normalized;
  }

  static create(value: string, config?: ValueObjectConfig): Neighborhood {
    const result = Neighborhood.tryCreate(value, config);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(value: string, config?: ValueObjectConfig): Result<Neighborhood> {
    const display = (value ?? '').trim().replace(/\s+/g, ' ');
    if (!display) {
      return Result.fail(PARTICIPANTS_ERRORS.INVALID_ADDRESS);
    }

    const normalized = normalizeSearchText(display);

    return Result.ok(new Neighborhood({ display, normalized }, config));
  }
}
