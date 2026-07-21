## Purpose

Define how backend routes are protected with JWT guards, claims validation, and tenant isolation. Ensures only authenticated and authorized users can access protected resources.

---

## Requirements

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

### Requirement: Persistence errors do not leak to the client
O backend SHALL traduzir erros de persistência (Prisma) para erros de domínio estáveis, nunca retornando `error.message` bruto nem detalhes internos ao cliente. Logs internos NÃO SHALL conter dados sensíveis (senhas, tokens, digests).

#### Scenario: Database failure returns a generic error
- **WHEN** uma operação falha por erro de conexão ou exceção interna do Prisma
- **THEN** o cliente recebe um erro genérico (ex.: `500`) sem detalhes técnicos

#### Scenario: Constraint violation is translated to a stable error
- **WHEN** o banco rejeita por violação de constraint (ex.: username duplicado)
- **THEN** o adapter traduz para um erro de domínio estável (ex.: `IDENTITY.USERNAME_ALREADY_EXISTS`), sem vazar a mensagem do banco

### Requirement: ToggleAccountStatusUseCase authorizes via the permission catalog, not a raw role check
`ToggleAccountStatusUseCase` SHALL substituir sua checagem de papel bruto (`actorRole !== 'OWNER' && actorRole !== 'ADMIN'`) pela consulta à porta `hasPermission(actorRole, 'identity.accounts.toggle-status')` do catálogo autoritativo de Access Control. A invariante contextual "`ADMIN` nunca altera o status de uma conta `OWNER`" SHALL permanecer como validação explícita no domínio de Identity, executada após a checagem de permissão, e NÃO SHALL ser representada como uma `PermissionKey`. A negação de permissão SHALL retornar o mesmo erro de autorização já padronizado (`FORBIDDEN`) usado pelas demais checagens de autorização do sistema.

#### Scenario: Action allowed when the actor role holds the permission
- **WHEN** `hasPermission(actorRole, 'identity.accounts.toggle-status')` retorna `true` e a invariante contextual (alvo não é `OWNER` quando o ator é `ADMIN`) é satisfeita
- **THEN** `ToggleAccountStatusUseCase` executa a ação normalmente

#### Scenario: Action denied when the permission is not granted
- **WHEN** `hasPermission(actorRole, 'identity.accounts.toggle-status')` retorna `false` (papel `USER`)
- **THEN** `ToggleAccountStatusUseCase` recusa a ação e retorna `FORBIDDEN`, sem avaliar a invariante contextual

#### Scenario: Contextual invariant still blocks ADMIN targeting OWNER even with permission granted
- **WHEN** o ator é `ADMIN` (permissão `identity.accounts.toggle-status` concedida pelo catálogo) e o alvo da operação possui papel `OWNER`
- **THEN** `ToggleAccountStatusUseCase` recusa a ação e retorna `FORBIDDEN`, pois a invariante contextual de Identity — não o catálogo de permissões — proíbe essa combinação

#### Scenario: Unknown permission key referenced by a use case is a configuration error
- **WHEN** um caso de uso referencia uma `PermissionKey` que não existe no catálogo autoritativo
- **THEN** o sistema trata isso como erro de configuração/programação, detectável antes de produção, não como uma negação de autorização em runtime

### Requirement: AdminResetPasswordUseCase authorizes via the permission catalog, not a raw role check
`AdminResetPasswordUseCase` SHALL substituir sua checagem de papel bruto (`actorRole !== 'OWNER' && actorRole !== 'ADMIN'`) pela consulta à porta `hasPermission(actorRole, 'identity.accounts.reset-password')` do catálogo autoritativo de Access Control. A invariante contextual "`ADMIN` nunca reseta a senha de uma conta `OWNER`" SHALL permanecer como validação explícita no domínio de Identity, executada após a checagem de permissão, e NÃO SHALL ser representada como uma `PermissionKey`.

#### Scenario: Action allowed when the actor role holds the permission
- **WHEN** `hasPermission(actorRole, 'identity.accounts.reset-password')` retorna `true` e a invariante contextual (alvo não é `OWNER` quando o ator é `ADMIN`) é satisfeita
- **THEN** `AdminResetPasswordUseCase` executa a ação normalmente

#### Scenario: Action denied when the permission is not granted
- **WHEN** `hasPermission(actorRole, 'identity.accounts.reset-password')` retorna `false` (papel `USER`)
- **THEN** `AdminResetPasswordUseCase` recusa a ação e retorna `FORBIDDEN`, sem avaliar a invariante contextual

#### Scenario: Contextual invariant still blocks ADMIN targeting OWNER even with permission granted
- **WHEN** o ator é `ADMIN` (permissão `identity.accounts.reset-password` concedida pelo catálogo) e o alvo da operação possui papel `OWNER`
- **THEN** `AdminResetPasswordUseCase` recusa a ação e retorna `FORBIDDEN`, pois a invariante contextual de Identity — não o catálogo de permissões — proíbe essa combinação

### Requirement: Self-service use cases authorize via the permission catalog, with real consumers for every self-service key
`GetAuthenticatedUserContextUseCase`, `UpdateOwnProfileUseCase` e `ChangePasswordUseCase` SHALL consultar `hasPermission` para, respectivamente, `identity.profile.read-own`, `identity.profile.update-own` e `identity.password.change-own`, antes de executar a operação. Nenhuma `PermissionKey` do catálogo autoritativo SHALL permanecer sem um consumidor real que a invoque via `hasPermission`.

#### Scenario: Own profile read is authorized via the catalog
- **WHEN** um ator autenticado com qualquer papel (`OWNER`, `ADMIN` ou `USER`) consulta `GET /api/auth/me`
- **THEN** `GetAuthenticatedUserContextUseCase` consulta `hasPermission(actorRole, 'identity.profile.read-own')` antes de compor o contexto de exibição

#### Scenario: Own profile update is authorized via the catalog
- **WHEN** um ator autenticado com qualquer papel atualiza o próprio nome/e-mail via `PATCH /api/auth/me`
- **THEN** `UpdateOwnProfileUseCase` consulta `hasPermission(actorRole, 'identity.profile.update-own')` antes de aplicar a mudança

#### Scenario: Own password change is authorized via the catalog
- **WHEN** um ator autenticado troca a própria senha via `PATCH /api/auth/password`
- **THEN** `ChangePasswordUseCase` consulta `hasPermission(account.role, 'identity.password.change-own')` (papel da própria conta já carregada) antes de validar a senha atual

#### Scenario: No catalog key is left without a real consumer
- **WHEN** as 9 `PermissionKey`s do catálogo autoritativo são inventariadas
- **THEN** cada uma corresponde a pelo menos um caso de uso real que a consulta via `hasPermission` — nenhuma existe apenas em catálogo/mapa/testes
