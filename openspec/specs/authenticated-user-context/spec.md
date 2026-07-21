## Purpose

Define the authenticated user context endpoint (`GET /api/auth/me`) that returns only the display context of the authenticated user and their banca, resolved exclusively from the validated `AuthContext`. This capability establishes how the endpoint composes an explicit read projection, preserves the established authentication policy, handles post-guard inconsistencies and technical failures safely, and keeps display data out of JWT application claims.

---

## Requirements

### Requirement: Authenticated user context endpoint
O sistema SHALL expor `GET /api/auth/me` no Identity, protegido pelo `JwtCookieAuthGuard`, para retornar somente o contexto de exibição do próprio usuário autenticado. O endpoint SHALL identificar usuário e banca exclusivamente por `userId` e `bancaId` do `AuthContext` validado e SHALL NOT aceitar identificadores autoritativos em body, query string ou parâmetro de rota.

O contrato de sucesso SHALL ser `{ userId, username, name, email, role, banca: { bancaId, codigoBanca, name } }`, onde `email` PODE ser `null`. Os dados da conta, incluindo `role`, SHALL refletir a projeção persistida atual de Identity; os dados da banca SHALL refletir a projeção atual de Tenancy.

#### Scenario: Authenticated user gets own current context
- **WHEN** um usuário com access token, sessão, conta e banca válidos chama `GET /api/auth/me`
- **THEN** o backend retorna `200` com `{ userId, username, name, email, role, banca: { bancaId, codigoBanca, name } }` referentes exclusivamente ao próprio usuário e à sua banca

#### Scenario: Missing email is represented explicitly
- **WHEN** a conta autenticada não possui e-mail
- **THEN** o backend retorna `email: null` sem omitir o campo nem fabricar um valor

#### Scenario: Persisted role is returned
- **WHEN** o papel persistido da conta difere de uma application claim antiga ainda presente no token
- **THEN** o campo `role` da resposta reflete a projeção persistida atual da conta

#### Scenario: Client-supplied identifiers have no authority
- **WHEN** a requisição tenta enviar outro `userId`, `bancaId` ou `codigoBanca` por body, query string ou parâmetro
- **THEN** o backend ignora esses valores e resolve o contexto somente a partir do `AuthContext` validado

### Requirement: Guard failures preserve the established authentication policy
O sistema SHALL aplicar as validações autoritativas do `JwtCookieAuthGuard` antes de executar a leitura de contexto e SHALL preservar os códigos públicos estabelecidos pelo guard. Token inválido ou autenticação ausente SHALL resultar em `401 INVALID_CREDENTIALS`; sessão revogada ou expirada SHALL resultar em `401 SESSION_REVOKED`; conta ausente, inativa ou bloqueada durante o guard SHALL resultar em `401 ACCOUNT_INACTIVE`; banca ausente ou inativa durante o guard SHALL resultar em `401 BANCA_INACTIVE`.

O endpoint SHALL permanecer sem `@AllowPasswordChange`; uma sessão com `mustChangePassword=true` SHALL resultar em `403 MUST_CHANGE_PASSWORD`.

#### Scenario: Missing or invalid access token is rejected
- **WHEN** a requisição chega sem cookie de access token válido ou com token inválido
- **THEN** o guard retorna `401 INVALID_CREDENTIALS` e nenhuma leitura de contexto é devolvida

#### Scenario: Revoked or expired session is rejected
- **WHEN** o token é válido, mas a sessão foi revogada ou expirou antes da validação do guard
- **THEN** o guard retorna `401 SESSION_REVOKED` e nenhuma leitura de contexto é devolvida

#### Scenario: Missing inactive or blocked account is rejected by the guard
- **WHEN** a conta está ausente, inativa ou bloqueada durante a validação do guard
- **THEN** o guard retorna `401 ACCOUNT_INACTIVE` sem expor o estado interno da conta

#### Scenario: Missing or inactive banca is rejected by the guard
- **WHEN** a banca está ausente ou inativa durante a validação do guard
- **THEN** o guard retorna `401 BANCA_INACTIVE` sem expor o estado interno da banca

#### Scenario: Mandatory password change remains enforced
- **WHEN** o contexto autenticado possui `mustChangePassword=true`
- **THEN** o guard bloqueia o endpoint com `403 MUST_CHANGE_PASSWORD`

### Requirement: Post-guard inconsistencies fail as invalid credentials
O sistema SHALL tratar ausência, inatividade, divergência ou mudança de estado detectada depois da aprovação do guard como inconsistência segura de autenticação. Conta ou banca que deixa de ser válida, `userId` que não pertence ao `bancaId`, divergência entre as projeções ou corrida equivalente SHALL resultar em `401 INVALID_CREDENTIALS`, sem contexto parcial, enumeração ou vazamento cross-tenant.

#### Scenario: User cannot cross tenant boundary
- **WHEN** o `userId` não pertence ao `bancaId` do `AuthContext` ou as projeções retornam bancas diferentes depois da aprovação do guard
- **THEN** o backend retorna `401 INVALID_CREDENTIALS` e não devolve dados da conta nem de outra banca

#### Scenario: Account changes after guard validation
- **WHEN** a conta deixa de existir, fica inativa ou bloqueada entre a aprovação do guard e a query de contexto
- **THEN** o backend retorna `401 INVALID_CREDENTIALS` sem contexto parcial

#### Scenario: Banca changes after guard validation
- **WHEN** a banca deixa de existir ou fica inativa entre a aprovação do guard e a query de contexto
- **THEN** o backend retorna `401 INVALID_CREDENTIALS` sem contexto parcial

### Requirement: Technical query failures return a safe internal server error
O sistema SHALL distinguir falhas técnicas de Identity, Tenancy, Query ou Prisma de ausências e inconsistências esperadas. Timeout, indisponibilidade, erro de conexão, exceção inesperada ou falha equivalente SHALL permanecer tecnicamente distinguível até a borda HTTP e SHALL resultar em `500` com resposta externa genérica.

A resposta externa SHALL NOT conter código interno, mensagem técnica, stack trace, detalhe Prisma ou informação sobre a existência de conta ou banca. A causa técnica SHALL ficar disponível somente para logging interno seguro. Falhas técnicas SHALL NOT ser convertidas em `400`, `401` ou ausência esperada, e o comportamento SHALL ser simétrico para origens em Identity e Tenancy.

#### Scenario: Identity query fails technically
- **WHEN** a query ou adapter de Identity falha por uma causa técnica ao atender `GET /api/auth/me`
- **THEN** o backend registra a causa internamente e retorna `500` genérico sem código ou detalhe técnico da causa

#### Scenario: Tenancy query fails technically
- **WHEN** a query, port ou adapter de Tenancy falha por uma causa técnica ao atender `GET /api/auth/me`
- **THEN** o backend registra a causa internamente e retorna `500` genérico com o mesmo contrato externo aplicado à falha técnica de Identity

#### Scenario: Technical failure is not reclassified as client or credential error
- **WHEN** uma falha técnica percorre o caso de uso e a tradução HTTP
- **THEN** ela não é convertida em `400`, `401 INVALID_CREDENTIALS` nem outro erro de estado esperado

### Requirement: Context response is an explicit read projection
O sistema SHALL montar a resposta com DTOs/projeções de leitura e SHALL NOT serializar `UserAccount`, `Banca`, rows Prisma ou objetos carregados pelo guard. A resposta SHALL NOT conter credential, password hash, refresh digest, contadores de falha, bloqueios, timestamps internos ou status operacional. A resposta SHALL conter `version` (o versionamento otimista corrente do `UserAccount`, o mesmo valor exposto pelo getter de domínio), destinado exclusivamente a permitir que o próprio ator submeta atualizações de perfil com concorrência otimista ([[self-profile-management]]); nenhum outro campo além dos já declarados no contrato SHALL ser adicionado.

#### Scenario: Domain entities never cross the HTTP boundary
- **WHEN** o endpoint monta uma resposta de sucesso
- **THEN** o payload contém exatamente a projeção pública declarada, sem entidades de domínio ou campos internos de persistência

#### Scenario: Active status is not redundantly exposed
- **WHEN** conta e banca válidas produzem uma resposta `200`
- **THEN** o payload não contém `isActive` nem outro status operacional já validado pelo guard

#### Scenario: Response exposes the optimistic concurrency version
- **WHEN** conta e banca válidas produzem uma resposta `200`
- **THEN** o payload contém `version` com o valor corrente de `UserAccount.version`, e nenhum outro campo internamente vedado (credential, hash, contadores de falha, bloqueios, timestamps internos, status operacional) é exposto

### Requirement: Endpoint does not leak display data into JWT application claims
O sistema SHALL manter dados de exibição fora das application claims do access token. Os access tokens emitidos por login e refresh SHALL conter somente as application claims `sub`, `bancaId`, `sessionId`, `role` e `mustChangePassword`. Claims padrão do JWT gerenciadas pela biblioteca, incluindo `iat` e `exp`, PODEM estar presentes e SHALL NOT ser tratadas como violação desse contrato. Nome, e-mail, username, código e nome da banca SHALL ser obtidos pela leitura autenticada e SHALL NOT ser adicionados ao token.

#### Scenario: Login access token keeps application claims minimal
- **WHEN** o access token emitido pelo login é decodificado
- **THEN** contém somente `sub`, `bancaId`, `sessionId`, `role` e `mustChangePassword` como application claims, pode conter claims JWT padrão como `iat` e `exp` e não contém dados de exibição

#### Scenario: Refreshed access token keeps application claims minimal
- **WHEN** o access token emitido pelo refresh é decodificado
- **THEN** contém somente `sub`, `bancaId`, `sessionId`, `role` e `mustChangePassword` como application claims, pode conter claims JWT padrão como `iat` e `exp` e não contém dados de exibição
