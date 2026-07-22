import { Id } from '@bancaflow/shared';
import { CreateBettingAgentUseCase } from '../src/app/use-case/create-betting-agent.use-case';
import { SetBettingAgentStatusUseCase } from '../src/betting-agent/use-case/set-betting-agent-status.use-case';
import { PARTICIPANTS_ERRORS } from '../src/shared/errors/participants.errors';
import {
  FixedClock,
  InMemoryBettingAgentRepository,
  InMemoryPartyRepository,
  RealPermissionChecker,
  RollbackOnFailureTransactionManager,
  StubPartyDuplicateQuery,
} from './support/fakes';

const NOW = new Date('2026-07-21T12:00:00.000Z');
const LATER = new Date('2026-07-22T12:00:00.000Z');

function build() {
  const parties = new InMemoryPartyRepository();
  const agents = new InMemoryBettingAgentRepository();
  const duplicates = new StubPartyDuplicateQuery();
  const tx = new RollbackOnFailureTransactionManager([parties, agents]);
  const createUseCase = new CreateBettingAgentUseCase(
    parties,
    agents,
    duplicates,
    new RealPermissionChecker(),
    new FixedClock(NOW),
    tx,
  );
  const statusUseCase = new SetBettingAgentStatusUseCase(
    agents,
    new RealPermissionChecker(),
    new FixedClock(LATER),
    tx,
  );
  return { agents, createUseCase, statusUseCase };
}

async function createAgent(createUseCase: CreateBettingAgentUseCase) {
  const bancaId = Id.createUUID();
  const result = await createUseCase.execute({
    bancaId,
    actorRole: 'OWNER',
    actorUserId: Id.createUUID(),
    code: '001',
    policy: { type: 'PERCENTAGE_ON_SALES', percentage: 10 },
    confirmPossibleDuplicate: false,
  });
  if (result.isFailure || result.instance.outcome !== 'CREATED') {
    throw new Error('setup: falha ao criar Cambista para o teste');
  }
  return { bancaId, bettingAgentId: result.instance.bettingAgentId };
}

describe('SetBettingAgentStatusUseCase', () => {
  it('bloqueia USER (FORBIDDEN)', async () => {
    const { createUseCase, statusUseCase } = build();
    const { bancaId, bettingAgentId } = await createAgent(createUseCase);

    const result = await statusUseCase.execute({
      id: bettingAgentId,
      bancaId,
      actorRole: 'USER',
      status: 'INACTIVE',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([PARTICIPANTS_ERRORS.FORBIDDEN]);
  });

  it('OWNER/ADMIN inativam um Cambista ACTIVE', async () => {
    for (const actorRole of ['OWNER', 'ADMIN'] as const) {
      const { createUseCase, statusUseCase, agents } = build();
      const { bancaId, bettingAgentId } = await createAgent(createUseCase);

      const result = await statusUseCase.execute({
        id: bettingAgentId,
        bancaId,
        actorRole,
        status: 'INACTIVE',
      });

      expect(result.isFailure).toBe(false);
      expect(result.instance.status).toBe('INACTIVE');
      const agent = (await agents.findById(bettingAgentId, bancaId)).instance!;
      expect(agent.status.value).toBe('INACTIVE');
    }
  });

  it('reativa um Cambista INACTIVE', async () => {
    const { createUseCase, statusUseCase, agents } = build();
    const { bancaId, bettingAgentId } = await createAgent(createUseCase);
    await statusUseCase.execute({ id: bettingAgentId, bancaId, actorRole: 'OWNER', status: 'INACTIVE' });

    const result = await statusUseCase.execute({
      id: bettingAgentId,
      bancaId,
      actorRole: 'OWNER',
      status: 'ACTIVE',
    });

    expect(result.isFailure).toBe(false);
    const agent = (await agents.findById(bettingAgentId, bancaId)).instance!;
    expect(agent.status.value).toBe('ACTIVE');
  });

  it('repetir a mesma transição é idempotente e não falha', async () => {
    const { createUseCase, statusUseCase } = build();
    const { bancaId, bettingAgentId } = await createAgent(createUseCase);
    await statusUseCase.execute({ id: bettingAgentId, bancaId, actorRole: 'OWNER', status: 'INACTIVE' });

    const result = await statusUseCase.execute({
      id: bettingAgentId,
      bancaId,
      actorRole: 'OWNER',
      status: 'INACTIVE',
    });

    expect(result.isFailure).toBe(false);
    expect(result.instance.status).toBe('INACTIVE');
  });

  it('preserva dados cadastrais e código ao inativar', async () => {
    const { createUseCase, statusUseCase, agents } = build();
    const { bancaId, bettingAgentId } = await createAgent(createUseCase);

    await statusUseCase.execute({ id: bettingAgentId, bancaId, actorRole: 'OWNER', status: 'INACTIVE' });

    const agent = (await agents.findById(bettingAgentId, bancaId)).instance!;
    expect(agent.code.value).toBe('001');
    expect(agent.policy.value.type).toBe('PERCENTAGE_ON_SALES');
  });

  it('retorna BETTING_AGENT_NOT_FOUND para Cambista de outra Banca (tenant-scoped)', async () => {
    const { createUseCase, statusUseCase } = build();
    const { bettingAgentId } = await createAgent(createUseCase);

    const result = await statusUseCase.execute({
      id: bettingAgentId,
      bancaId: Id.createUUID(),
      actorRole: 'OWNER',
      status: 'INACTIVE',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([PARTICIPANTS_ERRORS.BETTING_AGENT_NOT_FOUND]);
  });

  it('falha transacional não altera o status (rollback total)', async () => {
    const { createUseCase, statusUseCase, agents } = build();
    const { bancaId, bettingAgentId } = await createAgent(createUseCase);
    agents.failUpdateStatus = true;

    const result = await statusUseCase.execute({
      id: bettingAgentId,
      bancaId,
      actorRole: 'OWNER',
      status: 'INACTIVE',
    });

    expect(result.isFailure).toBe(true);
    agents.failUpdateStatus = false;
    const agent = (await agents.findById(bettingAgentId, bancaId)).instance!;
    expect(agent.status.value).toBe('ACTIVE');
  });
});
