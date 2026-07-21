import { Result } from '../base/result';

export interface TransactionContext {}

export interface TransactionManager<CTX extends TransactionContext = TransactionContext> {
  runInTransaction<T>(operation: (context: CTX) => Promise<T>): Promise<T>;

  /**
   * Executa `operation` dentro de uma transação com semântica de `Result`:
   * se o callback retornar `Result.fail(...)`, a transação é revertida (rollback)
   * mesmo sem exceção lançada; se retornar `Result.ok(...)`, a transação é
   * confirmada (commit). Diferente de `runInTransaction`, que só reverte quando o
   * callback lança uma exceção.
   *
   * A implementação concreta (Prisma, no Backend) deve detectar `Result.isFailure`
   * dentro da transação, lançar internamente para forçar o rollback do driver, e
   * capturar de volta como `Result.fail` (sem propagar a exceção ao chamador).
   */
  runInTransactionResult<T>(operation: (context: CTX) => Promise<Result<T>>): Promise<Result<T>>;
}
