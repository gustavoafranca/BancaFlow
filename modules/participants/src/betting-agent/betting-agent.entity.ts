import { Entity, EntityProps, Id, Result } from '@bancaflow/shared';
import { CompensationPolicy, CompensationPolicyInput } from './vo/compensation-policy.vo';
import { BettingAgentCode } from './vo/betting-agent-code.vo';
import { BettingAgentStatus, BettingAgentStatusType } from './vo/betting-agent-status.vo';
import { EffectivePeriod } from '../party/vo/effective-period.vo';

export interface BettingAgentProps extends EntityProps {
  bancaId: string;
  partyId: string;
  code: string; // valor bruto (dígitos)
  status?: string;
  policy: CompensationPolicyInput;
  policyEffectiveFrom: Date;
  policyEffectiveTo?: Date | null;
  createdBy: string;
}

/**
 * Agregado operacional do Cambista. Referencia exatamente uma `Party` e sempre
 * possui uma política vigente (aberta) iniciando na criação (D27). O estado
 * inicial é `ACTIVE`. `tryCreate` serve tanto para criação nova (id gerado pelo
 * repositório) quanto para reconstrução a partir do banco (id/timestamps
 * fornecidos pelo adapter).
 *
 * A invariante "Party e BettingAgent na mesma Banca" é coordenada pelo caso de
 * uso `CreateBettingAgent` (ambos criados com o mesmo `bancaId` do contexto).
 */
export class BettingAgent extends Entity<BettingAgent, BettingAgentProps> {
  private constructor(props: BettingAgentProps) {
    super(props);
  }

  private rebuild(overrides: Partial<BettingAgentProps>): Result<BettingAgent> {
    return BettingAgent.tryCreate({ ...this.props, ...overrides });
  }

  get bancaId(): string {
    return this.props.bancaId;
  }

  get partyId(): string {
    return this.props.partyId;
  }

  get code(): BettingAgentCode {
    return BettingAgentCode.create(this.props.code);
  }

  get status(): BettingAgentStatus {
    return BettingAgentStatus.create(this.props.status ?? BettingAgentStatus.ACTIVE);
  }

  get policy(): CompensationPolicy {
    return CompensationPolicy.create(this.props.policy);
  }

  get policyPeriod(): EffectivePeriod {
    return EffectivePeriod.create({
      effectiveFrom: this.props.policyEffectiveFrom,
      effectiveTo: this.props.policyEffectiveTo ?? null,
    });
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  /** Transição de status (D-status). O caso de uso decide idempotência antes de chamar. */
  setStatus(status: BettingAgentStatusType, now: Date): Result<BettingAgent> {
    const statusResult = BettingAgentStatus.tryCreate(status);
    if (statusResult.isFailure) {
      return Result.fail(statusResult.errors!);
    }
    return Result.ok(
      new BettingAgent({ ...this.props, status: statusResult.instance.value, updatedAt: now }),
    );
  }

  static create(props: BettingAgentProps): BettingAgent {
    const result = BettingAgent.tryCreate(props);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(props: BettingAgentProps): Result<BettingAgent> {
    const id = Id.tryCreate(props.id);
    const bancaId = Id.tryCreate(props.bancaId);
    const partyId = Id.tryCreate(props.partyId);
    const createdBy = Id.tryCreate(props.createdBy);
    const code = BettingAgentCode.tryCreate(props.code);
    const status = BettingAgentStatus.tryCreate(props.status ?? BettingAgentStatus.ACTIVE);
    const policy = CompensationPolicy.tryCreate(props.policy);
    const policyPeriod = EffectivePeriod.tryCreate({
      effectiveFrom: props.policyEffectiveFrom,
      effectiveTo: props.policyEffectiveTo ?? null,
    });

    const attrs = Result.combine([
      id,
      bancaId,
      partyId,
      createdBy,
      code,
      status,
      policy,
      policyPeriod,
    ]);
    if (attrs.isFailure) {
      return Result.fail(attrs.errors!);
    }

    return Result.ok(
      new BettingAgent({
        ...props,
        id: id.instance.value,
        bancaId: bancaId.instance.value,
        partyId: partyId.instance.value,
        createdBy: createdBy.instance.value,
        code: code.instance.value,
        status: status.instance.value,
        policy: policy.instance.value,
        policyEffectiveFrom: policyPeriod.instance.effectiveFrom,
        policyEffectiveTo: policyPeriod.instance.effectiveTo,
      }),
    );
  }
}
