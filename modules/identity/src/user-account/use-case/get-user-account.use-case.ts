import { AccountRoleType, Result, UseCase } from '@bancaflow/shared';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';
import { assertAdministrableTarget } from '../assert-administrable-target';
import { UserAccountRepository } from '../user-account.repository';
import { AccountStatusType } from '../vo/account-status.vo';

export interface GetUserAccountInput {
  bancaId: string;
  actorRole: AccountRoleType;
  actorUserId: string;
  targetUserId: string;
}

export interface GetUserAccountOutput {
  userId: string;
  username: string;
  name: string;
  email: string | null;
  role: AccountRoleType;
  status: AccountStatusType;
  mustChangePassword: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class GetUserAccountUseCase implements UseCase<GetUserAccountInput, GetUserAccountOutput> {
  constructor(
    private readonly accounts: UserAccountRepository,
    private readonly permissions: PermissionChecker,
  ) {}

  async execute(data: GetUserAccountInput): Promise<Result<GetUserAccountOutput>> {
    if (!this.permissions.hasPermission(data.actorRole, 'identity.accounts.read')) {
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

    return Result.ok({
      userId: target.id,
      username: target.username.raw,
      name: target.name,
      email: target.email,
      role: target.role.value,
      status: target.status.value,
      mustChangePassword: target.mustChangePassword,
      version: target.version,
      createdAt: target.createdAt,
      updatedAt: target.updatedAt,
    });
  }
}
