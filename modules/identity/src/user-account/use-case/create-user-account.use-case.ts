import { AccountRoleType, Result, StrongPassword, UseCase } from '@bancaflow/shared';
import { IDENTITY_ERRORS } from '../../shared/errors/identity.errors';
import { Clock } from '../../shared/ports/clock.port';
import { PasswordCryptoProvider } from '../../shared/ports/password-crypto.port';
import { UserAccount } from '../user-account.entity';
import { UserAccountRepository } from '../user-account.repository';
import { AccountRole } from '../vo/account-role.vo';
import { AccountStatus } from '../vo/account-status.vo';
import { Username } from '../vo/username.vo';

export interface CreateUserAccountInput {
  bancaId: string;
  username: string;
  name: string;
  password: string;
  email?: string;
  role: AccountRoleType;
  mustChangePassword?: boolean;
}

export interface CreateUserAccountOutput {
  userId: string;
  username: string;
  role: AccountRoleType;
}

export interface CreateUserAccountPort extends UseCase<CreateUserAccountInput, CreateUserAccountOutput> {}

export class CreateUserAccountUseCase implements CreateUserAccountPort {
  constructor(
    private readonly accounts: UserAccountRepository,
    private readonly passwordCrypto: PasswordCryptoProvider,
    private readonly clock: Clock,
  ) {}

  async execute(data: CreateUserAccountInput): Promise<Result<CreateUserAccountOutput>> {
    const username = Username.tryCreate(data.username);
    if (username.isFailure) {
      return Result.fail(username.errors!);
    }

    const role = AccountRole.tryCreate(data.role);
    if (role.isFailure) {
      return Result.fail(role.errors!);
    }

    if (!StrongPassword.isStrong(data.password)) {
      return Result.fail(IDENTITY_ERRORS.PASSWORD_TOO_WEAK);
    }

    const existing = await this.accounts.findByBancaAndUsername(data.bancaId, username.instance.normalized);
    if (existing.isFailure) {
      return Result.fail(existing.errors!);
    }
    if (existing.instance) {
      return Result.fail(IDENTITY_ERRORS.USERNAME_ALREADY_EXISTS);
    }

    const hash = await this.passwordCrypto.hash(data.password);
    if (hash.isFailure) {
      return Result.fail(hash.errors!);
    }

    const now = this.clock.now();
    const account = UserAccount.tryCreate({
      id: this.accounts.nextId(),
      bancaId: data.bancaId,
      username: username.instance.raw,
      name: data.name,
      email: data.email ?? null,
      role: role.instance.value,
      status: AccountStatus.ACTIVE,
      credential: {
        passwordHash: hash.instance,
        passwordChangedAt: now,
        mustChangePassword: data.mustChangePassword ?? false,
      },
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedUntil: null,
    });
    if (account.isFailure) {
      return Result.fail(account.errors!);
    }

    const saved = await this.accounts.save(account.instance);
    if (saved.isFailure) {
      return Result.fail(saved.errors!);
    }

    return Result.ok({
      userId: account.instance.id,
      username: account.instance.username.raw,
      role: account.instance.role.value,
    });
  }
}
