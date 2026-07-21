import { AccountRoleType, Result, TransactionManager, UseCase } from '@bancaflow/shared';
import { SessionRepository } from '../../session/session.repository';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import { Clock } from '../../shared/ports/clock.port';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';
import { assertAdministrableTarget } from '../assert-administrable-target';
import { UserAccount } from '../user-account.entity';
import { UserAccountRepository } from '../user-account.repository';
import { AccountStatusType } from '../vo/account-status.vo';

export type ToggleAccountStatusAction = 'activate' | 'deactivate' | 'block' | 'unblock';

export interface ToggleAccountStatusInput {
  bancaId: string;
  actorRole: AccountRoleType;
  actorUserId: string;
  targetUserId: string;
  action: ToggleAccountStatusAction;
}

export interface ToggleAccountStatusOutput {
  userId: string;
  status: AccountStatusType;
}

export class ToggleAccountStatusUseCase implements UseCase<ToggleAccountStatusInput, ToggleAccountStatusOutput> {
  constructor(
    private readonly accounts: UserAccountRepository,
    private readonly sessions: SessionRepository,
    private readonly clock: Clock,
    private readonly transactionManager: TransactionManager,
    private readonly permissions: PermissionChecker,
  ) {}

  async execute(data: ToggleAccountStatusInput): Promise<Result<ToggleAccountStatusOutput>> {
    if (!this.permissions.hasPermission(data.actorRole, 'identity.accounts.toggle-status')) {
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

    const updated = this.applyAction(target, data.action);
    if (updated.isFailure) {
      return Result.fail(updated.errors!);
    }

    return this.transactionManager.runInTransactionResult(async () => {
      const saved = await this.accounts.save(updated.instance);
      if (saved.isFailure) {
        return Result.fail<ToggleAccountStatusOutput>(saved.errors!);
      }

      if (data.action === 'block' || data.action === 'deactivate') {
        const revoked = await this.sessions.revokeAll(updated.instance.id, data.bancaId, this.clock.now());
        if (revoked.isFailure) {
          return Result.fail<ToggleAccountStatusOutput>(revoked.errors!);
        }
      }

      return Result.ok<ToggleAccountStatusOutput>({
        userId: updated.instance.id,
        status: updated.instance.status.value,
      });
    });
  }

  private applyAction(account: UserAccount, action: ToggleAccountStatusAction): Result<UserAccount> {
    switch (action) {
      case 'activate':
        return account.activate();
      case 'deactivate':
        return account.deactivate();
      case 'block':
        return account.block();
      case 'unblock':
        return account.unblock();
      default:
        return Result.fail(IDENTITY_ERRORS.FORBIDDEN);
    }
  }
}
