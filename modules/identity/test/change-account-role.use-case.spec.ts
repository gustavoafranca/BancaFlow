import { Id } from '@bancaflow/shared';
import { ChangeAccountRoleUseCase } from '../src/user-account/use-case/change-account-role.use-case';
import { UserAccount } from '../src/user-account/user-account.entity';
import { AccountRole, AccountRoleType } from '../src/user-account/vo/account-role.vo';
import { AccountStatus } from '../src/user-account/vo/account-status.vo';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';
import {
  FixedClock,
  InMemorySessionRepository,
  InMemoryUserAccountRepository,
  PassthroughTransactionManager,
  RealPermissionChecker,
} from './support/fakes';

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

function buildUseCase(seed: UserAccount[]) {
  const accounts = new InMemoryUserAccountRepository(seed);
  const sessions = new InMemorySessionRepository();
  const useCase = new ChangeAccountRoleUseCase(
    accounts,
    sessions,
    new FixedClock(NOW),
    new PassthroughTransactionManager(),
    new RealPermissionChecker(),
  );
  return { useCase, accounts, sessions };
}

describe('ChangeAccountRoleUseCase', () => {
  it('promove USER para ADMIN e revoga todas as sessões do alvo', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const { useCase, accounts, sessions } = buildUseCase([target]);

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
      role: 'ADMIN',
    });

    expect(result.isOk).toBe(true);
    expect(result.instance.role).toBe('ADMIN');
    expect(accounts.get(target.id)!.role.value).toBe('ADMIN');
    expect(sessions.revokeAllCallCount).toBe(1);
  });

  it('rebaixa ADMIN para USER e revoga sessões', async () => {
    const target = buildAccount(BANCA_A, AccountRole.ADMIN);
    const { useCase, accounts, sessions } = buildUseCase([target]);

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
      role: 'USER',
    });

    expect(result.isOk).toBe(true);
    expect(accounts.get(target.id)!.role.value).toBe('USER');
    expect(sessions.revokeAllCallCount).toBe(1);
  });

  it('rejeita alvo OWNER', async () => {
    const owner = buildAccount(BANCA_A, AccountRole.OWNER);
    const { useCase, sessions } = buildUseCase([owner]);

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: owner.id,
      role: 'USER',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
    expect(sessions.revokeAllCallCount).toBe(0);
  });

  it('rejeita cross-banca com ACCOUNT_NOT_FOUND, nunca FORBIDDEN', async () => {
    const target = buildAccount(BANCA_B, AccountRole.USER);
    const { useCase } = buildUseCase([target]);

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
      role: 'ADMIN',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.ACCOUNT_NOT_FOUND);
    expect(result.errors).not.toContain(IDENTITY_ERRORS.FORBIDDEN);
  });

  it('rejeita ADMIN e USER como atores nesta versão', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    for (const role of ['ADMIN', 'USER'] as const) {
      const { useCase } = buildUseCase([target]);
      const result = await useCase.execute({
        bancaId: BANCA_A,
        actorRole: role,
        actorUserId: ACTOR_USER_ID,
        targetUserId: target.id,
        role: 'ADMIN',
      });
      expect(result.isFailure).toBe(true);
      expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
    }
  });

  it('impede o ator de trocar o próprio papel por este painel', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const { useCase, sessions } = buildUseCase([target]);

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: target.id,
      targetUserId: target.id,
      role: 'ADMIN',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
    expect(sessions.revokeAllCallCount).toBe(0);
  });

  it('propaga falha ao salvar sem revogar sessões', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const { useCase, accounts, sessions } = buildUseCase([target]);
    accounts.failSave = true;

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
      role: 'ADMIN',
    });

    expect(result.isFailure).toBe(true);
    expect(sessions.revokeAllCallCount).toBe(0);
  });
});
