## MODIFIED Requirements

### Requirement: Protect routes with JWT guard
O sistema SHALL proteger todos os endpoints privados com um guard NestJS que valida, em fronteira confiável e a cada requisição: (1) **autenticidade** — assinatura e expiração do access token verificadas pelo framework, não apenas decodificação; (2) **estado da sessão** — a sessão identificada por `sessionId` existe no banco, não está revogada e não expirou; (3) **estado da conta e da banca** — conta `ACTIVE` e não bloqueada, banca `ACTIVE`. Decodificar o JWT sem essa validação NÃO é autenticação suficiente.

#### Scenario: Valid token with active session grants access
- **WHEN** o access token tem assinatura válida e não expirada, a sessão existe com `revokedAt IS NULL` e não expirada, a conta está `ACTIVE` e a banca `ACTIVE`
- **THEN** o guard injeta o contexto autenticado (`userId`, `bancaId`, `sessionId`, `role`, `mustChangePassword`) e permite o acesso

#### Scenario: Forged or tampered token is rejected
- **WHEN** o cliente envia um token com claims falsificados ou assinatura inválida
- **THEN** a verificação de assinatura falha e o sistema retorna `401`, sem confiar no conteúdo decodificado

#### Scenario: Expired token is rejected
- **WHEN** o access token está expirado (60 minutos)
- **THEN** o sistema retorna `401`; o cliente deve usar o refresh token para renovar

#### Scenario: Revoked session is rejected
- **WHEN** o token é válido mas a sessão correspondente (`sessionId`) tem `revokedAt` preenchido
- **THEN** o sistema retorna `401`

#### Scenario: Blocked or inactive account is rejected
- **WHEN** o token e a sessão são válidos, mas a conta está `BLOCKED` ou `INACTIVE`
- **THEN** o sistema retorna `401`, mesmo que a sessão ainda não tivesse sido revogada

#### Scenario: Inactive banca is rejected
- **WHEN** o token, a sessão e a conta são válidos, mas a banca está `INACTIVE`
- **THEN** o sistema retorna `401` e a sessão anterior não pode ser usada

#### Scenario: mustChangePassword restricts protected routes
- **WHEN** um token com `mustChangePassword == true` acessa qualquer rota protegida exceto a de troca obrigatória de senha
- **THEN** o guard retorna `403` com `IDENTITY.MUST_CHANGE_PASSWORD`

### Requirement: bancaId from body cannot override authenticated context
O sistema SHALL usar exclusivamente o `bancaId` extraído do token JWT autenticado para todas as operações autenticadas.

#### Scenario: bancaId in body is ignored
- **WHEN** uma requisição autenticada inclui `bancaId` no body
- **THEN** o sistema ignora esse valor e usa apenas o `bancaId` do token

#### Scenario: Operations are scoped to authenticated bancaId
- **WHEN** qualquer caso de uso autenticado é executado
- **THEN** o `bancaId` passado ao caso de uso vem exclusivamente do token autenticado

## ADDED Requirements

### Requirement: Persistence errors do not leak to the client
O backend SHALL traduzir erros de persistência (Prisma) para erros de domínio estáveis, nunca retornando `error.message` bruto nem detalhes internos ao cliente. Logs internos NÃO SHALL conter dados sensíveis (senhas, tokens, digests).

#### Scenario: Database failure returns a generic error
- **WHEN** uma operação falha por erro de conexão ou exceção interna do Prisma
- **THEN** o cliente recebe um erro genérico (ex.: `500`) sem detalhes técnicos

#### Scenario: Constraint violation is translated to a stable error
- **WHEN** o banco rejeita por violação de constraint (ex.: username duplicado)
- **THEN** o adapter traduz para um erro de domínio estável (ex.: `IDENTITY.USERNAME_ALREADY_EXISTS`), sem vazar a mensagem do banco
