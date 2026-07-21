import { AccountRoleType, Result, TransactionManager, UseCase } from '@bancaflow/shared';
import { SessionRepository } from '../../session/session.repository';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import { Clock } from '../../shared/ports/clock.port';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';
import { assertAdministrableTarget } from '../assert-administrable-target';
import type { AdministrableAccountRole } from '../query/list-user-accounts.query';
import { UserAccountRepository } from '../user-account.repository';
import { AccountRole } from '../vo/account-role.vo';

export interface ChangeAccountRoleInput {
  bancaId: string;
  actorRole: AccountRoleType;
  actorUserId: string;
  targetUserId: string;
  role: AdministrableAccountRole;
}

export interface ChangeAccountRoleOutput {
  userId: string;
  role: AccountRoleType;
}

/**
 * Alterna uma conta de terceiro entre `ADMIN` e `USER`. `OWNER` nunca é um
 * alvo administrável (`assertAdministrableTarget`) nem um valor de destino
 * válido (`UserAccount.changeRole` rejeita). Revoga todas as sessões ativas
 * do alvo na mesma transação — `role` é claim do access token.
 */
export class ChangeAccountRoleUseCase implements UseCase<ChangeAccountRoleInput, ChangeAccountRoleOutput> {
  constructor(
    private readonly accounts: UserAccountRepository,
    private readonly sessions: SessionRepository,
    private readonly clock: Clock,
    private readonly transactionManager: TransactionManager,
    private readonly permissions: PermissionChecker,
  ) {}

  async execute(data: ChangeAccountRoleInput): Promise<Result<ChangeAccountRoleOutput>> {
    if (!this.permissions.hasPermission(data.actorRole, 'identity.accounts.change-role')) {
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

    const newRole = AccountRole.tryCreate(data.role);
    if (newRole.isFailure) {
      return Result.fail(newRole.errors!);
    }

    const updated = target.changeRole(newRole.instance);
    if (updated.isFailure) {
      return Result.fail(updated.errors!);
    }

    return this.transactionManager.runInTransactionResult(async () => {
      const saved = await this.accounts.save(updated.instance);
      if (saved.isFailure) {
        return Result.fail<ChangeAccountRoleOutput>(saved.errors!);
      }

      const revoked = await this.sessions.revokeAll(updated.instance.id, data.bancaId, this.clock.now());
      if (revoked.isFailure) {
        return Result.fail<ChangeAccountRoleOutput>(revoked.errors!);
      }

      return Result.ok<ChangeAccountRoleOutput>({
        userId: updated.instance.id,
        role: updated.instance.role.value,
      });
    });
  }
}
