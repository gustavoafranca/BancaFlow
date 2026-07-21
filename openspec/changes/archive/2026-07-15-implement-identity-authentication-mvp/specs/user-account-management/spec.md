## ADDED Requirements

### Requirement: Create user account via ProvisionBanca
O sistema SHALL criar contas de usuário exclusivamente através do fluxo `ProvisionBanca`. Não existe cadastro público de usuários.

Toda conta nasce com status `ACTIVE` e `mustChangePassword = false` (a não ser que criada com senha temporária). A primeira conta criada por `ProvisionBanca` nasce com papel `OWNER`; contas posteriores podem ser `ADMIN` ou `USER` conforme autorização.

O `username` SHALL ser único dentro da mesma banca: `UNIQUE (bancaId, normalizedUsername)`.

O e-mail é opcional, não é identificador de login e não precisa ser único.

#### Scenario: Account created with unique username in banca
- **WHEN** `ProvisionBanca` solicita criação de conta com `username = "joao"` na banca `farizeu`
- **THEN** a conta é criada com status `ACTIVE`, papel `OWNER`, `bancaId = farizeuId`, `normalizedUsername = "joao"`

#### Scenario: Same username allowed in different bancas
- **WHEN** `username = "joao"` já existe na banca `farizeu` e `ProvisionBanca` cria conta com o mesmo username na banca `botafogo`
- **THEN** a conta é criada com sucesso na banca `botafogo`

#### Scenario: Duplicate username in same banca is rejected
- **WHEN** `username = "joao"` já existe na banca `farizeu` e uma tentativa de criar outro `username = "joao"` (ou "João" ou "JOAO") na mesma banca é feita
- **THEN** o sistema retorna erro `IDENTITY.USERNAME_ALREADY_EXISTS`

### Requirement: Strict tenant isolation
O sistema SHALL garantir que operações de conta somente afetem contas do `bancaId` autenticado.

#### Scenario: Account lookup is scoped to bancaId
- **WHEN** qualquer operação de leitura ou escrita de `UserAccount` é executada
- **THEN** a query inclui obrigatoriamente o filtro `bancaId = <bancaId do contexto autenticado>`

### Requirement: Activate and deactivate account
Uma conta `OWNER` ou `ADMIN` SHALL poder ativar ou desativar conta autorizada dentro da própria banca. `ADMIN` não pode alterar o estado de `OWNER`.

#### Scenario: Deactivated account cannot authenticate
- **WHEN** uma conta tem status `INACTIVE` e uma tentativa de login é feita
- **THEN** o sistema retorna `401` com mensagem genérica (não revela que a conta existe)

#### Scenario: Reactivated account can authenticate
- **WHEN** uma conta desativada é reativada por um administrador
- **THEN** a conta pode autenticar normalmente na próxima tentativa válida

### Requirement: Block and unblock account
O sistema SHALL suportar bloqueio manual e desbloqueio de contas por administrador.

#### Scenario: Manually blocked account cannot authenticate
- **WHEN** uma conta tem status `BLOCKED` e uma tentativa de login é feita
- **THEN** o sistema retorna `401` com mensagem genérica

#### Scenario: Admin can unblock account
- **WHEN** um administrador desbloqueia uma conta dentro da própria banca
- **THEN** o contador de tentativas é zerado e a conta pode autenticar novamente

### Requirement: Minimal administrative authorization
Somente `OWNER` ou `ADMIN` SHALL executar operações administrativas, sempre dentro do `bancaId` do próprio token. `ADMIN` não pode gerenciar `OWNER`.

#### Scenario: Cross-banca management is rejected
- **WHEN** um administrador da banca `farizeu` tenta desativar ou redefinir senha de uma conta da banca `botafogo`
- **THEN** o sistema retorna `403`

#### Scenario: Regular user cannot manage accounts
- **WHEN** uma conta `USER` tenta ativar, desativar, bloquear, desbloquear ou redefinir outra conta
- **THEN** o sistema retorna `403`
