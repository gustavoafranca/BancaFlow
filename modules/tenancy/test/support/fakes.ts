import { Id, Result, TransactionManager } from '@bancaflow/shared';
import {
  CreateUserAccountInput,
  CreateUserAccountOutput,
  CreateUserAccountPort,
} from '@bancaflow/identity';
import { Banca } from '../../src/banca/banca.entity';
import { BancaRepository } from '../../src/banca/banca.repository';

export class InMemoryBancaRepository implements BancaRepository {
  private store = new Map<string, Banca>();
  failFindByCodigo = false;
  failFindById = false;
  failExistsByCodigo = false;
  failSave = false;

  constructor(seed: Banca[] = []) {
    seed.forEach((b) => this.store.set(b.id, b));
  }

  nextId(): string {
    return Id.createUUID();
  }

  async findByCodigo(normalizedCodigo: string): Promise<Result<Banca | null>> {
    if (this.failFindByCodigo) {
      return Result.fail('BANCA_FIND_BY_CODIGO_ERROR');
    }
    for (const banca of this.store.values()) {
      if (banca.codigoBanca.normalized === normalizedCodigo) {
        return Result.ok(banca);
      }
    }
    return Result.ok(null);
  }

  async findById(id: string): Promise<Result<Banca | null>> {
    if (this.failFindById) {
      return Result.fail('BANCA_FIND_BY_ID_ERROR');
    }
    return Result.ok(this.store.get(id) ?? null);
  }

  async existsByCodigo(normalizedCodigo: string): Promise<Result<boolean>> {
    if (this.failExistsByCodigo) {
      return Result.fail('BANCA_EXISTS_BY_CODIGO_ERROR');
    }
    const found = await this.findByCodigo(normalizedCodigo);
    return Result.ok(!!found.instance);
  }

  async save(banca: Banca): Promise<Result<void>> {
    if (this.failSave) {
      return Result.fail('BANCA_SAVE_ERROR');
    }
    this.store.set(banca.id, banca);
    return Result.ok();
  }

  get size(): number {
    return this.store.size;
  }

  snapshot(): Map<string, Banca> {
    return new Map(this.store);
  }

  restore(snap: Map<string, Banca>): void {
    this.store = new Map(snap);
  }
}

/**
 * TransactionManager que apenas repassa o callback (transação bem-sucedida).
 */
export class PassthroughTransactionManager implements TransactionManager {
  async runInTransaction<T>(operation: (ctx: unknown) => Promise<T>): Promise<T> {
    return operation({});
  }
}

/**
 * TransactionManager que simula rollback: tira um snapshot do repositório antes
 * de executar e o restaura caso o callback lance erro, propagando o erro.
 */
export class RollbackTransactionManager implements TransactionManager {
  constructor(private readonly repo: InMemoryBancaRepository) {}

  async runInTransaction<T>(operation: (ctx: unknown) => Promise<T>): Promise<T> {
    const snap = this.repo.snapshot();
    try {
      return await operation({});
    } catch (error) {
      this.repo.restore(snap);
      throw error;
    }
  }
}

/**
 * Port de criação de conta que registra a última entrada recebida e pode ser
 * configurada para falhar.
 */
export class FakeCreateUserAccountPort implements CreateUserAccountPort {
  lastInput?: CreateUserAccountInput;
  calls = 0;

  constructor(private readonly failWith?: string) {}

  async execute(data: CreateUserAccountInput): Promise<Result<CreateUserAccountOutput>> {
    this.calls += 1;
    this.lastInput = data;
    if (this.failWith) {
      return Result.fail(this.failWith);
    }
    return Result.ok({
      userId: Id.createUUID(),
      username: data.username,
      role: data.role ?? 'OWNER',
    });
  }
}
