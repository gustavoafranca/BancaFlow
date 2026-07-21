import { Id } from '@bancaflow/shared';
import { GetUserAccountUseCase } from '../src/user-account/use-case/get-user-account.use-case';
import { UserAccount } from '../src/user-account/user-account.entity';
import { AccountRole, AccountRoleType } from '../src/user-account/vo/account-role.vo';
import { AccountStatus } from '../src/user-account/vo/account-status.vo';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';
import { InMemoryUserAccountRepository, RealPermissionChecker } from './support/fakes';

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
    email: 'alvo@example.com',
    role,
    status: AccountStatus.ACTIVE,
    credential: { passwordHash: 'hashed:old', passwordChangedAt: NOW, mustChangePassword: false },
    failedLoginAttempts: 0,
  });
}

describe('GetUserAccountUseCase', () => {
  it('OWNER consulta o detalhe de uma conta da própria banca, sem passwordHash', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const accounts = new InMemoryUserAccountRepository([target]);
    const useCase = new GetUserAccountUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
    });

    expect(result.isOk).toBe(true);
    expect(result.instance.userId).toBe(target.id);
    expect(result.instance.email).toBe('alvo@example.com');
    expect((result.instance as any).passwordHash).toBeUndefined();
  });

  it('retorna ACCOUNT_NOT_FOUND para conta de outra banca, nunca FORBIDDEN', async () => {
    const target = buildAccount(BANCA_B, AccountRole.USER);
    const accounts = new InMemoryUserAccountRepository([target]);
    const useCase = new GetUserAccountUseCase(accounts, new RealPermissionChecker());

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.ACCOUNT_NOT_FOUND);
  });

  it('rejeita ADMIN e USER nesta versão', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const accounts = new InMemoryUserAccountRepository([target]);
    for (const role of ['ADMIN', 'USER'] as const) {
      const useCase = new GetUserAccountUseCase(accounts, new RealPermissionChecker());
      const result = await useCase.execute({
        bancaId: BANCA_A,
        actorRole: role,
        actorUserId: ACTOR_USER_ID,
        targetUserId: target.id,
      });
      expect(result.isFailure).toBe(true);
      expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
    }
  });

  it('rejeita alvo OWNER e autoconsulta', async () => {
    const owner = buildAccount(BANCA_A, AccountRole.OWNER);
    const accounts = new InMemoryUserAccountRepository([owner]);
    const useCase = new GetUserAccountUseCase(accounts, new RealPermissionChecker());

    const ownerTargetResult = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: owner.id,
    });
    expect(ownerTargetResult.isFailure).toBe(true);
    expect(ownerTargetResult.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);

    const target = buildAccount(BANCA_A, AccountRole.USER);
    accounts.save(target);
    const selfResult = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: target.id,
      targetUserId: target.id,
    });
    expect(selfResult.isFailure).toBe(true);
    expect(selfResult.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
  });
});
