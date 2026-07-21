import { Id, PaginatedInputDTO, PaginatedResultDTO, Result } from '@bancaflow/shared';
import { ListUserAccountsUseCase } from '../src/user-account/use-case/list-user-accounts.use-case';
import {
  ListUserAccountsFilter,
  ListUserAccountsQuery,
} from '../src/user-account/query/list-user-accounts.query';
import { UserAccountListItemDto } from '../src/user-account/query/user-account-list-item.dto';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';
import { RealPermissionChecker } from './support/fakes';

const BANCA_ID = Id.createUUID();

class FakeListUserAccountsQuery implements ListUserAccountsQuery {
  lastFilter?: ListUserAccountsFilter;
  lastPagination?: PaginatedInputDTO;
  result: PaginatedResultDTO<UserAccountListItemDto> = {
    data: [],
    meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  };

  async execute(
    filter: ListUserAccountsFilter,
    pagination: PaginatedInputDTO,
  ): Promise<Result<PaginatedResultDTO<UserAccountListItemDto>>> {
    this.lastFilter = filter;
    this.lastPagination = pagination;
    return Result.ok(this.result);
  }
}

describe('ListUserAccountsUseCase', () => {
  it('OWNER consulta a listagem tenant-scoped', async () => {
    const query = new FakeListUserAccountsQuery();
    query.result = {
      data: [
        {
          userId: Id.createUUID(),
          username: 'joao',
          name: 'Joao Silva',
          email: null,
          role: 'USER',
          status: 'ACTIVE',
          createdAt: new Date(),
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    const useCase = new ListUserAccountsUseCase(query, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      pagination: { page: 1, pageSize: 20 },
    });

    expect(result.isOk).toBe(true);
    expect(result.instance.data).toHaveLength(1);
    expect(query.lastFilter?.bancaId).toBe(BANCA_ID);
  });

  it('repassa busca e filtros de papel/status para a query', async () => {
    const query = new FakeListUserAccountsQuery();
    const useCase = new ListUserAccountsUseCase(query, new RealPermissionChecker());

    await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      pagination: { page: 2, pageSize: 10 },
      search: 'joao',
      role: 'ADMIN',
      status: 'BLOCKED',
    });

    expect(query.lastFilter).toEqual({ bancaId: BANCA_ID, search: 'joao', role: 'ADMIN', status: 'BLOCKED' });
    expect(query.lastPagination).toEqual({ page: 2, pageSize: 10 });
  });

  it('rejeita ADMIN nesta versão (ADMIN não administra contas)', async () => {
    const query = new FakeListUserAccountsQuery();
    const useCase = new ListUserAccountsUseCase(query, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'ADMIN',
      pagination: { page: 1, pageSize: 20 },
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
    expect(query.lastFilter).toBeUndefined();
  });

  it('rejeita USER', async () => {
    const query = new FakeListUserAccountsQuery();
    const useCase = new ListUserAccountsUseCase(query, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'USER',
      pagination: { page: 1, pageSize: 20 },
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
  });
});
