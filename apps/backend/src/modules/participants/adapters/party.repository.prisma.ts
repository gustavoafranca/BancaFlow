import { Injectable } from '@nestjs/common';
import { Id, Result } from '@bancaflow/shared';
import { Party, PartyAddress, PartyContact, PartyRepository } from '@bancaflow/participants';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../db/prisma.service';
import { safeErrorCode } from '../../../shared/errors/prisma-error.util';
import { TECHNICAL_ERROR_CODES } from '../../../shared/errors/technical-error-codes';
import { normalizeText } from './participants-normalize.util';

type PartyRow = {
  id: string;
  bancaId: string;
  type: string;
  name: string | null;
  nickname: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  contacts: { id: string; phone: string; label: string | null; createdAt: Date; updatedAt: Date }[];
  addresses: {
    id: string;
    street: string | null;
    number: string | null;
    neighborhood: string;
    city: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
};

/**
 * Adapter Prisma do contrato `PartyRepository`. Persiste o agregado `Party` e
 * suas entidades filhas (`PartyContact`, `PartyAddress`) numa única escrita
 * aninhada, sobre o `activeClient()` (transação ambiente do caso de uso).
 * Mapeia domínio → banco explicitamente e nunca vaza tipos Prisma.
 */
@Injectable()
export class PartyRepositoryPrisma implements PartyRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeClient(): Prisma.TransactionClient {
    return this.prisma.activeClient();
  }

  nextId(): string {
    return Id.createUUID();
  }

  async save(party: Party): Promise<Result<void>> {
    try {
      const address = party.address;
      await this.activeClient().party.create({
        data: {
          id: party.id,
          bancaId: party.bancaId,
          type: party.type,
          name: party.name,
          nameNormalized: normalizeText(party.name),
          nickname: party.nickname,
          nicknameNormalized: normalizeText(party.nickname),
          createdBy: party.createdBy,
          createdAt: party.createdAt,
          contacts: {
            create: party.contacts.map((contact) => ({
              id: contact.id,
              phone: contact.phoneValue,
              label: contact.label,
              createdAt: contact.createdAt,
            })),
          },
          addresses: address
            ? {
                create: [
                  {
                    id: address.id,
                    street: address.street,
                    number: address.number,
                    neighborhood: address.neighborhood.display,
                    neighborhoodNormalized: address.neighborhoodNormalized,
                    city: address.city.display,
                    cityNormalized: address.cityNormalized,
                    effectiveFrom: address.effectivePeriod.effectiveFrom,
                    effectiveTo: address.effectivePeriod.effectiveTo,
                    createdAt: address.createdAt,
                  },
                ],
              }
            : undefined,
        },
      });
      return Result.ok(undefined);
    } catch (error: unknown) {
      return Result.fail(
        safeErrorCode(error, TECHNICAL_ERROR_CODES.PARTICIPANTS_PARTY_SAVE, {
          operation: 'PartyRepositoryPrisma.save',
        }),
      );
    }
  }

  async findById(id: string, bancaId: string): Promise<Result<Party | null>> {
    try {
      const row = await this.activeClient().party.findFirst({
        where: { id, bancaId },
        include: {
          contacts: { where: { status: 'ACTIVE' } },
          addresses: { where: { effectiveTo: null } },
        },
      });
      if (!row) {
        return Result.ok(null);
      }
      return this.toDomain(row);
    } catch (error: unknown) {
      return Result.fail(
        safeErrorCode(error, TECHNICAL_ERROR_CODES.PARTICIPANTS_PARTY_FIND, {
          operation: 'PartyRepositoryPrisma.findById',
        }),
      );
    }
  }

  /**
   * Persiste uma edição (D5): reconcilia `PartyContact` (soft-delete via
   * `status` para os ausentes da lista desejada, casados por `id` já
   * preservado pelo domínio; atualiza rótulo dos que persistem; cria os
   * novos) e `PartyAddress` (encerra a vigência ativa anterior — usando
   * `party.updatedAt`, o "agora" do domínio, quando não há novo endereço —
   * e cria o novo endereço quando presente). Nunca cria uma nova `Party`.
   */
  async update(party: Party): Promise<Result<void>> {
    try {
      const client = this.activeClient();

      await client.party.update({
        where: { id: party.id },
        data: {
          name: party.name,
          nameNormalized: normalizeText(party.name),
          nickname: party.nickname,
          nicknameNormalized: normalizeText(party.nickname),
        },
      });

      const existingContacts = await client.partyContact.findMany({
        where: { partyId: party.id, status: 'ACTIVE' },
        select: { id: true },
      });
      const existingContactIds = new Set(existingContacts.map((c) => c.id));
      const desiredContactIds = new Set(party.contacts.map((c) => c.id));

      const toDeactivate = existingContacts
        .map((c) => c.id)
        .filter((contactId) => !desiredContactIds.has(contactId));
      if (toDeactivate.length > 0) {
        await client.partyContact.updateMany({
          where: { id: { in: toDeactivate } },
          data: { status: 'INACTIVE' },
        });
      }

      for (const contact of party.contacts) {
        if (existingContactIds.has(contact.id)) {
          await client.partyContact.update({
            where: { id: contact.id },
            data: { label: contact.label },
          });
        } else {
          await client.partyContact.create({
            data: {
              id: contact.id,
              partyId: party.id,
              phone: contact.phoneValue,
              label: contact.label,
              createdAt: contact.createdAt,
            },
          });
        }
      }

      const activeAddress = await client.partyAddress.findFirst({
        where: { partyId: party.id, effectiveTo: null },
      });
      const desiredAddress = party.address;

      if (activeAddress) {
        await client.partyAddress.update({
          where: { id: activeAddress.id },
          data: {
            effectiveTo: desiredAddress?.effectivePeriod.effectiveFrom ?? party.updatedAt,
          },
        });
      }
      if (desiredAddress) {
        await client.partyAddress.create({
          data: {
            id: desiredAddress.id,
            partyId: party.id,
            street: desiredAddress.street,
            number: desiredAddress.number,
            neighborhood: desiredAddress.neighborhood.display,
            neighborhoodNormalized: desiredAddress.neighborhoodNormalized,
            city: desiredAddress.city.display,
            cityNormalized: desiredAddress.cityNormalized,
            effectiveFrom: desiredAddress.effectivePeriod.effectiveFrom,
            effectiveTo: desiredAddress.effectivePeriod.effectiveTo,
            createdAt: desiredAddress.createdAt,
          },
        });
      }

      return Result.ok(undefined);
    } catch (error: unknown) {
      return Result.fail(
        safeErrorCode(error, TECHNICAL_ERROR_CODES.PARTICIPANTS_PARTY_SAVE, {
          operation: 'PartyRepositoryPrisma.update',
        }),
      );
    }
  }

  private toDomain(row: PartyRow): Result<Party> {
    const contactResults = row.contacts.map((c) =>
      PartyContact.tryCreate({
        id: c.id,
        phone: c.phone,
        label: c.label,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }),
    );
    const contactsCombined = Result.combine(contactResults);
    if (contactsCombined.isFailure) {
      return Result.fail(contactsCombined.errors!);
    }

    let address: PartyAddress | null = null;
    const activeAddressRow = row.addresses[0];
    if (activeAddressRow) {
      const addressResult = PartyAddress.tryCreate({
        id: activeAddressRow.id,
        street: activeAddressRow.street,
        number: activeAddressRow.number,
        neighborhood: activeAddressRow.neighborhood,
        city: activeAddressRow.city,
        effectiveFrom: activeAddressRow.effectiveFrom,
        effectiveTo: activeAddressRow.effectiveTo,
        createdAt: activeAddressRow.createdAt,
        updatedAt: activeAddressRow.updatedAt,
      });
      if (addressResult.isFailure) {
        return Result.fail(addressResult.errors!);
      }
      address = addressResult.instance;
    }

    return Party.reconstitute({
      id: row.id,
      bancaId: row.bancaId,
      type: row.type,
      name: row.name,
      nickname: row.nickname,
      contacts: contactsCombined.instance,
      address,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
