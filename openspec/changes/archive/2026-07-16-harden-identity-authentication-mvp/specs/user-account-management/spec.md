## MODIFIED Requirements

### Requirement: Create user account via ProvisionBanca
O sistema SHALL criar contas de usuário exclusivamente através do fluxo `ProvisionBanca`. Não existe cadastro público. O `role` SHALL ser sempre explícito na criação: `ProvisionBanca` informa `OWNER` explicitamente; nenhuma via assume `OWNER` implicitamente. Na ausência de `role`, o padrão SHALL ser `USER`, nunca `OWNER`. A senha fornecida SHALL satisfazer a política de força autoritativa do domínio ([[credential-management]]); senha fraca é rejeitada antes de qualquer persistência.

O `username` SHALL ser único dentro da mesma banca: `UNIQUE (bancaId, normalizedUsername)`. O e-mail é opcional, não é identificador de login e não precisa ser único.

#### Scenario: Account created with unique username in banca
- **WHEN** `ProvisionBanca` solicita criação de conta com `username = "joao"` na banca `farizeu` e `role: 'OWNER'` explícito
- **THEN** a conta é criada com status `ACTIVE`, papel `OWNER`, `bancaId = farizeuId`, `normalizedUsername = "joao"`

#### Scenario: Role is never OWNER by default
- **WHEN** uma criação de conta não informa `role`
- **THEN** o sistema assume `USER`; jamais `OWNER`

#### Scenario: Weak password is rejected before persisting
- **WHEN** a criação recebe uma senha que não atende à política de força
- **THEN** retorna `Result.fail(IDENTITY.PASSWORD_TOO_WEAK)` e nenhuma conta é persistida

#### Scenario: Same username allowed in different bancas
- **WHEN** `username = "joao"` já existe na banca `farizeu` e `ProvisionBanca` cria o mesmo username na banca `botafogo`
- **THEN** a conta é criada com sucesso na banca `botafogo`

#### Scenario: Duplicate username in same banca is rejected
- **WHEN** `username = "joao"` já existe na banca `farizeu` e uma tentativa de criar `"joao"` (ou `"João"`, `"JOAO"`) na mesma banca é feita
- **THEN** o sistema retorna `IDENTITY.USERNAME_ALREADY_EXISTS` e o banco reforça via `UNIQUE(bancaId, normalizedUsername)`

### Requirement: Activate and deactivate account
Uma conta `OWNER` ou `ADMIN` SHALL poder ativar ou desativar conta autorizada dentro da própria banca. `ADMIN` não pode alterar o estado de `OWNER`. Desativar uma conta SHALL revogar suas sessões ativas na mesma transação; reativar SHALL exigir nova autenticação.

#### Scenario: Deactivation revokes active sessions atomically
- **WHEN** uma conta `ACTIVE` é desativada
- **THEN** na mesma transação o status vira `INACTIVE` e todas as sessões não revogadas recebem `revokedAt = now`

#### Scenario: Deactivated account cannot authenticate
- **WHEN** uma conta `INACTIVE` tenta login mesmo com senha correta
- **THEN** o sistema retorna `401` com mensagem genérica (não revela que a conta existe)

#### Scenario: Reactivated account requires a fresh login
- **WHEN** uma conta desativada é reativada por um administrador
- **THEN** os tokens antigos continuam inválidos (sessões foram revogadas) e o usuário precisa autenticar novamente

### Requirement: Block and unblock account
O sistema SHALL suportar bloqueio manual e desbloqueio de contas por administrador. Bloquear SHALL revogar as sessões ativas na mesma transação. Essa orquestração ("mudar status → revogar sessões") vive **no caso de uso** (`ToggleAccountStatusUseCase`, coordenando `UserAccountRepository`, `SessionRepository`, `Clock` e `TransactionManager` via `runInTransactionResult`), NÃO escondida no `save()` do adapter Prisma — o `save()` persiste apenas o próprio agregado. Desbloquear SHALL limpar `failedLoginAttempts`, `failedLoginWindowStartedAt` e `lockedUntil`. O bloqueio administrativo (status `BLOCKED`) é distinto do bloqueio temporário por tentativas inválidas (`lockedUntil` no futuro, status permanece `ACTIVE`).

#### Scenario: Manually blocked account cannot authenticate
- **WHEN** uma conta tem status `BLOCKED` e uma tentativa de login é feita
- **THEN** o sistema retorna `401` com mensagem genérica

#### Scenario: Blocking revokes issued tokens atomically
- **WHEN** uma conta é bloqueada
- **THEN** o caso de uso, dentro da mesma transação, muda o status e revoga as sessões ativas; qualquer token já emitido deixa de ser aceito pelo guard

#### Scenario: Revocation on block is visible at the use-case level
- **WHEN** um teste unitário do `ToggleAccountStatusUseCase` bloqueia uma conta usando um `SessionRepository` fake
- **THEN** o fake registra a revogação das sessões — o comportamento é observável no domínio e não depende de qual adapter de persistência está em uso

#### Scenario: Admin unblock resets the lockout counter
- **WHEN** um administrador desbloqueia uma conta dentro da própria banca
- **THEN** `failedLoginAttempts = 0`, `failedLoginWindowStartedAt = null`, `lockedUntil = null` e a conta pode autenticar novamente

#### Scenario: Temporary lock differs from administrative block
- **WHEN** uma conta atinge o bloqueio temporário por tentativas inválidas
- **THEN** seu status permanece `ACTIVE` com `lockedUntil` no futuro, e o desbloqueio ocorre pela expiração da janela, sem intervenção administrativa

### Requirement: Minimal administrative authorization
Somente `OWNER` ou `ADMIN` SHALL executar operações administrativas, sempre dentro do `bancaId` do próprio token. `ADMIN` não pode gerenciar `OWNER`.

#### Scenario: Cross-banca management is rejected
- **WHEN** um administrador da banca `farizeu` tenta desativar ou redefinir senha de uma conta da banca `botafogo`
- **THEN** o sistema retorna `403`

#### Scenario: Regular user cannot manage accounts
- **WHEN** uma conta `USER` tenta ativar, desativar, bloquear, desbloquear ou redefinir outra conta
- **THEN** o sistema retorna `403`

## ADDED Requirements

### Requirement: UserAccount protects counter and date invariants
O agregado `UserAccount` SHALL proteger invariantes: `failedLoginAttempts >= 0`; janela e bloqueio coerentes; datas (`passwordChangedAt`, `failedLoginWindowStartedAt`, `lockedUntil`) expostas e recebidas como cópias defensivas; todas as transições de status ocorrem por métodos do agregado (`activate`, `deactivate`, `block`, `unblock`), nunca por setters públicos. As bases `Entity`/`ValueObject` (`packages/shared`) SHALL expor `props`/`value` como `protected readonly` (não públicos e mutáveis), de modo que não seja possível contornar os métodos do agregado mutando os objetos diretamente. O banco SHALL reforçar via check constraints (`failedLoginAttempts >= 0`).

#### Scenario: Counter never goes negative
- **WHEN** qualquer operação tenta reduzir `failedLoginAttempts` abaixo de zero
- **THEN** a operação é rejeitada; `resetLoginFailures()` zera para `0`, nunca negativo

#### Scenario: State changes only through methods
- **WHEN** o estado da conta muda (status, contador, bloqueio)
- **THEN** a mudança ocorre por um método que valida a transição e retorna `Result<UserAccount>`, sem setter público

#### Scenario: Exposed dates cannot mutate internal state
- **WHEN** um consumidor lê uma data da conta e a modifica
- **THEN** o estado interno da entidade permanece inalterado (cópia defensiva)

#### Scenario: Internal props cannot be mutated to bypass invariants
- **WHEN** um consumidor tenta alterar diretamente o estado interno (ex.: `account['props'].status = 'ACTIVE'`)
- **THEN** o acesso é bloqueado em tempo de compilação/tipo (`props` é `protected readonly`), forçando a mudança pelos métodos do agregado

### Requirement: Database enforces tenant isolation and enum integrity
O banco SHALL reforçar o isolamento e a integridade além dos filtros de aplicação: `UNIQUE(bancaId, normalizedUsername)`; índice de suporte a login por `(bancaId, normalizedUsername)`; check/enum constraints para `AccountRole` (`OWNER`, `ADMIN`, `USER`) e `AccountStatus` (`ACTIVE`, `INACTIVE`, `BLOCKED`). Migrations SHALL ser reversíveis e compatíveis com os dados do MVP.

#### Scenario: Invalid role value is rejected at the database
- **WHEN** uma gravação tenta persistir um `role` fora do conjunto permitido
- **THEN** a constraint de enum/check rejeita a gravação

#### Scenario: Invalid status value is rejected at the database
- **WHEN** uma gravação tenta persistir um `status` fora de `ACTIVE`/`INACTIVE`/`BLOCKED`
- **THEN** a constraint de enum/check rejeita a gravação
