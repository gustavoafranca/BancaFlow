import { Id, Result } from '@bancaflow/shared';
import { ListSessionsUseCase } from '../src/app/use-case/list-sessions.use-case';
import { Session } from '../src/session/session.entity';
import { InMemorySessionRepository } from './support/fakes';

const BANCA_ID = Id.createUUID();
const USER_ID = Id.createUUID();

// `InMemorySessionRepository.findActiveByUser` filtra por `now = new Date()`
// (tempo real de execução) — `expiresAt` precisa ficar no futuro em relação
// ao momento em que o teste roda, não a um instante fixo do passado.
function futureDate(msFromNow: number): Date {
  return new Date(Date.now() + msFromNow);
}

function buildSession(overrides: { deviceInfo?: string | null; expiresAt?: Date } = {}): Session {
  return Session.create({
    id: Id.createUUID(),
    userId: USER_ID,
    bancaId: BANCA_ID,
    refreshTokenDigest: `digest-${Id.createUUID()}`,
    expiresAt: overrides.expiresAt ?? futureDate(60_000),
    revokedAt: null,
    deviceInfo: overrides.deviceInfo ?? 'Mozilla/5.0 (Windows NT 10.0)',
  });
}

describe('ListSessionsUseCase', () => {
  it('marca a sessão atual entre múltiplas sessões ativas', async () => {
    const current = buildSession();
    const other = buildSession();
    const repo = new InMemorySessionRepository();
    repo.store.set(current.id, current);
    repo.store.set(other.id, other);
    const useCase = new ListSessionsUseCase(repo);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: USER_ID,
      currentSessionId: current.id,
    });

    expect(result.isOk).toBe(true);
    const list = result.instance;
    expect(list).toHaveLength(2);
    const currentEntry = list.find((s) => s.sessionId === current.id)!;
    const otherEntry = list.find((s) => s.sessionId === other.id)!;
    expect(currentEntry.isCurrent).toBe(true);
    expect(otherEntry.isCurrent).toBe(false);
  });

  it('nenhuma sessão é marcada como atual quando currentSessionId não corresponde a nenhuma ativa', async () => {
    const session = buildSession();
    const repo = new InMemorySessionRepository();
    repo.store.set(session.id, session);
    const useCase = new ListSessionsUseCase(repo);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: USER_ID,
      currentSessionId: Id.createUUID(),
    });

    expect(result.isOk).toBe(true);
    expect(result.instance.every((s) => s.isCurrent === false)).toBe(true);
  });

  it('expiresAt reflete o valor persistido da sessão', async () => {
    const expiresAt = futureDate(7 * 24 * 60 * 60 * 1000);
    const session = buildSession({ expiresAt });
    const repo = new InMemorySessionRepository();
    repo.store.set(session.id, session);
    const useCase = new ListSessionsUseCase(repo);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: USER_ID,
      currentSessionId: session.id,
    });

    expect(result.instance[0]!.expiresAt.getTime()).toBe(expiresAt.getTime());
  });

  it('não expõe nenhum campo além do contrato (sem IP/localização/atividade)', async () => {
    const session = buildSession();
    const repo = new InMemorySessionRepository();
    repo.store.set(session.id, session);
    const useCase = new ListSessionsUseCase(repo);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: USER_ID,
      currentSessionId: session.id,
    });

    expect(Object.keys(result.instance[0]!).sort()).toEqual(
      ['sessionId', 'createdAt', 'expiresAt', 'isCurrent', 'deviceInfo'].sort(),
    );
  });

  it('propaga falha ao buscar sessões ativas', async () => {
    const repo = new InMemorySessionRepository();
    repo.findActiveByUser = async () => Result.fail('SESSION_FIND_ERROR');
    const useCase = new ListSessionsUseCase(repo);

    const result = await useCase.execute({
      bancaId: BANCA_ID,
      userId: USER_ID,
      currentSessionId: Id.createUUID(),
    });

    expect(result.isFailure).toBe(true);
  });
});
