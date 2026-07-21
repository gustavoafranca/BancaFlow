import {
  IDENTITY_ERRORS,
  UserAccount,
  type UserAccountRepository,
} from '@bancaflow/identity';
import { Id, Result } from '@bancaflow/shared';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../db/prisma.service';
import {
  isUniqueConstraintViolation,
  safeErrorCode,
} from '../../../shared/errors/prisma-error.util';

/**
 * Traduz violações de constraint Prisma conhecidas para códigos de domínio
 * estáveis. Nunca propaga `error.message` bruto ao chamador (evita vazar
 * detalhes de schema/infra na resposta HTTP) — ver `safeErrorCode`.
 */
function translatePrismaError(error: unknown, fallback: string): string {
  if (isUniqueConstraintViolation(error)) {
    return IDENTITY_ERRORS.USERNAME_ALREADY_EXISTS;
  }
  return safeErrorCode(error, fallback);
}

type UserAccountRow = {
  id: string;
  bancaId: string;
  username: string;
  normalizedUsername: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  passwordHash: string;
  passwordChangedAt: Date;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  failedLoginWindowStartedAt: Date | null;
  lockedUntil: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UserAccountRepositoryPrisma implements UserAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Cliente Prisma ativo — o `tx` ambiente dentro de uma transação, ou o padrão fora dela. */
  private activeClient(): Prisma.TransactionClient {
    return this.prisma.activeClient();
  }

  nextId(): string {
    return Id.createUUID();
  }

  async findById(
    id: string,
    bancaId: string,
  ): Promise<Result<UserAccount | null>> {
    try {
      const row = await this.activeClient().userAccount.findFirst({
        where: { id, bancaId },
      });
      return row ? this.toDomain(row) : Result.ok(null);
    } catch (error: unknown) {
      return Result.fail(
        safeErrorCode(error, 'IDENTITY.USER_ACCOUNT_FIND_ERROR'),
      );
    }
  }

  async findByBancaAndUsername(
    bancaId: string,
    normalizedUsername: string,
  ): Promise<Result<UserAccount | null>> {
    try {
      const row = await this.activeClient().userAccount.findUnique({
        where: { bancaId_normalizedUsername: { bancaId, normalizedUsername } },
      });
      return row ? this.toDomain(row) : Result.ok(null);
    } catch (error: unknown) {
      return Result.fail(
        safeErrorCode(error, 'IDENTITY.USER_ACCOUNT_FIND_ERROR'),
      );
    }
  }

  async save(account: UserAccount): Promise<Result<void>> {
    if (this.prisma.isInTransaction()) {
      return this.persist(this.activeClient(), account);
    }

    try {
      return await this.prisma.runInTransactionResult((ctx) =>
        this.persist(ctx.client, account),
      );
    } catch (error: unknown) {
      return Result.fail(
        translatePrismaError(error, 'IDENTITY.USER_ACCOUNT_SAVE_ERROR'),
      );
    }
  }

  private async persist(
    client: Prisma.TransactionClient,
    account: UserAccount,
  ): Promise<Result<void>> {
    try {
      const data = this.fromDomain(account);
      const existing = await client.userAccount.findUnique({
        where: { id: data.id },
        select: { id: true },
      });

      if (!existing) {
        await client.userAccount.create({ data: { ...data, version: 1 } });
      } else {
        const updated = await client.userAccount.updateMany({
          where: { id: data.id, version: account.version },
          data: {
            username: data.username,
            normalizedUsername: data.normalizedUsername,
            name: data.name,
            email: data.email,
            role: data.role,
            status: data.status,
            passwordHash: data.passwordHash,
            passwordChangedAt: data.passwordChangedAt,
            mustChangePassword: data.mustChangePassword,
            failedLoginAttempts: data.failedLoginAttempts,
            failedLoginWindowStartedAt: data.failedLoginWindowStartedAt,
            lockedUntil: data.lockedUntil,
            version: { increment: 1 },
          },
        });
        if (updated.count === 0) {
          // Nenhuma linha afetada: outra escrita concorrente já mudou a
          // versão. Compare-and-swap perdido — falha de negócio, não de infra.
          return Result.fail(IDENTITY_ERRORS.CONCURRENCY_CONFLICT);
        }
      }

      return Result.ok(undefined);
    } catch (error: unknown) {
      return Result.fail(
        translatePrismaError(error, 'IDENTITY.USER_ACCOUNT_SAVE_ERROR'),
      );
    }
  }

  async recordLoginFailureAtomic(
    bancaId: string,
    normalizedUsername: string,
    now: Date,
  ): Promise<Result<UserAccount | null>> {
    try {
      return await this.prisma.runInTransaction(async (ctx) => {
        const rows = await ctx.client.$queryRaw<UserAccountRow[]>`
          SELECT * FROM "user_accounts"
          WHERE "bancaId" = ${bancaId} AND "normalizedUsername" = ${normalizedUsername}
          FOR UPDATE
        `;
        const row = rows[0];
        if (!row) {
          return Result.ok<UserAccount | null>(null);
        }

        const accountResult = this.toDomain(row);
        if (accountResult.isFailure) {
          return Result.fail<UserAccount | null>(accountResult.errors);
        }

        const failed = accountResult.instance.recordLoginFailure(now);
        if (failed.isFailure) {
          return Result.fail<UserAccount | null>(failed.errors);
        }

        const data = this.fromDomain(failed.instance);
        await ctx.client.userAccount.update({
          where: { id: row.id },
          data: {
            failedLoginAttempts: data.failedLoginAttempts,
            failedLoginWindowStartedAt: data.failedLoginWindowStartedAt,
            lockedUntil: data.lockedUntil,
            version: { increment: 1 },
          },
        });

        return Result.ok<UserAccount | null>(failed.instance);
      });
    } catch (error: unknown) {
      return Result.fail(
        safeErrorCode(error, 'IDENTITY.USER_ACCOUNT_LOCK_ERROR'),
      );
    }
  }

  private toDomain(row: UserAccountRow): Result<UserAccount> {
    return UserAccount.tryCreate({
      id: row.id,
      bancaId: row.bancaId,
      username: row.username,
      name: row.name,
      email: row.email,
      role: row.role as 'OWNER' | 'ADMIN' | 'USER',
      status: row.status as 'ACTIVE' | 'INACTIVE' | 'BLOCKED',
      credential: {
        passwordHash: row.passwordHash,
        passwordChangedAt: row.passwordChangedAt,
        mustChangePassword: row.mustChangePassword,
      },
      failedLoginAttempts: row.failedLoginAttempts,
      failedLoginWindowStartedAt: row.failedLoginWindowStartedAt,
      lockedUntil: row.lockedUntil,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private fromDomain(account: UserAccount): UserAccountRow {
    return {
      id: account.id,
      bancaId: account.bancaId,
      username: account.username.raw,
      normalizedUsername: account.username.normalized,
      name: account.name,
      email: account.email,
      role: account.role.value,
      status: account.status.value,
      passwordHash: account.credential.passwordHash,
      passwordChangedAt: account.credential.passwordChangedAt,
      mustChangePassword: account.credential.mustChangePassword,
      failedLoginAttempts: account.failedLoginAttempts,
      failedLoginWindowStartedAt: account.failedLoginWindowStartedAt,
      lockedUntil: account.lockedUntil,
      version: account.version,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
