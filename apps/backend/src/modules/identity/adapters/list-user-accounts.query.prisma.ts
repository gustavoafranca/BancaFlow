import type {
  ListUserAccountsFilter,
  ListUserAccountsQuery,
  UserAccountListItemDto,
} from '@bancaflow/identity';
import type { PaginatedInputDTO, PaginatedResultDTO } from '@bancaflow/shared';
import { Result } from '@bancaflow/shared';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../db/prisma.service';
import { safeErrorCode } from '../../../shared/errors/prisma-error.util';

/**
 * Adapter Prisma da listagem administrativa de contas. O filtro
 * `role IN ('ADMIN', 'USER')` (exclusão do `OWNER`) SHALL sempre fazer parte
 * do mesmo `where` usado tanto por `count` quanto por `findMany` — nunca um
 * filtro aplicado depois da paginação, para não corromper `total`/
 * `totalPages` nem gerar páginas incompletas (ver `design.md` D5 da change
 * `enable-tenant-user-administration`).
 */
@Injectable()
export class ListUserAccountsQueryPrisma implements ListUserAccountsQuery {
  constructor(private readonly prisma: PrismaService) {}

  private activeClient(): Prisma.TransactionClient {
    return this.prisma.activeClient();
  }

  async execute(
    filter: ListUserAccountsFilter,
    pagination: PaginatedInputDTO,
  ): Promise<Result<PaginatedResultDTO<UserAccountListItemDto>>> {
    try {
      const where: Prisma.UserAccountWhereInput = {
        bancaId: filter.bancaId,
        role: filter.role ?? { in: ['ADMIN', 'USER'] },
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.search
          ? {
              OR: [
                { username: { contains: filter.search, mode: 'insensitive' } },
                { name: { contains: filter.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      const client = this.activeClient();
      const [total, rows] = await Promise.all([
        client.userAccount.count({ where }),
        client.userAccount.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          skip: (pagination.page - 1) * pagination.pageSize,
          take: pagination.pageSize,
        }),
      ]);

      const data: UserAccountListItemDto[] = rows.map((row) => ({
        userId: row.id,
        username: row.username,
        name: row.name,
        email: row.email,
        role: row.role as UserAccountListItemDto['role'],
        status: row.status as UserAccountListItemDto['status'],
        createdAt: row.createdAt,
      }));

      return Result.ok({
        data,
        meta: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total,
          totalPages:
            pagination.pageSize > 0
              ? Math.ceil(total / pagination.pageSize)
              : 0,
        },
      });
    } catch (error: unknown) {
      return Result.fail(
        safeErrorCode(error, 'IDENTITY.LIST_USER_ACCOUNTS_ERROR', {
          operation: 'ListUserAccountsQueryPrisma.execute',
        }),
      );
    }
  }
}
