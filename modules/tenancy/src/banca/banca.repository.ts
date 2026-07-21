import { Result } from '@bancaflow/shared';
import { Banca } from './banca.entity';

export interface BancaRepository {
  nextId(): string;

  findByCodigo(normalizedCodigo: string): Promise<Result<Banca | null>>;

  findById(id: string): Promise<Result<Banca | null>>;

  existsByCodigo(normalizedCodigo: string): Promise<Result<boolean>>;

  save(banca: Banca): Promise<Result<void>>;
}
