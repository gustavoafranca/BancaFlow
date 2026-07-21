## MODIFIED Requirements

### Requirement: Authenticate with username and password in banca context
O sistema SHALL autenticar um usuário usando `username` e `password` dentro do contexto de banca resolvido pelo subdomínio. O `codigoBanca` NUNCA é enviado pelo cliente no body.

#### Scenario: Successful authentication
- **WHEN** a banca `farizeu` existe e está ativa, a conta com `username = "joao"` existe e está ativa, e a senha fornecida é válida
- **THEN** o sistema emite access token JWT (60 min) e refresh token opaco, zera `failedLoginAttempts`, cria uma sessão e retorna os tokens

#### Scenario: Wrong password returns generic error with counter increment
- **WHEN** a banca existe, a conta existe, mas a senha está errada
- **THEN** o sistema retorna `401` com mensagem genérica sem revelar se o username ou a banca existem, e incrementa `failedLoginAttempts` **persistentemente** mesmo em falha (regra de negócio que persiste)

#### Scenario: Non-existent username returns generic error
- **WHEN** a banca existe mas o username não existe nela
- **THEN** o sistema retorna `401` com a mesma mensagem genérica que senha errada (proteção contra enumeração)

#### Scenario: Login never queries outside resolved bancaId
- **WHEN** qualquer operação de autenticação é executada
- **THEN** todas as queries de `UserAccount` incluem obrigatoriamente `bancaId = <bancaId resolvido pelo host>`

### Requirement: Failed login attempt tracking
O sistema SHALL contar falhas de login por conta usando `failedLoginAttempts`, `failedLoginWindowStartedAt` e `lockedUntil`, bloqueando automaticamente após 5 falhas dentro de 15 minutos. **O incremento é serializado por lock pessimista (`SELECT ... FOR UPDATE`) na linha da conta, dentro de uma transação, sem perder incrementos sob concorrência.** O `LoginUseCase` NÃO ignora o resultado da persistência da falha.

#### Scenario: Fifth failure within 15 minutes locks account
- **WHEN** a quinta tentativa de login com senha inválida ocorre dentro de 15 minutos para a mesma conta
- **THEN** a conta é bloqueada por 15 minutos (`lockedUntil = now + 15min`) e o sistema retorna `401`

#### Scenario: Failure outside window does not count
- **WHEN** falhas anteriores ocorreram fora da janela de 15 minutos
- **THEN** o sistema inicia uma nova janela em `now`, define o contador como 1 e desconsidera as falhas anteriores

#### Scenario: Lockout expires automatically
- **WHEN** a conta está bloqueada e o tempo de bloqueio de 15 minutos expirou
- **THEN** o próximo login com credenciais corretas é aceito e o contador é zerado

#### Scenario: Successful login resets failure counter and clears window
- **WHEN** o usuário autentica com sucesso
- **THEN** `failedLoginAttempts = 0`, `failedLoginWindowStartedAt = null` e `lockedUntil = null` são persistidos

#### Scenario: Login against locked account is rejected immediately
- **WHEN** a conta está bloqueada (`lockedUntil` no futuro) mesmo com credenciais corretas
- **THEN** o sistema retorna `401` com mensagem genérica sem tentar validar a senha

#### Scenario: Five concurrent failed logins result in correct block
- **WHEN** cinco requisições simultâneas de login com senha errada chegam para a mesma conta
- **THEN** o lock pessimista serializa os incrementos e ao final `failedLoginAttempts === 5` (valor **exato**, não uma faixa) e `lockedUntil` é definido corretamente

### Requirement: Access token contains required claims
O access token JWT SHALL conter, no mínimo, `userId`, `bancaId`, `sessionId`, `role` e `mustChangePassword`. O `bancaId` do body de qualquer requisição posterior NUNCA é considerado.

#### Scenario: Token carries mandatory claims
- **WHEN** um access token é emitido após login bem-sucedido
- **THEN** o payload decodificado contém `sub` (userId), `bancaId`, `sessionId`, `role` e `mustChangePassword`

#### Scenario: bancaId from body is ignored
- **WHEN** uma requisição autenticada inclui `bancaId` no body com valor diferente do token
- **THEN** o sistema usa exclusivamente o `bancaId` do token para todas as operações

## ADDED Requirements

### Requirement: Login uses transactional atomicity for counter and token emission
O sistema SHALL garantir que, no sucesso do login, a escrita de reset do contador, a criação da sessão e a emissão de token sejam atômicas, causando rollback se falha ocorrer em qualquer etapa posterior a uma escrita ([[transaction-consistency]]). A persistência do contador de falhas em caso de senha incorreta é regra de negócio e permanece confirmada (não sofre rollback).

#### Scenario: Token emission failure rolls back session and reset
- **WHEN** `LoginUseCase` cria a sessão e zera o contador com sucesso, mas falha ao emitir o token
- **THEN** a transação é revertida completamente; o banco não reflete a nova sessão; o cliente recebe erro genérico

#### Scenario: Failed-password counter increment is not rolled back
- **WHEN** o login falha por senha incorreta
- **THEN** o incremento de `failedLoginAttempts` é confirmado (regra de negócio que persiste), diferentemente das falhas técnicas que revertem
