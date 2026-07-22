import { Id } from '@bancaflow/shared';
import { CreateBettingAgentUseCase } from '../src/app/use-case/create-betting-agent.use-case';
import {
  UpdateBettingAgentProfileInput,
  UpdateBettingAgentProfileUseCase,
} from '../src/app/use-case/update-betting-agent-profile.use-case';
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
  const updateUseCase = new UpdateBettingAgentProfileUseCase(
    agents,
    parties,
    new RealPermissionChecker(),
    new FixedClock(LATER),
    tx,
  );
  return { parties, agents, createUseCase, updateUseCase };
}

async function createAgent(
  createUseCase: CreateBettingAgentUseCase,
  overrides: Record<string, unknown> = {},
) {
  const bancaId = (overrides.bancaId as string) ?? Id.createUUID();
  const result = await createUseCase.execute({
    bancaId,
    actorRole: 'OWNER',
    actorUserId: Id.createUUID(),
    code: '001',
    policy: { type: 'PERCENTAGE_ON_SALES', percentage: 10 },
    confirmPossibleDuplicate: false,
    name: 'João',
    nickname: 'Jota',
    phones: [{ phone: '(11) 90000-0001', label: 'Celular' }],
    address: { neighborhood: 'Centro', city: 'São Paulo' },
    ...overrides,
  });
  if (result.isFailure || result.instance.outcome !== 'CREATED') {
    throw new Error('setup: falha ao criar Cambista para o teste');
  }
  return { bancaId, bettingAgentId: result.instance.bettingAgentId, partyId: result.instance.partyId };
}

describe('UpdateBettingAgentProfileUseCase', () => {
  it('bloqueia USER (FORBIDDEN) e nada muda', async () => {
    const { createUseCase, updateUseCase, parties } = build();
    const { bancaId, bettingAgentId, partyId } = await createAgent(createUseCase);

    const result = await updateUseCase.execute({
      id: bettingAgentId,
      bancaId,
      actorRole: 'USER',
      name: 'Outro Nome',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([PARTICIPANTS_ERRORS.FORBIDDEN]);
    const party = (await parties.findById(partyId, bancaId)).instance;
    expect(party?.name).toBe('João');
  });

  it('autoriza OWNER/ADMIN, edita nome/apelido e preserva contatos quando `phones` é omitido', async () => {
    for (const actorRole of ['OWNER', 'ADMIN'] as const) {
      const { createUseCase, updateUseCase, parties } = build();
      const { bancaId, bettingAgentId, partyId } = await createAgent(createUseCase);

      const result = await updateUseCase.execute({
        id: bettingAgentId,
        bancaId,
        actorRole,
        name: 'Novo Nome',
      });

      expect(result.isFailure).toBe(false);
      const party = (await parties.findById(partyId, bancaId)).instance!;
      expect(party.name).toBe('Novo Nome');
      expect(party.nickname).toBe('Jota');
      expect(party.contacts).toHaveLength(1);
      // `address` omitido remove o endereço ativo (D5) — comportamento coberto
      // à parte em "remove o endereço quando omitido ou nulo".
    }
  });

  it('retorna BETTING_AGENT_NOT_FOUND para id de outra Banca (não revela existência)', async () => {
    const { createUseCase, updateUseCase } = build();
    const { bettingAgentId } = await createAgent(createUseCase);

    const result = await updateUseCase.execute({
      id: bettingAgentId,
      bancaId: Id.createUUID(),
      actorRole: 'OWNER',
      name: 'Outro',
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([PARTICIPANTS_ERRORS.BETTING_AGENT_NOT_FOUND]);
  });

  it('reconcilia contatos: mantém id ao repetir telefone normalizado, remove ausente, cria novo', async () => {
    const { createUseCase, updateUseCase, parties } = build();
    const { bancaId, bettingAgentId, partyId } = await createAgent(createUseCase, {
      phones: [
        { phone: '(11) 90000-0001', label: 'Celular' },
        { phone: '(11) 3333-4444', label: 'Casa' },
      ],
    });
    const before = (await parties.findById(partyId, bancaId)).instance!;
    const keptContactId = before.contacts.find((c) => c.phoneValue === '11900000001')!.id;

    const input: UpdateBettingAgentProfileInput = {
      id: bettingAgentId,
      bancaId,
      actorRole: 'OWNER',
      phones: [
        { phone: '(11) 90000-0001', label: 'Celular novo rótulo' }, // persiste, só rótulo muda
        { phone: '(11) 98888-7777' }, // novo
        // (11) 3333-4444 ausente => removido
      ],
    };
    const result = await updateUseCase.execute(input);
    expect(result.isFailure).toBe(false);

    const after = (await parties.findById(partyId, bancaId)).instance!;
    expect(after.contacts).toHaveLength(2);
    const kept = after.contacts.find((c) => c.phoneValue === '11900000001')!;
    expect(kept.id).toBe(keptContactId);
    expect(kept.label).toBe('Celular novo rótulo');
    expect(after.contacts.some((c) => c.phoneValue === '11988887777')).toBe(true);
    expect(after.contacts.some((c) => c.phoneValue === '1133334444')).toBe(false);
  });

  it('colapsa telefones que normalizam para o mesmo valor (último rótulo vence, sem id duplicado)', async () => {
    const { createUseCase, updateUseCase, parties } = build();
    const { bancaId, bettingAgentId, partyId } = await createAgent(createUseCase, {
      phones: [{ phone: '(11) 90000-0001', label: 'Celular' }],
    });

    const result = await updateUseCase.execute({
      id: bettingAgentId,
      bancaId,
      actorRole: 'OWNER',
      phones: [
        { phone: '(11) 90000-0001', label: 'Celular' },
        { phone: '11900000001', label: 'Mesmo número' }, // normaliza igual ao anterior
      ],
    });

    expect(result.isFailure).toBe(false);
    const after = (await parties.findById(partyId, bancaId)).instance!;
    expect(after.contacts).toHaveLength(1);
    expect(after.contacts[0].phoneValue).toBe('11900000001');
    expect(after.contacts[0].label).toBe('Mesmo número');
    // Um único id — não houve atribuição do mesmo id a duas linhas.
    expect(new Set(after.contacts.map((c) => c.id)).size).toBe(after.contacts.length);
  });

  it('rejeita telefone inválido na edição e não persiste nada', async () => {
    const { createUseCase, updateUseCase, parties } = build();
    const { bancaId, bettingAgentId, partyId } = await createAgent(createUseCase);

    const result = await updateUseCase.execute({
      id: bettingAgentId,
      bancaId,
      actorRole: 'OWNER',
      phones: [{ phone: '123' }],
    });

    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([PARTICIPANTS_ERRORS.INVALID_PHONE]);
    const party = (await parties.findById(partyId, bancaId)).instance!;
    expect(party.contacts).toHaveLength(1);
  });

  it('substitui o endereço quando informado', async () => {
    const { createUseCase, updateUseCase, parties } = build();
    const { bancaId, bettingAgentId, partyId } = await createAgent(createUseCase);

    const result = await updateUseCase.execute({
      id: bettingAgentId,
      bancaId,
      actorRole: 'OWNER',
      address: { neighborhood: 'Vila Nova', city: 'Campinas' },
    });

    expect(result.isFailure).toBe(false);
    const party = (await parties.findById(partyId, bancaId)).instance!;
    expect(party.address?.neighborhood.display).toBe('Vila Nova');
    expect(party.address?.city.display).toBe('Campinas');
  });

  it('remove o endereço quando omitido ou nulo', async () => {
    const { createUseCase, updateUseCase, parties } = build();
    const { bancaId, bettingAgentId, partyId } = await createAgent(createUseCase);

    const result = await updateUseCase.execute({
      id: bettingAgentId,
      bancaId,
      actorRole: 'OWNER',
      name: 'Só nome',
    });

    expect(result.isFailure).toBe(false);
    const party = (await parties.findById(partyId, bancaId)).instance!;
    expect(party.address).toBeNull();
  });

  it('code/política não são aceitos pelo input (imutabilidade estrutural do use case)', async () => {
    const { createUseCase, updateUseCase, agents } = build();
    const { bancaId, bettingAgentId } = await createAgent(createUseCase);

    await updateUseCase.execute({
      id: bettingAgentId,
      bancaId,
      actorRole: 'OWNER',
      name: 'Novo',
    });

    const agent = (await agents.findById(bettingAgentId, bancaId)).instance!;
    expect(agent.code.value).toBe('001');
  });

  it('falha transacional não deixa alteração parcial (rollback total)', async () => {
    const { createUseCase, updateUseCase, parties } = build();
    const { bancaId, bettingAgentId, partyId } = await createAgent(createUseCase);
    parties.failUpdate = true;

    const result = await updateUseCase.execute({
      id: bettingAgentId,
      bancaId,
      actorRole: 'OWNER',
      name: 'X',
    });

    expect(result.isFailure).toBe(true);
    parties.failUpdate = false;
    const party = (await parties.findById(partyId, bancaId)).instance!;
    expect(party.name).toBe('João');
  });
});
