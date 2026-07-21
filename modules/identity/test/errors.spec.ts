import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';

describe('IDENTITY_ERRORS — estabilidade dos códigos', () => {
  it('mantém os códigos estáveis usados pelo contrato público do módulo', () => {
    expect(IDENTITY_ERRORS.USERNAME_ALREADY_EXISTS).toBe('IDENTITY.USERNAME_ALREADY_EXISTS');
    expect(IDENTITY_ERRORS.ACCOUNT_NOT_FOUND).toBe('IDENTITY.ACCOUNT_NOT_FOUND');
    expect(IDENTITY_ERRORS.ACCOUNT_LOCKED).toBe('IDENTITY.ACCOUNT_LOCKED');
    expect(IDENTITY_ERRORS.ACCOUNT_INACTIVE).toBe('IDENTITY.ACCOUNT_INACTIVE');
    expect(IDENTITY_ERRORS.INVALID_CREDENTIALS).toBe('IDENTITY.INVALID_CREDENTIALS');
    expect(IDENTITY_ERRORS.SESSION_NOT_FOUND).toBe('IDENTITY.SESSION_NOT_FOUND');
    expect(IDENTITY_ERRORS.SESSION_REVOKED).toBe('IDENTITY.SESSION_REVOKED');
    expect(IDENTITY_ERRORS.MUST_CHANGE_PASSWORD).toBe('IDENTITY.MUST_CHANGE_PASSWORD');
    expect(IDENTITY_ERRORS.BANCA_NOT_FOUND).toBe('IDENTITY.BANCA_NOT_FOUND');
    expect(IDENTITY_ERRORS.BANCA_INACTIVE).toBe('IDENTITY.BANCA_INACTIVE');
    expect(IDENTITY_ERRORS.FORBIDDEN).toBe('IDENTITY.FORBIDDEN');
    expect(IDENTITY_ERRORS.PASSWORD_TOO_WEAK).toBe('IDENTITY.PASSWORD_TOO_WEAK');
    expect(IDENTITY_ERRORS.INVALID_FAILED_LOGIN_ATTEMPTS).toBe('IDENTITY.INVALID_FAILED_LOGIN_ATTEMPTS');
  });

  it('nenhum código se repete entre si (unicidade)', () => {
    const values = Object.values(IDENTITY_ERRORS);
    expect(new Set(values).size).toBe(values.length);
  });

  it('todos os códigos seguem o prefixo estável IDENTITY.', () => {
    Object.values(IDENTITY_ERRORS).forEach((code) => {
      expect(code.startsWith('IDENTITY.')).toBe(true);
    });
  });
});
