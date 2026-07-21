import { Id } from '@bancaflow/shared';
import { LoginUseCase } from '../src/app/use-case/login.use-case';
import { UserAccount } from '../src/user-account/user-account.entity';
import { AccountRole } from '../src/user-account/vo/account-role.vo';
import { AccountStatus } from '../src/user-account/vo/account-status.vo';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';
import {
  FakeAccessTokenIssuer,
  FakeBancaResolver,
  FakePasswordCrypto,
  FakeRefreshTokenDigester,
  FakeRefreshTokenGenerator,
  FixedClock,
  InMemorySessionRepository,
  InMemoryUserAccountRepository,
  PassthroughTransactionManager,
} from './support/fakes';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const BANCA_ID = Id.createUUID();
const PASSWORD = 'Secret@123';

function buildAccount(overrides: Partial<Parameters<typeof UserAccount.create>[0]> = {}): UserAccount {
  return UserAccount.create({
    id: Id.createUUID(),
    bancaId: BANCA_ID,
    username: 'joao',
    name: 'Joao Silva',
    role: AccountRole.USER,
    status: AccountStatus.ACTIVE,
    credential: { passwordHash: `hashed:${PASSWORD}`, passwordChangedAt: NOW, mustChangePassword: false },
    failedLoginAttempts: 0,
    ...overrides,
  });
}

function buildUseCase(account?: UserAccount, bancaActive = true) {
  const accounts = new InMemoryUserAccountRepository(account ? [account] : []);
  const sessions = new InMemorySessionRepository();
  const passwordCrypto = new FakePasswordCrypto();
  const refreshTokenGenerator = new FakeRefreshTokenGenerator();
  const refreshTokenDigester = new FakeRefreshTokenDigester();
  const accessTokenIssuer = new FakeAccessTokenIssuer();
  const useCase = new LoginUseCase(
    new FakeBancaResolver({ farizeu: { bancaId: BANCA_ID, isActive: bancaActive } }),
    accounts,
    sessions,
    passwordCrypto,
    refreshTokenGenerator,
    refreshTokenDigester,
    accessTokenIssuer,
    new FixedClock(NOW),
    new PassthroughTransactionManager(),
  );
  return {
    useCase,
    accounts,
    sessions,
    passwordCrypto,
    refreshTokenGenerator,
    refreshTokenDigester,
    accessTokenIssuer,
  };
}

describe('LoginUseCase', () => {
  it('autentica com sucesso e cria sessão com claims obrigatórias', async () => {
    const account = buildAccount();
    const { useCase, sessions } = buildUseCase(account);

    const result = await useCase.execute({ codigoBanca: 'farizeu', username: 'joao', password: PASSWORD });

    expect(result.isOk).toBe(true);
    expect(result.instance.userId).toBe(account.id);
    expect(result.instance.bancaId).toBe(BANCA_ID);
    expect(result.instance.role).toBe('USER');
    expect(result.instance.mustChangePassword).toBe(false);
    expect(result.instance.accessToken).toContain('access:');
    expect(result.instance.refreshToken).toBe('refresh-token-1');
    expect(sessions.store.size).toBe(1);
  });

  it('retorna erro genérico para senha errada e incrementa falhas', async () => {
    const account = buildAccount();
    const { useCase, accounts } = buildUseCase(account);

    const result = await useCase.execute({ codigoBanca: 'farizeu', username: 'joao', password: 'wrong' });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    expect(accounts.get(account.id)!.failedLoginAttempts).toBe(1);
  });

  it('retorna o mesmo erro genérico para username inexistente', async () => {
    const { useCase } = buildUseCase(buildAccount());
    const result = await useCase.execute({ codigoBanca: 'farizeu', username: 'ghost', password: PASSWORD });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.INVALID_CREDENTIALS);
  });

  it('rejeita login em banca inativa', async () => {
    const { useCase } = buildUseCase(buildAccount(), false);
    const result = await useCase.execute({ codigoBanca: 'farizeu', username: 'joao', password: PASSWORD });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.INVALID_CREDENTIALS);
  });

  it('rejeita conta bloqueada sem validar senha', async () => {
    const account = buildAccount({ lockedUntil: new Date(NOW.getTime() + 60_000) });
    const { useCase, sessions } = buildUseCase(account);
    const result = await useCase.execute({ codigoBanca: 'farizeu', username: 'joao', password: PASSWORD });
    expect(result.isFailure).toBe(true);
    expect(sessions.store.size).toBe(0);
  });

  it('zera falhas no login bem-sucedido', async () => {
    const account = buildAccount({ failedLoginAttempts: 3, failedLoginWindowStartedAt: NOW });
    const { useCase, accounts } = buildUseCase(account);
    await useCase.execute({ codigoBanca: 'farizeu', username: 'joao', password: PASSWORD });
    expect(accounts.get(account.id)!.failedLoginAttempts).toBe(0);
  });

  it('rejeita username em formato inválido antes de consultar a banca', async () => {
    const { useCase } = buildUseCase(buildAccount());
    const result = await useCase.execute({ codigoBanca: 'farizeu', username: 'a', password: PASSWORD });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.INVALID_CREDENTIALS);
  });

  it('rejeita quando o resolver de banca falha', async () => {
    const { useCase } = buildUseCase(buildAccount());
    const result = await useCase.execute({ codigoBanca: 'nao-existe', username: 'joao', password: PASSWORD });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.INVALID_CREDENTIALS);
  });

  it('propaga falha quando a comparação de senha falha (não apenas senha errada)', async () => {
    const account = buildAccount();
    const { useCase, passwordCrypto } = buildUseCase(account);
    passwordCrypto.failCompare = true;
    const result = await useCase.execute({ codigoBanca: 'farizeu', username: 'joao', password: PASSWORD });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.INVALID_CREDENTIALS);
  });

  it('propaga falha ao buscar a conta por banca e username', async () => {
    const account = buildAccount();
    const { useCase, accounts } = buildUseCase(account);
    accounts.failFindByBancaAndUsername = true;
    const result = await useCase.execute({ codigoBanca: 'farizeu', username: 'joao', password: PASSWORD });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.INVALID_CREDENTIALS);
  });

  it('propaga falha ao salvar a conta após zerar as tentativas', async () => {
    const account = buildAccount();
    const { useCase, accounts } = buildUseCase(account);
    accounts.failSave = true;
    const result = await useCase.execute({ codigoBanca: 'farizeu', username: 'joao', password: PASSWORD });
    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao gerar o refresh token', async () => {
    const account = buildAccount();
    const { useCase, refreshTokenGenerator } = buildUseCase(account);
    refreshTokenGenerator.failGenerate = true;
    const result = await useCase.execute({ codigoBanca: 'farizeu', username: 'joao', password: PASSWORD });
    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao calcular o digest do refresh token', async () => {
    const account = buildAccount();
    const { useCase, refreshTokenDigester } = buildUseCase(account);
    refreshTokenDigester.failDigest = true;
    const result = await useCase.execute({ codigoBanca: 'farizeu', username: 'joao', password: PASSWORD });
    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao criar a sessão quando o digest retornado é vazio', async () => {
    const account = buildAccount();
    const { useCase, refreshTokenDigester, sessions } = buildUseCase(account);
    refreshTokenDigester.digestOverride = '';
    const result = await useCase.execute({ codigoBanca: 'farizeu', username: 'joao', password: PASSWORD });
    expect(result.isFailure).toBe(true);
    expect(sessions.store.size).toBe(0);
  });

  it('propaga falha ao salvar a sessão', async () => {
    const account = buildAccount();
    const { useCase, sessions } = buildUseCase(account);
    sessions.failSave = true;
    const result = await useCase.execute({ codigoBanca: 'farizeu', username: 'joao', password: PASSWORD });
    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao emitir o access token', async () => {
    const account = buildAccount();
    const { useCase, accessTokenIssuer } = buildUseCase(account);
    accessTokenIssuer.failIssue = true;
    const result = await useCase.execute({ codigoBanca: 'farizeu', username: 'joao', password: PASSWORD });
    expect(result.isFailure).toBe(true);
  });
});
