import { Id } from '@bancaflow/shared';
import { ChangePasswordUseCase } from '../src/user-account/use-case/change-password.use-case';
import { UserAccount } from '../src/user-account/user-account.entity';
import { AccountRole } from '../src/user-account/vo/account-role.vo';
import { AccountStatus } from '../src/user-account/vo/account-status.vo';
import { Session } from '../src/session/session.entity';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';
import {
  DenyAllPermissionChecker,
  FakeAccessTokenIssuer,
  FakePasswordCrypto,
  FixedClock,
  InMemorySessionRepository,
  InMemoryUserAccountRepository,
  PassthroughTransactionManager,
  RealPermissionChecker,
  RollbackOnFailureTransactionManager,
} from './support/fakes';
import type { PermissionChecker } from '../src/shared/ports/permission-checker.port';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const BANCA_ID = Id.createUUID();
const CURRENT_PASSWORD = 'Secret@123';
// `currentSessionId` é obrigatório no contrato do caso de uso.
const CURRENT_SESSION_ID = Id.createUUID();

function buildAccount(): UserAccount {
  return UserAccount.create({
    id: Id.createUUID(),
    bancaId: BANCA_ID,
    username: 'joao',
    name: 'Joao Silva',
    role: AccountRole.USER,
    status: AccountStatus.ACTIVE,
    credential: { passwordHash: `hashed:${CURRENT_PASSWORD}`, passwordChangedAt: NOW, mustChangePassword: false },
    failedLoginAttempts: 0,
  });
}

function buildUseCase(
  account: UserAccount,
  seedSessions: Session[] = [],
  permissions: PermissionChecker = new RealPermissionChecker(),
) {
  const accounts = new InMemoryUserAccountRepository([account]);
  const sessions = new InMemorySessionRepository();
  seedSessions.forEach((s) => sessions.store.set(s.id, s));
  const passwordCrypto = new FakePasswordCrypto();
  const accessTokenIssuer = new FakeAccessTokenIssuer();
  const useCase = new ChangePasswordUseCase(
    accounts,
    sessions,
    passwordCrypto,
    accessTokenIssuer,
    new FixedClock(NOW),
    new PassthroughTransactionManager(),
    permissions,
  );
  return { useCase, accounts, sessions, passwordCrypto, accessTokenIssuer };
}

function buildSession(userId: string, bancaId: string): Session {
  return Session.create({
    id: Id.createUUID(),
    userId,
    bancaId,
    refreshTokenDigest: `digest-${Id.createUUID()}`,
    expiresAt: new Date(NOW.getTime() + 60_000),
    revokedAt: null,
  });
}

describe('ChangePasswordUseCase', () => {
  it('nega via hasPermission (identity.password.change-own) sem comparar/trocar senha nem revogar sessões', async () => {
    const account = buildAccount();
    const current = buildSession(account.id, BANCA_ID);
    const permissions = new DenyAllPermissionChecker();
    const { useCase, accounts, sessions, passwordCrypto } = buildUseCase(account, [current], permissions);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      currentPassword: CURRENT_PASSWORD,
      newPassword: 'NewSecret@456',
      currentSessionId: current.id,
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
    expect(permissions.lastArgs).toEqual({ actorRole: 'USER', permissionKey: 'identity.password.change-own' });
    // Nenhum efeito colateral: nem hash/compare de senha, nem persistência, nem revogação de sessão.
    expect(passwordCrypto.compareCallCount).toBe(0);
    expect(passwordCrypto.hashCallCount).toBe(0);
    expect(accounts.get(account.id)!.credential.passwordHash).toBe(`hashed:${CURRENT_PASSWORD}`);
    expect(sessions.store.get(current.id)!.isRevoked()).toBe(false);
  });

  it('troca a senha com sucesso e revoga as outras sessões, preservando a atual', async () => {
    const account = buildAccount();
    const current = buildSession(account.id, BANCA_ID);
    const other = buildSession(account.id, BANCA_ID);
    const { useCase, accounts, sessions } = buildUseCase(account, [current, other]);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      currentPassword: CURRENT_PASSWORD,
      newPassword: 'NewSecret@456',
      currentSessionId: current.id,
    });

    expect(result.isOk).toBe(true);
    expect(result.instance.userId).toBe(account.id);
    expect(result.instance.accessToken).toContain('access:');
    expect(result.instance.accessTokenExpiresAt).toBeInstanceOf(Date);
    expect(accounts.get(account.id)!.credential.passwordHash).toBe('hashed:NewSecret@456');
    expect(sessions.store.get(current.id)!.isRevoked()).toBe(false);
    expect(sessions.store.get(other.id)!.isRevoked()).toBe(true);
  });

  it('rejeita senha atual incorreta com código distinto de INVALID_CREDENTIALS, sem alterar nem revogar nada', async () => {
    const account = buildAccount();
    const current = buildSession(account.id, BANCA_ID);
    const other = buildSession(account.id, BANCA_ID);
    const { useCase, accounts, sessions } = buildUseCase(account, [current, other]);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      currentPassword: 'wrong',
      newPassword: 'NewSecret@456',
      currentSessionId: current.id,
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.CURRENT_PASSWORD_INCORRECT);
    expect(result.errors).not.toContain(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    expect(accounts.get(account.id)!.credential.passwordHash).toBe(`hashed:${CURRENT_PASSWORD}`);
    // Nenhuma sessão é revogada quando a senha atual está incorreta.
    expect(sessions.store.get(current.id)!.isRevoked()).toBe(false);
    expect(sessions.store.get(other.id)!.isRevoked()).toBe(false);
  });

  it('rejeita nova senha fraca sem alterar nada', async () => {
    const account = buildAccount();
    const { useCase, accounts } = buildUseCase(account);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      currentPassword: CURRENT_PASSWORD,
      newPassword: 'weak',
      currentSessionId: CURRENT_SESSION_ID,
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.PASSWORD_TOO_WEAK);
    expect(accounts.get(account.id)!.credential.passwordHash).toBe(`hashed:${CURRENT_PASSWORD}`);
  });

  it('retorna ACCOUNT_NOT_FOUND quando a conta não existe na banca', async () => {
    const account = buildAccount();
    const { useCase } = buildUseCase(account);

    const result = await useCase.execute({
      bancaId: Id.createUUID(),
      userId: account.id,
      currentPassword: CURRENT_PASSWORD,
      newPassword: 'NewSecret@456',
      currentSessionId: CURRENT_SESSION_ID,
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.ACCOUNT_NOT_FOUND);
  });

  it('propaga falha ao buscar a conta', async () => {
    const account = buildAccount();
    const { useCase, accounts } = buildUseCase(account);
    accounts.failFindById = true;

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      currentPassword: CURRENT_PASSWORD,
      newPassword: 'NewSecret@456',
      currentSessionId: CURRENT_SESSION_ID,
    });

    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao gerar o hash da nova senha', async () => {
    const account = buildAccount();
    const { useCase, passwordCrypto } = buildUseCase(account);
    passwordCrypto.failHash = true;

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      currentPassword: CURRENT_PASSWORD,
      newPassword: 'NewSecret@456',
      currentSessionId: CURRENT_SESSION_ID,
    });

    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao salvar a conta com o novo hash', async () => {
    const account = buildAccount();
    const { useCase, accounts } = buildUseCase(account);
    accounts.failSave = true;

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      currentPassword: CURRENT_PASSWORD,
      newPassword: 'NewSecret@456',
      currentSessionId: CURRENT_SESSION_ID,
    });

    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao revogar as outras sessões', async () => {
    const account = buildAccount();
    const { useCase, sessions } = buildUseCase(account);
    sessions.failRevokeOtherSessions = true;

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      currentPassword: CURRENT_PASSWORD,
      newPassword: 'NewSecret@456',
      currentSessionId: CURRENT_SESSION_ID,
    });

    expect(result.isFailure).toBe(true);
  });

  it('reverte a persistência do novo hash quando a revogação de sessões falha na mesma transação', async () => {
    const account = buildAccount();
    const accounts = new InMemoryUserAccountRepository([account]);
    const sessions = new InMemorySessionRepository();
    sessions.failRevokeOtherSessions = true;
    const passwordCrypto = new FakePasswordCrypto();
    const accessTokenIssuer = new FakeAccessTokenIssuer();
    const useCase = new ChangePasswordUseCase(
      accounts,
      sessions,
      passwordCrypto,
      accessTokenIssuer,
      new FixedClock(NOW),
      new RollbackOnFailureTransactionManager([accounts]),
      new RealPermissionChecker(),
    );

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      currentPassword: CURRENT_PASSWORD,
      newPassword: 'NewSecret@456',
      currentSessionId: CURRENT_SESSION_ID,
    });

    expect(result.isFailure).toBe(true);
    // Rollback: o hash antigo permanece — a escrita anterior foi revertida.
    expect(accounts.get(account.id)!.credential.passwordHash).toBe(`hashed:${CURRENT_PASSWORD}`);
  });

  it('propaga falha ao emitir o novo access token (P0-2: emissão dentro da transação)', async () => {
    const account = buildAccount();
    const { useCase, accessTokenIssuer } = buildUseCase(account);
    accessTokenIssuer.failIssue = true;

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      currentPassword: CURRENT_PASSWORD,
      newPassword: 'NewSecret@456',
      currentSessionId: CURRENT_SESSION_ID,
    });

    expect(result.isFailure).toBe(true);
  });

  it('reverte hash e revogação quando a emissão do access token falha na mesma transação (P0-2)', async () => {
    const account = buildAccount();
    const current = buildSession(account.id, BANCA_ID);
    const other = buildSession(account.id, BANCA_ID);
    const accounts = new InMemoryUserAccountRepository([account]);
    const sessions = new InMemorySessionRepository();
    sessions.store.set(current.id, current);
    sessions.store.set(other.id, other);
    const passwordCrypto = new FakePasswordCrypto();
    const accessTokenIssuer = new FakeAccessTokenIssuer();
    accessTokenIssuer.failIssue = true;
    const useCase = new ChangePasswordUseCase(
      accounts,
      sessions,
      passwordCrypto,
      accessTokenIssuer,
      new FixedClock(NOW),
      new RollbackOnFailureTransactionManager([accounts, sessions]),
      new RealPermissionChecker(),
    );

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      currentPassword: CURRENT_PASSWORD,
      newPassword: 'NewSecret@456',
      currentSessionId: current.id,
    });

    expect(result.isFailure).toBe(true);
    // Rollback completo: hash antigo permanece e nenhuma sessão foi revogada.
    expect(accounts.get(account.id)!.credential.passwordHash).toBe(`hashed:${CURRENT_PASSWORD}`);
    expect(sessions.store.get(other.id)!.isRevoked()).toBe(false);
  });
});
