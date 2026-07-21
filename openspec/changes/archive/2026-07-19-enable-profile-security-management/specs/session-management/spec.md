## MODIFIED Requirements

### Requirement: List and revoke individual sessions
O sistema SHALL listar as sessões ativas do usuário e permitir revogação individual. A listagem SHALL incluir, para cada sessão, `expiresAt` (a expiração já persistida) e `isCurrent` (calculado exclusivamente no Backend a partir do `sessionId` do `AuthContext` da própria requisição, nunca decodificado ou inferido no cliente). Nenhum campo de IP, geolocalização ou "última atividade" SHALL ser adicionado à listagem.

#### Scenario: List sessions shows active sessions
- **WHEN** o usuário solicita a listagem de sessões
- **THEN** o sistema retorna somente sessões não revogadas e não expiradas do `userId` e `bancaId` do token

#### Scenario: Listing marks the current session
- **WHEN** o usuário autenticado com `sessionId` `S1` solicita a listagem de sessões e `S1` está entre as ativas
- **THEN** a sessão `S1` na resposta tem `isCurrent: true` e todas as demais têm `isCurrent: false`

#### Scenario: Listing exposes expiry without internal or activity data
- **WHEN** a listagem de sessões é retornada
- **THEN** cada item contém `sessionId`, `createdAt`, `expiresAt`, `isCurrent` e `deviceInfo` opcional, sem IP, geolocalização, "última atividade" ou qualquer campo de sessão de outra banca

#### Scenario: Individual session revocation
- **WHEN** o usuário revoga uma sessão específica por `sessionId`
- **THEN** somente aquela sessão tem `revokedAt` preenchido

#### Scenario: Cannot revoke session of another banca
- **WHEN** o usuário tenta revogar uma `sessionId` que pertence a outro `bancaId`
- **THEN** o sistema retorna `404 IDENTITY.TARGET_SESSION_NOT_FOUND` (não revela que a sessão existe)

#### Scenario: Missing or already-revoked target session returns 404, not an authentication failure
- **WHEN** o usuário tenta revogar uma `sessionId` que já não existe (ex.: expirou ou já foi encerrada por outra requisição concorrente) ou que pertence a outro usuário da mesma banca
- **THEN** o sistema retorna `404 IDENTITY.TARGET_SESSION_NOT_FOUND`, um código distinto de `IDENTITY.SESSION_NOT_FOUND` (reservado à ausência da própria sessão do ator autenticado) e de qualquer código mapeado para `401` — a sessão do próprio ator que fez a requisição permanece válida e não é afetada
