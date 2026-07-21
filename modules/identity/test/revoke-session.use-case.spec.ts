import { Id, Result } from '@bancaflow/shared';
import { RevokeSessionUseCase } from '../src/app/use-case/revoke-session.use-case';
import { Session } from '../src/session/session.entity';
import { IDENTITY_ERRORS } from '../src/shared/errors/identity.errors';
import { FixedClock, InMemorySessionRepository } from './support/fakes';

const NOW = new Date('2026-07-19T12:00:00.000Z');
const BANCA_ID = Id.createUUID();
const USER_ID = Id.createUUID();

function buildSession(overrides: { userId?: string; bancaId?: string; revokedAt?: Date | null } = {}): Session {
  return Session.create({
    id: Id.createUUID(),
    userId: overrides.userId ?? USER_ID,
    bancaId: overrides.bancaId ?? BANCA_ID,
    refreshTokenDigest: `digest-${Id.createUUID()}`,
    expiresAt: new Date(NOW.getTime() + 60_000),
    revokedAt: overrides.revokedAt ?? null,
  });
}

describe('RevokeSessionUseCase', () => {
  it('revoga a sessão do próprio ator com sucesso', async () => {
    const session = buildSession();
    const repo = new InMemorySessionRepository();
    repo.store.set(session.id, session);
    const useCase = new RevokeSessionUseCase(repo, new FixedClock(NOW));

    const result = await useCase.execute({ bancaId: BANCA_ID, userId: USER_ID, sessionId: session.id });

    expect(result.isOk).toBe(true);
    expect(result.instance.sessionId).toBe(session.id);
    expect(repo.store.get(session.id)!.isRevoked()).toBe(true);
  });

  it('é idempotente ao revogar uma sessão já revogada', async () => {
    const session = buildSession({ revokedAt: NOW });
    const repo = new InMemorySessionRepository();
    repo.store.set(session.id, session);
    const useCase = new RevokeSessionUseCase(repo, new FixedClock(NOW));

    const result = await useCase.execute({ bancaId: BANCA_ID, userId: USER_ID, sessionId: session.id });

    expect(result.isOk).toBe(true);
  });

  it('retorna TARGET_SESSION_NOT_FOUND (não SESSION_NOT_FOUND) quando a sessão pertence a outro usuário', async () => {
    const session = buildSession({ userId: Id.createUUID() });
    const repo = new InMemorySessionRepository();
    repo.store.set(session.id, session);
    const useCase = new RevokeSessionUseCase(repo, new FixedClock(NOW));

    const result = await useCase.execute({ bancaId: BANCA_ID, userId: USER_ID, sessionId: session.id });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.TARGET_SESSION_NOT_FOUND);
    expect(result.errors).not.toContain(IDENTITY_ERRORS.SESSION_NOT_FOUND);
  });

  it('retorna TARGET_SESSION_NOT_FOUND quando a sessão não existe na banca (findById filtra por bancaId)', async () => {
    const repo = new InMemorySessionRepository();
    const useCase = new RevokeSessionUseCase(repo, new FixedClock(NOW));

    const result = await useCase.execute({ bancaId: BANCA_ID, userId: USER_ID, sessionId: Id.createUUID() });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toContain(IDENTITY_ERRORS.TARGET_SESSION_NOT_FOUND);
  });

  it('propaga falha técnica ao buscar a sessão', async () => {
    const repo = new InMemorySessionRepository();
    repo.findById = async () => Result.fail('SESSION_FIND_ERROR');
    const useCase = new RevokeSessionUseCase(repo, new FixedClock(NOW));

    const result = await useCase.execute({ bancaId: BANCA_ID, userId: USER_ID, sessionId: Id.createUUID() });

    expect(result.isFailure).toBe(true);
  });
});
