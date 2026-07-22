import { Injectable } from '@nestjs/common';
import { Id, Result } from '@bancaflow/shared';
import {
  BettingAgent,
  BettingAgentRepository,
  PARTICIPANTS_ERRORS,
  type CompensationPolicyInput,
} from '@bancaflow/participants';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../db/prisma.service';
import {
  isUniqueConstraintViolation,
  safeErrorCode,
} from '../../../shared/errors/prisma-error.util';
import { TECHNICAL_ERROR_CODES } from '../../../shared/errors/technical-error-codes';
import { currentPolicy, type PolicyRow } from './current-policy.util';

/**
 * Adapter Prisma do contrato `BettingAgentRepository`. Persiste o agregado +
 * política inicial em escrita aninhada sobre o `activeClient()`. Traduz a
 * violação de constraint única `(bancaId, code)` (`P2002`) para o erro estável
 * `CODE_ALREADY_EXISTS`, sem vazar detalhes do banco.
 */
@Injectable()
export class BettingAgentRepositoryPrisma implements BettingAgentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeClient(): Prisma.TransactionClient {
    return this.prisma.activeClient();
  }

  nextId(): string {
    return Id.createUUID();
  }

  async save(agent: BettingAgent): Promise<Result<void>> {
    try {
      const policy = agent.policy.value;
      const period = agent.policyPeriod;
      await this.activeClient().bettingAgent.create({
        data: {
          id: agent.id,
          bancaId: agent.bancaId,
          partyId: agent.partyId,
          code: agent.code.value,
          status: agent.status.value,
          createdBy: agent.createdBy,
          createdAt: agent.createdAt,
          compensationPolicies: {
            create: [
              {
                id: Id.createUUID(),
                type: policy.type,
                percentage: 'percentage' in policy ? policy.percentage : null,
                weeklyFixedAmountCents:
                  'weeklyFixedAmountCents' in policy
                    ? policy.weeklyFixedAmountCents
                    : null,
                effectiveFrom: period.effectiveFrom,
                effectiveTo: period.effectiveTo,
              },
            ],
          },
        },
      });
      return Result.ok(undefined);
    } catch (error: unknown) {
      if (isUniqueConstraintViolation(error)) {
        return Result.fail(PARTICIPANTS_ERRORS.CODE_ALREADY_EXISTS);
      }
      return Result.fail(
        safeErrorCode(
          error,
          TECHNICAL_ERROR_CODES.PARTICIPANTS_BETTING_AGENT_SAVE,
          {
            operation: 'BettingAgentRepositoryPrisma.save',
          },
        ),
      );
    }
  }

  async updateStatus(agent: BettingAgent): Promise<Result<void>> {
    try {
      await this.activeClient().bettingAgent.update({
        where: { id: agent.id },
        data: { status: agent.status.value },
      });
      return Result.ok(undefined);
    } catch (error: unknown) {
      return Result.fail(
        safeErrorCode(
          error,
          TECHNICAL_ERROR_CODES.PARTICIPANTS_BETTING_AGENT_SAVE,
          {
            operation: 'BettingAgentRepositoryPrisma.updateStatus',
          },
        ),
      );
    }
  }

  async findById(
    id: string,
    bancaId: string,
  ): Promise<Result<BettingAgent | null>> {
    try {
      const row = await this.activeClient().bettingAgent.findFirst({
        where: { id, bancaId },
        include: { compensationPolicies: true },
      });
      if (!row) {
        return Result.ok(null);
      }
      return this.toDomain(row);
    } catch (error: unknown) {
      return Result.fail(
        safeErrorCode(
          error,
          TECHNICAL_ERROR_CODES.PARTICIPANTS_BETTING_AGENT_FIND,
          {
            operation: 'BettingAgentRepositoryPrisma.findById',
          },
        ),
      );
    }
  }

  private toDomain(row: {
    id: string;
    bancaId: string;
    partyId: string;
    code: string;
    status: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    compensationPolicies: PolicyRow[];
  }): Result<BettingAgent> {
    const current = currentPolicy(row.compensationPolicies);
    if (!current) {
      return Result.fail(PARTICIPANTS_ERRORS.INVALID_POLICY);
    }

    const policy: CompensationPolicyInput = {
      type: current.type,
      percentage:
        current.percentage !== null ? Number(current.percentage) : null,
      weeklyFixedAmountCents: current.weeklyFixedAmountCents,
    };

    return BettingAgent.tryCreate({
      id: row.id,
      bancaId: row.bancaId,
      partyId: row.partyId,
      code: row.code,
      status: row.status,
      policy,
      policyEffectiveFrom: current.effectiveFrom,
      policyEffectiveTo: current.effectiveTo,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

}
