## Purpose

Define atomic transaction handling for Result-based operations, ensuring consistency when business logic failures must roll back database changes while certain domain rules persist despite technical failures.

---

## Requirements

### Requirement: runInTransactionResult helper for atomic Result-based operations
O Backend SHALL fornecer `runInTransactionResult<T>(callback: () => Promise<Result<T>>): Promise<Result<T>>` no `PrismaService`, garantindo rollback se callback retorna `Result.fail`.

#### Scenario: Commit on Result.ok
- **WHEN** callback persistir dados, atualizar contador e retornar `Result.ok(...)`
- **THEN** todas as alterações são confirmadas no banco

#### Scenario: Rollback on Result.fail
- **WHEN** callback persistir dados, depois retornar `Result.fail(...)` (ex: senha fraca detectada após hashing)
- **THEN** transação é revertida; nenhuma alteração persiste no banco

#### Scenario: Atomicity of login write and token emission
- **WHEN** `LoginUseCase` persiste contador/bloqueio, depois falha em emissão de token
- **THEN** escrita é revertida; banco não reflete tentativa

#### Scenario: Atomicity of password change and session revocation
- **WHEN** `ChangePasswordUseCase` persiste hash, revoga outras sessões, depois falha em emissão de novo token
- **THEN** transação é revertida completamente; hash antigo permanece; sessões não são revogadas

### Requirement: Document which failures cause rollback vs. persist
O sistema SHALL documentar claramente quais erros de negócio causam rollback e quais representam alteração de estado que deve persistir.

#### Scenario: Failed login increments counter persistently
- **WHEN** `LoginUseCase` falha por senha errada ou usuário não encontrado
- **THEN** `failedLoginAttempts` é persistido mesmo em falha (regra de negócio)

#### Scenario: Blocked account login does not increment counter again
- **WHEN** conta está bloqueada (`lockedUntil > now`) e login é tentado
- **THEN** erro retornado, mas contador **não** é incrementado (já foi bloqueado)

#### Scenario: Token emission failure rolls back password change
- **WHEN** `ChangePasswordUseCase` persiste hash novo, mas falha ao emitir novo token
- **THEN** transação é revertida; hash antigo permanece válido; nenhum token novo é emitido
