## ADDED Requirements

### Requirement: Create session on login
O sistema SHALL criar uma sessão ao autenticar com sucesso, armazenando o digest HMAC-SHA-256 do refresh token, expiração de 7 dias e metadados opcionais de dispositivo.

#### Scenario: Session is created on successful login
- **WHEN** o login é bem-sucedido
- **THEN** uma nova sessão é criada com `userId`, `bancaId`, `refreshTokenDigest`, `expiresAt = now + 7 dias`, `revokedAt = null` e metadados do dispositivo (user-agent, IP)

### Requirement: Refresh session with rotating refresh token
O sistema SHALL aceitar o refresh token atual, invalidar o token anterior ao substituir seu digest na sessão e emitir novos access e refresh tokens.

#### Scenario: Valid refresh token rotates successfully
- **WHEN** o cliente envia um refresh token válido e não revogado
- **THEN** o sistema atualiza a sessão com novo hash, nova expiração e retorna novos tokens (access + refresh)

#### Scenario: Revoked refresh token is rejected
- **WHEN** o cliente envia um refresh token que já foi rotacionado ou revogado
- **THEN** o sistema retorna `401` com mensagem genérica

#### Scenario: Expired refresh token is rejected
- **WHEN** o refresh token está expirado (`expiresAt` no passado)
- **THEN** o sistema retorna `401` e o cliente deve fazer novo login

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
O sistema SHALL listar as sessões ativas do usuário e permitir revogação individual.

#### Scenario: List sessions shows active sessions
- **WHEN** o usuário solicita a listagem de sessões
- **THEN** o sistema retorna somente sessões não revogadas e não expiradas do `userId` e `bancaId` do token

#### Scenario: Individual session revocation
- **WHEN** o usuário revoga uma sessão específica por `sessionId`
- **THEN** somente aquela sessão tem `revokedAt` preenchido

#### Scenario: Cannot revoke session of another banca
- **WHEN** o usuário tenta revogar uma `sessionId` que pertence a outro `bancaId`
- **THEN** o sistema retorna `404` (não revela que a sessão existe)

### Requirement: Refresh token stored only as deterministic digest
O sistema SHALL armazenar somente o digest HMAC-SHA-256 determinístico do refresh token, usando segredo diferente do JWT. O valor original é enviado ao cliente e nunca persistido. Bcrypt SHALL ser usado somente para senhas.

#### Scenario: Refresh token is opaque and hashed
- **WHEN** uma sessão é criada ou rotacionada
- **THEN** o banco contém apenas `refreshTokenDigest`; o token bruto é retornado somente ao cliente no cookie

#### Scenario: Refresh token expires after seven days
- **WHEN** uma sessão é criada ou rotacionada
- **THEN** sua expiração é definida para 7 dias após a emissão, salvo configuração explícita de ambiente
