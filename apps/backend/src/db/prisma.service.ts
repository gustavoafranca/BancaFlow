import {
  Result,
  TransactionContext,
  TransactionManager,
} from '@bancaflow/shared';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface PrismaTransactionContext extends TransactionContext {
  client: Prisma.TransactionClient;
}

/**
 * Exceção sentinela usada exclusivamente para forçar o driver Prisma a
 * reverter (rollback) a transação quando o callback de `runInTransactionResult`
 * retorna `Result.fail(...)` sem lançar. É capturada de volta em
 * `runInTransactionResult` e NUNCA deve escapar para o chamador — qualquer
 * outra exceção lançada dentro do callback propaga normalmente como erro real.
 */
class ResultFailureSentinel extends Error {
  constructor(readonly errors: string[]) {
    super('IDENTITY.TRANSACTION_RESULT_FAILURE_SENTINEL');
  }
}

/**
 * Serviço Prisma com propagação transacional por contexto ambiente.
 * `runInTransaction` mantém o cliente de transação ativo em um
 * `AsyncLocalStorage` durante toda a execução do callback (incluindo chamadas
 * assíncronas aninhadas). Os adapters de qualquer módulo (Tenancy, Identity)
 * resolvem o cliente ativo via `activeClient()` — sem receber o contexto de
 * transação como parâmetro, preservando o isolamento do domínio (D6).
 */
@Injectable()
export class PrismaService
  implements
    OnModuleInit,
    OnModuleDestroy,
    TransactionManager<PrismaTransactionContext>
{
  readonly client: PrismaClient;
  private readonly als = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor() {
    this.client = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL!,
      }),
    });
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  /** Retorna o cliente de transação ambiente, ou o cliente padrão fora de uma transação. */
  activeClient(): Prisma.TransactionClient {
    return this.als.getStore() ?? this.client;
  }

  /**
   * Indica se a chamada corrente já está dentro de uma transação ambiente
   * (`runInTransaction`/`runInTransactionResult`). Adapters usam isto para
   * decidir se precisam abrir sua própria sub-transação interna (quando
   * chamados fora de qualquer transação, ex.: `ToggleAccountStatusUseCase`)
   * ou se podem apenas reutilizar `activeClient()` (quando já compostos dentro
   * da transação de um caso de uso, ex.: `ChangePasswordUseCase`).
   */
  isInTransaction(): boolean {
    return this.als.getStore() !== undefined;
  }

  async runInTransaction<T>(
    operation: (context: PrismaTransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(async (tx) => {
      return this.als.run(tx, () => operation({ client: tx }));
    });
  }

  async runInTransactionResult<T>(
    operation: (context: PrismaTransactionContext) => Promise<Result<T>>,
  ): Promise<Result<T>> {
    try {
      return await this.client.$transaction(async (tx) => {
        return this.als.run(tx, async () => {
          const result = await operation({ client: tx });
          if (result.isFailure) {
            throw new ResultFailureSentinel(result.errors);
          }
          return result;
        });
      });
    } catch (error: unknown) {
      if (error instanceof ResultFailureSentinel) {
        return Result.fail<T>(error.errors);
      }
      throw error;
    }
  }
}
