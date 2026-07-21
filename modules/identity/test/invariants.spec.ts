import { Id } from '@bancaflow/shared';
import { UserAccount } from '../src/user-account/user-account.entity';
import { AccountRole } from '../src/user-account/vo/account-role.vo';
import { AccountStatus } from '../src/user-account/vo/account-status.vo';
import { Session } from '../src/session/session.entity';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';

const BASE = new Date('2026-07-15T12:00:00.000Z');

function buildAccount(overrides: Partial<Parameters<typeof UserAccount.create>[0]> = {}): UserAccount {
  return UserAccount.create({
    id: Id.createUUID(),
    bancaId: Id.createUUID(),
    username: 'joao',
    name: 'Joao Silva',
    role: AccountRole.USER,
    status: AccountStatus.ACTIVE,
    credential: { passwordHash: 'hashed-password', passwordChangedAt: BASE, mustChangePassword: false },
    failedLoginAttempts: 0,
    ...overrides,
  });
}

describe('UserAccount — invariantes de contador e cópias defensivas', () => {
  it('rejeita failedLoginAttempts negativo na criação', () => {
    const result = UserAccount.tryCreate({
      id: Id.createUUID(),
      bancaId: Id.createUUID(),
      username: 'joao',
      name: 'Joao Silva',
      role: AccountRole.USER,
      status: AccountStatus.ACTIVE,
      credential: { passwordHash: 'hash', passwordChangedAt: BASE, mustChangePassword: false },
      failedLoginAttempts: -1,
    });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.INVALID_FAILED_LOGIN_ATTEMPTS);
  });

  it('resetLoginFailures nunca deixa o contador negativo (sempre zera)', () => {
    const account = buildAccount({ failedLoginAttempts: 3 });
    const reset = account.resetLoginFailures();
    expect(reset.instance.failedLoginAttempts).toBe(0);
  });

  it('expõe version com default 1 quando ausente', () => {
    const account = buildAccount();
    expect(account.version).toBe(1);
  });

  it('mutar a data retornada por failedLoginWindowStartedAt não afeta o estado interno', () => {
    const account = buildAccount({ failedLoginWindowStartedAt: BASE });
    const exposed = account.failedLoginWindowStartedAt!;
    exposed.setFullYear(1999);
    expect(account.failedLoginWindowStartedAt!.getTime()).toBe(BASE.getTime());
  });

  it('mutar a data retornada por lockedUntil não afeta o estado interno', () => {
    const lockedUntil = new Date(BASE.getTime() + 1000);
    const account = buildAccount({ lockedUntil });
    const exposed = account.lockedUntil!;
    exposed.setFullYear(1999);
    expect(account.lockedUntil!.getTime()).toBe(lockedUntil.getTime());
  });

  it('mutar a data de entrada (lockedUntil) após a criação não afeta o estado interno', () => {
    const lockedUntil = new Date(BASE.getTime() + 1000);
    const account = buildAccount({ lockedUntil });
    lockedUntil.setFullYear(1999); // muta o objeto original passado
    expect(account.lockedUntil!.getFullYear()).not.toBe(1999);
  });

  it('mutar a data retornada por credential.passwordChangedAt não afeta o estado interno', () => {
    const account = buildAccount();
    const exposed = account.credential.passwordChangedAt;
    exposed.setFullYear(1999);
    expect(account.credential.passwordChangedAt.getFullYear()).not.toBe(1999);
  });

  it('todas as transições de status ocorrem por métodos, nunca por setter público', () => {
    const account = buildAccount();
    expect((account as any).setStatus).toBeUndefined();
    expect(typeof account.activate).toBe('function');
    expect(typeof account.deactivate).toBe('function');
    expect(typeof account.block).toBe('function');
    expect(typeof account.unblock).toBe('function');
  });

  it('mutar o objeto retornado por toJSON() NÃO altera o estado do agregado', () => {
    const account = buildAccount({ status: AccountStatus.BLOCKED });
    const snapshot = account.toJSON() as Record<string, unknown>;
    // Tentativa de burlar as invariantes mutando o snapshot serializado.
    snapshot.status = AccountStatus.ACTIVE;
    (snapshot.credential as { mustChangePassword: boolean }).mustChangePassword = true;
    expect(account.status.value).toBe(AccountStatus.BLOCKED);
    expect(account.mustChangePassword).toBe(false);
  });

  it('mutar o objeto retornado por credential.value NÃO altera a credencial', () => {
    const account = buildAccount();
    const exposed = account.credential.value;
    exposed.mustChangePassword = true;
    exposed.passwordHash = 'tampered';
    expect(account.credential.mustChangePassword).toBe(false);
    expect(account.credential.passwordHash).toBe('hashed-password');
  });

  it('mutar a data retornada por createdAt/updatedAt NÃO altera o estado interno', () => {
    const account = buildAccount();
    const created = account.createdAt;
    created.setFullYear(1999);
    expect(account.createdAt.getFullYear()).not.toBe(1999);
  });
});

describe('Session — cópias defensivas de datas', () => {
  function buildSession(overrides: Partial<Parameters<typeof Session.create>[0]> = {}): Session {
    return Session.create({
      id: Id.createUUID(),
      userId: Id.createUUID(),
      bancaId: Id.createUUID(),
      refreshTokenDigest: 'digest-1',
      expiresAt: new Date(BASE.getTime() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
      ...overrides,
    });
  }

  it('mutar a data retornada por expiresAt não afeta o estado interno', () => {
    const session = buildSession();
    const original = session.expiresAt.getTime();
    const exposed = session.expiresAt;
    exposed.setFullYear(1999);
    expect(session.expiresAt.getTime()).toBe(original);
  });

  it('mutar a data retornada por revokedAt não afeta o estado interno', () => {
    const session = buildSession({ revokedAt: BASE });
    const exposed = session.revokedAt!;
    exposed.setFullYear(1999);
    expect(session.revokedAt!.getTime()).toBe(BASE.getTime());
  });

  it('mutar a data de entrada (expiresAt) após a criação não afeta o estado interno', () => {
    const expiresAt = new Date(BASE.getTime() + 1000);
    const session = buildSession({ expiresAt });
    expiresAt.setFullYear(1999); // muta o objeto original passado
    expect(session.expiresAt.getFullYear()).not.toBe(1999);
  });
});
