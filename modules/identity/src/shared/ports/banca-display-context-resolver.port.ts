import { Result } from '@bancaflow/shared';

export interface BancaDisplayContext {
  bancaId: string;
  codigoBanca: string;
  name: string;
}

export interface BancaDisplayContextResolver {
  resolve(bancaId: string): Promise<Result<BancaDisplayContext | null>>;
}
