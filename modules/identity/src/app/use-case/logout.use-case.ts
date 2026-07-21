import { Result, UseCase } from '@bancaflow/shared';
import { SessionRepository } from '../../session/session.repository';
import { Clock } from '../../shared/ports/clock.port';

export interface LogoutInput {
  bancaId: string;
  sessionId: string;
}

export interface LogoutOutput {
  sessionId: string;
}

export class LogoutUseCase implements UseCase<LogoutInput, LogoutOutput> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly clock: Clock,
  ) {}

  async execute(data: LogoutInput): Promise<Result<LogoutOutput>> {
    const found = await this.sessions.findById(data.sessionId, data.bancaId);
    if (found.isFailure) {
      return Result.fail(found.errors!);
    }
    const session = found.instance;
    if (session && !session.isRevoked()) {
      const revoked = session.revoke(this.clock.now());
      if (revoked.isOk) {
        const saved = await this.sessions.save(revoked.instance);
        if (saved.isFailure) {
          return Result.fail(saved.errors!);
        }
      }
    }
    return Result.ok({ sessionId: data.sessionId });
  }
}
