import { Id } from '@bancaflow/shared';
import { ToggleAccountStatusUseCase } from '../src/user-account/use-case/toggle-account-status.use-case';
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
  RollbackOnFailureTransactionManager,
} from './support/fakes';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const BANCA_ID = Id.createUUID();
const ACTOR_USER_ID = Id.createUUID();

function buildAccount(role: AccountRoleType = 'USER'): UserAccount {
  return UserAccount.create({
    id: Id.createUUID(),
    bancaId: BANCA_ID,
    username: 'joao',
    name: 'Joao Silva',
    role,
    status: AccountStatus.ACTIVE,
    credential: { passwordHash: 'hashed:Secret@123', passwordChangedAt: NOW, mustChangePassword: false },
    failedLoginAttempts: 0,
  });
}

function buildUseCase(account: UserAccount) {
  const accounts = new InMemoryUserAccountRepository([account]);
  const sessions = new InMemorySessionRepository();
  const useCase = new ToggleAccountStatusUseCase(
    accounts,
    sessions,
    new FixedClock(NOW),
    new PassthroughTransactionManager(),
    new RealPermissionChecker(),
  );
  return { useCase, accounts, sessions };
}

describe('ToggleAccountStatusUseCase', () => {
  it('bloquear revoga todas as sessões da conta (regra visível ao domínio — decisão 6 revisada)', async () => {
    const account = buildAccount('USER');
    const { useCase, accounts, sessions } = buildUseCase(account);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: account.id,
      action: 'block',
    });

    expect(result.isOk).toBe(true);
    expect(result.instance.status).toBe('BLOCKED');
    expect(sessions.revokeAllCallCount).toBe(1);
    expect(accounts.get(account.id)!.status.value).toBe('BLOCKED');
  });

  it('desativar revoga todas as sessões da conta', async () => {
    const account = buildAccount('USER');
    const { useCase, sessions } = buildUseCase(account);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: account.id,
      action: 'deactivate',
    });

    expect(result.isOk).toBe(true);
    expect(sessions.revokeAllCallCount).toBe(1);
  });

  it('ativar NÃO revoga sessões', async () => {
    const account = buildAccount('USER');
    const { useCase, sessions } = buildUseCase(account);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: account.id,
      action: 'activate',
    });

    expect(result.isOk).toBe(true);
    expect(sessions.revokeAllCallCount).toBe(0);
  });

  it('desbloquear NÃO revoga sessões', async () => {
    const account = buildAccount('USER');
    const { useCase, sessions } = buildUseCase(account);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: account.id,
      action: 'unblock',
    });

    expect(result.isOk).toBe(true);
    expect(sessions.revokeAllCallCount).toBe(0);
  });

  it('rejeita ator USER (nega via hasPermission, não checagem de papel bruto)', async () => {
    const account = buildAccount('USER');
    const { useCase } = buildUseCase(account);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'USER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: account.id,
      action: 'block',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
  });

  it('rejeita ator ADMIN nesta versão (ADMIN não administra contas)', async () => {
    const account = buildAccount('USER');
    const { useCase, sessions } = buildUseCase(account);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'ADMIN',
      actorUserId: ACTOR_USER_ID,
      targetUserId: account.id,
      action: 'block',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
    expect(sessions.revokeAllCallCount).toBe(0);
  });

  it('impede OWNER de administrar uma conta OWNER (ninguém administra OWNER por este painel)', async () => {
    const account = buildAccount('OWNER');
    const { useCase, sessions } = buildUseCase(account);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: account.id,
      action: 'block',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
    expect(sessions.revokeAllCallCount).toBe(0);
  });

  it('impede OWNER de administrar a própria conta por este painel (autoproteção)', async () => {
    const account = buildAccount('USER');
    const { useCase, sessions } = buildUseCase(account);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      actorUserId: account.id,
      targetUserId: account.id,
      action: 'block',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
    expect(sessions.revokeAllCallCount).toBe(0);
  });

  it('propaga falha ao salvar a conta sem revogar sessões', async () => {
    const account = buildAccount('USER');
    const { useCase, accounts, sessions } = buildUseCase(account);
    accounts.failSave = true;

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: account.id,
      action: 'block',
    });

    expect(result.isFailure).toBe(true);
    expect(sessions.revokeAllCallCount).toBe(0);
  });

  it('propaga falha ao revogar sessões', async () => {
    const account = buildAccount('USER');
    const { useCase, sessions } = buildUseCase(account);
    sessions.failRevokeAll = true;

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: account.id,
      action: 'block',
    });

    expect(result.isFailure).toBe(true);
  });

  it('reverte a mudança de status quando a revogação de sessões falha na mesma transação', async () => {
    const account = buildAccount('USER');
    const accounts = new InMemoryUserAccountRepository([account]);
    const sessions = new InMemorySessionRepository();
    sessions.failRevokeAll = true;
    const useCase = new ToggleAccountStatusUseCase(
      accounts,
      sessions,
      new FixedClock(NOW),
      new RollbackOnFailureTransactionManager([accounts]),
      new RealPermissionChecker(),
    );

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: account.id,
      action: 'block',
    });

    expect(result.isFailure).toBe(true);
    expect(accounts.get(account.id)!.status.value).toBe('ACTIVE');
  });

  it('retorna ACCOUNT_NOT_FOUND (404) quando a conta alvo não existe na banca, nunca FORBIDDEN', async () => {
    const account = buildAccount('USER');
    const { useCase } = buildUseCase(account);

    const result = await useCase.execute({
      bancaId: Id.createUUID(),
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: account.id,
      action: 'block',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.ACCOUNT_NOT_FOUND);
    expect(result.errors).not.toContain(IDENTITY_ERRORS.FORBIDDEN);
  });
});
