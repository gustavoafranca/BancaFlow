import type { PaginatedInputDTO, PaginatedResultDTO, Result } from '@bancaflow/shared';
import type { AccountStatusType } from '../vo/account-status.vo';
import type { UserAccountListItemDto } from './user-account-list-item.dto';

/** Papéis que podem aparecer na listagem administrativa — nunca `OWNER`. */
export type AdministrableAccountRole = 'ADMIN' | 'USER';

export interface ListUserAccountsFilter {
  bancaId: string;
  search?: string;
  role?: AdministrableAccountRole;
  status?: AccountStatusType;
}

/**
 * Porta de leitura (CQRS) para a listagem paginada de contas `ADMIN`/`USER`
 * da própria banca. O adapter SHALL incluir `role IN ('ADMIN', 'USER')`
 * (exclusão do `OWNER`) nos critérios do próprio `WHERE` — avaliado pelo
 * banco antes de `count`, `skip` e `take` — nunca um filtro aplicado depois
 * da paginação, para não corromper `total`/`totalPages` nem gerar páginas
 * incompletas.
 */
export interface ListUserAccountsQuery {
  execute(
    filter: ListUserAccountsFilter,
    pagination: PaginatedInputDTO,
  ): Promise<Result<PaginatedResultDTO<UserAccountListItemDto>>>;
}
