import { Result, ValueObject, ValueObjectConfig } from '@bancaflow/shared';
import { PARTICIPANTS_ERRORS } from '../../shared/errors/participants.errors';

export type BettingAgentStatusType = 'ACTIVE' | 'INACTIVE';

/**
 * Estado operacional do Cambista. A criação sempre inicia `ACTIVE`; o ciclo de
 * vida `ACTIVE`⇄`INACTIVE` é alternado explicitamente por `SetBettingAgentStatus`.
 */
export class BettingAgentStatus extends ValueObject<BettingAgentStatusType, ValueObjectConfig> {
  static readonly ACTIVE: BettingAgentStatusType = 'ACTIVE';
  static readonly INACTIVE: BettingAgentStatusType = 'INACTIVE';

  private static readonly VALUES: BettingAgentStatusType[] = ['ACTIVE', 'INACTIVE'];

  private constructor(value: BettingAgentStatusType, config?: ValueObjectConfig) {
    super(value, config);
  }

  get value(): BettingAgentStatusType {
    return this._value;
  }

  get isActive(): boolean {
    return this._value === 'ACTIVE';
  }

  static create(value: string, config?: ValueObjectConfig): BettingAgentStatus {
    const result = BettingAgentStatus.tryCreate(value, config);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(value: string, config?: ValueObjectConfig): Result<BettingAgentStatus> {
    const normalized = (value ?? '').trim().toUpperCase() as BettingAgentStatusType;
    if (!BettingAgentStatus.VALUES.includes(normalized)) {
      // `status` chega da entrada do usuário no PATCH de status; um valor fora
      // de `ACTIVE`/`INACTIVE` é rejeitado com o erro estável do catálogo.
      return Result.fail(PARTICIPANTS_ERRORS.INVALID_STATUS);
    }
    return Result.ok(new BettingAgentStatus(normalized, config));
  }
}
