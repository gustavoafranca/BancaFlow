import { Result } from '@bancaflow/shared';

export interface BancaContext {
  bancaId: string;
  isActive: boolean;
}

export interface BancaContextResolver {
  resolve(codigoBanca: string): Promise<Result<BancaContext>>;
}
