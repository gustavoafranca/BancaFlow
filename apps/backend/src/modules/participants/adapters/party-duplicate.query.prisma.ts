import { Injectable } from '@nestjs/common';
import { Result } from '@bancaflow/shared';
import type {
  DuplicateCandidateDTO,
  DuplicateProbe,
  PartyDuplicateQuery,
} from '@bancaflow/participants';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../db/prisma.service';
import { safeErrorCode } from '../../../shared/errors/prisma-error.util';
import { TECHNICAL_ERROR_CODES } from '../../../shared/errors/technical-error-codes';
import { normalizeText } from './participants-normalize.util';

const MAX_CANDIDATES = 20;

/**
 * Adapter Prisma da `PartyDuplicateQuery`. Detecta possível duplicidade dentro
 * da própria Banca por telefone normalizado OU por par nome+apelido normalizado.
 * Retorna apenas candidatos mínimos (id do Cambista, código, rótulo de exibição)
 * — nunca entidades, telefones ou dados de outra Banca.
 */
@Injectable()
export class PartyDuplicateQueryPrisma implements PartyDuplicateQuery {
  constructor(private readonly prisma: PrismaService) {}

  private activeClient(): Prisma.TransactionClient {
    return this.prisma.activeClient();
  }

  async findCandidates(
    probe: DuplicateProbe,
  ): Promise<Result<DuplicateCandidateDTO[]>> {
    try {
      const or: Prisma.BettingAgentWhereInput[] = [];

      if (probe.phones.length > 0) {
        or.push({
          party: {
            contacts: { some: { phone: { in: probe.phones }, status: 'ACTIVE' } },
          },
        });
      }

      const nameNorm = normalizeText(probe.name);
      const nicknameNorm = normalizeText(probe.nickname);
      if (nameNorm && nicknameNorm) {
        or.push({
          party: { nameNormalized: nameNorm, nicknameNormalized: nicknameNorm },
        });
      }

      if (or.length === 0) {
        return Result.ok([]);
      }

      const rows = await this.activeClient().bettingAgent.findMany({
        where: { bancaId: probe.bancaId, OR: or },
        select: {
          id: true,
          code: true,
          party: { select: { name: true, nickname: true } },
        },
        take: MAX_CANDIDATES,
      });

      return Result.ok(
        rows.map((row) => ({
          bettingAgentId: row.id,
          code: row.code,
          displayName: row.party?.name ?? row.party?.nickname ?? null,
        })),
      );
    } catch (error: unknown) {
      return Result.fail(
        safeErrorCode(
          error,
          TECHNICAL_ERROR_CODES.PARTICIPANTS_PARTY_DUPLICATE_QUERY,
          {
            operation: 'PartyDuplicateQueryPrisma.findCandidates',
          },
        ),
      );
    }
  }
}
