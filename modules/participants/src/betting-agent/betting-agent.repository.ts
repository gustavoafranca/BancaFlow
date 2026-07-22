import { Result } from '@bancaflow/shared';
import { BettingAgent } from './betting-agent.entity';

/**
 * Porta de escrita do agregado `BettingAgent` (inclui a política inicial). Sem
 * `delete` (D25). `findById` é sempre tenant-scoped (`bancaId` obrigatório) e
 * retorna a entidade reconstruída para invariantes/detalhe. `save` traduz o
 * conflito de código único `(bancaId, code)` para `CODE_ALREADY_EXISTS` no
 * adapter, sem vazar detalhes do banco. A transação ambiente aberta pelo caso
 * de uso é resolvida pelo adapter via contexto implícito (`AsyncLocalStorage`,
 * D6) — sem recebê-la como parâmetro aqui.
 */
export interface BettingAgentRepository {
  nextId(): string;

  save(agent: BettingAgent): Promise<Result<void>>;

  findById(id: string, bancaId: string): Promise<Result<BettingAgent | null>>;

  /** Persiste uma transição de status (`status`/`updatedAt`); demais campos não são tocados. */
  updateStatus(agent: BettingAgent): Promise<Result<void>>;
}
