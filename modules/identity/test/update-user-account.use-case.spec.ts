import { Id } from '@bancaflow/shared';
import { UpdateUserAccountUseCase } from '../src/user-account/use-case/update-user-account.use-case';
import { UserAccount } from '../src/user-account/user-account.entity';
import { AccountRole, AccountRoleType } from '../src/user-account/vo/account-role.vo';
import { AccountStatus } from '../src/user-account/vo/account-status.vo';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';
import { InMemoryUserAccountRepository, RealPermissionChecker } from './support/fakes';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const BANCA_A = Id.createUUID();
const BANCA_B = Id.createUUID();
const ACTOR_USER_ID = Id.createUUID();

function buildAccount(bancaId: string, role: AccountRoleType, username = 'target'): UserAccount {
  return UserAccount.create({
    id: Id.createUUID(),
    bancaId,
    username,
    name: 'Alvo Silva',
    email: 'alvo@example.com',
    role,
    status: AccountStatus.ACTIVE,
    credential: { passwordHash: 'hashed:old', passwordChangedAt: NOW, mustChangePassword: false },
    failedLoginAttempts: 0,
    version: 1,
  });
}

describe('UpdateUserAccountUseCase', () => {
  it('OWNER atualiza nome e e-mail de uma conta de terceiro, sem revogar sessões', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const accounts = new InMemoryUserAccountRepository([target]);
    const useCase = new UpdateUserAccountUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
      expectedVersion: 1,
      name: 'Maria Souza',
      email: 'maria@example.com',
    });

    expect(result.isOk).toBe(true);
    const updated = accounts.get(target.id)!;
    expect(updated.name).toBe('Maria Souza');
    expect(updated.email).toBe('maria@example.com');
  });

  it('OWNER troca o username de uma conta de terceiro', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER, 'joao');
    const accounts = new InMemoryUserAccountRepository([target]);
    const useCase = new UpdateUserAccountUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
      expectedVersion: 1,
      username: 'joao.silva',
    });

    expect(result.isOk).toBe(true);
    expect(accounts.get(target.id)!.username.raw).toBe('joao.silva');
  });

  it('rejeita username duplicado na mesma banca', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER, 'joao');
    const other = buildAccount(BANCA_A, AccountRole.USER, 'maria');
    const accounts = new InMemoryUserAccountRepository([target, other]);
    const useCase = new UpdateUserAccountUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
      expectedVersion: 1,
      username: 'maria',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.USERNAME_ALREADY_EXISTS);
  });

  it('permite manter o próprio username inalterado (não colide consigo mesma)', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER, 'joao');
    const accounts = new InMemoryUserAccountRepository([target]);
    const useCase = new UpdateUserAccountUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
      expectedVersion: 1,
      username: 'joao',
      name: 'Joao Novo Sobrenome',
    });

    expect(result.isOk).toBe(true);
  });

  it('rejeita versão desatualizada com CONCURRENCY_CONFLICT', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const accounts = new InMemoryUserAccountRepository([target]);
    const useCase = new UpdateUserAccountUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
      expectedVersion: 99,
      name: 'Nome Qualquer Silva',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.CONCURRENCY_CONFLICT);
  });

  it('retorna ACCOUNT_NOT_FOUND para alvo de outra banca, nunca FORBIDDEN', async () => {
    const target = buildAccount(BANCA_B, AccountRole.USER);
    const accounts = new InMemoryUserAccountRepository([target]);
    const useCase = new UpdateUserAccountUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
      expectedVersion: 1,
      name: 'Nome Qualquer Silva',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.ACCOUNT_NOT_FOUND);
    expect(result.errors).not.toContain(IDENTITY_ERRORS.FORBIDDEN);
  });

  it('rejeita ADMIN e USER nesta versão', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const accounts = new InMemoryUserAccountRepository([target]);
    for (const role of ['ADMIN', 'USER'] as const) {
      const useCase = new UpdateUserAccountUseCase(accounts, new RealPermissionChecker());
      const result = await useCase.execute({
        bancaId: BANCA_A,
        actorRole: role,
        actorUserId: ACTOR_USER_ID,
        targetUserId: target.id,
        expectedVersion: 1,
        name: 'Nome Qualquer Silva',
      });
      expect(result.isFailure).toBe(true);
      expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
    }
  });

  it('impede administrar a própria conta por este painel', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const accounts = new InMemoryUserAccountRepository([target]);
    const useCase = new UpdateUserAccountUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: target.id,
      targetUserId: target.id,
      expectedVersion: 1,
      name: 'Nome Qualquer Silva',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
  });
});
