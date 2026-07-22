import { PaginatedInputDTO, PaginatedResultDTO, Result } from '@bancaflow/shared';
import { GetBettingAgentUseCase } from '../src/betting-agent/use-case/get-betting-agent.use-case';
import { ListBettingAgentsUseCase } from '../src/betting-agent/use-case/list-betting-agents.use-case';
import {
  BettingAgentListFilters,
  BettingAgentQuery,
} from '../src/betting-agent/query/betting-agent.query';
import {
  BettingAgentDetailDTO,
  BettingAgentListItemDTO,
} from '../src/shared/dto/betting-agent.dto';
import { PARTICIPANTS_ERRORS } from '../src/shared/errors/participants.errors';
import { RealPermissionChecker } from './support/fakes';

class StubBettingAgentQuery implements BettingAgentQuery {
  lastListBancaId?: string;
  lastGet?: { id: string; bancaId: string };
  detail: BettingAgentDetailDTO | null = null;

  async list(
    bancaId: string,
    _filters: BettingAgentListFilters,
    pagination: PaginatedInputDTO,
  ): Promise<Result<PaginatedResultDTO<BettingAgentListItemDTO>>> {
    this.lastListBancaId = bancaId;
    return Result.ok({
      data: [],
      meta: { page: pagination.page, pageSize: pagination.pageSize, total: 0, totalPages: 0 },
    });
  }

  async getDetail(id: string, bancaId: string): Promise<Result<BettingAgentDetailDTO | null>> {
    this.lastGet = { id, bancaId };
    return Result.ok(this.detail);
  }
}

describe('ListBettingAgentsUseCase', () => {
  it('autoriza OWNER, ADMIN e USER (lookup read-only do catálogo) e é tenant-scoped', async () => {
    for (const actorRole of ['OWNER', 'ADMIN', 'USER'] as const) {
      const query = new StubBettingAgentQuery();
      const useCase = new ListBettingAgentsUseCase(query, new RealPermissionChecker());
      const result = await useCase.execute({
        bancaId: 'banca-a',
        actorRole,
        page: 1,
        pageSize: 20,
      });
      expect(result.isFailure).toBe(false);
      expect(query.lastListBancaId).toBe('banca-a');
    }
  });
});

describe('GetBettingAgentUseCase', () => {
  it('retorna NOT_FOUND para id inexistente ou de outra Banca (sem revelar existência)', async () => {
    const query = new StubBettingAgentQuery();
    query.detail = null; // adapter retorna null quando o id não pertence à Banca
    const useCase = new GetBettingAgentUseCase(query, new RealPermissionChecker());

    const result = await useCase.execute({ id: 'x', bancaId: 'banca-a', actorRole: 'USER' });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([PARTICIPANTS_ERRORS.BETTING_AGENT_NOT_FOUND]);
    expect(query.lastGet).toEqual({ id: 'x', bancaId: 'banca-a' });
  });

  it('retorna o detalhe quando encontrado na própria Banca', async () => {
    const query = new StubBettingAgentQuery();
    query.detail = {
      id: 'ag-1',
      code: '001',
      status: 'ACTIVE',
      party: { id: 'p-1', name: null, nickname: null, contacts: [], address: null },
      policy: {
        type: 'PERCENTAGE_ON_SALES',
        percentage: 10,
        weeklyFixedAmountCents: null,
        effectiveFrom: '2026-07-21T12:00:00.000Z',
        effectiveTo: null,
      },
      createdAt: '2026-07-21T12:00:00.000Z',
    };
    const useCase = new GetBettingAgentUseCase(query, new RealPermissionChecker());

    const result = await useCase.execute({ id: 'ag-1', bancaId: 'banca-a', actorRole: 'ADMIN' });

    expect(result.isFailure).toBe(false);
    expect(result.instance.code).toBe('001');
  });
});
