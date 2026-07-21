import { Injectable } from '@nestjs/common';
import { Result } from '@bancaflow/shared';
import type {
  BancaDisplayContextQuery,
  BancaDisplayContextView,
} from '@bancaflow/tenancy';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../db/prisma.service';
import { safeErrorCode } from '../../../shared/errors/prisma-error.util';
import { TECHNICAL_ERROR_CODES } from '../../../shared/errors/technical-error-codes';

const ACTIVE_STATUS = 'ACTIVE';

/**
 * Adapter Prisma da leitura (CQRS) `BancaDisplayContextQuery`. Projeta apenas os
 * campos de exibição de uma banca ATIVA por id, via `select`, sem reidratar nem
 * serializar a entidade `Banca` e sem vazar tipos Prisma. Banca inexistente ou
 * inativa resulta em `null`. `codigoBanca` já é persistido normalizado.
 */
@Injectable()
export class BancaDisplayContextQueryPrisma implements BancaDisplayContextQuery {
  constructor(private readonly prisma: PrismaService) {}

  /** Cliente Prisma ativo — o `tx` ambiente dentro de uma transação, ou o padrão fora dela. */
  private activeClient(): Prisma.TransactionClient {
    return this.prisma.activeClient();
  }

  async findActiveById(
    bancaId: string,
  ): Promise<Result<BancaDisplayContextView | null>> {
    try {
      const row = await this.activeClient().banca.findFirst({
        where: { id: bancaId, status: ACTIVE_STATUS },
        select: { id: true, codigoBanca: true, nome: true },
      });
      if (!row) {
        return Result.ok(null);
      }
      return Result.ok({
        bancaId: row.id,
        codigoBanca: row.codigoBanca,
        nome: row.nome,
      });
    } catch (error: unknown) {
      // Categoria C: falha técnica preservada (código distinguível até a borda
      // HTTP). Banca ausente/inativa é `null` (categoria B); erro de execução
      // NUNCA é colapsado em ausência.
      return Result.fail(
        safeErrorCode(
          error,
          TECHNICAL_ERROR_CODES.TENANCY_BANCA_DISPLAY_QUERY,
          {
            operation: 'BancaDisplayContextQueryPrisma.findActiveById',
          },
        ),
      );
    }
  }
}
