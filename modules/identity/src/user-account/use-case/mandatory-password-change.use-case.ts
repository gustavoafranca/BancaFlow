import { Result, StrongPassword, TransactionManager, UseCase } from '@bancaflow/shared';
import { SessionRepository } from '../../session/session.repository';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import { AccessTokenIssuer } from '../../shared/ports/access-token-issuer.port';
import { Clock } from '../../shared/ports/clock.port';
import { PasswordCryptoProvider } from '../../shared/ports/password-crypto.port';
import { UserAccountRepository } from '../user-account.repository';

export interface MandatoryPasswordChangeInput {
  bancaId: string;
  userId: string;
  newPassword: string;
  currentSessionId: string;
}

export interface MandatoryPasswordChangeOutput {
  userId: string;
  accessToken: string;
  accessTokenExpiresAt: Date;
}

export class MandatoryPasswordChangeUseCase implements UseCase<
  MandatoryPasswordChangeInput,
  MandatoryPasswordChangeOutput
> {
  constructor(
    private readonly accounts: UserAccountRepository,
    private readonly sessions: SessionRepository,
    private readonly passwordCrypto: PasswordCryptoProvider,
    private readonly accessTokenIssuer: AccessTokenIssuer,
    private readonly clock: Clock,
    private readonly transactionManager: TransactionManager,
  ) {}

  async execute(data: MandatoryPasswordChangeInput): Promise<Result<MandatoryPasswordChangeOutput>> {
    if (!data.currentSessionId?.trim()) {
      return Result.fail(IDENTITY_ERRORS.SESSION_NOT_FOUND);
    }

    const found = await this.accounts.findById(data.userId, data.bancaId);
    if (found.isFailure) {
      return Result.fail(found.errors!);
    }
    const account = found.instance;
    if (!account) {
      return Result.fail(IDENTITY_ERRORS.ACCOUNT_NOT_FOUND);
    }

    if (!account.mustChangePassword) {
      return Result.fail(IDENTITY_ERRORS.FORBIDDEN);
    }

    const strongPassword = StrongPassword.tryCreate(data.newPassword);
    if (strongPassword.isFailure) {
      return Result.fail(IDENTITY_ERRORS.PASSWORD_TOO_WEAK);
    }

    const hash = await this.passwordCrypto.hash(data.newPassword);
    if (hash.isFailure) {
      return Result.fail(hash.errors!);
    }

    const now = this.clock.now();
    const updated = account.changePassword(hash.instance, false, now);
    if (updated.isFailure) {
      return Result.fail(updated.errors!);
    }

    return this.transactionManager.runInTransactionResult(async () => {
      const saved = await this.accounts.save(updated.instance);
      if (saved.isFailure) {
        return Result.fail<MandatoryPasswordChangeOutput>(saved.errors!);
      }

      const revoked = await this.sessions.revokeOtherSessions(data.userId, data.bancaId, data.currentSessionId, now);
      if (revoked.isFailure) {
        return Result.fail<MandatoryPasswordChangeOutput>(revoked.errors!);
      }

      const accessToken = await this.accessTokenIssuer.issue({
        sub: account.id,
        bancaId: data.bancaId,
        sessionId: data.currentSessionId,
        role: account.role.value,
        mustChangePassword: false,
      });
      if (accessToken.isFailure) {
        return Result.fail<MandatoryPasswordChangeOutput>(accessToken.errors!);
      }

      return Result.ok<MandatoryPasswordChangeOutput>({
        userId: account.id,
        accessToken: accessToken.instance.token,
        accessTokenExpiresAt: accessToken.instance.expiresAt,
      });
    });
  }
}
