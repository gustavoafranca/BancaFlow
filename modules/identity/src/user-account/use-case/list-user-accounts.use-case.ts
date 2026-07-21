import { AccountRoleType, PaginatedInputDTO, PaginatedResultDTO, Result, UseCase } from '@bancaflow/shared';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';
import { AdministrableAccountRole, ListUserAccountsQuery } from '../query/list-user-accounts.query';
import { UserAccountListItemDto } from '../query/user-account-list-item.dto';
import { AccountStatusType } from '../vo/account-status.vo';

export interface ListUserAccountsInput {
  bancaId: string;
  actorRole: AccountRoleType;
  pagination: PaginatedInputDTO;
  search?: string;
  role?: AdministrableAccountRole;
  status?: AccountStatusType;
}

/**
 * Listagem administrativa das contas `ADMIN`/`USER` da própria banca.
 * Sem alvo — só verifica a permissão e delega à query tenant-scoped;
 * NÃO usa `assertAdministrableTarget` (não se aplica a uma listagem).
 */
export class ListUserAccountsUseCase
  implements UseCase<ListUserAccountsInput, PaginatedResultDTO<UserAccountListItemDto>>
{
  constructor(
    private readonly query: ListUserAccountsQuery,
    private readonly permissions: PermissionChecker,
  ) {}

  async execute(data: ListUserAccountsInput): Promise<Result<PaginatedResultDTO<UserAccountListItemDto>>> {
    if (!this.permissions.hasPermission(data.actorRole, 'identity.accounts.list')) {
      return Result.fail(IDENTITY_ERRORS.FORBIDDEN);
    }

    return this.query.execute(
      {
        bancaId: data.bancaId,
        search: data.search,
        role: data.role,
        status: data.status,
      },
      data.pagination,
    );
  }
}
