import { Id } from '@bancaflow/shared';
import { Banca } from '../src/banca/banca.entity';
import { BancaStatus } from '../src/banca/vo/banca-status.vo';
import { TENANCY_ERRORS } from '../src/shared/errors/tenancy.errors';

function buildBanca(overrides: Partial<Parameters<typeof Banca.tryCreate>[0]> = {}) {
  return Banca.tryCreate({
    id: Id.createUUID(),
    codigoBanca: 'Farizeu',
    nome: 'Farizeu',
    status: BancaStatus.ACTIVE,
    ...overrides,
  });
}

describe('Banca', () => {
  it('cria com código normalizado e status ACTIVE', () => {
    const result = buildBanca();
    expect(result.isOk).toBe(true);
    const banca = result.instance;
    expect(banca.codigoBanca.normalized).toBe('farizeu');
    expect(banca.status.value).toBe('ACTIVE');
    expect(banca.isActive()).toBe(true);
    expect(banca.nome).toBe('Farizeu');
  });

  it('armazena o código já na forma normalizada e autoritativa (raw == normalized)', () => {
    const result = buildBanca({ codigoBanca: 'Farizeu' });
    expect(result.isOk).toBe(true);
    const banca = result.instance;
    // O valor bruto original ("Farizeu") não é preservado: a forma persistida
    // e comparável é a normalizada, exposta tanto em `.raw` quanto `.normalized`
    // ao reconstruir o VO a partir do valor armazenado.
    expect(banca.codigoBanca.raw).toBe('farizeu');
    expect(banca.codigoBanca.normalized).toBe('farizeu');
  });

  it('rejeita código inválido', () => {
    const result = buildBanca({ codigoBanca: '-farizeu' });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(TENANCY_ERRORS.CODIGO_INVALID);
  });

  it('rejeita nome vazio com erro próprio, distinto do erro de código inválido', () => {
    const result = buildBanca({ nome: '   ' });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(TENANCY_ERRORS.NOME_INVALID);
    expect(result.errors).not.toContain(TENANCY_ERRORS.CODIGO_INVALID);
  });

  it('rejeita nome indefinido (não apenas vazio) com erro próprio', () => {
    const result = buildBanca({ nome: undefined as unknown as string });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(TENANCY_ERRORS.NOME_INVALID);
  });

  it('desativa uma banca ativa', () => {
    const banca = buildBanca().instance;
    const result = banca.deactivate();
    expect(result.isOk).toBe(true);
    expect(result.instance.status.value).toBe('INACTIVE');
    expect(result.instance.isActive()).toBe(false);
  });

  it('ativa uma banca inativa', () => {
    const banca = buildBanca({ status: BancaStatus.INACTIVE }).instance;
    const result = banca.activate();
    expect(result.isOk).toBe(true);
    expect(result.instance.status.value).toBe('ACTIVE');
  });
});
