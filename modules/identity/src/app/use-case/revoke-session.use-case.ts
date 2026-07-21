import { Result, UseCase } from '@bancaflow/shared';
import { Clock } from '../../shared/ports/clock.port';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import { SessionRepository } from '../../session/session.repository';

export interface RevokeSessionInput {
  bancaId: string;
  userId: string;
  sessionId: string;
}

export interface RevokeSessionOutput {
  sessionId: string;
}

/**
 * Revoga uma sessão específica, validando ownership por `bancaId` e `userId`.
 * Sessão de outra banca/usuário/inexistente retorna `TARGET_SESSION_NOT_FOUND`
 * (não revela existência) — distinto de `SESSION_NOT_FOUND`, reservado para a
 * ausência da PRÓPRIA sessão do ator (ex.: `ChangePasswordUseCase`), que é uma
 * falha de autenticação (401), não uma falha sobre um alvo de terceiro (404).
 */
export class RevokeSessionUseCase implements UseCase<RevokeSessionInput, RevokeSessionOutput> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly clock: Clock,
  ) {}

  async execute(data: RevokeSessionInput): Promise<Result<RevokeSessionOutput>> {
    const found = await this.sessions.findById(data.sessionId, data.bancaId);
    if (found.isFailure) {
      return Result.fail(found.errors!);
    }
    const session = found.instance;
    if (!session || session.userId !== data.userId) {
      return Result.fail(IDENTITY_ERRORS.TARGET_SESSION_NOT_FOUND);
    }

    if (!session.isRevoked()) {
      const revoked = session.revoke(this.clock.now());
      if (revoked.isFailure) {
        return Result.fail(revoked.errors!);
      }
      const saved = await this.sessions.save(revoked.instance);
      if (saved.isFailure) {
        return Result.fail(saved.errors!);
      }
    }

    return Result.ok({ sessionId: data.sessionId });
  }
}
