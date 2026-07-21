import { AccountRoleType, Result, StrongPassword, UseCase } from '@bancaflow/shared';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import { PermissionChecker } from '../../shared/ports/permission-checker.port';
import { TemporaryPasswordGenerator } from '../../shared/ports/temporary-password-generator.port';
import type { AdministrableAccountRole } from '../query/list-user-accounts.query';
import { CreateUserAccountPort } from './create-user-account.use-case';

const MAX_TEMP_PASSWORD_ATTEMPTS = 5;

export interface AdminCreateUserAccountInput {
  bancaId: string;
  actorRole: AccountRoleType;
  actorUserId: string;
  username: string;
  name: string;
  email?: string;
  role: AdministrableAccountRole;
}

export interface AdminCreateUserAccountOutput {
  userId: string;
  username: string;
  role: AccountRoleType;
  temporaryPassword: string;
}

/**
 * Criação administrativa de conta `ADMIN`/`USER` pelo `OWNER`, dentro da
 * própria banca. NÃO duplica as validações de `username`/`PersonName`/
 * `Email`/`StrongPassword` — delega a criação do agregado ao
 * `CreateUserAccountUseCase` já existente (consumido, sem alterações de
 * contrato, também por `ProvisionBanca`). A autorização administrativa vive
 * inteiramente aqui, nunca dentro do caso de uso delegado.
 */
export class AdminCreateUserAccountUseCase
  implements UseCase<AdminCreateUserAccountInput, AdminCreateUserAccountOutput>
{
  constructor(
    private readonly createUserAccount: CreateUserAccountPort,
    private readonly tempPasswordGenerator: TemporaryPasswordGenerator,
    private readonly permissions: PermissionChecker,
  ) {}

  async execute(data: AdminCreateUserAccountInput): Promise<Result<AdminCreateUserAccountOutput>> {
    if (!this.permissions.hasPermission(data.actorRole, 'identity.accounts.create')) {
      return Result.fail(IDENTITY_ERRORS.FORBIDDEN);
    }

    if (data.role !== 'ADMIN' && data.role !== 'USER') {
      return Result.fail(IDENTITY_ERRORS.FORBIDDEN);
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

    const created = await this.createUserAccount.execute({
      bancaId: data.bancaId,
      username: data.username,
      name: data.name,
      email: data.email,
      password: temporary.instance,
      role: data.role,
      mustChangePassword: true,
    });
    if (created.isFailure) {
      return Result.fail(created.errors!);
    }

    return Result.ok({
      userId: created.instance.userId,
      username: created.instance.username,
      role: created.instance.role,
      temporaryPassword: temporary.instance,
    });
  }
}
