import { Id } from '@bancaflow/shared';
import { Banca } from '../src/banca/banca.entity';
import { BancaStatus } from '../src/banca/vo/banca-status.vo';
import { GetBancaContextUseCase } from '../src/banca/use-case/get-banca-context.use-case';
import { TENANCY_ERRORS } from '../src/shared/errors/tenancy.errors';
import { InMemoryBancaRepository } from './support/fakes';

function buildBanca(codigo: string, status = BancaStatus.ACTIVE) {
  return Banca.create({
    id: Id.createUUID(),
    codigoBanca: codigo,
    nome: codigo,
    status,
  });
}

describe('GetBancaContextUseCase', () => {
  it('retorna contexto de banca existente e ativa', async () => {
    const banca = buildBanca('farizeu');
    const useCase = new GetBancaContextUseCase(new InMemoryBancaRepository([banca]));
    const result = await useCase.execute({ codigoBanca: 'farizeu' });
    expect(result.isOk).toBe(true);
    expect(result.instance).toEqual({ bancaId: banca.id, isActive: true });
  });

  it('retorna isActive=false para banca inativa', async () => {
    const banca = buildBanca('farizeu', BancaStatus.INACTIVE);
    const useCase = new GetBancaContextUseCase(new InMemoryBancaRepository([banca]));
    const result = await useCase.execute({ codigoBanca: 'farizeu' });
    expect(result.isOk).toBe(true);
    expect(result.instance.isActive).toBe(false);
  });

  it('normaliza o código antes da busca', async () => {
    const banca = buildBanca('farizeu');
    const useCase = new GetBancaContextUseCase(new InMemoryBancaRepository([banca]));
    const result = await useCase.execute({ codigoBanca: 'FARIZEU' });
    expect(result.isOk).toBe(true);
    expect(result.instance.bancaId).toBe(banca.id);
  });

  it('falha genérica quando a banca não existe', async () => {
    const useCase = new GetBancaContextUseCase(new InMemoryBancaRepository());
    const result = await useCase.execute({ codigoBanca: 'inexistente' });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(TENANCY_ERRORS.BANCA_NOT_FOUND);
  });

  it('falha genérica para código em formato inválido (não revela detalhes)', async () => {
    const useCase = new GetBancaContextUseCase(new InMemoryBancaRepository());
    const result = await useCase.execute({ codigoBanca: '-invalido' });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(TENANCY_ERRORS.BANCA_NOT_FOUND);
  });

  it('propaga falha ao consultar o repositório', async () => {
    const repo = new InMemoryBancaRepository();
    repo.failFindByCodigo = true;
    const useCase = new GetBancaContextUseCase(repo);
    const result = await useCase.execute({ codigoBanca: 'farizeu' });
    expect(result.isFailure).toBe(true);
  });
});
