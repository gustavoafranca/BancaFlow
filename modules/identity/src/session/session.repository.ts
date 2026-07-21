import { Result } from '@bancaflow/shared';
import { Session } from './session.entity';

export interface SessionRepository {
  nextId(): string;

  findById(sessionId: string, bancaId: string): Promise<Result<Session | null>>;

  findByDigest(refreshTokenDigest: string): Promise<Result<Session | null>>;

  findActiveByUser(userId: string, bancaId: string): Promise<Result<Session[]>>;

  save(session: Session): Promise<Result<void>>;

  revokeAll(userId: string, bancaId: string, revokedAt: Date): Promise<Result<void>>;

  revokeOtherSessions(
    userId: string,
    bancaId: string,
    currentSessionId: string,
    revokedAt: Date,
  ): Promise<Result<void>>;

  rotateIfDigestMatches(
    sessionId: string,
    oldDigest: string,
    newDigest: string,
    newExpiresAt: Date,
    now: Date,
  ): Promise<Result<Session | null>>;
}
