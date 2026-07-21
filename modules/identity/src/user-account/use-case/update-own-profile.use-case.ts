import { AccountRoleType, Email, PersonName, Result, UseCase } from '@bancaflow/shared';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';
import { UserAccountRepository } from '../user-account.repository';

export interface UpdateOwnProfileInput {
  bancaId: string;
  userId: string;
  actorRole: AccountRoleType;
  expectedVersion: number;
  name?: string;
  email?: string | null;
}

export interface UpdateOwnProfileOutput {
  userId: string;
}

export class UpdateOwnProfileUseCase implements UseCase<UpdateOwnProfileInput, UpdateOwnProfileOutput> {
  constructor(
    private readonly accounts: UserAccountRepository,
    private readonly permissions: PermissionChecker,
  ) {}

  async execute(data: UpdateOwnProfileInput): Promise<Result<UpdateOwnProfileOutput>> {
    if (!this.permissions.hasPermission(data.actorRole, 'identity.profile.update-own')) {
      return Result.fail(IDENTITY_ERRORS.FORBIDDEN);
    }

    const found = await this.accounts.findById(data.userId, data.bancaId);
    if (found.isFailure) {
      return Result.fail(found.errors!);
    }
    const account = found.instance;
    if (!account) {
      return Result.fail(IDENTITY_ERRORS.ACCOUNT_NOT_FOUND);
    }

    if (account.version !== data.expectedVersion) {
      return Result.fail(IDENTITY_ERRORS.CONCURRENCY_CONFLICT);
    }

    let updated = account;

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

    return Result.ok({ userId: account.id });
  }
}
