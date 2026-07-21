import { Injectable } from '@nestjs/common';
import { Banca, BancaRepository } from '@bancaflow/tenancy';
import { Id, Result } from '@bancaflow/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../db/prisma.service';
import { safeErrorCode } from '../../../shared/errors/prisma-error.util';

type BancaRow = {
  id: string;
  codigoBanca: string;
  nome: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Adapter Prisma do contrato `BancaRepository` do domínio Tenancy.
 * Mapeia banco ↔ domínio explicitamente (`toDomain`/`fromDomain`) e nunca
 * vaza tipos Prisma para fora.
 */
@Injectable()
export class BancaRepositoryPrisma implements BancaRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Cliente Prisma ativo — o `tx` ambiente dentro de uma transação, ou o padrão fora dela. */
  private activeClient(): Prisma.TransactionClient {
    return this.prisma.activeClient();
  }

  nextId(): string {
    return Id.createUUID();
  }

  async findByCodigo(normalizedCodigo: string): Promise<Result<Banca | null>> {
    try {
      const row = await this.activeClient().banca.findUnique({
        where: { codigoBanca: normalizedCodigo },
      });
      return row ? this.toDomain(row) : Result.ok(null);
    } catch (error: unknown) {
      return Result.fail(safeErrorCode(error, 'TENANCY_BANCA_FIND_ERROR'));
    }
  }

  async findById(id: string): Promise<Result<Banca | null>> {
    try {
      const row = await this.activeClient().banca.findUnique({ where: { id } });
      return row ? this.toDomain(row) : Result.ok(null);
    } catch (error: unknown) {
      return Result.fail(safeErrorCode(error, 'TENANCY_BANCA_FIND_ERROR'));
    }
  }

  async existsByCodigo(normalizedCodigo: string): Promise<Result<boolean>> {
    try {
      const count = await this.activeClient().banca.count({
        where: { codigoBanca: normalizedCodigo },
      });
      return Result.ok(count > 0);
    } catch (error: unknown) {
      return Result.fail(safeErrorCode(error, 'TENANCY_BANCA_EXISTS_ERROR'));
    }
  }

  async save(banca: Banca): Promise<Result<void>> {
    try {
      const data = this.fromDomain(banca);
      await this.activeClient().banca.upsert({
        where: { id: data.id },
        create: data,
        update: {
          codigoBanca: data.codigoBanca,
          nome: data.nome,
          status: data.status,
        },
      });
      return Result.ok(undefined);
    } catch (error: unknown) {
      return Result.fail(safeErrorCode(error, 'TENANCY_BANCA_SAVE_ERROR'));
    }
  }

  private toDomain(row: BancaRow): Result<Banca> {
    return Banca.tryCreate({
      id: row.id,
      codigoBanca: row.codigoBanca,
      nome: row.nome,
      status: row.status as 'ACTIVE' | 'INACTIVE',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private fromDomain(banca: Banca): BancaRow {
    return {
      id: banca.id,
      // Persiste sempre o valor normalizado (constraint UNIQUE / lookups).
      codigoBanca: banca.codigoBanca.normalized,
      nome: banca.nome,
      status: banca.status.value,
      createdAt: banca.createdAt,
      updatedAt: banca.updatedAt,
    };
  }
}
