import { Id } from '@bancaflow/shared';
import { assertAdministrableTarget } from '../src/user-account/assert-administrable-target';
import { UserAccount } from '../src/user-account/user-account.entity';
import { AccountRole } from '../src/user-account/vo/account-role.vo';
import { AccountStatus } from '../src/user-account/vo/account-status.vo';

const BASE = new Date('2026-07-15T12:00:00.000Z');

function buildAccount(role: string, id?: string): UserAccount {
  return UserAccount.create({
    id: id ?? Id.createUUID(),
    bancaId: Id.createUUID(),
    username: 'joao',
    name: 'Joao Silva',
    email: null,
    role: role as never,
    status: AccountStatus.ACTIVE,
    credential: { passwordHash: 'hashed-password', passwordChangedAt: BASE, mustChangePassword: false },
    failedLoginAttempts: 0,
    failedLoginWindowStartedAt: null,
    lockedUntil: null,
  });
}

describe('assertAdministrableTarget', () => {
  it('autoriza um alvo ADMIN/USER distinto do ator', () => {
    const actorUserId = Id.createUUID();
    const target = buildAccount(AccountRole.USER);
    const result = assertAdministrableTarget(actorUserId, target);
    expect(result.isFailure).toBe(false);
  });

  it('rejeita quando o alvo é a própria conta do ator', () => {
    const actorUserId = Id.createUUID();
    const target = buildAccount(AccountRole.USER, actorUserId);
    const result = assertAdministrableTarget(actorUserId, target);
    expect(result.isFailure).toBe(true);
  });

  it('rejeita quando o alvo é OWNER', () => {
    const actorUserId = Id.createUUID();
    const target = buildAccount(AccountRole.OWNER);
    const result = assertAdministrableTarget(actorUserId, target);
    expect(result.isFailure).toBe(true);
  });

  it('rejeita quando o alvo é simultaneamente o próprio ator e OWNER', () => {
    const actorUserId = Id.createUUID();
    const target = buildAccount(AccountRole.OWNER, actorUserId);
    const result = assertAdministrableTarget(actorUserId, target);
    expect(result.isFailure).toBe(true);
  });
});
