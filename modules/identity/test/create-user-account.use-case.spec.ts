import { Id } from '@bancaflow/shared';
import { CreateUserAccountUseCase } from '../src/user-account/use-case/create-user-account.use-case';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';
import { FakePasswordCrypto, FixedClock, InMemoryUserAccountRepository } from './support/fakes';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const BANCA_ID = Id.createUUID();

function buildUseCase() {
  const accounts = new InMemoryUserAccountRepository();
  const passwordCrypto = new FakePasswordCrypto();
  const useCase = new CreateUserAccountUseCase(accounts, passwordCrypto, new FixedClock(NOW));
  return { useCase, accounts, passwordCrypto };
}

describe('CreateUserAccountUseCase', () => {
  it('cria conta com papel USER quando informado explicitamente', async () => {
    const { useCase } = buildUseCase();
    const result = await useCase.execute({
      bancaId: BANCA_ID,
      username: 'dono',
      name: 'Dono Silva',
      password: 'Secret@123',
      role: 'USER',
    });
    expect(result.isOk).toBe(true);
    expect(result.instance.role).toBe('USER');
  });

  it('exige role explícito em tempo de compilação (nunca há papel implícito)', () => {
    // @ts-expect-error role agora é obrigatório em CreateUserAccountInput — omiti-lo é erro de compilação.
    const input: Parameters<CreateUserAccountUseCase['execute']>[0] = {
      bancaId: BANCA_ID,
      username: 'dono',
      name: 'Dono Silva',
      password: 'Secret@123',
    };
    expect(input).toBeDefined();
  });

  it('cria conta com papel OWNER quando informado explicitamente (fluxo ProvisionBanca)', async () => {
    const { useCase } = buildUseCase();
    const result = await useCase.execute({
      bancaId: BANCA_ID,
      username: 'dono',
      name: 'Dono Silva',
      password: 'Secret@123',
      role: 'OWNER',
    });
    expect(result.isOk).toBe(true);
    expect(result.instance.role).toBe('OWNER');
  });

  it('rejeita senha fraca antes de qualquer persistência', async () => {
    const { useCase, accounts } = buildUseCase();
    const result = await useCase.execute({
      bancaId: BANCA_ID,
      username: 'joao',
      name: 'Joao Silva',
      password: 'weak',
      role: 'USER',
    });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.PASSWORD_TOO_WEAK);
    expect(accounts.get).toBeDefined();
    const existing = await accounts.findByBancaAndUsername(BANCA_ID, 'joao');
    expect(existing.instance).toBeNull();
  });

  it('rejeita username duplicado na mesma banca (case-insensitive)', async () => {
    const { useCase } = buildUseCase();
    await useCase.execute({ bancaId: BANCA_ID, username: 'joao', name: 'Joao Silva', password: 'Secret@123', role: 'USER' });
    const dup = await useCase.execute({
      bancaId: BANCA_ID,
      username: 'JOAO',
      name: 'Joao Souza',
      password: 'Secret@123',
      role: 'USER',
    });
    expect(dup.isFailure).toBe(true);
    expect(dup.errors).toContain(IDENTITY_ERRORS.USERNAME_ALREADY_EXISTS);
  });

  it('permite o mesmo username em bancas diferentes', async () => {
    const { useCase } = buildUseCase();
    const other = Id.createUUID();
    await useCase.execute({ bancaId: BANCA_ID, username: 'joao', name: 'Joao Silva', password: 'Secret@123', role: 'USER' });
    const result = await useCase.execute({
      bancaId: other,
      username: 'joao',
      name: 'Joao Silva',
      password: 'Secret@123',
      role: 'USER',
    });
    expect(result.isOk).toBe(true);
  });

  it('rejeita username em formato inválido', async () => {
    const { useCase } = buildUseCase();
    const result = await useCase.execute({
      bancaId: BANCA_ID,
      username: 'a',
      name: 'Joao Silva',
      password: 'Secret@123',
      role: 'USER',
    });
    expect(result.isFailure).toBe(true);
  });

  it('rejeita role inválido', async () => {
    const { useCase } = buildUseCase();
    const result = await useCase.execute({
      bancaId: BANCA_ID,
      username: 'joao',
      name: 'Joao Silva',
      password: 'Secret@123',
      role: 'SUPERADMIN' as never,
    });
    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao consultar unicidade de username', async () => {
    const { useCase, accounts } = buildUseCase();
    accounts.failFindByBancaAndUsername = true;
    const result = await useCase.execute({
      bancaId: BANCA_ID,
      username: 'joao',
      name: 'Joao Silva',
      password: 'Secret@123',
      role: 'USER',
    });
    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao gerar o hash da senha', async () => {
    const { useCase, passwordCrypto } = buildUseCase();
    passwordCrypto.failHash = true;
    const result = await useCase.execute({
      bancaId: BANCA_ID,
      username: 'joao',
      name: 'Joao Silva',
      password: 'Secret@123',
      role: 'USER',
    });
    expect(result.isFailure).toBe(true);
  });

  it('rejeita quando a entidade não pode ser construída (nome sem sobrenome)', async () => {
    const { useCase } = buildUseCase();
    const result = await useCase.execute({
      bancaId: BANCA_ID,
      username: 'joao',
      name: 'Joao',
      password: 'Secret@123',
      role: 'USER',
    });
    expect(result.isFailure).toBe(true);
  });

  it('propaga falha ao salvar a conta', async () => {
    const { useCase, accounts } = buildUseCase();
    accounts.failSave = true;
    const result = await useCase.execute({
      bancaId: BANCA_ID,
      username: 'joao',
      name: 'Joao Silva',
      password: 'Secret@123',
      role: 'USER',
    });
    expect(result.isFailure).toBe(true);
  });
});
