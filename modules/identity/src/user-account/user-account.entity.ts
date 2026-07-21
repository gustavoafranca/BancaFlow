import { AccountRoleType, Email, Entity, EntityProps, Id, PersonName, Result } from '@bancaflow/shared';
import { IDENTITY_ERRORS } from '../shared/errors/identity.errors';
import { AccountRole } from './vo/account-role.vo';
import { AccountStatus, AccountStatusType } from './vo/account-status.vo';
import { Credential, CredentialData } from './vo/credential.vo';
import { Username } from './vo/username.vo';

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const LOCK_MS = 15 * 60 * 1000; // 15 minutos

export interface UserAccountProps extends EntityProps {
  bancaId: string;
  username: string; // valor bruto (raw)
  name: string;
  email?: string | null;
  role: AccountRoleType;
  status: AccountStatusType;
  credential: CredentialData;
  failedLoginAttempts: number;
  failedLoginWindowStartedAt?: Date | null;
  lockedUntil?: Date | null;
  version?: number;
}

export class UserAccount extends Entity<UserAccount, UserAccountProps> {
  private constructor(props: UserAccountProps) {
    super(props);
  }

  private rebuild(overrides: Partial<UserAccountProps>): Result<UserAccount> {
    return UserAccount.tryCreate({ ...this.props, ...overrides });
  }

  get bancaId(): string {
    return this.props.bancaId;
  }

  get username(): Username {
    return Username.create(this.props.username);
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string | null {
    return this.props.email ?? null;
  }

  get role(): AccountRole {
    return AccountRole.create(this.props.role);
  }

  get status(): AccountStatus {
    return AccountStatus.create(this.props.status);
  }

  get credential(): Credential {
    return Credential.create(this.props.credential);
  }

  get failedLoginAttempts(): number {
    return this.props.failedLoginAttempts;
  }

  get failedLoginWindowStartedAt(): Date | null {
    return this.props.failedLoginWindowStartedAt ? new Date(this.props.failedLoginWindowStartedAt.getTime()) : null;
  }

  get lockedUntil(): Date | null {
    return this.props.lockedUntil ? new Date(this.props.lockedUntil.getTime()) : null;
  }

  get mustChangePassword(): boolean {
    return this.props.credential.mustChangePassword;
  }

  get version(): number {
    return this.props.version ?? 1;
  }

  isLocked(now: Date): boolean {
    const lockedUntil = this.props.lockedUntil;
    return !!lockedUntil && lockedUntil.getTime() > now.getTime();
  }

  isActive(): boolean {
    return this.props.status === 'ACTIVE';
  }

  recordLoginFailure(now: Date): Result<UserAccount> {
    const windowStartedAt = this.props.failedLoginWindowStartedAt;
    const windowExpired = !windowStartedAt || now.getTime() - windowStartedAt.getTime() > WINDOW_MS;

    const attempts = windowExpired ? 1 : this.props.failedLoginAttempts + 1;
    const nextWindowStart = windowExpired ? now : windowStartedAt!;
    const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(now.getTime() + LOCK_MS) : null;

    return this.rebuild({
      failedLoginAttempts: attempts,
      failedLoginWindowStartedAt: nextWindowStart,
      lockedUntil,
    });
  }

  resetLoginFailures(): Result<UserAccount> {
    return this.rebuild({
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedUntil: null,
    });
  }

  activate(): Result<UserAccount> {
    return this.rebuild({
      status: AccountStatus.ACTIVE,
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedUntil: null,
    });
  }

  deactivate(): Result<UserAccount> {
    if (this.role.isOwner) {
      return Result.fail(IDENTITY_ERRORS.FORBIDDEN);
    }
    return this.rebuild({ status: AccountStatus.INACTIVE });
  }

  block(): Result<UserAccount> {
    if (this.role.isOwner) {
      return Result.fail(IDENTITY_ERRORS.FORBIDDEN);
    }
    return this.rebuild({ status: AccountStatus.BLOCKED });
  }

  unblock(): Result<UserAccount> {
    return this.rebuild({
      status: AccountStatus.ACTIVE,
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedUntil: null,
    });
  }

  rename(newName: PersonName): Result<UserAccount> {
    return this.rebuild({ name: newName.value });
  }

  updateEmail(newEmail: Email | null): Result<UserAccount> {
    return this.rebuild({ email: newEmail ? newEmail.value : null });
  }

  renameUsername(newUsername: Username): Result<UserAccount> {
    return this.rebuild({ username: newUsername.raw });
  }

  changeRole(newRole: AccountRole): Result<UserAccount> {
    if (this.role.isOwner || newRole.isOwner) {
      return Result.fail(IDENTITY_ERRORS.FORBIDDEN);
    }
    return this.rebuild({ role: newRole.value });
  }

  changePassword(newHash: string, mustChangePassword: boolean, changedAt: Date): Result<UserAccount> {
    const credential = Credential.tryCreate({
      passwordHash: newHash,
      passwordChangedAt: changedAt,
      mustChangePassword,
    });
    if (credential.isFailure) {
      return Result.fail(credential.errors!);
    }
    return this.rebuild({ credential: credential.instance.value });
  }

  static create(props: UserAccountProps): UserAccount {
    const result = UserAccount.tryCreate(props);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(props: UserAccountProps): Result<UserAccount> {
    const id = Id.tryCreate(props.id);
    const bancaId = Id.tryCreate(props.bancaId);
    const username = Username.tryCreate(props.username);
    const name = PersonName.tryCreate(props.name);
    const role = AccountRole.tryCreate(props.role);
    const status = AccountStatus.tryCreate(props.status);
    const credential = Credential.tryCreate(props.credential);

    const attrs = Result.combine([id, bancaId, username, name, role, status, credential]);
    if (attrs.isFailure) {
      return Result.fail(attrs.errors!);
    }

    let email: string | null = null;
    if (props.email) {
      const emailResult = Email.tryCreate(props.email);
      if (emailResult.isFailure) {
        return Result.fail(emailResult.errors!);
      }
      email = emailResult.instance.value;
    }

    const failedLoginAttempts = props.failedLoginAttempts ?? 0;
    if (failedLoginAttempts < 0) {
      return Result.fail(IDENTITY_ERRORS.INVALID_FAILED_LOGIN_ATTEMPTS);
    }

    return Result.ok(
      new UserAccount({
        ...props,
        id: id.instance.value,
        bancaId: bancaId.instance.value,
        username: username.instance.raw,
        name: name.instance.value,
        email,
        role: role.instance.value,
        status: status.instance.value,
        credential: credential.instance.value,
        failedLoginAttempts,
        failedLoginWindowStartedAt: props.failedLoginWindowStartedAt
          ? new Date(props.failedLoginWindowStartedAt.getTime())
          : null,
        lockedUntil: props.lockedUntil ? new Date(props.lockedUntil.getTime()) : null,
        version: props.version ?? 1,
      }),
    );
  }
}
