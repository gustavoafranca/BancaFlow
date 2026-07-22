import { AccountRoleType, Result, TransactionManager, UseCase } from '@bancaflow/shared';
import { BettingAgentRepository } from '../betting-agent.repository';
import { BettingAgentStatusType } from '../vo/betting-agent-status.vo';
import { PARTICIPANTS_ERRORS } from '../../shared/errors/participants.errors';
import { Clock } from '../../shared/ports/clock.port';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';

export interface SetBettingAgentStatusInput {
  id: string;
  bancaId: string;
  actorRole: AccountRoleType;
  status: BettingAgentStatusType;
}

export interface SetBettingAgentStatusOutput {
  bettingAgentId: string;
  status: BettingAgentStatusType;
}

/**
 * Alterna o status do `BettingAgent` entre `ACTIVE`/`INACTIVE`. Idempotente:
 * repetir a mesma transição não escreve no banco nem falha (curto-circuita
 * antes da transação). Recurso de outra Banca (ou inexistente) responde como
 * não encontrado.
 */
export class SetBettingAgentStatusUseCase
  implements UseCase<SetBettingAgentStatusInput, SetBettingAgentStatusOutput>
{
  constructor(
    private readonly bettingAgents: BettingAgentRepository,
    private readonly permissions: PermissionChecker,
    private readonly clock: Clock,
    private readonly tx: TransactionManager,
  ) {}

  async execute(data: SetBettingAgentStatusInput): Promise<Result<SetBettingAgentStatusOutput>> {
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

    if (agent.status.value === data.status) {
      return Result.ok({ bettingAgentId: agent.id, status: agent.status.value });
    }

    const updatedResult = agent.setStatus(data.status, this.clock.now());
    if (updatedResult.isFailure) {
      return Result.fail(updatedResult.errors!);
    }
    const updatedAgent = updatedResult.instance;

    return this.tx.runInTransactionResult<SetBettingAgentStatusOutput>(async () => {
      const saved = await this.bettingAgents.updateStatus(updatedAgent);
      if (saved.isFailure) {
        return Result.fail(saved.errors!);
      }
      return Result.ok({ bettingAgentId: updatedAgent.id, status: updatedAgent.status.value });
    });
  }
}
