import { Id } from '@bancaflow/shared';
import { AdminRevokeAccountSessionUseCase } from '../src/user-account/use-case/admin-revoke-account-session.use-case';
import { UserAccount } from '../src/user-account/user-account.entity';
import { AccountRole, AccountRoleType } from '../src/user-account/vo/account-role.vo';
import { AccountStatus } from '../src/user-account/vo/account-status.vo';
import { Session } from '../src/session/session.entity';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';
import {
  FixedClock,
  InMemorySessionRepository,
  InMemoryUserAccountRepository,
  RealPermissionChecker,
} from './support/fakes';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const BANCA_A = Id.createUUID();
const ACTOR_USER_ID = Id.createUUID();

function buildAccount(bancaId: string, role: AccountRoleType): UserAccount {
  return UserAccount.create({
    id: Id.createUUID(),
    bancaId,
    username: 'target',
    name: 'Alvo Silva',
    role,
    status: AccountStatus.ACTIVE,
    credential: { passwordHash: 'hashed:old', passwordChangedAt: NOW, mustChangePassword: false },
    failedLoginAttempts: 0,
  });
}

function buildSession(userId: string, bancaId: string): Session {
  return Session.create({
    id: Id.createUUID(),
    userId,
    bancaId,
    refreshTokenDigest: `digest-${Id.createUUID()}`,
    expiresAt: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
  });
}

describe('AdminRevokeAccountSessionUseCase', () => {
  it('OWNER revoga uma sessão específica de uma conta de terceiro', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const other = buildSession(target.id, BANCA_A);
    const revoking = buildSession(target.id, BANCA_A);
    const accounts = new InMemoryUserAccountRepository([target]);
    const sessions = new InMemorySessionRepository();
    sessions.store.set(other.id, other);
    sessions.store.set(revoking.id, revoking);
    const useCase = new AdminRevokeAccountSessionUseCase(accounts, sessions, new FixedClock(NOW), new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
      sessionId: revoking.id,
    });

    expect(result.isOk).toBe(true);
    expect(sessions.store.get(revoking.id)!.isRevoked()).toBe(true);
    expect(sessions.store.get(other.id)!.isRevoked()).toBe(false);
  });

  it('retorna TARGET_SESSION_NOT_FOUND quando a sessão não pertence à conta indicada', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const another = buildAccount(BANCA_A, AccountRole.USER);
    const foreignSession = buildSession(another.id, BANCA_A);
    const accounts = new InMemoryUserAccountRepository([target, another]);
    const sessions = new InMemorySessionRepository();
    sessions.store.set(foreignSession.id, foreignSession);
    const useCase = new AdminRevokeAccountSessionUseCase(accounts, sessions, new FixedClock(NOW), new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
      sessionId: foreignSession.id,
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.TARGET_SESSION_NOT_FOUND);
  });

  it('retorna ACCOUNT_NOT_FOUND quando a conta alvo não existe na banca', async () => {
    const accounts = new InMemoryUserAccountRepository([]);
    const sessions = new InMemorySessionRepository();
    const useCase = new AdminRevokeAccountSessionUseCase(accounts, sessions, new FixedClock(NOW), new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: Id.createUUID(),
      sessionId: Id.createUUID(),
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.ACCOUNT_NOT_FOUND);
  });

  it('rejeita ADMIN e USER como atores, e impede autorrevogação por este painel', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const session = buildSession(target.id, BANCA_A);
    const accounts = new InMemoryUserAccountRepository([target]);
    const sessions = new InMemorySessionRepository();
    sessions.store.set(session.id, session);

    for (const role of ['ADMIN', 'USER'] as const) {
      const useCase = new AdminRevokeAccountSessionUseCase(
        accounts,
        sessions,
        new FixedClock(NOW),
        new RealPermissionChecker(),
      );
      const result = await useCase.execute({
        bancaId: BANCA_A,
        actorRole: role,
        actorUserId: ACTOR_USER_ID,
        targetUserId: target.id,
        sessionId: session.id,
      });
      expect(result.isFailure).toBe(true);
      expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
    }

    const selfUseCase = new AdminRevokeAccountSessionUseCase(
      accounts,
      sessions,
      new FixedClock(NOW),
      new RealPermissionChecker(),
    );
    const selfResult = await selfUseCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: target.id,
      targetUserId: target.id,
      sessionId: session.id,
    });
    expect(selfResult.isFailure).toBe(true);
    expect(selfResult.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
  });
});
