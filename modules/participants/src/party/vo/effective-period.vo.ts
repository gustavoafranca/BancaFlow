import { Result, ValueObject, ValueObjectConfig } from '@bancaflow/shared';

export interface EffectivePeriodValue {
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export interface EffectivePeriodInput {
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}

/**
 * Vigência versionável: início obrigatório, fim opcional (aberto). Usada pelo
 * endereço da Party e pela política do BettingAgent. Se `effectiveTo` for
 * informado, deve ser estritamente posterior a `effectiveFrom`. Os getters
 * retornam cópias de `Date` para preservar a imutabilidade do VO.
 */
export class EffectivePeriod extends ValueObject<EffectivePeriodValue, ValueObjectConfig> {
  private static readonly INVALID = 'PARTICIPANTS.INVALID_EFFECTIVE_PERIOD';

  private constructor(value: EffectivePeriodValue, config?: ValueObjectConfig) {
    super(value, config);
  }

  get effectiveFrom(): Date {
    return new Date(this._value.effectiveFrom.getTime());
  }

  get effectiveTo(): Date | null {
    return this._value.effectiveTo ? new Date(this._value.effectiveTo.getTime()) : null;
  }

  get isOpenEnded(): boolean {
    return this._value.effectiveTo === null;
  }

  static create(input: EffectivePeriodInput, config?: ValueObjectConfig): EffectivePeriod {
    const result = EffectivePeriod.tryCreate(input, config);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(input: EffectivePeriodInput, config?: ValueObjectConfig): Result<EffectivePeriod> {
    const from = input?.effectiveFrom;
    if (!(from instanceof Date) || Number.isNaN(from.getTime())) {
      return Result.fail(EffectivePeriod.INVALID);
    }

    const to = input.effectiveTo ?? null;
    if (to !== null) {
      if (!(to instanceof Date) || Number.isNaN(to.getTime()) || to.getTime() <= from.getTime()) {
        return Result.fail(EffectivePeriod.INVALID);
      }
    }

    return Result.ok(
      new EffectivePeriod(
        { effectiveFrom: new Date(from.getTime()), effectiveTo: to ? new Date(to.getTime()) : null },
        config,
      ),
    );
  }
}
