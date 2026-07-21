import { Id, StrongPassword } from '@bancaflow/shared';
import { AdminCreateUserAccountUseCase } from '../src/user-account/use-case/admin-create-user-account.use-case';
import { CreateUserAccountUseCase } from '../src/user-account/use-case/create-user-account.use-case';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';
import {
  FakePasswordCrypto,
  FakeTemporaryPasswordGenerator,
  FixedClock,
  InMemoryUserAccountRepository,
  RealPermissionChecker,
} from './support/fakes';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const BANCA_ID = Id.createUUID();
const ACTOR_USER_ID = Id.createUUID();

function buildUseCase() {
  const accounts = new InMemoryUserAccountRepository();
  const passwordCrypto = new FakePasswordCrypto();
  const createUserAccount = new CreateUserAccountUseCase(accounts, passwordCrypto, new FixedClock(NOW));
  const tempPasswordGenerator = new FakeTemporaryPasswordGenerator('Temp@98765');
  const useCase = new AdminCreateUserAccountUseCase(createUserAccount, tempPasswordGenerator, new RealPermissionChecker());
  return { useCase, accounts, tempPasswordGenerator };
}

describe('AdminCreateUserAccountUseCase', () => {
  it('OWNER cria uma conta ADMIN com senha temporária forte, mustChangePassword=true, devolvida uma única vez', async () => {
    const { useCase, accounts } = buildUseCase();

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      username: 'novo.admin',
      name: 'Novo Admin Silva',
      role: 'ADMIN',
    });

    expect(result.isOk).toBe(true);
    expect(result.instance.role).toBe('ADMIN');
    expect(StrongPassword.isStrong(result.instance.temporaryPassword)).toBe(true);
    const created = accounts.get(result.instance.userId)!;
    expect(created.mustChangePassword).toBe(true);
    expect(created.bancaId).toBe(BANCA_ID);
    // A senha temporária em texto puro só existe no retorno único do use case
    // (`result.instance.temporaryPassword`) — a conta persistida só carrega o
    // hash (que, com um hasher real, nem reproduz o valor em claro) e nenhum
    // outro campo da entidade guarda a senha em claro.
    expect(created.credential.passwordHash).not.toBe(result.instance.temporaryPassword);
    const { credential, ...rest } = JSON.parse(JSON.stringify(created));
    expect(JSON.stringify(rest)).not.toContain(result.instance.temporaryPassword);
    expect(credential).not.toHaveProperty('temporaryPassword');
    expect(credential).not.toHaveProperty('plainPassword');
  });

  it('OWNER cria uma conta USER', async () => {
    const { useCase, accounts } = buildUseCase();

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      username: 'novo.user',
      name: 'Novo User Silva',
      role: 'USER',
    });

    expect(result.isOk).toBe(true);
    expect(accounts.get(result.instance.userId)!.role.value).toBe('USER');
  });

  it('rejeita role OWNER na criação administrativa', async () => {
    const { useCase, accounts } = buildUseCase();

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      username: 'tentativa.owner',
      name: 'Tentativa Owner Silva',
      role: 'OWNER' as never,
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
    expect(accounts.saveCallCount).toBe(0);
  });

  it('rejeita ADMIN e USER como atores nesta versão', async () => {
    for (const role of ['ADMIN', 'USER'] as const) {
      const { useCase, accounts } = buildUseCase();
      const result = await useCase.execute({
        bancaId: BANCA_ID,
        actorRole: role,
        actorUserId: ACTOR_USER_ID,
        username: 'novo.user',
        name: 'Novo User Silva',
        role: 'USER',
      });
      expect(result.isFailure).toBe(true);
      expect(result.errors).toContain(IDENTITY_ERRORS.FORBIDDEN);
      expect(accounts.saveCallCount).toBe(0);
    }
  });

  it('propaga USERNAME_ALREADY_EXISTS delegado ao CreateUserAccountUseCase', async () => {
    const { useCase } = buildUseCase();

    const first = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      username: 'duplicado',
      name: 'Primeiro Silva',
      role: 'USER',
    });
    expect(first.isOk).toBe(true);

    const second = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      username: 'duplicado',
      name: 'Segundo Silva',
      role: 'ADMIN',
    });
    expect(second.isFailure).toBe(true);
    expect(second.errors).toContain(IDENTITY_ERRORS.USERNAME_ALREADY_EXISTS);
  });

  it('gera novamente quando a senha temporária sai fraca, até encontrar uma forte', async () => {
    const { useCase, tempPasswordGenerator } = buildUseCase();
    tempPasswordGenerator.enqueue('weak', 'alsoweak');

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      username: 'novo.user',
      name: 'Novo User Silva',
      role: 'USER',
    });

    expect(result.isOk).toBe(true);
    expect(result.instance.temporaryPassword).toBe('Temp@98765');
  });

  it('falha após esgotar as tentativas de gerar senha temporária forte', async () => {
    const { useCase, tempPasswordGenerator } = buildUseCase();
    tempPasswordGenerator.enqueue('weak', 'weak', 'weak', 'weak', 'weak');

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      actorRole: 'OWNER',
      actorUserId: ACTOR_USER_ID,
      username: 'novo.user',
      name: 'Novo User Silva',
      role: 'USER',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.PASSWORD_TOO_WEAK);
  });
});
