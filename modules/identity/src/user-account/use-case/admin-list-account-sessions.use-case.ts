import { AccountRoleType, Result, UseCase } from '@bancaflow/shared';
import { SessionRepository } from '../../session/session.repository';
import { SessionInfoDto } from '../../shared/dto/session-info.dto';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';
import { assertAdministrableTarget } from '../assert-administrable-target';
import { UserAccountRepository } from '../user-account.repository';

export interface AdminListAccountSessionsInput {
  bancaId: string;
  actorRole: AccountRoleType;
  actorUserId: string;
  targetUserId: string;
}

/**
 * Lista as sessões ativas de uma conta de terceiro. Distinto de
 * `ListSessionsUseCase` (autosserviço, sempre sobre o próprio ator):
 * `isCurrent` é sempre `false` aqui, pois o ator nunca consulta as próprias
 * sessões por este endpoint (autoconsulta é rejeitada por
 * `assertAdministrableTarget`).
 */
export class AdminListAccountSessionsUseCase implements UseCase<AdminListAccountSessionsInput, SessionInfoDto[]> {
  constructor(
    private readonly accounts: UserAccountRepository,
    private readonly sessions: SessionRepository,
    private readonly permissions: PermissionChecker,
  ) {}

  async execute(data: AdminListAccountSessionsInput): Promise<Result<SessionInfoDto[]>> {
    if (!this.permissions.hasPermission(data.actorRole, 'identity.accounts.sessions.read')) {
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

    const active = await this.sessions.findActiveByUser(data.targetUserId, data.bancaId);
    if (active.isFailure) {
      return Result.fail(active.errors!);
    }

    const list: SessionInfoDto[] = active.instance.map((session) => ({
      sessionId: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: false,
      deviceInfo: session.deviceInfo ?? undefined,
    }));

    return Result.ok(list);
  }
}
