## MODIFIED Requirements

### Requirement: Blocking or deactivating an account revokes its sessions atomically
O sistema SHALL revogar todas as sessões ativas de uma conta na **mesma transação** em que a conta é bloqueada, desativada, ou tem seu papel alterado (`ADMIN⇄USER`), de modo que tokens já emitidos deixem de valer imediatamente. Troca de papel revoga sessões porque `role` é uma claim do access token; troca de `username`, nome ou e-mail de terceiro NÃO revoga sessão, pois nenhum desses campos é claim do token.

#### Scenario: Blocking revokes all active sessions in the same transaction
- **WHEN** uma conta transita para `BLOCKED` ou `INACTIVE`
- **THEN** na mesma transação executa-se `UPDATE Session SET revokedAt = now WHERE userId = ? AND bancaId = ? AND revokedAt IS NULL`; se qualquer etapa falhar, nada é confirmado

#### Scenario: Role change revokes all active sessions in the same transaction
- **WHEN** o papel de uma conta é alterado entre `ADMIN` e `USER` por um `OWNER`
- **THEN** na mesma transação em que o novo papel é persistido, todas as sessões ativas da conta são revogadas; a próxima requisição da conta com o token antigo é rejeitada pelo guard

#### Scenario: Username, name, or email change does not revoke sessions
- **WHEN** o `username`, `name` ou `email` de uma conta de terceiro é atualizado por um `OWNER`
- **THEN** nenhuma sessão ativa dessa conta é revogada, pois nenhum desses campos é claim do access token

#### Scenario: Previously issued token stops working after revocation
- **WHEN** um access token emitido antes do bloqueio, da desativação ou da troca de papel é usado após a revogação das sessões
- **THEN** o guard encontra a sessão com `revokedAt` preenchido e retorna `401`

## ADDED Requirements

### Requirement: Administrative session query and revocation for a third-party account
O sistema SHALL permitir que um `OWNER` consulte (`GET /api/accounts/:accountId/sessions`) e revogue individualmente (`DELETE /api/accounts/:accountId/sessions/:sessionId`) as sessões de uma conta `ADMIN` ou `USER` da própria banca, autorizado por `identity.accounts.sessions.read` e `identity.accounts.sessions.revoke` respectivamente. Esses endpoints são distintos dos endpoints de autosserviço (`GET /api/auth/sessions`, `DELETE /api/auth/sessions/:sessionId`), que continuam operando exclusivamente sobre a sessão do próprio ator. A listagem administrativa reaproveita o mesmo `SessionInfoDto` do autosserviço (`sessionId`, `createdAt`, `expiresAt`, `isCurrent`, `deviceInfo` opcional), sem criar uma forma paralela: como o ator nunca consulta as próprias sessões por este endpoint (autoconsulta é rejeitada, ver escopo abaixo), `isCurrent` SHALL ser sempre `false` para todo item retornado por esta listagem administrativa.

#### Scenario: Owner lists sessions of a third-party account in the same banca
- **WHEN** um `OWNER` consulta `GET /api/accounts/:accountId/sessions` para uma conta `ADMIN` ou `USER` da própria banca
- **THEN** o sistema retorna as sessões ativas dessa conta, todas com `isCurrent: false`

#### Scenario: Owner revokes a specific session of a third-party account
- **WHEN** um `OWNER` executa `DELETE /api/accounts/:accountId/sessions/:sessionId` para uma sessão pertencente à conta indicada, dentro da própria banca
- **THEN** somente aquela sessão recebe `revokedAt = now`; as demais sessões da conta permanecem ativas

#### Scenario: Cross-banca session lookup returns 404, never 403
- **WHEN** um `OWNER` tenta consultar ou revogar sessões de uma conta que pertence a outra banca, ou que não existe
- **THEN** o sistema retorna `404` em ambos os casos, sem revelar se a conta ou a sessão existem — `403` é reservado para quando o ator não possui `identity.accounts.sessions.read`/`.revoke`

#### Scenario: ADMIN and USER cannot query or revoke sessions of another account
- **WHEN** uma conta `ADMIN` ou `USER` tenta consultar ou revogar sessões de outra conta
- **THEN** o sistema retorna `403`

#### Scenario: Owner cannot use this endpoint on their own sessions
- **WHEN** um `OWNER` informa o próprio `userId` como `accountId` em `GET /api/accounts/:accountId/sessions` ou `DELETE /api/accounts/:accountId/sessions/:sessionId`
- **THEN** o sistema retorna `403`; a consulta/revogação das próprias sessões continua exclusiva de `GET /api/auth/sessions`/`DELETE /api/auth/sessions/:sessionId`
