import { AccountRoleType, Result, UseCase } from '@bancaflow/shared';
import { SessionRepository } from '../../session/session.repository';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import { Clock } from '../../shared/ports/clock.port';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';
import { assertAdministrableTarget } from '../assert-administrable-target';
import { UserAccountRepository } from '../user-account.repository';

export interface AdminRevokeAccountSessionInput {
  bancaId: string;
  actorRole: AccountRoleType;
  actorUserId: string;
  targetUserId: string;
  sessionId: string;
}

export interface AdminRevokeAccountSessionOutput {
  sessionId: string;
}

/**
 * Revoga uma sessão específica de uma conta de terceiro. Reaproveita
 * `IDENTITY_ERRORS.TARGET_SESSION_NOT_FOUND` (mesmo código de
 * `RevokeSessionUseCase`) quando a sessão não existe ou não pertence à
 * conta indicada, sem revelar detalhes.
 */
export class AdminRevokeAccountSessionUseCase
  implements UseCase<AdminRevokeAccountSessionInput, AdminRevokeAccountSessionOutput>
{
  constructor(
    private readonly accounts: UserAccountRepository,
    private readonly sessions: SessionRepository,
    private readonly clock: Clock,
    private readonly permissions: PermissionChecker,
  ) {}

  async execute(data: AdminRevokeAccountSessionInput): Promise<Result<AdminRevokeAccountSessionOutput>> {
    if (!this.permissions.hasPermission(data.actorRole, 'identity.accounts.sessions.revoke')) {
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

    const foundSession = await this.sessions.findById(data.sessionId, data.bancaId);
    if (foundSession.isFailure) {
      return Result.fail(foundSession.errors!);
    }
    const session = foundSession.instance;
    if (!session || session.userId !== data.targetUserId) {
      return Result.fail(IDENTITY_ERRORS.TARGET_SESSION_NOT_FOUND);
    }

    if (!session.isRevoked()) {
      const revoked = session.revoke(this.clock.now());
      if (revoked.isFailure) {
        return Result.fail(revoked.errors!);
      }
      const saved = await this.sessions.save(revoked.instance);
      if (saved.isFailure) {
        return Result.fail(saved.errors!);
      }
    }

    return Result.ok({ sessionId: data.sessionId });
  }
}
