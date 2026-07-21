## ADDED Requirements

### Requirement: Backend fails to start if secrets are missing or weak
O Backend SHALL validar `JWT_SECRET` e `REFRESH_TOKEN_SECRET` no startup, falhando se ausentes, com comprimento < 32 caracteres ou iguais um ao outro.

#### Scenario: Missing JWT_SECRET fails startup
- **WHEN** `JWT_SECRET` não está definida
- **THEN** Backend log exibe erro e processo é encerrado com exit code != 0

#### Scenario: Weak JWT_SECRET fails startup
- **WHEN** `JWT_SECRET` tem comprimento < 32 caracteres
- **THEN** Backend falha no startup com mensagem clara

#### Scenario: Identical secrets fail startup
- **WHEN** `JWT_SECRET == REFRESH_TOKEN_SECRET`
- **THEN** Backend falha no startup, exigindo secrets distintos

#### Scenario: Valid secrets allow startup
- **WHEN** ambos secrets estão definidos, >= 32 caracteres e diferentes
- **THEN** Backend inicia normalmente

### Requirement: CORS is whitelist-based, not origin: true
O sistema SHALL usar CORS whitelist-based com `CORS_ORIGINS` env var, nunca `origin: true`.

#### Scenario: Request from whitelisted origin is accepted
- **WHEN** `CORS_ORIGINS=https://farizeu.bancaflow.com.br` e request vem desse origin
- **THEN** resposta inclui `Access-Control-Allow-Origin: https://farizeu.bancaflow.com.br`

#### Scenario: Request from non-whitelisted origin is rejected
- **WHEN** `CORS_ORIGINS=https://farizeu.bancaflow.com.br` e request vem de outro origin
- **THEN** CORS headers não são incluídos; navegador rejeita

### Requirement: DTOs validate input with class-validator
O sistema SHALL validar todos os DTOs de entrada usando `class-validator` decorators (`@IsString()`, `@MinLength()`, etc.).

#### Scenario: Invalid DTO is rejected
- **WHEN** request body não atende schema de DTO
- **THEN** NestJS retorna `400` com lista de erros de validação

#### Scenario: Valid DTO is accepted
- **WHEN** request body atende schema
- **THEN** DTO é populado e caso de uso é chamado

### Requirement: Prisma errors do not leak to client
O sistema SHALL capturar erros Prisma, traduzir para erro de domínio estável e nunca retornar `error.message` bruto.

#### Scenario: Database connection error is generic
- **WHEN** Prisma falha por conexão
- **THEN** cliente recebe `500 Internal Server Error` sem detalhes técnicos

#### Scenario: Validation error is translation
- **WHEN** Prisma valida constraint e retorna erro
- **THEN** adapter traduz para `Result.fail(IDENTITY.USERNAME_ALREADY_EXISTS)` ou similar

### Requirement: Role is mandatory in account creation
O sistema SHALL exigir `role` explícito em DTOs de criação de conta, nunca assumindo `USER` implicitamente.

#### Scenario: Role is required field
- **WHEN** `CreateUserAccountDto` é validado sem `role`
- **THEN** validation falha; `400` retornado

#### Scenario: ProvisionBanca passes OWNER explicitly
- **WHEN** `ProvisionBancaUseCase` chama `CreateUserAccountPort`
- **THEN** input contém `role: 'OWNER'` explicitamente, não confiando em default
