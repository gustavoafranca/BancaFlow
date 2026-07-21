import { GetOwnEffectivePermissionsUseCase } from '../src/use-case/get-own-effective-permissions.use-case';
import { PERMISSION_KEYS } from '../src/permission-key';

describe('GetOwnEffectivePermissionsUseCase', () => {
  const useCase = new GetOwnEffectivePermissionsUseCase();

  it('returns all keys for OWNER', async () => {
    const result = await useCase.execute({ actorRole: 'OWNER' });
    expect(result.isFailure).toBe(false);
    expect(result.instance.role).toBe('OWNER');
    expect(result.instance.permissions.map((p) => p.key).sort()).toEqual([...PERMISSION_KEYS].sort());
  });

  it('returns only self-service and betting-agent read keys for USER, never the full matrix', async () => {
    const result = await useCase.execute({ actorRole: 'USER' });
    expect(result.isFailure).toBe(false);
    const keys = result.instance.permissions.map((p) => p.key);
    expect(keys.sort()).toEqual(
      [
        'identity.profile.read-own',
        'identity.profile.update-own',
        'identity.password.change-own',
        'participants.betting-agents.list',
        'participants.betting-agents.read',
      ].sort(),
    );
    expect(keys).not.toContain('identity.accounts.toggle-status');
  });

  it('is available to any authenticated role without requiring its own permission key', async () => {
    for (const role of ['OWNER', 'ADMIN', 'USER'] as const) {
      const result = await useCase.execute({ actorRole: role });
      expect(result.isFailure).toBe(false);
    }
  });
});
