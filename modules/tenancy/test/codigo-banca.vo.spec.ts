import { CodigoBanca } from '../src/banca/vo/codigo-banca.vo';
import { TENANCY_ERRORS } from '../src/shared/errors/tenancy.errors';

describe('CodigoBanca', () => {
  it('normaliza com trim + lowercase', () => {
    const result = CodigoBanca.tryCreate('  Farizeu  ');
    expect(result.isOk).toBe(true);
    expect(result.instance.raw).toBe('Farizeu');
    expect(result.instance.normalized).toBe('farizeu');
  });

  it.each(['-farizeu', 'farizeu-', 'fa', 'banca_x', 'BAN CA', ''])(
    'rejeita formato inválido: %s',
    (value) => {
      const result = CodigoBanca.tryCreate(value);
      expect(result.isFailure).toBe(true);
      expect(result.errors).toContain(TENANCY_ERRORS.CODIGO_INVALID);
    },
  );

  it.each(['www', 'api', 'admin', 'app', 'status', 'API'])(
    'rejeita código reservado: %s',
    (value) => {
      const result = CodigoBanca.tryCreate(value);
      expect(result.isFailure).toBe(true);
      expect(result.errors).toContain(TENANCY_ERRORS.CODIGO_RESERVED);
    },
  );

  it('aceita códigos válidos com hífen no meio', () => {
    const result = CodigoBanca.tryCreate('minha-banca-01');
    expect(result.isOk).toBe(true);
    expect(result.instance.normalized).toBe('minha-banca-01');
  });

  it('rejeita valor indefinido (não apenas string vazia)', () => {
    const result = CodigoBanca.tryCreate(undefined as unknown as string);
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(TENANCY_ERRORS.CODIGO_INVALID);
  });
});
