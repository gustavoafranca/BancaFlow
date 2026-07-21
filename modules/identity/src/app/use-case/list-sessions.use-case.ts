import { Result, UseCase } from '@bancaflow/shared';
import { SessionInfoDto } from '../../shared/dto/session-info.dto';
import { SessionRepository } from '../../session/session.repository';

export interface ListSessionsInput {
  bancaId: string;
  userId: string;
  currentSessionId: string;
}

/**
 * Lista as sessões ativas (não revogadas e não expiradas) do usuário na banca.
 * `isCurrent` é calculado aqui, a partir do `currentSessionId` do `AuthContext`
 * — nunca inferido no Web a partir do JWT HttpOnly.
 */
export class ListSessionsUseCase implements UseCase<ListSessionsInput, SessionInfoDto[]> {
  constructor(private readonly sessions: SessionRepository) {}

  async execute(data: ListSessionsInput): Promise<Result<SessionInfoDto[]>> {
    const active = await this.sessions.findActiveByUser(data.userId, data.bancaId);
    if (active.isFailure) {
      return Result.fail(active.errors!);
    }

    const list: SessionInfoDto[] = active.instance.map((session) => ({
      sessionId: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: session.id === data.currentSessionId,
      deviceInfo: session.deviceInfo ?? undefined,
    }));

    return Result.ok(list);
  }
}
