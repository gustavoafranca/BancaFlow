import { Result, UseCase } from '@bancaflow/shared';
import { SessionRepository } from '../../session/session.repository';
import { Clock } from '../../shared/ports/clock.port';

export interface LogoutAllInput {
  bancaId: string;
  userId: string;
}

export interface LogoutAllOutput {
  userId: string;
}

export class LogoutAllUseCase implements UseCase<LogoutAllInput, LogoutAllOutput> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly clock: Clock,
  ) {}

  async execute(data: LogoutAllInput): Promise<Result<LogoutAllOutput>> {
    const revoked = await this.sessions.revokeAll(data.userId, data.bancaId, this.clock.now());
    if (revoked.isFailure) {
      return Result.fail(revoked.errors!);
    }
    return Result.ok({ userId: data.userId });
  }
}
