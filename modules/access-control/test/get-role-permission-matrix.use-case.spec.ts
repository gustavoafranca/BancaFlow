import { GetRolePermissionMatrixUseCase } from '../src/use-case/get-role-permission-matrix.use-case';
import { ACCESS_CONTROL_ERRORS } from '../src/errors/access-control.errors';

describe('GetRolePermissionMatrixUseCase', () => {
  const useCase = new GetRolePermissionMatrixUseCase();

  it('returns the full matrix with presentation metadata for OWNER', async () => {
    const result = await useCase.execute({ actorRole: 'OWNER' });
    expect(result.isFailure).toBe(false);
    const capabilities = result.instance.capabilities;
    expect(capabilities.map((c) => c.capability)).toEqual(['identity', 'participants', 'access-control']);
    const toggleStatus = capabilities
      .flatMap((c) => c.permissions)
      .find((p) => p.key === 'identity.accounts.toggle-status');
    expect(toggleStatus?.roles).toEqual(['OWNER']);
    expect(toggleStatus?.label).toBeTruthy();
  });

  it('denies ADMIN access to the full matrix in this version', async () => {
    const result = await useCase.execute({ actorRole: 'ADMIN' });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([ACCESS_CONTROL_ERRORS.FORBIDDEN]);
  });

  it('denies USER access to the full matrix', async () => {
    const result = await useCase.execute({ actorRole: 'USER' });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([ACCESS_CONTROL_ERRORS.FORBIDDEN]);
  });

  it('never exposes the prototype fictitious profiles', async () => {
    const result = await useCase.execute({ actorRole: 'OWNER' });
    const roleNames = result.instance.capabilities
      .flatMap((c) => c.permissions)
      .flatMap((p) => p.roles);
    for (const fake of ['Administrador', 'Operador', 'Cambista', 'Somente Leitura']) {
      expect(roleNames).not.toContain(fake);
    }
  });
});
