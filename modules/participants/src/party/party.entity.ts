import { Entity, EntityProps, Id, Result } from '@bancaflow/shared';
import { PartyAddress } from './party-address.entity';
import { PartyContact } from './party-contact.entity';
import { PartyType, PartyTypeValue } from './vo/party-type.vo';
import { Phone } from './vo/phone.vo';

export interface PartyContactInput {
  phone: string;
  label?: string | null;
}

export interface PartyAddressInput {
  street?: string | null;
  number?: string | null;
  neighborhood: string;
  city: string;
}

export interface CreatePartyInput extends EntityProps {
  bancaId: string;
  type?: string; // somente 'PERSON' neste incremento (D29)
  name?: string | null;
  nickname?: string | null;
  contacts?: PartyContactInput[];
  address?: PartyAddressInput | null;
  createdBy: string;
  /** Data de criação/início da vigência do endereço inicial (via `Clock`). */
  now: Date;
}

/** Reconstrução a partir do banco: entidades filhas já existentes, com id/timestamps preservados. */
export interface ReconstitutePartyInput extends EntityProps {
  bancaId: string;
  type?: string;
  name?: string | null;
  nickname?: string | null;
  contacts: PartyContact[];
  address: PartyAddress | null;
  createdBy: string;
}

export interface UpdatePartyProfileInput {
  name?: string | null;
  nickname?: string | null;
  /** Estado final desejado dos telefones (D5). Omitido (`undefined`) preserva os contatos atuais. */
  contacts?: PartyContactInput[];
  /**
   * Endereço desejado (D5). Presente e válido → substitui o endereço ativo.
   * Ausente (`undefined`) OU `null` → remove o endereço ativo (sem "manter
   * como está" para este campo — é o único jeito de expressar remoção num
   * payload de estado final único).
   */
  address?: PartyAddressInput | null;
  now: Date;
}

interface PartyProps extends EntityProps {
  bancaId: string;
  type: PartyTypeValue;
  name: string | null;
  nickname: string | null;
  contacts: PartyContact[];
  address: PartyAddress | null;
  createdBy: string;
}

/**
 * Agregado de identidade cadastral (pessoa natural). Pode existir sem nome/
 * apelido/telefone/endereço — o identificador operacional obrigatório vive no
 * `BettingAgent`. As entidades filhas (`PartyContact`, `PartyAddress`) são
 * construídas e mantidas exclusivamente aqui. Nunca é reconstruída a partir do
 * banco (o repositório só expõe `save`), portanto não há `rebuild` público.
 */
export class Party extends Entity<Party, PartyProps> {
  private constructor(props: PartyProps) {
    super(props);
  }

  get bancaId(): string {
    return this.props.bancaId;
  }

  get type(): PartyTypeValue {
    return this.props.type;
  }

  get name(): string | null {
    return this.props.name;
  }

  get nickname(): string | null {
    return this.props.nickname;
  }

  get contacts(): PartyContact[] {
    return [...this.props.contacts];
  }

  get address(): PartyAddress | null {
    return this.props.address;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  static create(input: CreatePartyInput): Party {
    const result = Party.tryCreate(input);
    result.validator.throwsIfFailed();
    return result.instance;
  }

  static tryCreate(input: CreatePartyInput): Result<Party> {
    const id = Id.tryCreate(input.id);
    const bancaId = Id.tryCreate(input.bancaId);
    const createdBy = Id.tryCreate(input.createdBy);
    const type = PartyType.tryCreate(input.type ?? PartyType.PERSON);

    const baseAttrs = Result.combine([id, bancaId, createdBy, type]);
    if (baseAttrs.isFailure) {
      return Result.fail(baseAttrs.errors!);
    }

    const contactResults = (input.contacts ?? []).map((c) =>
      PartyContact.tryCreate({ phone: c.phone, label: c.label ?? null }),
    );
    const contactsCombined = Result.combine(contactResults);
    if (contactsCombined.isFailure) {
      return Result.fail(contactsCombined.errors!);
    }

    let address: PartyAddress | null = null;
    if (input.address) {
      const addressResult = PartyAddress.tryCreate({
        street: input.address.street ?? null,
        number: input.address.number ?? null,
        neighborhood: input.address.neighborhood,
        city: input.address.city,
        effectiveFrom: input.now,
        effectiveTo: null,
      });
      if (addressResult.isFailure) {
        return Result.fail(addressResult.errors!);
      }
      address = addressResult.instance;
    }

    const name = input.name?.trim() ? input.name.trim() : null;
    const nickname = input.nickname?.trim() ? input.nickname.trim() : null;

    return Result.ok(
      new Party({
        id: id.instance.value,
        bancaId: bancaId.instance.value,
        type: type.instance.value,
        name,
        nickname,
        contacts: contactsCombined.instance,
        address,
        createdBy: createdBy.instance.value,
        createdAt: input.now,
        updatedAt: input.now,
      }),
    );
  }

  /** Reconstrói a partir do banco, preservando entidades filhas já existentes (id/timestamps). */
  static reconstitute(input: ReconstitutePartyInput): Result<Party> {
    const id = Id.tryCreate(input.id);
    const bancaId = Id.tryCreate(input.bancaId);
    const createdBy = Id.tryCreate(input.createdBy);
    const type = PartyType.tryCreate(input.type ?? PartyType.PERSON);

    const attrs = Result.combine([id, bancaId, createdBy, type]);
    if (attrs.isFailure) {
      return Result.fail(attrs.errors!);
    }

    return Result.ok(
      new Party({
        id: id.instance.value,
        bancaId: bancaId.instance.value,
        type: type.instance.value,
        name: input.name ?? null,
        nickname: input.nickname ?? null,
        contacts: input.contacts,
        address: input.address,
        createdBy: createdBy.instance.value,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
      }),
    );
  }

  /**
   * Edita nome/apelido/contatos/endereço (D4/D5). `name`/`nickname` só mudam
   * quando a chave é informada (`!== undefined`); `contacts` só é reconciliado
   * quando informado (a lista informada é o estado final: ausentes são
   * removidos, telefones já existentes têm só o rótulo atualizado, novos são
   * criados). `address` segue a regra própria de `UpdatePartyProfileInput`.
   */
  updateProfile(input: UpdatePartyProfileInput): Result<Party> {
    const name =
      input.name !== undefined ? (input.name?.trim() ? input.name.trim() : null) : this.props.name;
    const nickname =
      input.nickname !== undefined
        ? input.nickname?.trim()
          ? input.nickname.trim()
          : null
        : this.props.nickname;

    let contacts = this.props.contacts;
    if (input.contacts !== undefined) {
      const reconciled = Party.reconcileContacts(this.props.contacts, input.contacts);
      if (reconciled.isFailure) {
        return Result.fail(reconciled.errors!);
      }
      contacts = reconciled.instance;
    }

    let address: PartyAddress | null = null;
    if (input.address) {
      const addressResult = PartyAddress.tryCreate({
        street: input.address.street ?? null,
        number: input.address.number ?? null,
        neighborhood: input.address.neighborhood,
        city: input.address.city,
        effectiveFrom: input.now,
        effectiveTo: null,
      });
      if (addressResult.isFailure) {
        return Result.fail(addressResult.errors!);
      }
      address = addressResult.instance;
    }

    return Result.ok(
      new Party({
        ...this.props,
        name,
        nickname,
        contacts,
        address,
        updatedAt: input.now,
      }),
    );
  }

  /**
   * Casa cada telefone desejado com um contato existente pelo VALOR
   * NORMALIZADO (nunca a string bruta) para preservar `id`/metadados de
   * auditoria quando o telefone persiste — só o rótulo muda nesse caso
   * (Risco documentado em `design.md`). Contatos existentes ausentes da lista
   * desejada são descartados aqui; a persistência física (soft-delete via
   * `status`) é responsabilidade do adapter, comparando ids.
   */
  private static reconcileContacts(
    existing: PartyContact[],
    desired: PartyContactInput[],
  ): Result<PartyContact[]> {
    // Deduplica pelo VALOR NORMALIZADO antes de casar com os existentes: dois
    // telefones que normalizam para o mesmo valor (ex.: com e sem DDI/máscara)
    // colapsam em um só (o último rótulo vence), evitando atribuir o mesmo `id`
    // de contato existente a duas linhas distintas — o que corromperia o
    // upsert-por-id do adapter.
    const byNormalized = new Map<string, PartyContactInput>();
    for (const input of desired) {
      const phoneResult = Phone.tryCreate(input.phone);
      if (phoneResult.isFailure) {
        return Result.fail<PartyContact[]>(phoneResult.errors!);
      }
      byNormalized.set(phoneResult.instance.value, input);
    }

    const results = [...byNormalized.entries()].map(([normalized, input]) => {
      const match = existing.find((c) => c.phoneValue === normalized);
      return PartyContact.tryCreate({
        id: match?.id,
        phone: input.phone,
        label: input.label ?? null,
        createdAt: match?.createdAt,
      });
    });
    return Result.combine(results);
  }
}
