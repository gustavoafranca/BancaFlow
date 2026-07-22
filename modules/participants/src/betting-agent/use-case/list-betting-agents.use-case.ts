import {
  AccountRoleType,
  PaginatedInputDTO,
  PaginatedResultDTO,
  Result,
  UseCase,
} from '@bancaflow/shared';
import type { BettingAgentListItemDTO } from '../../shared/dto/betting-agent.dto';
import { PARTICIPANTS_ERRORS } from '../../shared/errors/participants.errors';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';
import { BettingAgentQuery } from '../query/betting-agent.query';

export interface ListBettingAgentsInput {
  bancaId: string;
  actorRole: AccountRoleType;
  search?: string;
  page: number;
  pageSize: number;
}

/**
 * Lista Cambistas da própria Banca (tenant-scoped), com busca parcial por
 * código/nome/apelido e paginação. Autoriza via `hasPermission`. Delega a
 * projeção ao `BettingAgentQuery` — nunca retorna entidades.
 */
export class ListBettingAgentsUseCase
  implements UseCase<ListBettingAgentsInput, PaginatedResultDTO<BettingAgentListItemDTO>>
{
  constructor(
    private readonly query: BettingAgentQuery,
    private readonly permissions: PermissionChecker,
  ) {}

  async execute(
    data: ListBettingAgentsInput,
  ): Promise<Result<PaginatedResultDTO<BettingAgentListItemDTO>>> {
    if (!this.permissions.hasPermission(data.actorRole, 'participants.betting-agents.list')) {
      return Result.fail(PARTICIPANTS_ERRORS.FORBIDDEN);
    }

    const pagination: PaginatedInputDTO = {
      page: Number.isInteger(data.page) && data.page > 0 ? data.page : 1,
      pageSize: Number.isInteger(data.pageSize) && data.pageSize > 0 ? Math.min(data.pageSize, 100) : 20,
    };

    return this.query.list(data.bancaId, { search: data.search?.trim() || undefined }, pagination);
  }
}
