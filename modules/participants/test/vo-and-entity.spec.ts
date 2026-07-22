import { Id } from '@bancaflow/shared';
import { BettingAgent } from '../src/betting-agent/betting-agent.entity';
import { BettingAgentCode } from '../src/betting-agent/vo/betting-agent-code.vo';
import { CompensationPolicy } from '../src/betting-agent/vo/compensation-policy.vo';
import { PartyAddress } from '../src/party/party-address.entity';
import { Party } from '../src/party/party.entity';
import { PartyType } from '../src/party/vo/party-type.vo';
import { Phone } from '../src/party/vo/phone.vo';
import { PARTICIPANTS_ERRORS } from '../src/shared/errors/participants.errors';

const NOW = new Date('2026-07-21T12:00:00.000Z');

describe('BettingAgentCode', () => {
  it('preserva zeros à esquerda: "001" permanece "001"', () => {
    expect(BettingAgentCode.tryCreate('001').instance.value).toBe('001');
  });

  it('faz trim externo: "  042  " vira "042"', () => {
    expect(BettingAgentCode.tryCreate('  042  ').instance.value).toBe('042');
  });

  it('rejeita código não numérico e vazio', () => {
    for (const bad of ['A12', '12-3', '', '   ', '1.5']) {
      const result = BettingAgentCode.tryCreate(bad);
      expect(result.isFailure).toBe(true);
      expect(result.errors).toEqual([PARTICIPANTS_ERRORS.INVALID_CODE]);
    }
  });
});

describe('CompensationPolicy', () => {
  it('aceita PERCENTAGE_ON_SALES com percentual válido', () => {
    const result = CompensationPolicy.tryCreate({ type: 'PERCENTAGE_ON_SALES', percentage: 10 });
    expect(result.isFailure).toBe(false);
    expect(result.instance.value).toEqual({ type: 'PERCENTAGE_ON_SALES', percentage: 10 });
  });

  it('aceita FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES com ambos os valores', () => {
    const result = CompensationPolicy.tryCreate({
      type: 'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES',
      percentage: 5,
      weeklyFixedAmountCents: 50000,
    });
    expect(result.isFailure).toBe(false);
    expect(result.instance.value).toEqual({
      type: 'FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES',
      percentage: 5,
      weeklyFixedAmountCents: 50000,
    });
  });

  it('rejeita FIXED_PER_ENTRY', () => {
    const result = CompensationPolicy.tryCreate({ type: 'FIXED_PER_ENTRY', weeklyFixedAmountCents: 100 });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([PARTICIPANTS_ERRORS.INVALID_POLICY]);
  });

  it('rejeita valores inválidos (percentual fora da faixa, fixo negativo/não inteiro)', () => {
    expect(CompensationPolicy.tryCreate({ type: 'PERCENTAGE_ON_SALES', percentage: 0 }).isFailure).toBe(true);
    expect(CompensationPolicy.tryCreate({ type: 'PERCENTAGE_ON_SALES', percentage: 150 }).isFailure).toBe(true);
    expect(CompensationPolicy.tryCreate({ type: 'FIXED_WEEKLY', weeklyFixedAmountCents: -1 }).isFailure).toBe(true);
    expect(CompensationPolicy.tryCreate({ type: 'FIXED_WEEKLY', weeklyFixedAmountCents: 10.5 }).isFailure).toBe(true);
    expect(CompensationPolicy.tryCreate({ type: 'FIXED_WEEKLY' }).isFailure).toBe(true);
  });
});

describe('PartyType', () => {
  it('aceita PERSON e rejeita ORGANIZATION', () => {
    expect(PartyType.tryCreate('PERSON').isFailure).toBe(false);
    const org = PartyType.tryCreate('ORGANIZATION');
    expect(org.isFailure).toBe(true);
    expect(org.errors).toEqual([PARTICIPANTS_ERRORS.INVALID_PARTY_TYPE]);
  });
});

describe('Phone', () => {
  it('normaliza e valida telefone com máscara e DDI', () => {
    expect(Phone.tryCreate('(11) 99999-8888').instance.value).toBe('11999998888');
    expect(Phone.tryCreate('+55 11 3333-4444').instance.value).toBe('1133334444');
  });

  it('rejeita telefone inválido', () => {
    const result = Phone.tryCreate('123');
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([PARTICIPANTS_ERRORS.INVALID_PHONE]);
  });
});

describe('PartyAddress', () => {
  const base = { effectiveFrom: NOW };

  it('exige bairro e cidade', () => {
    expect(PartyAddress.tryCreate({ ...base, neighborhood: '', city: 'São Paulo' }).isFailure).toBe(true);
    expect(PartyAddress.tryCreate({ ...base, neighborhood: 'Centro', city: '' }).isFailure).toBe(true);
  });

  it('aceita endereço sem rua e número', () => {
    const result = PartyAddress.tryCreate({ ...base, neighborhood: 'Centro', city: 'São Paulo' });
    expect(result.isFailure).toBe(false);
    expect(result.instance.street).toBeNull();
    expect(result.instance.number).toBeNull();
    expect(result.instance.isActive).toBe(true);
  });

  it('normaliza bairro/cidade preservando exibição', () => {
    const a = PartyAddress.create({ ...base, neighborhood: 'Centro', city: 'São Paulo' });
    const b = PartyAddress.create({ ...base, neighborhood: ' centro ', city: 'sao  paulo' });
    expect(a.neighborhoodNormalized).toBe(b.neighborhoodNormalized);
    expect(a.cityNormalized).toBe(b.cityNormalized);
    expect(a.neighborhood.display).toBe('Centro');
    expect(b.neighborhood.display).toBe('centro');
    expect(a.cityNormalized).toBe('sao paulo');
  });
});

describe('Party', () => {
  const identity = () => ({ bancaId: Id.createUUID(), createdBy: Id.createUUID(), now: NOW });

  it('cria sem nome, apelido, telefone ou endereço', () => {
    const result = Party.tryCreate({ ...identity() });
    expect(result.isFailure).toBe(false);
    expect(result.instance.name).toBeNull();
    expect(result.instance.nickname).toBeNull();
    expect(result.instance.contacts).toHaveLength(0);
    expect(result.instance.address).toBeNull();
    expect(result.instance.type).toBe('PERSON');
  });

  it('aceita vários telefones', () => {
    const result = Party.tryCreate({
      ...identity(),
      contacts: [{ phone: '(11) 99999-8888' }, { phone: '11 3333-4444' }],
    });
    expect(result.isFailure).toBe(false);
    expect(result.instance.contacts).toHaveLength(2);
  });

  it('rejeita quando um telefone é inválido', () => {
    const result = Party.tryCreate({ ...identity(), contacts: [{ phone: '123' }] });
    expect(result.isFailure).toBe(true);
  });

  it('endereço inicial começa ativo e é o único ativo', () => {
    const result = Party.tryCreate({
      ...identity(),
      address: { neighborhood: 'Centro', city: 'São Paulo' },
    });
    expect(result.isFailure).toBe(false);
    expect(result.instance.address?.isActive).toBe(true);
  });
});

describe('BettingAgent.setStatus', () => {
  const buildAgent = () =>
    BettingAgent.create({
      bancaId: Id.createUUID(),
      partyId: Id.createUUID(),
      code: '001',
      policy: { type: 'PERCENTAGE_ON_SALES', percentage: 10 },
      policyEffectiveFrom: NOW,
      createdBy: Id.createUUID(),
    });

  it('inativa um Cambista ACTIVE', () => {
    const agent = buildAgent();
    const result = agent.setStatus('INACTIVE', NOW);
    expect(result.isFailure).toBe(false);
    expect(result.instance.status.value).toBe('INACTIVE');
  });

  it('preserva código e política ao trocar o status', () => {
    const agent = buildAgent();
    const result = agent.setStatus('INACTIVE', NOW);
    expect(result.instance.code.value).toBe('001');
    expect(result.instance.policy.value.type).toBe('PERCENTAGE_ON_SALES');
  });
});

describe('Party.updateProfile', () => {
  const identity = () => ({ bancaId: Id.createUUID(), createdBy: Id.createUUID(), now: NOW });
  const LATER = new Date('2026-07-22T12:00:00.000Z');

  it('edita nome/apelido; preserva o que não é informado', () => {
    const party = Party.create({ ...identity(), name: 'João', nickname: 'Jota' });
    const result = party.updateProfile({ name: 'Novo Nome', now: LATER });
    expect(result.isFailure).toBe(false);
    expect(result.instance.name).toBe('Novo Nome');
    expect(result.instance.nickname).toBe('Jota');
  });

  it('limpa o nome quando informado como string vazia', () => {
    const party = Party.create({ ...identity(), name: 'João' });
    const result = party.updateProfile({ name: '', now: LATER });
    expect(result.isFailure).toBe(false);
    expect(result.instance.name).toBeNull();
  });

  it('não toca contatos quando `contacts` é omitido', () => {
    const party = Party.create({ ...identity(), contacts: [{ phone: '(11) 90000-0001' }] });
    const result = party.updateProfile({ name: 'X', now: LATER });
    expect(result.isFailure).toBe(false);
    expect(result.instance.contacts).toHaveLength(1);
  });

  it('reconcilia contatos: preserva id/rótulo dos que persistem, remove ausentes, cria novos', () => {
    const party = Party.create({
      ...identity(),
      contacts: [
        { phone: '(11) 90000-0001', label: 'Celular' },
        { phone: '(11) 3333-4444', label: 'Casa' },
      ],
    });
    const keptId = party.contacts.find((c) => c.phoneValue === '11900000001')!.id;

    const result = party.updateProfile({
      contacts: [
        { phone: '(11) 90000-0001', label: 'Rótulo novo' },
        { phone: '(11) 98888-7777' },
      ],
      now: LATER,
    });

    expect(result.isFailure).toBe(false);
    const contacts = result.instance.contacts;
    expect(contacts).toHaveLength(2);
    const kept = contacts.find((c) => c.phoneValue === '11900000001')!;
    expect(kept.id).toBe(keptId);
    expect(kept.label).toBe('Rótulo novo');
    expect(contacts.some((c) => c.phoneValue === '1133334444')).toBe(false);
    expect(contacts.some((c) => c.phoneValue === '11988887777')).toBe(true);
  });

  it('rejeita telefone inválido na reconciliação', () => {
    const party = Party.create({ ...identity() });
    const result = party.updateProfile({ contacts: [{ phone: '123' }], now: LATER });
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([PARTICIPANTS_ERRORS.INVALID_PHONE]);
  });

  it('substitui o endereço ativo quando `address` é informado', () => {
    const party = Party.create({
      ...identity(),
      address: { neighborhood: 'Centro', city: 'São Paulo' },
    });
    const result = party.updateProfile({
      address: { neighborhood: 'Vila Nova', city: 'Campinas' },
      now: LATER,
    });
    expect(result.isFailure).toBe(false);
    expect(result.instance.address?.neighborhood.display).toBe('Vila Nova');
    expect(result.instance.address?.isActive).toBe(true);
  });

  it('remove o endereço ativo quando `address` é omitido ou nulo', () => {
    const party = Party.create({
      ...identity(),
      address: { neighborhood: 'Centro', city: 'São Paulo' },
    });
    expect(party.updateProfile({ name: 'X', now: LATER }).instance.address).toBeNull();
    expect(party.updateProfile({ address: null, now: LATER }).instance.address).toBeNull();
  });
});
