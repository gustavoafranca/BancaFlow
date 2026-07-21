## Purpose

Define session lifecycle management including creation, refresh token rotation, logout mechanisms, and secure storage of tokens. Ensures sessions are properly tracked, rotated, and revoked.

---
## Requirements
### Requirement: Create session on login
O sistema SHALL criar uma sessão ao autenticar com sucesso, armazenando o digest HMAC-SHA-256 do refresh token, expiração de 7 dias e metadados opcionais de dispositivo.

#### Scenario: Session is created on successful login
- **WHEN** o login é bem-sucedido
- **THEN** uma nova sessão é criada com `userId`, `bancaId`, `refreshTokenDigest`, `expiresAt = now + 7 dias`, `revokedAt = null` e metadados do dispositivo (user-agent, IP)

### Requirement: Refresh session with rotating refresh token
O sistema SHALL aceitar o refresh token atual e rotacioná-lo de forma **atômica e de uso único** via compare-and-swap que também exige que a sessão esteja **ativa** no próprio predicado: `UPDATE Session SET refreshTokenDigest = newDigest, expiresAt = newExpiresAt WHERE id = ? AND refreshTokenDigest = oldDigest AND revokedAt IS NULL AND expiresAt > now`. Se nenhuma linha for atualizada (digest mudou, ou sessão revogada/expirada), a operação falha. A port `SessionRepository.rotateIfDigestMatches(sessionId, oldDigest, newDigest, newExpiresAt, now)` **recebe `now`** da port `Clock`; o adapter Prisma NUNCA chama `new Date()`. Isso fecha a corrida (TOCTOU) em que uma sessão revogada entre a leitura do domínio e o `UPDATE` ainda rotacionava.

#### Scenario: Valid refresh token rotates successfully
- **WHEN** o cliente envia um refresh token válido, não revogado e não expirado
- **THEN** o `oldDigest` casa exatamente uma linha ativa, o `newDigest` é gravado, novos access + refresh tokens são emitidos e o token anterior nunca mais funciona

#### Scenario: Revoked or already-rotated token is rejected
- **WHEN** o cliente envia um refresh token cujo digest não existe mais (já rotacionado ou revogado)
- **THEN** o `UPDATE` afeta 0 linhas e o sistema retorna `Result.fail(IDENTITY.SESSION_REVOKED)` / `401` genérico, sem emitir tokens

#### Scenario: Session revoked between read and rotation is rejected
- **WHEN** a sessão é revogada após a leitura do domínio e antes do `UPDATE` de rotação
- **THEN** o predicado `revokedAt IS NULL` faz o `UPDATE` afetar 0 linhas; nenhum token é emitido (a corrida está fechada)

#### Scenario: Concurrent refresh with the same token — only one wins
- **WHEN** duas requisições simultâneas enviam o mesmo refresh token para a mesma sessão
- **THEN** apenas o primeiro compare-and-swap atualiza 1 linha e recebe tokens novos; o segundo afeta 0 linhas e recebe `401`

#### Scenario: Expired refresh token is rejected
- **WHEN** o refresh token está expirado (`expiresAt <= now`, com `now` da `Clock`)
- **THEN** o predicado `expiresAt > now` faz a rotação afetar 0 linhas; o cliente recebe `401` e deve fazer novo login

### Requirement: Logout current session
O sistema SHALL revogar a sessão associada ao access token atual.

#### Scenario: Logout invalidates current session
- **WHEN** o usuário faz logout com access token válido
- **THEN** `revokedAt` é preenchido na sessão correspondente; refresh token desse dispositivo não funciona mais

### Requirement: Logout all sessions
O sistema SHALL revogar todas as sessões ativas do usuário autenticado.

#### Scenario: Global logout invalidates all sessions
- **WHEN** o usuário solicita logout global
- **THEN** todas as sessões do `userId` no `bancaId` têm `revokedAt` preenchido

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

### Requirement: Refresh token stored only as deterministic digest
O sistema SHALL armazenar somente o digest HMAC-SHA-256 determinístico do refresh token, usando segredo diferente do JWT, e o banco SHALL impor `UNIQUE(refreshTokenDigest)`. O valor original é enviado ao cliente e nunca persistido. Bcrypt SHALL ser usado somente para senhas.

#### Scenario: Refresh token is opaque and hashed
- **WHEN** uma sessão é criada ou rotacionada
- **THEN** o banco contém apenas `refreshTokenDigest`; o token bruto é retornado somente ao cliente no cookie

#### Scenario: Duplicate digest is rejected by the database
- **WHEN** por corrida ou reuso duas gravações tentam persistir o mesmo `refreshTokenDigest`
- **THEN** a constraint `UNIQUE(refreshTokenDigest)` rejeita a segunda; o adapter traduz para erro genérico ao cliente

#### Scenario: Refresh token expires after seven days
- **WHEN** uma sessão é criada ou rotacionada
- **THEN** sua expiração é definida para 7 dias após a emissão, salvo configuração explícita de ambiente

### Requirement: Session belongs to its account within the same banca
O banco SHALL impedir que uma `Session` referencie um `UserAccount` de outra banca, via chave estrangeira composta `(userId, bancaId)` → `UserAccount(id, bancaId)`. O isolamento por banca NÃO depende apenas de filtros de aplicação.

#### Scenario: Session references user within the same banca
- **WHEN** uma sessão é persistida com `(userId, bancaId)`
- **THEN** a FK composta garante que o usuário referenciado pertence exatamente àquela banca

#### Scenario: Cross-banca session is rejected by the database
- **WHEN** uma gravação tenta inserir uma sessão cujo `userId` pertence a uma banca diferente de `bancaId`
- **THEN** o banco rejeita por violação de FK composta e a transação é revertida

#### Scenario: Migration keeps existing MVP data valid
- **WHEN** a migration que adiciona a FK composta é aplicada sobre os dados do MVP
- **THEN** ela é reversível e compatível com as sessões existentes (que já respeitam a coerência de banca)

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

### Requirement: Session dates are always valid and future-bounded
O agregado `Session` SHALL garantir invariantes de data: `expiresAt` de criação e de rotação é sempre uma data futura válida; `revokedAt`, quando presente, não é anterior à criação; datas expostas são cópias defensivas.

#### Scenario: Rotation sets a future expiry validated against now
- **WHEN** `rotate(newDigest, newExpiresAt, now)` é chamado (recebendo `now` da port `Clock`)
- **THEN** o método rejeita `newExpiresAt <= now` e só produz nova instância com expiração futura válida. A referência é sempre `now` — NUNCA a `expiresAt` atual da sessão (que aceitaria data passada se a sessão já expirou)

#### Scenario: Exposed dates cannot mutate internal state
- **WHEN** um consumidor lê uma data da sessão e a modifica
- **THEN** o estado interno da entidade permanece inalterado (cópia defensiva)

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

### Requirement: Logout confirmations preserve backend session contracts
Confirmações de logout no Web SHALL chamar os contratos existentes de logout local e logout global sem alterar semântica backend. A UI SHALL redirecionar somente após sucesso e manter o modal aberto em falha.

#### Scenario: Local logout keeps global sessions contract unchanged
- **WHEN** o usuário confirma `Sair deste dispositivo`
- **THEN** o Web chama somente a API de logout da sessão atual e não tenta revogar todas as sessões pelo cliente

#### Scenario: Global logout keeps all-sessions contract unchanged
- **WHEN** o usuário confirma `Sair de todos os dispositivos`
- **THEN** o Web chama somente a API de logout global e aguarda sucesso antes de navegar para `/login`

