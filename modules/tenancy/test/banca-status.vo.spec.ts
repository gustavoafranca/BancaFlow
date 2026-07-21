import { BancaStatus } from '../src/banca/vo/banca-status.vo';
import { TENANCY_ERRORS } from '../src/shared/errors/tenancy.errors';

describe('BancaStatus', () => {
  it('cria cada status válido e normaliza formato (trim + uppercase)', () => {
    expect(BancaStatus.create('active').value).toBe('ACTIVE');
    expect(BancaStatus.create(' Inactive ').value).toBe('INACTIVE');
  });

  it('rejeita status desconhecido', () => {
    const result = BancaStatus.tryCreate('SUSPENDED');
    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(TENANCY_ERRORS.STATUS_INVALID);
  });

  it('rejeita valor vazio/indefinido', () => {
    expect(BancaStatus.tryCreate('').isFailure).toBe(true);
    expect(BancaStatus.tryCreate(undefined as unknown as string).isFailure).toBe(true);
  });

  it('isActive é true somente para ACTIVE', () => {
    expect(BancaStatus.create(BancaStatus.ACTIVE).isActive).toBe(true);
    expect(BancaStatus.create(BancaStatus.INACTIVE).isActive).toBe(false);
  });
});
