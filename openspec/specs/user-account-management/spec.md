## Purpose

Define user account lifecycle, creation constraints, tenant isolation, and administrative controls. Ensures accounts are created only through proper workflows and remain isolated to their tenant.

---
## Requirements
### Requirement: Create user account via ProvisionBanca
O sistema SHALL criar contas de usuário por dois caminhos, e somente por eles: (1) o fluxo `ProvisionBanca`, exclusivo para a conta `OWNER` inicial de uma banca nova; (2) a administração de contas da própria banca por um `OWNER` já existente, exclusiva para papéis `ADMIN` ou `USER` (ver `[[tenant-user-administration]]`). Não existe cadastro público em nenhum dos dois caminhos. O `role` SHALL ser sempre explícito na criação: `ProvisionBanca` informa `OWNER` explicitamente; a criação administrativa aceita somente `ADMIN` ou `USER` explícito, rejeitando `OWNER` e qualquer ausência de `role`. Na ausência de `role` em `ProvisionBanca`, o padrão SHALL ser `USER`, nunca `OWNER`. A senha fornecida (ou gerada como temporária, na criação administrativa) SHALL satisfazer a política de força autoritativa do domínio ([[credential-management]]); senha fraca é rejeitada antes de qualquer persistência.

O `username` SHALL ser único dentro da mesma banca: `UNIQUE (bancaId, normalizedUsername)`. O e-mail é opcional, não é identificador de login e não precisa ser único.

#### Scenario: Account created with unique username in banca
- **WHEN** `ProvisionBanca` solicita criação de conta com `username = "joao"` na banca `farizeu` e `role: 'OWNER'` explícito
- **THEN** a conta é criada com status `ACTIVE`, papel `OWNER`, `bancaId = farizeuId`, `normalizedUsername = "joao"`

#### Scenario: Role is never OWNER by default
- **WHEN** uma criação de conta via `ProvisionBanca` não informa `role`
- **THEN** o sistema assume `USER`; jamais `OWNER`

#### Scenario: Weak password is rejected before persisting
- **WHEN** a criação recebe uma senha (ou senha temporária gerada) que não atende à política de força
- **THEN** retorna `Result.fail(IDENTITY.PASSWORD_TOO_WEAK)` e nenhuma conta é persistida

#### Scenario: Same username allowed in different bancas
- **WHEN** `username = "joao"` já existe na banca `farizeu` e `ProvisionBanca` cria o mesmo username na banca `botafogo`
- **THEN** a conta é criada com sucesso na banca `botafogo`

#### Scenario: Duplicate username in same banca is rejected
- **WHEN** `username = "joao"` já existe na banca `farizeu` e uma tentativa de criar `"joao"` (ou `"João"`, `"JOAO"`) na mesma banca é feita, por `ProvisionBanca` ou por criação administrativa
- **THEN** o sistema retorna `IDENTITY.USERNAME_ALREADY_EXISTS` e o banco reforça via `UNIQUE(bancaId, normalizedUsername)`

#### Scenario: OWNER creates an additional ADMIN or USER account within the same banca
- **WHEN** um `OWNER` autenticado solicita a criação de uma conta com `role: 'ADMIN'` ou `role: 'USER'` dentro da própria banca
- **THEN** a conta é criada com `bancaId` do `OWNER` autenticado, status `ACTIVE`, senha temporária forte e `mustChangePassword = true`

#### Scenario: Administrative creation never assigns OWNER
- **WHEN** uma requisição de criação administrativa informa `role: 'OWNER'` (ou tenta omitir o `role` esperando um padrão)
- **THEN** o sistema rejeita a requisição antes de qualquer persistência; a criação de `OWNER` permanece exclusiva de `ProvisionBanca`

### Requirement: Strict tenant isolation
O sistema SHALL garantir que operações de conta somente afetem contas do `bancaId` autenticado.

#### Scenario: Account lookup is scoped to bancaId
- **WHEN** qualquer operação de leitura ou escrita de `UserAccount` é executada
- **THEN** a query inclui obrigatoriamente o filtro `bancaId = <bancaId do contexto autenticado>`

### Requirement: Activate and deactivate account
Uma conta `OWNER` SHALL poder ativar ou desativar conta `ADMIN` ou `USER` autorizada dentro da própria banca. Nesta versão, `ADMIN` não administra o estado de outra conta. Nenhum ator ativa ou desativa a própria conta por este mecanismo. Desativar uma conta SHALL revogar suas sessões ativas na mesma transação; reativar SHALL exigir nova autenticação.

#### Scenario: Deactivation revokes active sessions atomically
- **WHEN** uma conta `ACTIVE` é desativada
- **THEN** na mesma transação o status vira `INACTIVE` e todas as sessões não revogadas recebem `revokedAt = now`

#### Scenario: Deactivated account cannot authenticate
- **WHEN** uma conta `INACTIVE` tenta login mesmo com senha correta
- **THEN** o sistema retorna `401` com mensagem genérica (não revela que a conta existe)

#### Scenario: Reactivated account requires a fresh login
- **WHEN** uma conta desativada é reativada por um `OWNER`
- **THEN** os tokens antigos continuam inválidos (sessões foram revogadas) e o usuário precisa autenticar novamente

### Requirement: Block and unblock account
O sistema SHALL suportar bloqueio manual e desbloqueio de contas `ADMIN`/`USER` por um `OWNER` da mesma banca. Bloquear SHALL revogar as sessões ativas na mesma transação. Essa orquestração ("mudar status → revogar sessões") vive **no caso de uso** (`ToggleAccountStatusUseCase`, coordenando `UserAccountRepository`, `SessionRepository`, `Clock` e `TransactionManager` via `runInTransactionResult`), NÃO escondida no `save()` do adapter Prisma — o `save()` persiste apenas o próprio agregado. Desbloquear SHALL limpar `failedLoginAttempts`, `failedLoginWindowStartedAt` e `lockedUntil`. O bloqueio administrativo (status `BLOCKED`) é distinto do bloqueio temporário por tentativas inválidas (`lockedUntil` no futuro, status permanece `ACTIVE`).

#### Scenario: Manually blocked account cannot authenticate
- **WHEN** uma conta tem status `BLOCKED` e uma tentativa de login é feita
- **THEN** o sistema retorna `401` com mensagem genérica

#### Scenario: Blocking revokes issued tokens atomically
- **WHEN** uma conta é bloqueada por um `OWNER`
- **THEN** o caso de uso, dentro da mesma transação, muda o status e revoga as sessões ativas; qualquer token já emitido deixa de ser aceito pelo guard

#### Scenario: Revocation on block is visible at the use-case level
- **WHEN** um teste unitário do `ToggleAccountStatusUseCase` bloqueia uma conta usando um `SessionRepository` fake
- **THEN** o fake registra a revogação das sessões — o comportamento é observável no domínio e não depende de qual adapter de persistência está em uso

#### Scenario: Admin unblock resets the lockout counter
- **WHEN** um comportamento anterior a esta fase permitia `ADMIN` desbloquear uma conta
- **THEN** esse acesso foi revogado nesta versão — apenas `OWNER` desbloqueia (ver "Owner unblock resets the lockout counter")

#### Scenario: Owner unblock resets the lockout counter
- **WHEN** um `OWNER` desbloqueia uma conta dentro da própria banca
- **THEN** `failedLoginAttempts = 0`, `failedLoginWindowStartedAt = null`, `lockedUntil = null` e a conta pode autenticar novamente

#### Scenario: Temporary lock differs from administrative block
- **WHEN** uma conta atinge o bloqueio temporário por tentativas inválidas
- **THEN** seu status permanece `ACTIVE` com `lockedUntil` no futuro, e o desbloqueio ocorre pela expiração da janela, sem intervenção administrativa

### Requirement: Minimal administrative authorization
Somente `OWNER` SHALL executar operações administrativas sobre contas de terceiros (listar, visualizar, criar, atualizar, trocar papel, ativar, desativar, bloquear, desbloquear, redefinir senha, consultar e revogar sessões), sempre dentro do `bancaId` do próprio token. Nesta versão, `ADMIN` não administra contas de terceiros. Nenhum ator administra a própria conta através destes endpoints administrativos — autogestão continua exclusiva dos fluxos de autosserviço já existentes (`/api/auth/me`, `/api/auth/password`, `/api/auth/sessions`).

O contrato de erro SHALL distinguir claramente os dois motivos de recusa: `403` quando o `actorRole` não possui a `PermissionKey` exigida pela operação (`ADMIN`/`USER` tentando administrar); `404` quando o alvo (`accountId`/`targetUserId`) não existe ou pertence a outra banca — os dois casos indistinguíveis entre si, pois a busca já é escopada por `bancaId`. Quando o alvo existe dentro da própria banca do ator mas é o próprio ator ou é `OWNER`, a recusa é `403` (regra de negócio sobre um alvo já resolvido, não uma questão de tenant).

#### Scenario: Cross-banca management is rejected
- **WHEN** um comportamento anterior a esta fase retornava `403` para gerenciamento cross-banca
- **THEN** essa resposta foi substituída nesta versão por `404` uniforme para alvo inexistente ou de outra banca — ver "Cross-banca management returns 404, never 403"

#### Scenario: Cross-banca management returns 404, never 403
- **WHEN** um `OWNER` da banca `farizeu` tenta administrar uma conta que não existe, ou que pertence à banca `botafogo`
- **THEN** o sistema retorna `404` em ambos os casos, sem distinguir os dois na mensagem

#### Scenario: ADMIN cannot manage accounts in this version
- **WHEN** uma conta `ADMIN` tenta listar, visualizar, criar, atualizar, trocar papel, ativar, desativar, bloquear, desbloquear, redefinir senha ou administrar sessões de outra conta
- **THEN** o sistema retorna `403`

#### Scenario: Regular user cannot manage accounts
- **WHEN** uma conta `USER` tenta qualquer operação administrativa sobre outra conta
- **THEN** o sistema retorna `403`

#### Scenario: OWNER cannot manage their own account through the administrative endpoints
- **WHEN** um `OWNER` autenticado envia `accountId` igual ao próprio `userId` para qualquer endpoint administrativo de conta
- **THEN** o sistema rejeita a operação (`403`); a alteração dos próprios dados continua exclusiva dos fluxos de autosserviço

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

### Requirement: Administrative account listing limits page size
O endpoint HTTP de listagem administrativa de contas SHALL aceitar `page >= 1` e `pageSize >= 1`, limitar `pageSize` por teto seguro documentado, e continuar retornando `PaginatedResultDTO` com `PaginationMetaDTO`. O teto inicial SHALL ser `100`, salvo nova decisão de produto/performance.

#### Scenario: Page size above limit is rejected
- **WHEN** um cliente chama `GET /api/accounts?pageSize=101`
- **THEN** o backend rejeita a requisição com erro de validação e não executa paginação ilimitada

#### Scenario: Shared pagination DTO remains the output contract
- **WHEN** `GET /api/accounts` retorna sucesso
- **THEN** a resposta continua usando `data` e `meta` compatíveis com `PaginatedResultDTO`/`PaginationMetaDTO`

### Requirement: Administrative listing preserves tenant-scoped count and filters
A listagem administrativa SHALL executar `count` e `findMany` com o mesmo filtro tenant-scoped, incluindo exclusão de `OWNER`, busca e filtros antes da paginação. O Web SHALL exibir total e contexto de página de forma legível e desabilitar corretamente Anterior/Próxima.

#### Scenario: Count and page use the same where clause
- **WHEN** a listagem é consultada com busca, papel e status
- **THEN** `total`, `totalPages` e itens retornados refletem o mesmo filtro aplicado no banco

#### Scenario: Single page hides or disables pagination controls
- **WHEN** o resultado possui zero ou uma página
- **THEN** os controles Anterior/Próxima não permitem navegação inválida

