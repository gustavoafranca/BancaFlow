import { Id, Result } from '@bancaflow/shared';
import { UpdateOwnProfileUseCase } from '../src/user-account/use-case/update-own-profile.use-case';
import { UserAccount } from '../src/user-account/user-account.entity';
import { UserAccountRepository } from '../src/user-account/user-account.repository';
import { AccountRole } from '../src/user-account/vo/account-role.vo';
import { AccountStatus } from '../src/user-account/vo/account-status.vo';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';
import { DenyAllPermissionChecker, InMemoryUserAccountRepository, RealPermissionChecker } from './support/fakes';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const BANCA_ID = Id.createUUID();

function buildAccount(overrides: { email?: string | null; version?: number } = {}): UserAccount {
  return UserAccount.create({
    id: Id.createUUID(),
    bancaId: BANCA_ID,
    username: 'joao',
    name: 'Joao Silva',
    email: overrides.email ?? null,
    role: AccountRole.USER,
    status: AccountStatus.ACTIVE,
    credential: { passwordHash: 'hashed-password', passwordChangedAt: NOW, mustChangePassword: false },
    failedLoginAttempts: 0,
    version: overrides.version ?? 1,
  });
}

/** Simula o CAS do adapter Prisma falhando na escrita, mesmo com uma leitura inicialmente compatível. */
class WriteConflictUserAccountRepository implements UserAccountRepository {
  saveCallCount = 0;
  constructor(private readonly inner: InMemoryUserAccountRepository) {}

  nextId(): string {
    return this.inner.nextId();
  }

  findById(id: string, bancaId: string) {
    return this.inner.findById(id, bancaId);
  }

  findByBancaAndUsername(bancaId: string, normalizedUsername: string) {
    return this.inner.findByBancaAndUsername(bancaId, normalizedUsername);
  }

  async save(): Promise<Result<void>> {
    this.saveCallCount += 1;
    return Result.fail(IDENTITY_ERRORS.CONCURRENCY_CONFLICT);
  }

  recordLoginFailureAtomic(bancaId: string, normalizedUsername: string, now: Date) {
    return this.inner.recordLoginFailureAtomic(bancaId, normalizedUsername, now);
  }
}

describe('UpdateOwnProfileUseCase', () => {
  it('nega via hasPermission (identity.profile.update-own) sem ler ou salvar a conta quando a permissão é negada', async () => {
    const account = buildAccount({ email: 'joao@example.com' });
    const accounts = new InMemoryUserAccountRepository([account]);
    const permissions = new DenyAllPermissionChecker();
    const useCase = new UpdateOwnProfileUseCase(accounts, permissions);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      actorRole: 'USER',
      expectedVersion: account.version,
      name: 'Maria Souza',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
    expect(permissions.lastArgs).toEqual({ actorRole: 'USER', permissionKey: 'identity.profile.update-own' });
    expect(accounts.saveCallCount).toBe(0);
    expect(accounts.get(account.id)!.name).toBe('Joao Silva');
  });

  it('atualiza somente o nome, preservando o e-mail já persistido', async () => {
    const account = buildAccount({ email: 'joao@example.com' });
    const accounts = new InMemoryUserAccountRepository([account]);
    const useCase = new UpdateOwnProfileUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      actorRole: 'USER',
      expectedVersion: account.version,
      name: 'Maria Souza',
    });

    expect(result.isOk).toBe(true);
    expect(accounts.get(account.id)!.name).toBe('Maria Souza');
    expect(accounts.get(account.id)!.email).toBe('joao@example.com');
  });

  it('atualiza somente o e-mail, preservando o nome já persistido', async () => {
    const account = buildAccount({ email: 'joao@example.com' });
    const accounts = new InMemoryUserAccountRepository([account]);
    const useCase = new UpdateOwnProfileUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      actorRole: 'USER',
      expectedVersion: account.version,
      email: 'novo@example.com',
    });

    expect(result.isOk).toBe(true);
    expect(accounts.get(account.id)!.email).toBe('novo@example.com');
    expect(accounts.get(account.id)!.name).toBe('Joao Silva');
  });

  it('limpa o e-mail quando enviado como null', async () => {
    const account = buildAccount({ email: 'joao@example.com' });
    const accounts = new InMemoryUserAccountRepository([account]);
    const useCase = new UpdateOwnProfileUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      actorRole: 'USER',
      expectedVersion: account.version,
      email: null,
    });

    expect(result.isOk).toBe(true);
    expect(accounts.get(account.id)!.email).toBeNull();
  });

  it('atualiza nome e e-mail juntos', async () => {
    const account = buildAccount({ email: 'joao@example.com' });
    const accounts = new InMemoryUserAccountRepository([account]);
    const useCase = new UpdateOwnProfileUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      actorRole: 'USER',
      expectedVersion: account.version,
      name: 'Maria Souza',
      email: 'maria@example.com',
    });

    expect(result.isOk).toBe(true);
    expect(accounts.get(account.id)!.name).toBe('Maria Souza');
    expect(accounts.get(account.id)!.email).toBe('maria@example.com');
  });

  it('rejeita nome inválido sem persistir nada', async () => {
    const account = buildAccount();
    const accounts = new InMemoryUserAccountRepository([account]);
    const useCase = new UpdateOwnProfileUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      actorRole: 'USER',
      expectedVersion: account.version,
      name: 'X',
    });

    expect(result.isFailure).toBe(true);
    expect(accounts.saveCallCount).toBe(0);
    expect(accounts.get(account.id)!.name).toBe('Joao Silva');
  });

  it('rejeita e-mail inválido sem persistir nada', async () => {
    const account = buildAccount();
    const accounts = new InMemoryUserAccountRepository([account]);
    const useCase = new UpdateOwnProfileUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      actorRole: 'USER',
      expectedVersion: account.version,
      email: 'nao-e-email',
    });

    expect(result.isFailure).toBe(true);
    expect(accounts.saveCallCount).toBe(0);
  });

  it('retorna ACCOUNT_NOT_FOUND para conta inexistente', async () => {
    const account = buildAccount();
    const accounts = new InMemoryUserAccountRepository([account]);
    const useCase = new UpdateOwnProfileUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: Id.createUUID(),
      actorRole: 'USER',
      expectedVersion: 1,
      name: 'Maria Souza',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.ACCOUNT_NOT_FOUND);
    expect(accounts.saveCallCount).toBe(0);
  });

  it('retorna CONCURRENCY_CONFLICT quando o version já está desatualizado no momento da leitura, sem mutar nem salvar', async () => {
    const account = buildAccount({ version: 5 });
    const accounts = new InMemoryUserAccountRepository([account]);
    const useCase = new UpdateOwnProfileUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      actorRole: 'USER',
      expectedVersion: 4,
      name: 'Maria Souza',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.CONCURRENCY_CONFLICT);
    expect(accounts.saveCallCount).toBe(0);
    expect(accounts.get(account.id)!.name).toBe('Joao Silva');
  });

  it('retorna CONCURRENCY_CONFLICT quando o CAS falha na escrita, mesmo com leitura inicialmente compatível, sem persistir', async () => {
    const account = buildAccount({ version: 1 });
    const inner = new InMemoryUserAccountRepository([account]);
    const accounts = new WriteConflictUserAccountRepository(inner);
    const useCase = new UpdateOwnProfileUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: account.id,
      actorRole: 'USER',
      expectedVersion: account.version,
      name: 'Maria Souza',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.CONCURRENCY_CONFLICT);
    expect(accounts.saveCallCount).toBe(1);
    expect(inner.get(account.id)!.name).toBe('Joao Silva');
  });
});
