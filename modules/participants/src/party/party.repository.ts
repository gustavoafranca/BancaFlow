import { Result } from '@bancaflow/shared';
import { Party } from './party.entity';

/**
 * Porta de escrita do agregado `Party`. Persiste a Party e suas entidades
 * filhas (`PartyContact`, `PartyAddress`) atomicamente. Sem `delete` (D25: nada
 * é excluído neste domínio). A transação ambiente aberta pelo caso de uso
 * (`runInTransactionResult`) é resolvida pelo adapter via contexto implícito
 * (`AsyncLocalStorage`, D6) — o mesmo padrão usado por Identity/Tenancy — sem
 * recebê-la como parâmetro aqui.
 */
export interface PartyRepository {
  nextId(): string;

  save(party: Party): Promise<Result<void>>;

  /** Sempre tenant-scoped. Reconstrói com `Party.reconstitute`, contatos/endereço só ativos. */
  findById(id: string, bancaId: string): Promise<Result<Party | null>>;

  /**
   * Persiste uma edição (D5): reconcilia `PartyContact` (soft-delete via
   * `status` para os ausentes; preserva id para os que persistem) e
   * `PartyAddress` (encerra a vigência ativa anterior quando substituída ou
   * removida) contra o estado atual no banco. Nunca cria uma nova `Party`.
   */
  update(party: Party): Promise<Result<void>>;
}
