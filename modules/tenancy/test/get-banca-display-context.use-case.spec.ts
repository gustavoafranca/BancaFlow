import { Result } from '@bancaflow/shared';
import { GetBancaDisplayContextUseCase } from '../src/banca/use-case/get-banca-display-context.use-case';
import { TENANCY_ERRORS } from '../src/shared/errors/tenancy.errors';
import type {
  BancaDisplayContextQuery,
  BancaDisplayContextView,
} from '../src/banca/query/banca-display-context.query';

class FakeBancaDisplayQuery implements BancaDisplayContextQuery {
  lastBancaId?: string;
  constructor(private readonly result: Result<BancaDisplayContextView | null>) {}
  async findActiveById(bancaId: string) {
    this.lastBancaId = bancaId;
    return this.result;
  }
}

const view = (over: Partial<BancaDisplayContextView> = {}): BancaDisplayContextView => ({
  bancaId: 'banca-1',
  codigoBanca: 'farizeu',
  nome: 'Banca São Jorge',
  ...over,
});

describe('GetBancaDisplayContextUseCase', () => {
  it('retorna { bancaId, codigoBanca, nome } de banca ativa', async () => {
    const query = new FakeBancaDisplayQuery(Result.ok(view()));
    const useCase = new GetBancaDisplayContextUseCase(query);
    const result = await useCase.execute({ bancaId: 'banca-1' });

    expect(result.isOk).toBe(true);
    expect(result.instance).toEqual({
      bancaId: 'banca-1',
      codigoBanca: 'farizeu',
      nome: 'Banca São Jorge',
    });
    expect(query.lastBancaId).toBe('banca-1');
  });

  it('falha genérica quando a query não encontra banca ativa (inativa/inexistente)', async () => {
    const useCase = new GetBancaDisplayContextUseCase(new FakeBancaDisplayQuery(Result.ok(null)));
    const result = await useCase.execute({ bancaId: 'banca-x' });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(TENANCY_ERRORS.BANCA_NOT_FOUND);
  });

  it('falha genérica para banca inativa (query → null, indistinguível de inexistente)', async () => {
    const useCase = new GetBancaDisplayContextUseCase(new FakeBancaDisplayQuery(Result.ok(null)));
    const result = await useCase.execute({ bancaId: 'banca-inativa' });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(TENANCY_ERRORS.BANCA_NOT_FOUND);
  });

  it('propaga falha técnica da query SEM convertê-la em ausência (BANCA_NOT_FOUND)', async () => {
    const useCase = new GetBancaDisplayContextUseCase(
      new FakeBancaDisplayQuery(Result.fail('TENANCY.BANCA_DISPLAY_QUERY_ERROR')),
    );
    const result = await useCase.execute({ bancaId: 'banca-1' });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain('TENANCY.BANCA_DISPLAY_QUERY_ERROR');
    // A falha técnica (categoria C) NÃO é colapsada em ausência (categoria B).
    expect(result.errors).not.toContain(TENANCY_ERRORS.BANCA_NOT_FOUND);
  });

  it('não retorna a entidade Banca nem campos de persistência', async () => {
    const useCase = new GetBancaDisplayContextUseCase(new FakeBancaDisplayQuery(Result.ok(view())));
    const result = await useCase.execute({ bancaId: 'banca-1' });

    expect(Object.keys(result.instance).sort()).toEqual(
      ['bancaId', 'codigoBanca', 'nome'].sort(),
    );
    expect((result.instance as Record<string, unknown>).status).toBeUndefined();
  });
});
