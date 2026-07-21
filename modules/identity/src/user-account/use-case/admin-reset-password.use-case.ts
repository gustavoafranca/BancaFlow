import { AccountRoleType, Result, StrongPassword, TransactionManager, UseCase } from '@bancaflow/shared';
import { SessionRepository } from '../../session/session.repository';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import { Clock } from '../../shared/ports/clock.port';
import { PasswordCryptoProvider } from '../../shared/ports/password-crypto.port';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';
import { TemporaryPasswordGenerator } from '../../shared/ports/temporary-password-generator.port';
import { assertAdministrableTarget } from '../assert-administrable-target';
import { UserAccountRepository } from '../user-account.repository';

const MAX_TEMP_PASSWORD_ATTEMPTS = 5;

export interface AdminResetPasswordInput {
  bancaId: string;
  actorRole: AccountRoleType;
  actorUserId: string;
  targetUserId: string;
}

export interface AdminResetPasswordOutput {
  userId: string;
  temporaryPassword: string;
}

export class AdminResetPasswordUseCase implements UseCase<AdminResetPasswordInput, AdminResetPasswordOutput> {
  constructor(
    private readonly accounts: UserAccountRepository,
    private readonly sessions: SessionRepository,
    private readonly passwordCrypto: PasswordCryptoProvider,
    private readonly tempPasswordGenerator: TemporaryPasswordGenerator,
    private readonly clock: Clock,
    private readonly transactionManager: TransactionManager,
    private readonly permissions: PermissionChecker,
  ) {}

  async execute(data: AdminResetPasswordInput): Promise<Result<AdminResetPasswordOutput>> {
    if (!this.permissions.hasPermission(data.actorRole, 'identity.accounts.reset-password')) {
      return Result.fail(IDENTITY_ERRORS.FORBIDDEN);
    }

    const found = await this.accounts.findById(data.targetUserId, data.bancaId);
    if (found.isFailure) {
      return Result.fail(found.errors!);
    }
    const target = found.instance;
    if (!target) {
      return Result.fail(IDENTITY_ERRORS.ACCOUNT_NOT_FOUND);
    }

    const administrable = assertAdministrableTarget(data.actorUserId, target);
    if (administrable.isFailure) {
      return Result.fail(administrable.errors!);
    }

    let temporary: Result<string> | undefined;
    for (let attempt = 0; attempt < MAX_TEMP_PASSWORD_ATTEMPTS; attempt++) {
      const generated = this.tempPasswordGenerator.generate();
      if (generated.isFailure) {
        return Result.fail(generated.errors!);
      }
      if (StrongPassword.isStrong(generated.instance)) {
        temporary = generated;
        break;
      }
    }
    if (!temporary) {
      return Result.fail(IDENTITY_ERRORS.PASSWORD_TOO_WEAK);
    }

    const hash = await this.passwordCrypto.hash(temporary.instance);
    if (hash.isFailure) {
      return Result.fail(hash.errors!);
    }

    const now = this.clock.now();
    const updated = target.changePassword(hash.instance, true, now);
    if (updated.isFailure) {
      return Result.fail(updated.errors!);
    }

    return this.transactionManager.runInTransactionResult(async () => {
      const saved = await this.accounts.save(updated.instance);
      if (saved.isFailure) {
        return Result.fail<AdminResetPasswordOutput>(saved.errors!);
      }

      const revoked = await this.sessions.revokeAll(data.targetUserId, data.bancaId, now);
      if (revoked.isFailure) {
        return Result.fail<AdminResetPasswordOutput>(revoked.errors!);
      }

      return Result.ok<AdminResetPasswordOutput>({
        userId: target.id,
        temporaryPassword: temporary!.instance,
      });
    });
  }
}
