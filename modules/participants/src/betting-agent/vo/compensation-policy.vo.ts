import { Result, ValueObject, ValueObjectConfig } from '@bancaflow/shared';
import { PARTICIPANTS_ERRORS } from '../../shared/errors/participants.errors';

export type CompensationPolicyType =
  | 'PERCENTAGE_ON_SALES'
  | 'FIXED_WEEKLY'
  | 'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES';

/**
 * Valor da política. Dinheiro é sempre inteiro em centavos (`weeklyFixedAmountCents`),
 * nunca ponto flutuante binário. Percentual é um número em pontos percentuais
 * `(0, 100]` (persistido como `Decimal` no banco).
 */
export type CompensationPolicyValue =
  | { type: 'PERCENTAGE_ON_SALES'; percentage: number }
  | { type: 'FIXED_WEEKLY'; weeklyFixedAmountCents: number }
  | {
      type: 'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES';
      weeklyFixedAmountCents: number;
      percentage: number;
    };

export interface CompensationPolicyInput {
  type: string;
  percentage?: number | null;
  weeklyFixedAmountCents?: number | null;
}

/**
 * Política de remuneração como união discriminada. Aceita somente os três tipos
 * aprovados (D27); `FIXED_PER_ENTRY` e tipos desconhecidos são rejeitados. Cada
 * tipo valida os próprios valores (percentual em `(0, 100]`; valor fixo inteiro
 * positivo em centavos).
 */
export class CompensationPolicy extends ValueObject<CompensationPolicyValue, ValueObjectConfig> {
  private constructor(value: CompensationPolicyValue, config?: ValueObjectConfig) {
    super(value, config);
  }

  /** Cópia defensiva: nunca expõe o objeto interno por referência. */
  get value(): CompensationPolicyValue {
    return { ...this._value };
  }

  get type(): CompensationPolicyType {
    return this._value.type;
  }

  static create(input: CompensationPolicyInput, config?: ValueObjectConfig): CompensationPolicy {
    const result = CompensationPolicy.tryCreate(input, config);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(
    input: CompensationPolicyInput,
    config?: ValueObjectConfig,
  ): Result<CompensationPolicy> {
    const type = (input?.type ?? '').trim().toUpperCase();

    switch (type) {
      case 'PERCENTAGE_ON_SALES': {
        const percentage = CompensationPolicy.validPercentage(input.percentage);
        if (percentage === null) {
          return Result.fail(PARTICIPANTS_ERRORS.INVALID_POLICY);
        }
        return Result.ok(new CompensationPolicy({ type: 'PERCENTAGE_ON_SALES', percentage }, config));
      }

      case 'FIXED_WEEKLY': {
        const amount = CompensationPolicy.validAmountCents(input.weeklyFixedAmountCents);
        if (amount === null) {
          return Result.fail(PARTICIPANTS_ERRORS.INVALID_POLICY);
        }
        return Result.ok(
          new CompensationPolicy({ type: 'FIXED_WEEKLY', weeklyFixedAmountCents: amount }, config),
        );
      }

      case 'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES': {
        const percentage = CompensationPolicy.validPercentage(input.percentage);
        const amount = CompensationPolicy.validAmountCents(input.weeklyFixedAmountCents);
        if (percentage === null || amount === null) {
          return Result.fail(PARTICIPANTS_ERRORS.INVALID_POLICY);
        }
        return Result.ok(
          new CompensationPolicy(
            {
              type: 'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES',
              weeklyFixedAmountCents: amount,
              percentage,
            },
            config,
          ),
        );
      }

      default:
        // Inclui `FIXED_PER_ENTRY`, vazio e qualquer tipo desconhecido.
        return Result.fail(PARTICIPANTS_ERRORS.INVALID_POLICY);
    }
  }

  private static validPercentage(value: number | null | undefined): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }
    if (value <= 0 || value > 100) {
      return null;
    }
    return value;
  }

  private static validAmountCents(value: number | null | undefined): number | null {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      return null;
    }
    return value;
  }
}
