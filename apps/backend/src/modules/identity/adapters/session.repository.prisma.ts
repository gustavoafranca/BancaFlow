import { Session, type SessionRepository } from '@bancaflow/identity';
import { Id, Result } from '@bancaflow/shared';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../db/prisma.service';
import { safeErrorCode } from '../../../shared/errors/prisma-error.util';

type SessionRow = {
  id: string;
  userId: string;
  bancaId: string;
  refreshTokenDigest: string;
  expiresAt: Date;
  revokedAt: Date | null;
  deviceInfo: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class SessionRepositoryPrisma implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Cliente Prisma ativo — o `tx` ambiente dentro de uma transação, ou o padrão fora dela. */
  private activeClient(): Prisma.TransactionClient {
    return this.prisma.activeClient();
  }

  nextId(): string {
    return Id.createUUID();
  }

  async findById(
    sessionId: string,
    bancaId: string,
  ): Promise<Result<Session | null>> {
    try {
      const row = await this.activeClient().session.findFirst({
        where: { id: sessionId, bancaId },
      });
      return row ? this.toDomain(row) : Result.ok(null);
    } catch (error: unknown) {
      return Result.fail(safeErrorCode(error, 'IDENTITY.SESSION_FIND_ERROR'));
    }
  }

  async findByDigest(
    refreshTokenDigest: string,
  ): Promise<Result<Session | null>> {
    try {
      const row = await this.activeClient().session.findFirst({
        where: { refreshTokenDigest },
      });
      return row ? this.toDomain(row) : Result.ok(null);
    } catch (error: unknown) {
      return Result.fail(safeErrorCode(error, 'IDENTITY.SESSION_FIND_ERROR'));
    }
  }

  async findActiveByUser(
    userId: string,
    bancaId: string,
  ): Promise<Result<Session[]>> {
    try {
      const rows = await this.activeClient().session.findMany({
        where: {
          userId,
          bancaId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });
      const sessions: Session[] = [];
      for (const row of rows) {
        const mapped = this.toDomain(row);
        if (mapped.isFailure) {
          return Result.fail(mapped.errors);
        }
        sessions.push(mapped.instance);
      }
      return Result.ok(sessions);
    } catch (error: unknown) {
      return Result.fail(safeErrorCode(error, 'IDENTITY.SESSION_FIND_ERROR'));
    }
  }

  async save(session: Session): Promise<Result<void>> {
    try {
      const data = this.fromDomain(session);
      await this.activeClient().session.upsert({
        where: { id: data.id },
        create: data,
        update: {
          refreshTokenDigest: data.refreshTokenDigest,
          expiresAt: data.expiresAt,
          revokedAt: data.revokedAt,
          deviceInfo: data.deviceInfo,
        },
      });
      return Result.ok(undefined);
    } catch (error: unknown) {
      return Result.fail(safeErrorCode(error, 'IDENTITY.SESSION_SAVE_ERROR'));
    }
  }

  async revokeAll(
    userId: string,
    bancaId: string,
    revokedAt: Date,
  ): Promise<Result<void>> {
    try {
      await this.activeClient().session.updateMany({
        where: { userId, bancaId, revokedAt: null },
        data: { revokedAt },
      });
      return Result.ok(undefined);
    } catch (error: unknown) {
      return Result.fail(safeErrorCode(error, 'IDENTITY.SESSION_REVOKE_ERROR'));
    }
  }

  async revokeOtherSessions(
    userId: string,
    bancaId: string,
    currentSessionId: string,
    revokedAt: Date,
  ): Promise<Result<void>> {
    try {
      await this.activeClient().session.updateMany({
        where: {
          userId,
          bancaId,
          revokedAt: null,
          NOT: { id: currentSessionId },
        },
        data: { revokedAt },
      });
      return Result.ok(undefined);
    } catch (error: unknown) {
      return Result.fail(safeErrorCode(error, 'IDENTITY.SESSION_REVOKE_ERROR'));
    }
  }

  async rotateIfDigestMatches(
    sessionId: string,
    oldDigest: string,
    newDigest: string,
    newExpiresAt: Date,
    now: Date,
  ): Promise<Result<Session | null>> {
    try {
      const updated = await this.activeClient().session.updateMany({
        where: {
          id: sessionId,
          refreshTokenDigest: oldDigest,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { refreshTokenDigest: newDigest, expiresAt: newExpiresAt },
      });
      if (updated.count === 0) {
        // Compare-and-swap perdido: outra requisição concorrente já rotacionou
        // ou revogou a sessão. Condição de negócio esperada, não erro de infra.
        return Result.ok(null);
      }
      const row = await this.activeClient().session.findFirst({
        where: { id: sessionId },
      });
      return row ? this.toDomain(row) : Result.ok(null);
    } catch (error: unknown) {
      return Result.fail(safeErrorCode(error, 'IDENTITY.SESSION_ROTATE_ERROR'));
    }
  }

  private toDomain(row: SessionRow): Result<Session> {
    return Session.tryCreate({
      id: row.id,
      userId: row.userId,
      bancaId: row.bancaId,
      refreshTokenDigest: row.refreshTokenDigest,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      deviceInfo: row.deviceInfo,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private fromDomain(session: Session): SessionRow {
    return {
      id: session.id,
      userId: session.userId,
      bancaId: session.bancaId,
      refreshTokenDigest: session.refreshTokenDigest,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      deviceInfo: session.deviceInfo,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}
