import { Id } from '@bancaflow/shared';
import { Banca } from '../src/banca/banca.entity';
import { BancaStatus } from '../src/banca/vo/banca-status.vo';
import { ProvisionBancaUseCase } from '../src/app/use-case/provision-banca.use-case';
import { TENANCY_ERRORS } from '../src/shared/errors/tenancy.errors';
import {
  FakeCreateUserAccountPort,
  InMemoryBancaRepository,
  PassthroughTransactionManager,
  RollbackTransactionManager,
} from './support/fakes';

const OWNER = {
  username: 'dono',
  name: 'Dono Silva',
  password: 'Secret@123',
  email: 'dono@farizeu.com',
};

describe('ProvisionBancaUseCase', () => {
  it('cria banca ACTIVE + conta OWNER com role explícito', async () => {
    const bancas = new InMemoryBancaRepository();
    const createAccount = new FakeCreateUserAccountPort();
    const useCase = new ProvisionBancaUseCase(bancas, createAccount, new PassthroughTransactionManager());

    const result = await useCase.execute({ codigoBanca: 'Farizeu', nome: 'Farizeu', owner: OWNER });

    expect(result.isOk).toBe(true);
    expect(result.instance.bancaId).toBeDefined();
    expect(result.instance.userId).toBeDefined();

    // A port recebeu role 'OWNER' explícito e o bancaId da banca criada.
    expect(createAccount.lastInput?.role).toBe('OWNER');
    expect(createAccount.lastInput?.bancaId).toBe(result.instance.bancaId);
    expect(createAccount.lastInput?.username).toBe('dono');

    const persisted = await bancas.findById(result.instance.bancaId);
    expect(persisted.instance?.isActive()).toBe(true);
    expect(persisted.instance?.codigoBanca.normalized).toBe('farizeu');

    const notFound = await bancas.findById(Id.createUUID());
    expect(notFound.instance).toBeNull();
  });

  it('aborta quando o código já existe e não cria conta', async () => {
    const existing = Banca.create({
      id: Id.createUUID(),
      codigoBanca: 'farizeu',
      nome: 'Farizeu',
      status: BancaStatus.ACTIVE,
    });
    const bancas = new InMemoryBancaRepository([existing]);
    const createAccount = new FakeCreateUserAccountPort();
    const useCase = new ProvisionBancaUseCase(bancas, createAccount, new PassthroughTransactionManager());

    const result = await useCase.execute({ codigoBanca: 'FARIZEU', nome: 'Farizeu', owner: OWNER });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(TENANCY_ERRORS.CODIGO_ALREADY_EXISTS);
    expect(createAccount.calls).toBe(0);
  });

  it('faz rollback quando a criação da conta OWNER falha', async () => {
    const bancas = new InMemoryBancaRepository();
    const createAccount = new FakeCreateUserAccountPort('IDENTITY.USERNAME_ALREADY_EXISTS');
    const useCase = new ProvisionBancaUseCase(bancas, createAccount, new RollbackTransactionManager(bancas));

    const result = await useCase.execute({ codigoBanca: 'farizeu', nome: 'Farizeu', owner: OWNER });

    expect(result.isFailure).toBe(true);
    // A banca não permanece persistida após o rollback da transação.
    expect(bancas.size).toBe(0);
  });

  it('rejeita codigoBanca em formato inválido antes de consultar o repositório', async () => {
    const bancas = new InMemoryBancaRepository();
    const createAccount = new FakeCreateUserAccountPort();
    const useCase = new ProvisionBancaUseCase(bancas, createAccount, new PassthroughTransactionManager());

    const result = await useCase.execute({ codigoBanca: '-invalido', nome: 'Farizeu', owner: OWNER });

    expect(result.isFailure).toBe(true);
    expect(createAccount.calls).toBe(0);
  });

  it('propaga falha ao consultar unicidade do código', async () => {
    const bancas = new InMemoryBancaRepository();
    bancas.failExistsByCodigo = true;
    const createAccount = new FakeCreateUserAccountPort();
    const useCase = new ProvisionBancaUseCase(bancas, createAccount, new PassthroughTransactionManager());

    const result = await useCase.execute({ codigoBanca: 'farizeu', nome: 'Farizeu', owner: OWNER });

    expect(result.isFailure).toBe(true);
    expect(createAccount.calls).toBe(0);
  });

  it('aborta quando a Banca não pode ser construída (nome vazio)', async () => {
    const bancas = new InMemoryBancaRepository();
    const createAccount = new FakeCreateUserAccountPort();
    const useCase = new ProvisionBancaUseCase(bancas, createAccount, new RollbackTransactionManager(bancas));

    const result = await useCase.execute({ codigoBanca: 'farizeu', nome: '   ', owner: OWNER });

    expect(result.isFailure).toBe(true);
    expect(createAccount.calls).toBe(0);
    expect(bancas.size).toBe(0);
  });

  it('faz rollback quando salvar a Banca falha', async () => {
    const bancas = new InMemoryBancaRepository();
    bancas.failSave = true;
    const createAccount = new FakeCreateUserAccountPort();
    const useCase = new ProvisionBancaUseCase(bancas, createAccount, new RollbackTransactionManager(bancas));

    const result = await useCase.execute({ codigoBanca: 'farizeu', nome: 'Farizeu', owner: OWNER });

    expect(result.isFailure).toBe(true);
    expect(createAccount.calls).toBe(0);
  });
});
