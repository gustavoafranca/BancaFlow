import { AccountRoleType, Email, PersonName, Result, UseCase } from '@bancaflow/shared';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';
import { assertAdministrableTarget } from '../assert-administrable-target';
import { UserAccountRepository } from '../user-account.repository';
import { Username } from '../vo/username.vo';

export interface UpdateUserAccountInput {
  bancaId: string;
  actorRole: AccountRoleType;
  actorUserId: string;
  targetUserId: string;
  expectedVersion: number;
  username?: string;
  name?: string;
  email?: string | null;
}

export interface UpdateUserAccountOutput {
  userId: string;
}

/**
 * Atualiza username/name/email de uma conta de terceiro. Reutiliza os VOs
 * compartilhados `PersonName`/`Email` (mesmos usados por
 * `UpdateOwnProfileUseCase`) e o VO local `Username` de Identity. Não revoga
 * sessões — nenhum destes campos é claim do access token.
 */
export class UpdateUserAccountUseCase implements UseCase<UpdateUserAccountInput, UpdateUserAccountOutput> {
  constructor(
    private readonly accounts: UserAccountRepository,
    private readonly permissions: PermissionChecker,
  ) {}

  async execute(data: UpdateUserAccountInput): Promise<Result<UpdateUserAccountOutput>> {
    if (!this.permissions.hasPermission(data.actorRole, 'identity.accounts.update')) {
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

    if (target.version !== data.expectedVersion) {
      return Result.fail(IDENTITY_ERRORS.CONCURRENCY_CONFLICT);
    }

    let updated = target;

    if (data.username !== undefined) {
      const username = Username.tryCreate(data.username);
      if (username.isFailure) {
        return Result.fail(username.errors!);
      }

      const existing = await this.accounts.findByBancaAndUsername(data.bancaId, username.instance.normalized);
      if (existing.isFailure) {
        return Result.fail(existing.errors!);
      }
      if (existing.instance && existing.instance.id !== target.id) {
        return Result.fail(IDENTITY_ERRORS.USERNAME_ALREADY_EXISTS);
      }

      const renamed = updated.renameUsername(username.instance);
      if (renamed.isFailure) {
        return Result.fail(renamed.errors!);
      }
      updated = renamed.instance;
    }

    if (data.name !== undefined) {
      const name = PersonName.tryCreate(data.name);
      if (name.isFailure) {
        return Result.fail(name.errors!);
      }
      const renamed = updated.rename(name.instance);
      if (renamed.isFailure) {
        return Result.fail(renamed.errors!);
      }
      updated = renamed.instance;
    }

    if (data.email !== undefined) {
      let email: Email | null = null;
      if (data.email !== null) {
        const emailResult = Email.tryCreate(data.email);
        if (emailResult.isFailure) {
          return Result.fail(emailResult.errors!);
        }
        email = emailResult.instance;
      }
      const withEmail = updated.updateEmail(email);
      if (withEmail.isFailure) {
        return Result.fail(withEmail.errors!);
      }
      updated = withEmail.instance;
    }

    const saved = await this.accounts.save(updated);
    if (saved.isFailure) {
      return Result.fail(saved.errors!);
    }

    return Result.ok({ userId: target.id });
  }
}
