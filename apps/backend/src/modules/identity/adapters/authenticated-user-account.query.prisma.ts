import type {
  AuthenticatedUserAccountDto,
  AuthenticatedUserAccountQuery,
} from '@bancaflow/identity';
import { Result } from '@bancaflow/shared';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../db/prisma.service';
import { safeErrorCode } from '../../../shared/errors/prisma-error.util';
import { TECHNICAL_ERROR_CODES } from '../../../shared/errors/technical-error-codes';

const ACTIVE_STATUS = 'ACTIVE';

@Injectable()
export class AuthenticatedUserAccountQueryPrisma implements AuthenticatedUserAccountQuery {
  constructor(private readonly prisma: PrismaService) {}

  /** Cliente Prisma ativo — o `tx` ambiente dentro de uma transação, ou o padrão fora dela. */
  private activeClient(): Prisma.TransactionClient {
    return this.prisma.activeClient();
  }

  async findByUserAndBanca(
    userId: string,
    bancaId: string,
  ): Promise<Result<AuthenticatedUserAccountDto | null>> {
    try {
      const row = await this.activeClient().userAccount.findFirst({
        where: { id: userId, bancaId, status: ACTIVE_STATUS },
        select: {
          id: true,
          bancaId: true,
          username: true,
          name: true,
          email: true,
          role: true,
          version: true,
        },
      });
      if (!row) {
        return Result.ok(null);
      }
      return Result.ok({
        userId: row.id,
        bancaId: row.bancaId,
        username: row.username,
        name: row.name,
        email: row.email ?? null,
        role: row.role as AuthenticatedUserAccountDto['role'],
        version: row.version,
      });
    } catch (error: unknown) {
      // Categoria C: falha técnica preservada (código distinguível até a borda
      // HTTP, que traduz para `500` genérico). Nunca colapsa em ausência (`null`).
      return Result.fail(
        safeErrorCode(
          error,
          TECHNICAL_ERROR_CODES.IDENTITY_USER_ACCOUNT_QUERY,
          {
            operation: 'AuthenticatedUserAccountQueryPrisma.findByUserAndBanca',
          },
        ),
      );
    }
  }
}
