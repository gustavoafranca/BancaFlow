import { Result, StrongPassword, TransactionManager, UseCase } from '@bancaflow/shared';
import { SessionRepository } from '../../session/session.repository';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import { AccessTokenIssuer } from '../../shared/ports/access-token-issuer.port';
import { Clock } from '../../shared/ports/clock.port';
import { PasswordCryptoProvider } from '../../shared/ports/password-crypto.port';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';
import { UserAccountRepository } from '../user-account.repository';

export interface ChangePasswordInput {
  bancaId: string;
  userId: string;
  currentPassword: string;
  newPassword: string;
  currentSessionId: string;
}

export interface ChangePasswordOutput {
  userId: string;
  accessToken: string;
  accessTokenExpiresAt: Date;
}

export class ChangePasswordUseCase implements UseCase<ChangePasswordInput, ChangePasswordOutput> {
  constructor(
    private readonly accounts: UserAccountRepository,
    private readonly sessions: SessionRepository,
    private readonly passwordCrypto: PasswordCryptoProvider,
    private readonly accessTokenIssuer: AccessTokenIssuer,
    private readonly clock: Clock,
    private readonly transactionManager: TransactionManager,
    private readonly permissions: PermissionChecker,
  ) {}

  async execute(data: ChangePasswordInput): Promise<Result<ChangePasswordOutput>> {
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

    if (!this.permissions.hasPermission(account.role.value, 'identity.password.change-own')) {
      return Result.fail(IDENTITY_ERRORS.FORBIDDEN);
    }

    const matches = await this.passwordCrypto.compare(data.currentPassword, account.credential.passwordHash);
    if (matches.isFailure) {
      return Result.fail(matches.errors!);
    }
    if (!matches.instance) {
      return Result.fail(IDENTITY_ERRORS.CURRENT_PASSWORD_INCORRECT);
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
        return Result.fail<ChangePasswordOutput>(saved.errors!);
      }

      const revoked = await this.sessions.revokeOtherSessions(data.userId, data.bancaId, data.currentSessionId, now);
      if (revoked.isFailure) {
        return Result.fail<ChangePasswordOutput>(revoked.errors!);
      }

      const accessToken = await this.accessTokenIssuer.issue({
        sub: account.id,
        bancaId: data.bancaId,
        sessionId: data.currentSessionId,
        role: account.role.value,
        mustChangePassword: false,
      });
      if (accessToken.isFailure) {
        return Result.fail<ChangePasswordOutput>(accessToken.errors!);
      }

      return Result.ok<ChangePasswordOutput>({
        userId: account.id,
        accessToken: accessToken.instance.token,
        accessTokenExpiresAt: accessToken.instance.expiresAt,
      });
    });
  }
}
