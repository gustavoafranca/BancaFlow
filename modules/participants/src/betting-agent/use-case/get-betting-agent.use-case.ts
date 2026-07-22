import { AccountRoleType, Result, UseCase } from '@bancaflow/shared';
import type { BettingAgentDetailDTO } from '../../shared/dto/betting-agent.dto';
import { PARTICIPANTS_ERRORS } from '../../shared/errors/participants.errors';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';
import { BettingAgentQuery } from '../query/betting-agent.query';

export interface GetBettingAgentInput {
  id: string;
  bancaId: string;
  actorRole: AccountRoleType;
}

/**
 * Consulta o detalhe de um Cambista da própria Banca (tenant-scoped). Autoriza
 * via `hasPermission`. Recurso inexistente OU de outra Banca retorna
 * `BETTING_AGENT_NOT_FOUND` sem revelar existência.
 */
export class GetBettingAgentUseCase
  implements UseCase<GetBettingAgentInput, BettingAgentDetailDTO>
{
  constructor(
    private readonly query: BettingAgentQuery,
    private readonly permissions: PermissionChecker,
  ) {}

  async execute(data: GetBettingAgentInput): Promise<Result<BettingAgentDetailDTO>> {
    if (!this.permissions.hasPermission(data.actorRole, 'participants.betting-agents.read')) {
      return Result.fail(PARTICIPANTS_ERRORS.FORBIDDEN);
    }

    const found = await this.query.getDetail(data.id, data.bancaId);
    if (found.isFailure) {
      return Result.fail(found.errors!);
    }
    if (!found.instance) {
      return Result.fail(PARTICIPANTS_ERRORS.BETTING_AGENT_NOT_FOUND);
    }

    return Result.ok(found.instance);
  }
}
