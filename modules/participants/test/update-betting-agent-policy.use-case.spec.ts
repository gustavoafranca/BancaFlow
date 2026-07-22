import { Id } from '@bancaflow/shared';
import { CreateBettingAgentUseCase } from '../src/app/use-case/create-betting-agent.use-case';
import { UpdateBettingAgentPolicyUseCase } from '../src/betting-agent/use-case/update-betting-agent-policy.use-case';
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
  const policyUseCase = new UpdateBettingAgentPolicyUseCase(
    agents,
    new RealPermissionChecker(),
    new FixedClock(LATER),
    tx,
  );
  return { agents, createUseCase, policyUseCase };
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

describe('UpdateBettingAgentPolicyUseCase', () => {
  it('bloqueia USER (FORBIDDEN)', async () => {
    const { createUseCase, policyUseCase } = build();
    const { bancaId, bettingAgentId } = await createAgent(createUseCase);

    const result = await policyUseCase.execute({
      id: bettingAgentId,
      bancaId,
      actorRole: 'USER',
      policy: { type: 'FIXED_WEEKLY', weeklyFixedAmountCents: 50000 },
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([PARTICIPANTS_ERRORS.FORBIDDEN]);
  });

  it('OWNER/ADMIN alteram a política vigente', async () => {
    for (const actorRole of ['OWNER', 'ADMIN'] as const) {
      const { createUseCase, policyUseCase, agents } = build();
      const { bancaId, bettingAgentId } = await createAgent(createUseCase);

      const result = await policyUseCase.execute({
        id: bettingAgentId,
        bancaId,
        actorRole,
        policy: { type: 'FIXED_WEEKLY', weeklyFixedAmountCents: 50000 },
      });

      expect(result.isFailure).toBe(false);
      expect(result.instance.policy).toEqual({
        type: 'FIXED_WEEKLY',
        weeklyFixedAmountCents: 50000,
      });
      const agent = (await agents.findById(bettingAgentId, bancaId)).instance!;
      expect(agent.policy.value).toEqual({ type: 'FIXED_WEEKLY', weeklyFixedAmountCents: 50000 });
    }
  });

  it('a nova vigência começa em `now` e fica aberta', async () => {
    const { createUseCase, policyUseCase, agents } = build();
    const { bancaId, bettingAgentId } = await createAgent(createUseCase);

    await policyUseCase.execute({
      id: bettingAgentId,
      bancaId,
      actorRole: 'OWNER',
      policy: { type: 'FIXED_WEEKLY', weeklyFixedAmountCents: 50000 },
    });

    const agent = (await agents.findById(bettingAgentId, bancaId)).instance!;
    expect(agent.policyPeriod.effectiveFrom).toEqual(LATER);
    expect(agent.policyPeriod.effectiveTo).toBeNull();
  });

  it('rejeita FIXED_PER_ENTRY e mantém a política anterior', async () => {
    const { createUseCase, policyUseCase, agents } = build();
    const { bancaId, bettingAgentId } = await createAgent(createUseCase);

    const result = await policyUseCase.execute({
      id: bettingAgentId,
      bancaId,
      actorRole: 'OWNER',
      policy: { type: 'FIXED_PER_ENTRY' },
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([PARTICIPANTS_ERRORS.INVALID_POLICY]);
    const agent = (await agents.findById(bettingAgentId, bancaId)).instance!;
    expect(agent.policy.value.type).toBe('PERCENTAGE_ON_SALES');
  });

  it('rejeita valores inválidos (percentual fora da faixa) e mantém a política anterior', async () => {
    const { createUseCase, policyUseCase, agents } = build();
    const { bancaId, bettingAgentId } = await createAgent(createUseCase);

    const result = await policyUseCase.execute({
      id: bettingAgentId,
      bancaId,
      actorRole: 'OWNER',
      policy: { type: 'PERCENTAGE_ON_SALES', percentage: -5 },
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([PARTICIPANTS_ERRORS.INVALID_POLICY]);
    const agent = (await agents.findById(bettingAgentId, bancaId)).instance!;
    expect(agent.policy.value).toEqual({ type: 'PERCENTAGE_ON_SALES', percentage: 10 });
  });

  it('retorna BETTING_AGENT_NOT_FOUND para Cambista de outra Banca (tenant-scoped)', async () => {
    const { createUseCase, policyUseCase } = build();
    const { bettingAgentId } = await createAgent(createUseCase);

    const result = await policyUseCase.execute({
      id: bettingAgentId,
      bancaId: Id.createUUID(),
      actorRole: 'OWNER',
      policy: { type: 'FIXED_WEEKLY', weeklyFixedAmountCents: 50000 },
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([PARTICIPANTS_ERRORS.BETTING_AGENT_NOT_FOUND]);
  });

  it('falha transacional não altera a política (rollback total)', async () => {
    const { createUseCase, policyUseCase, agents } = build();
    const { bancaId, bettingAgentId } = await createAgent(createUseCase);
    agents.failUpdatePolicy = true;

    const result = await policyUseCase.execute({
      id: bettingAgentId,
      bancaId,
      actorRole: 'OWNER',
      policy: { type: 'FIXED_WEEKLY', weeklyFixedAmountCents: 50000 },
    });

    expect(result.isFailure).toBe(true);
    agents.failUpdatePolicy = false;
    const agent = (await agents.findById(bettingAgentId, bancaId)).instance!;
    expect(agent.policy.value.type).toBe('PERCENTAGE_ON_SALES');
  });
});
