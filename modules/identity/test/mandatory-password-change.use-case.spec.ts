import { Id } from '@bancaflow/shared';
import { MandatoryPasswordChangeUseCase } from '../src/user-account/use-case/mandatory-password-change.use-case';
import { UserAccount } from '../src/user-account/user-account.entity';
import { AccountRole, AccountRoleType } from '../src/user-account/vo/account-role.vo';
import { AccountStatus } from '../src/user-account/vo/account-status.vo';
import { Session } from '../src/session/session.entity';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';
import {
  FakeAccessTokenIssuer,
  FakePasswordCrypto,
  FixedClock,
  InMemorySessionRepository,
  InMemoryUserAccountRepository,
  PassthroughTransactionManager,
  RollbackOnFailureTransactionManager,
} from './support/fakes';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const BANCA_ID = Id.createUUID();
// `currentSessionId` é obrigatório no contrato do caso de uso.
const CURRENT_SESSION_ID = Id.createUUID();

function buildAccount(
  overrides: { role?: AccountRoleType; mustChangePassword?: boolean } = {},
): UserAccount {
  return UserAccount.create({
    id: Id.createUUID(),
    bancaId: BANCA_ID,
    username: 'joao',
    name: 'Joao Silva',
    role: overrides.role ?? AccountRole.USER,
    status: AccountStatus.ACTIVE,
    credential: {
      passwordHash: 'hashed:Temp@12345',
      passwordChangedAt: NOW,
      mustChangePassword: overrides.mustChangePassword ?? true,
    },
    failedLoginAttempts: 0,
  });
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

function buildUseCase(account: UserAccount, seedSessions: Session[] = []) {
  const accounts = new InMemoryUserAccountRepository([account]);
  const sessions = new InMemorySessionRepository();
  seedSessions.forEach((s) => sessions.store.set(s.id, s));
  const passwordCrypto = new FakePasswordCrypto();
  const accessTokenIssuer = new FakeAccessTokenIssuer();
  const useCase = new MandatoryPasswordChangeUseCase(
    accounts,
    sessions,
    passwordCrypto,
    accessTokenIssuer,
    new FixedClock(NOW),
    new PassthroughTransactionManager(),
  );
  return { useCase, accounts, sessions, passwordCrypto, accessTokenIssuer };
}

describe('MandatoryPasswordChangeUseCase', () => {
  it('troca a senha sem exigir a senha atual, limpa mustChangePassword e revoga outras sessões', async () => {
    const account = buildAccount();
    const current = buildSession(account.id, BANCA_ID);
    const other = buildSession(account.id, BANCA_ID);
    const { useCase, accounts, sessions } = buildUseCase(account, [current, other]);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      newPassword: 'NewSecret@456',
      currentSessionId: current.id,
    });

    expect(result.isOk).toBe(true);
    expect(result.instance.userId).toBe(account.id);
    expect(result.instance.accessToken).toContain('access:');
    expect(result.instance.accessTokenExpiresAt).toBeInstanceOf(Date);
    const updated = accounts.get(account.id)!;
    expect(updated.credential.passwordHash).toBe('hashed:NewSecret@456');
    expect(updated.mustChangePassword).toBe(false);
    expect(sessions.store.get(current.id)!.isRevoked()).toBe(false);
    expect(sessions.store.get(other.id)!.isRevoked()).toBe(true);
  });

  it('não recebe nem valida currentPassword no input', async () => {
    const account = buildAccount();
    const { useCase } = buildUseCase(account);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      newPassword: 'NewSecret@456',
      currentSessionId: CURRENT_SESSION_ID,
    });

    expect(result.isOk).toBe(true);
  });

  describe('autorização autoritativa (P0-1 — pela flag persistida, não pelo papel)', () => {
    it.each<AccountRoleType>(['USER', 'OWNER', 'ADMIN'])(
      'rejeita com FORBIDDEN quando mustChangePassword=false para papel %s, e NÃO altera a senha',
      async (role) => {
        const account = buildAccount({ role, mustChangePassword: false });
        const { useCase, accounts } = buildUseCase(account);

        const result = await useCase.execute({
          bancaId: BANCA_ID,
          userId: account.id,
          newPassword: 'NewSecret@456',
          currentSessionId: CURRENT_SESSION_ID,
        });

        expect(result.isFailure).toBe(true);
        expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
        // Nenhuma escrita ocorreu: a verificação é ANTES de qualquer save().
        expect(accounts.saveCallCount).toBe(0);
        expect(accounts.get(account.id)!.credential.passwordHash).toBe('hashed:Temp@12345');
      },
    );

    it('permite a troca quando mustChangePassword=true, independentemente do papel', async () => {
      const account = buildAccount({ role: 'OWNER', mustChangePassword: true });
      const { useCase, accounts } = buildUseCase(account);

      const result = await useCase.execute({
        bancaId: BANCA_ID,
        userId: account.id,
        newPassword: 'NewSecret@456',
        currentSessionId: CURRENT_SESSION_ID,
      });

      expect(result.isOk).toBe(true);
      expect(accounts.saveCallCount).toBe(1);
    });
  });

  it('rejeita nova senha fraca sem alterar nada', async () => {
    const account = buildAccount();
    const { useCase, accounts } = buildUseCase(account);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      newPassword: 'weak',
      currentSessionId: CURRENT_SESSION_ID,
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.PASSWORD_TOO_WEAK);
    expect(accounts.get(account.id)!.credential.passwordHash).toBe('hashed:Temp@12345');
  });

  it('retorna ACCOUNT_NOT_FOUND quando a conta não existe na banca', async () => {
    const account = buildAccount();
    const { useCase } = buildUseCase(account);

    const result = await useCase.execute({
      bancaId: Id.createUUID(),
      userId: account.id,
      newPassword: 'NewSecret@456',
      currentSessionId: CURRENT_SESSION_ID,
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.ACCOUNT_NOT_FOUND);
  });

  it('propaga falha ao gerar o hash da nova senha', async () => {
    const account = buildAccount();
    const { useCase, passwordCrypto } = buildUseCase(account);
    passwordCrypto.failHash = true;

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      newPassword: 'NewSecret@456',
      currentSessionId: CURRENT_SESSION_ID,
    });

    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao salvar a conta', async () => {
    const account = buildAccount();
    const { useCase, accounts } = buildUseCase(account);
    accounts.failSave = true;

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
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
      newPassword: 'NewSecret@456',
      currentSessionId: CURRENT_SESSION_ID,
    });

    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao emitir o novo access token (P0-2: emissão dentro da transação)', async () => {
    const account = buildAccount();
    const { useCase, accessTokenIssuer } = buildUseCase(account);
    accessTokenIssuer.failIssue = true;

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
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
    const useCase = new MandatoryPasswordChangeUseCase(
      accounts,
      sessions,
      passwordCrypto,
      accessTokenIssuer,
      new FixedClock(NOW),
      new RollbackOnFailureTransactionManager([accounts]),
    );

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      newPassword: 'NewSecret@456',
      currentSessionId: CURRENT_SESSION_ID,
    });

    expect(result.isFailure).toBe(true);
    expect(accounts.get(account.id)!.credential.passwordHash).toBe('hashed:Temp@12345');
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
    const useCase = new MandatoryPasswordChangeUseCase(
      accounts,
      sessions,
      passwordCrypto,
      accessTokenIssuer,
      new FixedClock(NOW),
      new RollbackOnFailureTransactionManager([accounts, sessions]),
    );

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      newPassword: 'NewSecret@456',
      currentSessionId: current.id,
    });

    expect(result.isFailure).toBe(true);
    expect(accounts.get(account.id)!.credential.passwordHash).toBe('hashed:Temp@12345');
    expect(sessions.store.get(other.id)!.isRevoked()).toBe(false);
  });
});
