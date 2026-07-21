import { Id } from '@bancaflow/shared';
import { Session, SessionProps } from '../src/session/session.entity';

const NOW = new Date('2026-07-15T12:00:00.000Z');

function buildSession(overrides: Partial<SessionProps> = {}): Session {
  return Session.create({
    id: Id.createUUID(),
    userId: Id.createUUID(),
    bancaId: Id.createUUID(),
    refreshTokenDigest: 'digest-1',
    expiresAt: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    deviceInfo: 'jest',
    ...overrides,
  });
}

describe('Session', () => {
  it('isExpired reflete a expiração', () => {
    const session = buildSession({ expiresAt: new Date(NOW.getTime() - 1) });
    expect(session.isExpired(NOW)).toBe(true);
    const alive = buildSession({ expiresAt: new Date(NOW.getTime() + 1000) });
    expect(alive.isExpired(NOW)).toBe(false);
  });

  it('isRevoked reflete revogação', () => {
    expect(buildSession().isRevoked()).toBe(false);
    expect(buildSession({ revokedAt: NOW }).isRevoked()).toBe(true);
  });

  it('expõe userId e bancaId', () => {
    const userId = Id.createUUID();
    const bancaId = Id.createUUID();
    const session = buildSession({ userId, bancaId });
    expect(session.userId).toBe(userId);
    expect(session.bancaId).toBe(bancaId);
  });

  it('revoke gera nova instância revogada', () => {
    const session = buildSession();
    const result = session.revoke(NOW);
    expect(result.isOk).toBe(true);
    expect(result.instance.revokedAt?.getTime()).toBe(NOW.getTime());
    expect(session.isRevoked()).toBe(false); // imutável
  });

  it('revoke em sessão já revogada falha', () => {
    const session = buildSession({ revokedAt: NOW });
    expect(session.revoke(NOW).isFailure).toBe(true);
  });

  it('rotate troca digest e expiração', () => {
    const session = buildSession();
    const newExpiry = new Date(NOW.getTime() + 1000);
    const result = session.rotate('digest-2', newExpiry, NOW);
    expect(result.isOk).toBe(true);
    expect(result.instance.refreshTokenDigest).toBe('digest-2');
    expect(result.instance.expiresAt.getTime()).toBe(newExpiry.getTime());
    expect(session.refreshTokenDigest).toBe('digest-1'); // imutável
  });

  it('rotate em sessão revogada falha', () => {
    const session = buildSession({ revokedAt: NOW });
    const newExpiry = new Date(NOW.getTime() + 1000);
    expect(session.rotate('digest-2', newExpiry, NOW).isFailure).toBe(true);
  });

  it('rotate com digest vazio falha com SESSION_NOT_FOUND', () => {
    const session = buildSession();
    const newExpiry = new Date(NOW.getTime() + 1000);
    const result = session.rotate('   ', newExpiry, NOW);
    expect(result.isFailure).toBe(true);
  });

  it('rotate com digest indefinido (não apenas vazio) também falha', () => {
    const session = buildSession();
    const newExpiry = new Date(NOW.getTime() + 1000);
    const result = session.rotate(undefined as unknown as string, newExpiry, NOW);
    expect(result.isFailure).toBe(true);
  });

  it('rotate rejeita newExpiresAt no passado em relação a `now` (now controlado, nunca new Date() do sistema)', () => {
    const session = buildSession();
    const now = new Date('2026-07-15T12:00:00.000Z');
    const pastExpiry = new Date(now.getTime() - 1000);
    const result = session.rotate('digest-2', pastExpiry, now);
    expect(result.isFailure).toBe(true);
    expect(session.refreshTokenDigest).toBe('digest-1'); // imutável
  });

  it('rotate rejeita newExpiresAt igual a `now` (referência é sempre now, nunca a expiresAt atual)', () => {
    const session = buildSession();
    const now = new Date('2026-07-15T12:00:00.000Z');
    const result = session.rotate('digest-2', now, now);
    expect(result.isFailure).toBe(true);
  });

  it('isActive reflete revogação e expiração', () => {
    const active = buildSession();
    expect(active.isActive(NOW)).toBe(true);

    const revoked = buildSession({ revokedAt: NOW });
    expect(revoked.isActive(NOW)).toBe(false);

    const expired = buildSession({ expiresAt: new Date(NOW.getTime() - 1) });
    expect(expired.isActive(NOW)).toBe(false);
  });

  it('deviceInfo retorna null quando ausente e o valor quando presente', () => {
    const withoutDevice = buildSession({ deviceInfo: null });
    expect(withoutDevice.deviceInfo).toBeNull();

    const withDevice = buildSession({ deviceInfo: 'chrome-mobile' });
    expect(withDevice.deviceInfo).toBe('chrome-mobile');
  });

  it('revokedAt retorna null quando a sessão nunca foi revogada', () => {
    const session = buildSession({ revokedAt: null });
    expect(session.revokedAt).toBeNull();
  });

  describe('tryCreate — validações', () => {
    it('rejeita id, userId ou bancaId inválidos', () => {
      const result = Session.tryCreate({
        id: 'not-a-uuid',
        userId: Id.createUUID(),
        bancaId: Id.createUUID(),
        refreshTokenDigest: 'digest-1',
        expiresAt: new Date(NOW.getTime() + 1000),
      });
      expect(result.isFailure).toBe(true);
    });

    it('rejeita refreshTokenDigest vazio', () => {
      const result = Session.tryCreate({
        id: Id.createUUID(),
        userId: Id.createUUID(),
        bancaId: Id.createUUID(),
        refreshTokenDigest: '   ',
        expiresAt: new Date(NOW.getTime() + 1000),
      });
      expect(result.isFailure).toBe(true);
    });

    it('rejeita refreshTokenDigest indefinido (não apenas vazio)', () => {
      const result = Session.tryCreate({
        id: Id.createUUID(),
        userId: Id.createUUID(),
        bancaId: Id.createUUID(),
        expiresAt: new Date(NOW.getTime() + 1000),
      } as never);
      expect(result.isFailure).toBe(true);
    });

    it('rejeita expiresAt inválido', () => {
      const result = Session.tryCreate({
        id: Id.createUUID(),
        userId: Id.createUUID(),
        bancaId: Id.createUUID(),
        refreshTokenDigest: 'digest-1',
        expiresAt: new Date(NaN),
      });
      expect(result.isFailure).toBe(true);
    });

    it('rejeita quando expiresAt não é uma instância de Date', () => {
      const result = Session.tryCreate({
        id: Id.createUUID(),
        userId: Id.createUUID(),
        bancaId: Id.createUUID(),
        refreshTokenDigest: 'digest-1',
        expiresAt: '2026-07-15T12:00:00.000Z' as unknown as Date,
      });
      expect(result.isFailure).toBe(true);
    });
  });
});
