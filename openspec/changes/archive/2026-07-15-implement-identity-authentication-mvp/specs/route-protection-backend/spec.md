## ADDED Requirements

### Requirement: Protect routes with JWT guard
O sistema SHALL proteger todos os endpoints privados com um guard NestJS que valida o access token JWT.

#### Scenario: Valid token grants access
- **WHEN** a requisição inclui access token válido e não expirado no cookie
- **THEN** o guard extrai `userId`, `bancaId`, `sessionId`, `role` e `mustChangePassword` do payload, valida a sessão e injeta um contexto autenticado específico do Identity

#### Scenario: Legacy bearer flow is not active in parallel
- **WHEN** a autenticação por cookie desta change estiver habilitada
- **THEN** a estratégia JWT/Bearer anterior é substituída ou adaptada, não permanecendo como segundo sistema concorrente

#### Scenario: Missing token is rejected
- **WHEN** a requisição não inclui access token
- **THEN** o sistema retorna `401`

#### Scenario: Expired token is rejected
- **WHEN** o access token está expirado (60 minutos)
- **THEN** o sistema retorna `401`; o cliente deve usar o refresh token para renovar

#### Scenario: Revoked session is rejected
- **WHEN** o access token é válido mas a sessão correspondente (`sessionId`) foi revogada no banco
- **THEN** o sistema retorna `401`

### Requirement: bancaId from body cannot override authenticated context
O sistema SHALL usar exclusivamente o `bancaId` extraído do token JWT para todas as operações autenticadas.

#### Scenario: bancaId in body is ignored
- **WHEN** uma requisição autenticada inclui `bancaId` no body
- **THEN** o sistema ignora esse valor e usa apenas o `bancaId` do token

#### Scenario: Operations are scoped to authenticated bancaId
- **WHEN** qualquer caso de uso autenticado é executado
- **THEN** o `bancaId` passado ao caso de uso vem exclusivamente do token autenticado
