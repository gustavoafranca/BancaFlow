import { Id } from '@bancaflow/shared';
import { AdminResetPasswordUseCase } from '../src/user-account/use-case/admin-reset-password.use-case';
import { UserAccount } from '../src/user-account/user-account.entity';
import { AccountRole } from '../src/user-account/vo/account-role.vo';
import { AccountStatus } from '../src/user-account/vo/account-status.vo';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';
import {
  FakePasswordCrypto,
  FakeTemporaryPasswordGenerator,
  FixedClock,
  InMemorySessionRepository,
  InMemoryUserAccountRepository,
  PassthroughTransactionManager,
  RealPermissionChecker,
} from './support/fakes';
import { AccountRoleType } from '../src/user-account/vo/account-role.vo';

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
  const passwordCrypto = new FakePasswordCrypto();
  const tempPasswordGenerator = new FakeTemporaryPasswordGenerator('Temp@98765');
  const useCase = new AdminResetPasswordUseCase(
    accounts,
    sessions,
    passwordCrypto,
    tempPasswordGenerator,
    new FixedClock(NOW),
    new PassthroughTransactionManager(),
    new RealPermissionChecker(),
  );
  return { useCase, accounts, sessions, passwordCrypto, tempPasswordGenerator };
}

describe('AdminResetPasswordUseCase', () => {
  it('OWNER redefine senha e devolve a temporária uma única vez', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const { useCase, accounts } = buildUseCase([target]);

    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
    });

    expect(result.isOk).toBe(true);
    expect(result.instance.temporaryPassword).toBe('Temp@98765');
    const updated = accounts.get(target.id)!;
    expect(updated.mustChangePassword).toBe(true);
    expect(updated.credential.passwordHash).toBe('hashed:Temp@98765');
    // A senha temporária em texto puro só existe no retorno único do use case
    // — a conta persistida só carrega o hash, e nenhum outro campo da
    // entidade guarda a senha em claro.
    const { credential, ...rest } = JSON.parse(JSON.stringify(updated));
    expect(JSON.stringify(rest)).not.toContain(result.instance.temporaryPassword);
    expect(credential).not.toHaveProperty('temporaryPassword');
    expect(credential).not.toHaveProperty('plainPassword');
  });

  it('rejeita redefinição cross-banca com ACCOUNT_NOT_FOUND (404), nunca FORBIDDEN', async () => {
    const target = buildAccount(BANCA_B, AccountRole.USER);
    const { useCase } = buildUseCase([target]);
    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
    });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.ACCOUNT_NOT_FOUND);
    expect(result.errors).not.toContain(IDENTITY_ERRORS.FORBIDDEN);
  });

  it('USER não é autorizado (nega via hasPermission, não checagem de papel bruto)', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const { useCase } = buildUseCase([target]);
    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'USER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
    });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
  });

  it('ADMIN não é autorizado nesta versão (ADMIN não administra contas)', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const { useCase, accounts } = buildUseCase([target]);
    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'ADMIN',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
    });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
    expect(accounts.get(target.id)!.mustChangePassword).toBe(false);
  });

  it('impede OWNER de redefinir a senha de uma conta OWNER (ninguém administra OWNER por este painel)', async () => {
    const owner = buildAccount(BANCA_A, AccountRole.OWNER);
    const { useCase } = buildUseCase([owner]);
    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: owner.id,
    });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
  });

  it('impede OWNER de redefinir a própria senha por este endpoint (autoproteção)', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const { useCase } = buildUseCase([target]);
    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: target.id,
      targetUserId: target.id,
    });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
  });

  it('propaga falha ao buscar a conta alvo', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const { useCase, accounts } = buildUseCase([target]);
    accounts.failFindById = true;
    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
    });
    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao gerar a senha temporária', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const { useCase, tempPasswordGenerator } = buildUseCase([target]);
    tempPasswordGenerator.failGenerate = true;
    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
    });
    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao gerar o hash da senha temporária', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const { useCase, passwordCrypto } = buildUseCase([target]);
    passwordCrypto.failHash = true;
    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
    });
    expect(result.isFailure).toBe(true);
  });

  it('propaga falha quando o novo hash é inválido (changePassword falha)', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const { useCase, passwordCrypto } = buildUseCase([target]);
    passwordCrypto.hashOverride = '';
    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
    });
    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao salvar a conta com a nova credencial', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const { useCase, accounts } = buildUseCase([target]);
    accounts.failSave = true;
    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
    });
    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao revogar as sessões do alvo', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const { useCase, sessions } = buildUseCase([target]);
    sessions.failRevokeAll = true;
    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
    });
    expect(result.isFailure).toBe(true);
  });

  it('gera novamente quando a senha temporária sai fraca, até encontrar uma forte', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const { useCase, accounts, tempPasswordGenerator } = buildUseCase([target]);
    tempPasswordGenerator.enqueue('weak', 'alsoweak');
    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
    });
    expect(result.isOk).toBe(true);
    expect(result.instance.temporaryPassword).toBe('Temp@98765');
    expect(accounts.get(target.id)!.credential.passwordHash).toBe('hashed:Temp@98765');
  });

  it('falha após esgotar as tentativas de gerar senha temporária forte', async () => {
    const target = buildAccount(BANCA_A, AccountRole.USER);
    const { useCase, tempPasswordGenerator } = buildUseCase([target]);
    tempPasswordGenerator.enqueue('weak', 'weak', 'weak', 'weak', 'weak');
    const result = await useCase.execute({
      bancaId: BANCA_A,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      targetUserId: target.id,
    });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.PASSWORD_TOO_WEAK);
  });
});
