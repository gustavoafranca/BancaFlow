import { Result } from '@bancaflow/shared';
export interface BancaDisplayContextView {
  bancaId: string;
  codigoBanca: string;
  nome: string;
}

export interface BancaDisplayContextQuery {
  findActiveById(bancaId: string): Promise<Result<BancaDisplayContextView | null>>;
}
