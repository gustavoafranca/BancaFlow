import { hasPermission } from '../src/has-permission';
import { PERMISSION_KEYS } from '../src/permission-key';
import { parsePermissionKey } from '../src/permission-key';
import { ACCESS_CONTROL_ERRORS } from '../src/errors/access-control.errors';

describe('hasPermission', () => {
  it('authorizes OWNER for every permission key in the catalog', () => {
    for (const key of PERMISSION_KEYS) {
      expect(hasPermission('OWNER', key)).toBe(true);
    }
  });

  it('authorizes ADMIN for self-service and participant-catalog permission keys', () => {
    const authorized = [
      'identity.profile.read-own',
      'identity.profile.update-own',
      'identity.password.change-own',
      'participants.betting-agents.create',
      'participants.betting-agents.update',
      'participants.betting-agents.list',
      'participants.betting-agents.read',
    ] as const;
    for (const key of authorized) {
      expect(hasPermission('ADMIN', key)).toBe(true);
    }
  });

  it('denies ADMIN for all account-administration and matrix-read permission keys', () => {
    const deniedForAdmin = [
      'identity.accounts.list',
      'identity.accounts.read',
      'identity.accounts.create',
      'identity.accounts.update',
      'identity.accounts.change-role',
      'identity.accounts.toggle-status',
      'identity.accounts.reset-password',
      'identity.accounts.sessions.read',
      'identity.accounts.sessions.revoke',
      'access-control.role-permissions.read',
    ] as const;
    for (const key of deniedForAdmin) {
      expect(hasPermission('ADMIN', key)).toBe(false);
    }
  });

  it('denies USER for account-administration, matrix-read, and betting-agent-create/update permission keys', () => {
    const deniedForUser = [
      'identity.accounts.list',
      'identity.accounts.read',
      'identity.accounts.create',
      'identity.accounts.update',
      'identity.accounts.change-role',
      'identity.accounts.toggle-status',
      'identity.accounts.reset-password',
      'identity.accounts.sessions.read',
      'identity.accounts.sessions.revoke',
      'participants.betting-agents.create',
      'participants.betting-agents.update',
      'access-control.role-permissions.read',
    ] as const;
    for (const key of deniedForUser) {
      expect(hasPermission('USER', key)).toBe(false);
    }
  });

  it('authorizes USER for self-service and betting-agent read permission keys', () => {
    const selfService = [
      'identity.profile.read-own',
      'identity.profile.update-own',
      'identity.password.change-own',
      'participants.betting-agents.list',
      'participants.betting-agents.read',
    ] as const;
    for (const key of selfService) {
      expect(hasPermission('USER', key)).toBe(true);
    }
  });

  it('never throws for a typed permission key', () => {
    for (const role of ['OWNER', 'ADMIN', 'USER'] as const) {
      for (const key of PERMISSION_KEYS) {
        expect(() => hasPermission(role, key)).not.toThrow();
      }
    }
  });

  it('produces the same result across different Bancas for the same role', () => {
    const first = hasPermission('ADMIN', 'identity.accounts.toggle-status');
    const second = hasPermission('ADMIN', 'identity.accounts.toggle-status');
    expect(first).toBe(second);
  });
});

describe('parsePermissionKey', () => {
  it('recognizes a known permission key', () => {
    const result = parsePermissionKey('identity.accounts.toggle-status');
    expect(result.isFailure).toBe(false);
    expect(result.instance).toBe('identity.accounts.toggle-status');
  });

  it('fails with a configuration error for an unknown value', () => {
    const result = parsePermissionKey('identity.accounts.does-not-exist');
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([ACCESS_CONTROL_ERRORS.UNKNOWN_PERMISSION_KEY]);
  });

  it('fails for non-string values', () => {
    const result = parsePermissionKey(42);
    expect(result.isFailure).toBe(true);
  });
});
