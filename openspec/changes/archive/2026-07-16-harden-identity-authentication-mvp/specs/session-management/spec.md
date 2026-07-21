## MODIFIED Requirements

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

## ADDED Requirements

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
O sistema SHALL revogar todas as sessões ativas de uma conta na **mesma transação** em que a conta é bloqueada ou desativada, de modo que tokens já emitidos deixem de valer imediatamente.

#### Scenario: Blocking revokes all active sessions in the same transaction
- **WHEN** uma conta transita para `BLOCKED` ou `INACTIVE`
- **THEN** na mesma transação executa-se `UPDATE Session SET revokedAt = now WHERE userId = ? AND bancaId = ? AND revokedAt IS NULL`; se qualquer etapa falhar, nada é confirmado

#### Scenario: Previously issued token stops working after revocation
- **WHEN** um access token emitido antes do bloqueio é usado após a revogação das sessões
- **THEN** o guard encontra a sessão com `revokedAt` preenchido e retorna `401`

### Requirement: Session dates are always valid and future-bounded
O agregado `Session` SHALL garantir invariantes de data: `expiresAt` de criação e de rotação é sempre uma data futura válida; `revokedAt`, quando presente, não é anterior à criação; datas expostas são cópias defensivas.

#### Scenario: Rotation sets a future expiry validated against now
- **WHEN** `rotate(newDigest, newExpiresAt, now)` é chamado (recebendo `now` da port `Clock`)
- **THEN** o método rejeita `newExpiresAt <= now` e só produz nova instância com expiração futura válida. A referência é sempre `now` — NUNCA a `expiresAt` atual da sessão (que aceitaria data passada se a sessão já expirou)

#### Scenario: Exposed dates cannot mutate internal state
- **WHEN** um consumidor lê uma data da sessão e a modifica
- **THEN** o estado interno da entidade permanece inalterado (cópia defensiva)
