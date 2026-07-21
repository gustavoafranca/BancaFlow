import { Entity, EntityProps, Id, Result } from '@bancaflow/shared';
import { IDENTITY_ERRORS } from '../shared/errors/identity.errors';

export interface SessionProps extends EntityProps {
  userId: string;
  bancaId: string;
  refreshTokenDigest: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  deviceInfo?: string | null;
}

export class Session extends Entity<Session, SessionProps> {
  private constructor(props: SessionProps) {
    super(props);
  }

  private rebuild(overrides: Partial<SessionProps>): Result<Session> {
    return Session.tryCreate({ ...this.props, ...overrides });
  }

  get userId(): string {
    return this.props.userId;
  }

  get bancaId(): string {
    return this.props.bancaId;
  }

  get refreshTokenDigest(): string {
    return this.props.refreshTokenDigest;
  }

  get expiresAt(): Date {
    return new Date(this.props.expiresAt.getTime());
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt ? new Date(this.props.revokedAt.getTime()) : null;
  }

  get deviceInfo(): string | null {
    return this.props.deviceInfo ?? null;
  }

  isExpired(now: Date): boolean {
    return this.props.expiresAt.getTime() <= now.getTime();
  }

  isRevoked(): boolean {
    return !!this.props.revokedAt;
  }

  isActive(now: Date): boolean {
    return !this.isRevoked() && !this.isExpired(now);
  }

  revoke(now: Date): Result<Session> {
    if (this.isRevoked()) {
      return Result.fail(IDENTITY_ERRORS.SESSION_REVOKED);
    }
    return this.rebuild({ revokedAt: now });
  }

  rotate(newDigest: string, newExpiresAt: Date, now: Date): Result<Session> {
    if (this.isRevoked()) {
      return Result.fail(IDENTITY_ERRORS.SESSION_REVOKED);
    }
    const digest = newDigest?.trim() ?? '';
    if (!digest) {
      return Result.fail(IDENTITY_ERRORS.SESSION_NOT_FOUND);
    }
    if (!(newExpiresAt instanceof Date) || Number.isNaN(newExpiresAt.getTime())) {
      return Result.fail(IDENTITY_ERRORS.INVALID_SESSION_EXPIRATION);
    }
    if (newExpiresAt.getTime() <= now.getTime()) {
      return Result.fail(IDENTITY_ERRORS.INVALID_SESSION_EXPIRATION);
    }
    return this.rebuild({ refreshTokenDigest: digest, expiresAt: newExpiresAt });
  }

  static create(props: SessionProps): Session {
    const result = Session.tryCreate(props);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(props: SessionProps): Result<Session> {
    const id = Id.tryCreate(props.id);
    const userId = Id.tryCreate(props.userId);
    const bancaId = Id.tryCreate(props.bancaId);

    const attrs = Result.combine([id, userId, bancaId]);
    if (attrs.isFailure) {
      return Result.fail(attrs.errors!);
    }

    const digest = props.refreshTokenDigest?.trim() ?? '';
    if (!digest) {
      return Result.fail('IDENTITY.INVALID_REFRESH_DIGEST');
    }
    if (!(props.expiresAt instanceof Date) || Number.isNaN(props.expiresAt.getTime())) {
      return Result.fail(IDENTITY_ERRORS.INVALID_SESSION_EXPIRATION);
    }

    return Result.ok(
      new Session({
        ...props,
        id: id.instance.value,
        userId: userId.instance.value,
        bancaId: bancaId.instance.value,
        refreshTokenDigest: digest,
        expiresAt: new Date(props.expiresAt.getTime()),
        revokedAt: props.revokedAt ? new Date(props.revokedAt.getTime()) : null,
        deviceInfo: props.deviceInfo ?? null,
      }),
    );
  }
}
