import { Id } from '@bancaflow/shared';
import { AdminListAccountSessionsUseCase } from '../src/user-account/use-case/admin-list-account-sessions.use-case';
import { UserAccount } from '../src/user-account/user-account.entity';
import { AccountRole, AccountRoleType } from '../src/user-account/vo/account-role.vo';
import { AccountStatus } from '../src/user-account/vo/account-status.vo';
import { Session } from '../src/session/session.entity';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';
import { InMemorySessionRepository, InMemoryUserAccountRepository, RealPermissionChecker } from './support/fakes';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const BANCA_A = Id.createUUID();
const BANCA_B = Id.createUUID();
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
    deviceInfo: 'Chrome/Linux',
  });
}

describe('AdminListAccountSessionsUseCase', () => {
  it('OWNER lista as sessões ativas de uma conta de terceiro, sempre com isCurrent false', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const accounts = new InMemoryUserAccountRepository([target]);
    const sessions = new InMemorySessionRepository();
    const session = buildSession(target.id, BANCA_A);
    sessions.store.set(session.id, session);
    const useCase = new AdminListAccountSessionsUseCase(accounts, sessions, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
    });

    expect(result.isOk).toBe(true);
    expect(result.instance).toHaveLength(1);
    expect(result.instance[0].isCurrent).toBe(false);
    expect(result.instance[0].sessionId).toBe(session.id);
  });

  it('retorna ACCOUNT_NOT_FOUND para conta de outra banca', async () => {
    const target = buildAccount(BANCA_B, AccountRole.USER);
    const accounts = new InMemoryUserAccountRepository([target]);
    const sessions = new InMemorySessionRepository();
    const useCase = new AdminListAccountSessionsUseCase(accounts, sessions, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.ACCOUNT_NOT_FOUND);
  });

  it('rejeita ADMIN e USER, e impede autoconsulta', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const accounts = new InMemoryUserAccountRepository([target]);
    const sessions = new InMemorySessionRepository();

    for (const role of ['ADMIN', 'USER'] as const) {
      const useCase = new AdminListAccountSessionsUseCase(accounts, sessions, new RealPermissionChecker());
      const result = await useCase.execute({
        bancaId: BANCA_A,
        actorRole: role,
        actorUserId: ACTOR_USER_ID,
        targetUserId: target.id,
      });
      expect(result.isFailure).toBe(true);
      expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
    }

    const selfUseCase = new AdminListAccountSessionsUseCase(accounts, sessions, new RealPermissionChecker());
    const selfResult = await selfUseCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: target.id,
      targetUserId: target.id,
    });
    expect(selfResult.isFailure).toBe(true);
    expect(selfResult.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
  });
});
