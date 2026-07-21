import { Id } from '@bancaflow/shared';
import { RefreshSessionUseCase } from '../src/app/use-case/refresh-session.use-case';
import { UserAccount } from '../src/user-account/user-account.entity';
import { AccountRole } from '../src/user-account/vo/account-role.vo';
import { AccountStatus } from '../src/user-account/vo/account-status.vo';
import { Session } from '../src/session/session.entity';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';
import {
  FakeAccessTokenIssuer,
  FakeRefreshTokenDigester,
  FakeRefreshTokenGenerator,
  FixedClock,
  InMemorySessionRepository,
  InMemoryUserAccountRepository,
  PassthroughTransactionManager,
} from './support/fakes';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const BANCA_ID = Id.createUUID();
const OLD_TOKEN = 'old-refresh-token';

function buildAccount(): UserAccount {
  return UserAccount.create({
    id: Id.createUUID(),
    bancaId: BANCA_ID,
    username: 'joao',
    name: 'Joao Silva',
    role: AccountRole.USER,
    status: AccountStatus.ACTIVE,
    credential: { passwordHash: 'hashed:x', passwordChangedAt: NOW, mustChangePassword: false },
    failedLoginAttempts: 0,
  });
}

function buildSession(userId: string, overrides: Partial<Parameters<typeof Session.create>[0]> = {}): Session {
  return Session.create({
    id: Id.createUUID(),
    userId,
    bancaId: BANCA_ID,
    refreshTokenDigest: `digest:${OLD_TOKEN}`,
    expiresAt: new Date(NOW.getTime() + 60_000),
    revokedAt: null,
    ...overrides,
  });
}

function buildUseCase(account: UserAccount, session: Session) {
  const accounts = new InMemoryUserAccountRepository([account]);
  const sessions = new InMemorySessionRepository();
  sessions.store.set(session.id, session);
  const refreshTokenGenerator = new FakeRefreshTokenGenerator();
  const refreshTokenDigester = new FakeRefreshTokenDigester();
  const accessTokenIssuer = new FakeAccessTokenIssuer();
  const useCase = new RefreshSessionUseCase(
    sessions,
    accounts,
    refreshTokenGenerator,
    refreshTokenDigester,
    accessTokenIssuer,
    new FixedClock(NOW),
    new PassthroughTransactionManager(),
  );
  return { useCase, accounts, sessions, refreshTokenGenerator, refreshTokenDigester, accessTokenIssuer };
}

describe('RefreshSessionUseCase', () => {
  it('rotaciona com sucesso e o token anterior deixa de funcionar', async () => {
    const account = buildAccount();
    const session = buildSession(account.id);
    const { useCase, sessions } = buildUseCase(account, session);

    const result = await useCase.execute({ refreshToken: OLD_TOKEN });

    expect(result.isOk).toBe(true);
    expect(result.instance.refreshToken).toBe('refresh-token-1');
    expect(result.instance.sessionId).toBe(session.id);

    const stored = sessions.store.get(session.id)!;
    expect(stored.refreshTokenDigest).not.toBe(`digest:${OLD_TOKEN}`);

    // Uma segunda tentativa com o token antigo já não encontra a sessão (digest mudou).
    const second = await useCase.execute({ refreshToken: OLD_TOKEN });
    expect(second.isFailure).toBe(true);
    expect(second.errors).toContain(IDENTITY_ERRORS.INVALID_CREDENTIALS);
  });

  it('rejeita refresh token de sessão revogada', async () => {
    const account = buildAccount();
    const session = buildSession(account.id, { revokedAt: NOW });
    const { useCase } = buildUseCase(account, session);

    const result = await useCase.execute({ refreshToken: OLD_TOKEN });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.INVALID_CREDENTIALS);
  });

  it('rejeita refresh token expirado', async () => {
    const account = buildAccount();
    const session = buildSession(account.id, { expiresAt: new Date(NOW.getTime() - 1) });
    const { useCase } = buildUseCase(account, session);

    const result = await useCase.execute({ refreshToken: OLD_TOKEN });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.INVALID_CREDENTIALS);
  });

  it('rejeita quando a conta não está ativa', async () => {
    const inactive = buildAccount().deactivate().instance;
    const session = buildSession(inactive.id);
    const { useCase } = buildUseCase(inactive, session);

    const result = await useCase.execute({ refreshToken: OLD_TOKEN });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.INVALID_CREDENTIALS);
  });

  it('corrida perdida no compare-and-swap retorna SESSION_REVOKED sem emitir tokens', async () => {
    const account = buildAccount();
    const session = buildSession(account.id);
    const { useCase, sessions, accessTokenIssuer } = buildUseCase(account, session);
    sessions.simulateLostRace = true;

    const result = await useCase.execute({ refreshToken: OLD_TOKEN });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.SESSION_REVOKED);
    expect(accessTokenIssuer.lastClaims).toBeUndefined();
  });

  it('propaga falha ao buscar a sessão pelo digest', async () => {
    const account = buildAccount();
    const session = buildSession(account.id);
    const { useCase, sessions } = buildUseCase(account, session);
    (sessions as any).findByDigest = async () => ({ isFailure: true, errors: ['ERR'] });

    const result = await useCase.execute({ refreshToken: OLD_TOKEN });
    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao gerar o novo refresh token', async () => {
    const account = buildAccount();
    const session = buildSession(account.id);
    const { useCase, refreshTokenGenerator } = buildUseCase(account, session);
    refreshTokenGenerator.failGenerate = true;

    const result = await useCase.execute({ refreshToken: OLD_TOKEN });
    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao calcular o digest do novo refresh token', async () => {
    const account = buildAccount();
    const session = buildSession(account.id);
    const { useCase, refreshTokenDigester } = buildUseCase(account, session);
    refreshTokenDigester.failDigest = true;

    const result = await useCase.execute({ refreshToken: OLD_TOKEN });
    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao rotacionar via compare-and-swap', async () => {
    const account = buildAccount();
    const session = buildSession(account.id);
    const { useCase, sessions } = buildUseCase(account, session);
    sessions.failRotateIfDigestMatches = true;

    const result = await useCase.execute({ refreshToken: OLD_TOKEN });
    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao emitir o novo access token', async () => {
    const account = buildAccount();
    const session = buildSession(account.id);
    const { useCase, accessTokenIssuer } = buildUseCase(account, session);
    accessTokenIssuer.failIssue = true;

    const result = await useCase.execute({ refreshToken: OLD_TOKEN });
    expect(result.isFailure).toBe(true);
  });
});
