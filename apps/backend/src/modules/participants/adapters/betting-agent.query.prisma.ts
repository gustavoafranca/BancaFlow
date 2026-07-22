import { Injectable } from '@nestjs/common';
import {
  PaginatedInputDTO,
  PaginatedResultDTO,
  Result,
} from '@bancaflow/shared';
import type {
  BettingAgentDetailDTO,
  BettingAgentListFilters,
  BettingAgentListItemDTO,
  BettingAgentQuery,
  CompensationPolicyDTO,
  PartyAddressDTO,
  PartyContactDTO,
} from '@bancaflow/participants';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../db/prisma.service';
import { safeErrorCode } from '../../../shared/errors/prisma-error.util';
import { TECHNICAL_ERROR_CODES } from '../../../shared/errors/technical-error-codes';
import { currentPolicy } from './current-policy.util';

type StatusType = 'ACTIVE' | 'INACTIVE';

/**
 * Adapter Prisma da leitura (CQRS) `BettingAgentQuery`. Sempre tenant-scoped por
 * `bancaId`; projeta DTOs via `select`/`include`, nunca reidrata entidades nem
 * vaza tipos Prisma. `getDetail` retorna `null` para id inexistente ou de outra
 * Banca (o caso de uso o traduz em NOT_FOUND, sem revelar existência).
 */
@Injectable()
export class BettingAgentQueryPrisma implements BettingAgentQuery {
  constructor(private readonly prisma: PrismaService) {}

  private activeClient(): Prisma.TransactionClient {
    return this.prisma.activeClient();
  }

  async list(
    bancaId: string,
    filters: BettingAgentListFilters,
    pagination: PaginatedInputDTO,
  ): Promise<Result<PaginatedResultDTO<BettingAgentListItemDTO>>> {
    try {
      const search = filters.search?.trim();
      const where: Prisma.BettingAgentWhereInput = {
        bancaId,
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: 'insensitive' } },
                { party: { name: { contains: search, mode: 'insensitive' } } },
                {
                  party: {
                    nickname: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      };

      const client = this.activeClient();
      const [total, rows] = await Promise.all([
        client.bettingAgent.count({ where }),
        client.bettingAgent.findMany({
          where,
          select: {
            id: true,
            code: true,
            status: true,
            createdAt: true,
            party: { select: { name: true, nickname: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (pagination.page - 1) * pagination.pageSize,
          take: pagination.pageSize,
        }),
      ]);

      const data: BettingAgentListItemDTO[] = rows.map((row) => ({
        id: row.id,
        code: row.code,
        status: row.status as StatusType,
        name: row.party?.name ?? null,
        nickname: row.party?.nickname ?? null,
        createdAt: row.createdAt.toISOString(),
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
        safeErrorCode(
          error,
          TECHNICAL_ERROR_CODES.PARTICIPANTS_BETTING_AGENT_QUERY,
          {
            operation: 'BettingAgentQueryPrisma.list',
          },
        ),
      );
    }
  }

  async getDetail(
    id: string,
    bancaId: string,
  ): Promise<Result<BettingAgentDetailDTO | null>> {
    try {
      const row = await this.activeClient().bettingAgent.findFirst({
        where: { id, bancaId },
        include: {
          compensationPolicies: true,
          party: {
            include: {
              contacts: { where: { status: 'ACTIVE' } },
              addresses: true,
            },
          },
        },
      });

      if (!row) {
        return Result.ok(null);
      }

      const policyRow = currentPolicy(row.compensationPolicies);
      if (!policyRow) {
        // Invariante violada no banco (BettingAgent ativo sempre tem política).
        return Result.fail(
          TECHNICAL_ERROR_CODES.PARTICIPANTS_BETTING_AGENT_QUERY,
        );
      }

      const activeAddress =
        row.party.addresses.find((a) => a.effectiveTo === null) ?? null;

      const contacts: PartyContactDTO[] = row.party.contacts.map((c) => ({
        phone: c.phone,
        label: c.label,
      }));

      const address: PartyAddressDTO | null = activeAddress
        ? {
            street: activeAddress.street,
            number: activeAddress.number,
            neighborhood: activeAddress.neighborhood,
            city: activeAddress.city,
            effectiveFrom: activeAddress.effectiveFrom.toISOString(),
            effectiveTo: activeAddress.effectiveTo
              ? activeAddress.effectiveTo.toISOString()
              : null,
          }
        : null;

      const policy: CompensationPolicyDTO = {
        type: policyRow.type as CompensationPolicyDTO['type'],
        percentage:
          policyRow.percentage !== null ? Number(policyRow.percentage) : null,
        weeklyFixedAmountCents: policyRow.weeklyFixedAmountCents,
        effectiveFrom: policyRow.effectiveFrom.toISOString(),
        effectiveTo: policyRow.effectiveTo
          ? policyRow.effectiveTo.toISOString()
          : null,
      };

      const detail: BettingAgentDetailDTO = {
        id: row.id,
        code: row.code,
        status: row.status as StatusType,
        party: {
          id: row.party.id,
          name: row.party.name,
          nickname: row.party.nickname,
          contacts,
          address,
        },
        policy,
        createdAt: row.createdAt.toISOString(),
      };

      return Result.ok(detail);
    } catch (error: unknown) {
      return Result.fail(
        safeErrorCode(
          error,
          TECHNICAL_ERROR_CODES.PARTICIPANTS_BETTING_AGENT_QUERY,
          {
            operation: 'BettingAgentQueryPrisma.getDetail',
          },
        ),
      );
    }
  }

}
