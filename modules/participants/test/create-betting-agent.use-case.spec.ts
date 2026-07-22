import { Id } from '@bancaflow/shared';
import {
  CreateBettingAgentInput,
  CreateBettingAgentUseCase,
} from '../src/app/use-case/create-betting-agent.use-case';
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

function build() {
  const parties = new InMemoryPartyRepository();
  const agents = new InMemoryBettingAgentRepository();
  const duplicates = new StubPartyDuplicateQuery();
  const tx = new RollbackOnFailureTransactionManager([parties, agents]);
  const useCase = new CreateBettingAgentUseCase(
    parties,
    agents,
    duplicates,
    new RealPermissionChecker(),
    new FixedClock(NOW),
    tx,
  );
  return { parties, agents, duplicates, useCase };
}

function validInput(overrides: Partial<CreateBettingAgentInput> = {}): CreateBettingAgentInput {
  return {
    bancaId: Id.createUUID(),
    actorRole: 'OWNER',
    actorUserId: Id.createUUID(),
    code: '001',
    policy: { type: 'PERCENTAGE_ON_SALES', percentage: 10 },
    confirmPossibleDuplicate: false,
    ...overrides,
  };
}

describe('CreateBettingAgentUseCase', () => {
  it('bloqueia USER na criação (FORBIDDEN) e nada persiste', async () => {
    const { useCase, parties, agents } = build();
    const result = await useCase.execute(validInput({ actorRole: 'USER' }));
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([PARTICIPANTS_ERRORS.FORBIDDEN]);
    expect(parties.store.size).toBe(0);
    expect(agents.store.size).toBe(0);
  });

  it('autoriza OWNER e ADMIN', async () => {
    for (const actorRole of ['OWNER', 'ADMIN'] as const) {
      const { useCase } = build();
      const result = await useCase.execute(validInput({ actorRole }));
      expect(result.isFailure).toBe(false);
      expect(result.instance.outcome).toBe('CREATED');
    }
  });

  it('rejeita criação sem política válida', async () => {
    const { useCase, parties, agents } = build();
    const result = await useCase.execute(validInput({ policy: { type: 'FIXED_PER_ENTRY' } }));
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([PARTICIPANTS_ERRORS.INVALID_POLICY]);
    expect(parties.store.size).toBe(0);
    expect(agents.store.size).toBe(0);
  });

  it('alerta de possível duplicidade sem confirmação não persiste nada', async () => {
    const { useCase, parties, agents, duplicates } = build();
    duplicates.candidates = [{ bettingAgentId: Id.createUUID(), code: '007', displayName: 'João' }];

    const result = await useCase.execute(validInput({ confirmPossibleDuplicate: false, name: 'João' }));

    expect(result.isFailure).toBe(false);
    expect(result.instance.outcome).toBe('POSSIBLE_DUPLICATE');
    if (result.instance.outcome === 'POSSIBLE_DUPLICATE') {
      expect(result.instance.candidates).toHaveLength(1);
    }
    expect(parties.store.size).toBe(0);
    expect(agents.store.size).toBe(0);
  });

  it('após confirmação, o mesmo pedido prossegue e cria Party + BettingAgent', async () => {
    const { useCase, parties, agents, duplicates } = build();
    duplicates.candidates = [{ bettingAgentId: Id.createUUID(), code: '007', displayName: 'João' }];

    const result = await useCase.execute(validInput({ confirmPossibleDuplicate: true, name: 'João' }));

    expect(result.isFailure).toBe(false);
    expect(result.instance.outcome).toBe('CREATED');
    expect(parties.store.size).toBe(1);
    expect(agents.store.size).toBe(1);
  });

  it('bloqueia código duplicado na mesma Banca sem deixar Party parcial', async () => {
    const { useCase, parties, agents } = build();
    const bancaId = Id.createUUID();

    const first = await useCase.execute(validInput({ bancaId, code: '001' }));
    expect(first.isFailure).toBe(false);

    const second = await useCase.execute(validInput({ bancaId, code: '001' }));
    expect(second.isFailure).toBe(true);
    expect(second.errors).toEqual([PARTICIPANTS_ERRORS.CODE_ALREADY_EXISTS]);

    expect(parties.store.size).toBe(1);
    expect(agents.store.size).toBe(1);
  });

  it('permite o mesmo código em Bancas diferentes', async () => {
    const { useCase } = build();
    const a = await useCase.execute(validInput({ bancaId: Id.createUUID(), code: '001' }));
    const b = await useCase.execute(validInput({ bancaId: Id.createUUID(), code: '001' }));
    expect(a.isFailure).toBe(false);
    expect(b.isFailure).toBe(false);
  });

  it('falha transacional na persistência do BettingAgent reverte a Party (rollback total)', async () => {
    const { useCase, parties, agents } = build();
    agents.failSave = true;

    const result = await useCase.execute(validInput());

    expect(result.isFailure).toBe(true);
    expect(parties.store.size).toBe(0);
    expect(agents.store.size).toBe(0);
  });
});
