import { AccountRoleType, Result, TransactionManager, UseCase } from '@bancaflow/shared';
import { BettingAgentRepository } from '../betting-agent.repository';
import { CompensationPolicyInput, CompensationPolicyValue } from '../vo/compensation-policy.vo';
import { PARTICIPANTS_ERRORS } from '../../shared/errors/participants.errors';
import { Clock } from '../../shared/ports/clock.port';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';

export interface UpdateBettingAgentPolicyInput {
  id: string;
  bancaId: string;
  actorRole: AccountRoleType;
  policy: CompensationPolicyInput;
}

export interface UpdateBettingAgentPolicyOutput {
  bettingAgentId: string;
  policy: CompensationPolicyValue;
}

/**
 * Altera a política de remuneração vigente de um `BettingAgent` existente
 * (`enable-betting-agent-policy-update`, D1/D3/D4). Mesma permissão de
 * `participants.betting-agents.update` usada por cadastro/status (hoje só
 * OWNER/ADMIN) — sem chave dedicada. Fecha a vigência anterior e abre uma
 * nova a partir de agora; nunca sobrescreve/apaga histórico. Recurso de
 * outra Banca (ou inexistente) responde como não encontrado.
 */
export class UpdateBettingAgentPolicyUseCase
  implements UseCase<UpdateBettingAgentPolicyInput, UpdateBettingAgentPolicyOutput>
{
  constructor(
    private readonly bettingAgents: BettingAgentRepository,
    private readonly permissions: PermissionChecker,
    private readonly clock: Clock,
    private readonly tx: TransactionManager,
  ) {}

  async execute(
    data: UpdateBettingAgentPolicyInput,
  ): Promise<Result<UpdateBettingAgentPolicyOutput>> {
    if (!this.permissions.hasPermission(data.actorRole, 'participants.betting-agents.update')) {
      return Result.fail(PARTICIPANTS_ERRORS.FORBIDDEN);
    }

    const agentResult = await this.bettingAgents.findById(data.id, data.bancaId);
    if (agentResult.isFailure) {
      return Result.fail(agentResult.errors!);
    }
    const agent = agentResult.instance;
    if (!agent) {
      return Result.fail(PARTICIPANTS_ERRORS.BETTING_AGENT_NOT_FOUND);
    }

    const updatedResult = agent.changePolicy(data.policy, this.clock.now());
    if (updatedResult.isFailure) {
      return Result.fail(updatedResult.errors!);
    }
    const updatedAgent = updatedResult.instance;

    return this.tx.runInTransactionResult<UpdateBettingAgentPolicyOutput>(async () => {
      const saved = await this.bettingAgents.updatePolicy(updatedAgent);
      if (saved.isFailure) {
        return Result.fail(saved.errors!);
      }
      return Result.ok({ bettingAgentId: updatedAgent.id, policy: updatedAgent.policy.value });
    });
  }
}
