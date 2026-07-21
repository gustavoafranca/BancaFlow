## MODIFIED Requirements

### Requirement: Store password as bcrypt hash
O sistema SHALL armazenar senhas exclusivamente como hash bcrypt com custo configurável (padrão: 12). Nunca armazenar ou logar a senha em texto puro.

#### Scenario: Password is stored as hash
- **WHEN** uma conta é criada com senha `"dev@123"`
- **THEN** o banco contém somente o hash bcrypt correspondente; a senha original não é acessível

### Requirement: Voluntary password change
Um usuário autenticado SHALL poder alterar voluntariamente a própria senha informando a senha atual (validada contra hash) e a nova senha (rejeitada se fraca pela política autoritativa do domínio).

#### Scenario: Successful voluntary change
- **WHEN** o usuário fornece a senha atual correta e uma nova senha **forte**
- **THEN** a senha é atualizada, `passwordChangedAt` é renovado, **todas as OUTRAS sessões são revogadas** (não a atual), novo token é emitido com `mustChangePassword = false`

#### Scenario: Wrong current password rejects change
- **WHEN** o usuário fornece a senha atual incorreta
- **THEN** o sistema retorna `400` sem revelar informação adicional; nada é alterado

#### Scenario: Weak new password rejects change
- **WHEN** o usuário fornece nova senha fraca
- **THEN** o sistema retorna `400 IDENTITY.PASSWORD_TOO_WEAK`; nada é alterado

#### Scenario: Session revocation is transactional
- **WHEN** troca voluntária bem-sucedida ocorre
- **THEN** em transação: (1) persistir hash novo, (2) revogar outras sessões, (3) emitir novo token. Se qualquer etapa falha, tudo é revertido.

### Requirement: Administrative password reset with temporary password
Uma conta com papel `OWNER` ou `ADMIN` SHALL poder redefinir a senha de conta autorizada da própria banca, gerando uma senha temporária **forte** (satisfazendo política) que é devolvida uma única vez e obriga troca no próximo acesso. Uma conta `ADMIN` não pode redefinir a senha de `OWNER`.

#### Scenario: Admin resets password
- **WHEN** um administrador da banca `farizeu` redefine a senha de uma conta da banca `farizeu`
- **THEN** a conta recebe uma nova senha (temporária, forte), `mustChangePassword = true` é definido e todas as sessões ativas da conta são revogadas **na mesma transação**

#### Scenario: Admin cannot reset password of another banca
- **WHEN** um administrador da banca `farizeu` tenta redefinir a senha de uma conta da banca `botafogo`
- **THEN** o sistema retorna `403`

#### Scenario: Admin cannot reset owner
- **WHEN** uma conta `ADMIN` tenta redefinir a senha de uma conta `OWNER` da mesma banca
- **THEN** o sistema retorna `403`; a recuperação de OWNER permanece reservada à administração da plataforma fora deste MVP

#### Scenario: Temporary password is strong and returned once
- **WHEN** uma redefinição administrativa autorizada é concluída
- **THEN** a senha temporária (mín. 12 caracteres, variedade) é retornada somente nessa resposta, nunca é persistida em texto puro

#### Scenario: Reset is transactional
- **WHEN** reset administrativo ocorre
- **THEN** em transação: (1) persistir hash novo com `mustChangePassword=true`, (2) revogar todas as sessões, (3) retornar senha temporária. Se falha, nada é alterado.

### Requirement: Force password change on next login
Quando `mustChangePassword == true`, o sistema SHALL bloquear acesso à área privada até que o usuário troque a senha via `/api/auth/mandatory-password-change`, autorizado por estado confiável do servidor (claim do token), nunca por booleano enviado pelo cliente.

#### Scenario: Login with mustChangePassword returns flag in token
- **WHEN** o usuário faz login bem-sucedido em uma conta com `mustChangePassword == true`
- **THEN** o access token é emitido com claim `mustChangePassword: true` e o frontend redireciona para a tela de troca obrigatória

#### Scenario: Protected route rejects mustChangePassword flag
- **WHEN** um access token com `mustChangePassword == true` é usado em qualquer endpoint protegido exceto `/api/auth/mandatory-password-change`
- **THEN** o sistema (guard) retorna `403` com código `IDENTITY.MUST_CHANGE_PASSWORD`

#### Scenario: After successful change mustChangePassword is cleared
- **WHEN** o usuário troca a senha com sucesso via `/api/auth/mandatory-password-change`
- **THEN** `mustChangePassword = false` é definido no novo token e o usuário acessa a área privada normalmente

## ADDED Requirements

### Requirement: Password strength policy is authoritative in the domain
O sistema SHALL validar a força da senha no núcleo de negócio/aplicação (autoritativo) para criação de conta, troca voluntária, troca obrigatória e reset administrativo, reutilizando o conceito compartilhado já existente em `@bancaflow/shared` (sem cópias divergentes). O Web replica a validação apenas para feedback rápido de UX. A senha temporária gerada SHALL satisfazer a mesma política. Senha em texto puro NUNCA é persistida, logada ou exposta em erro, e a mensagem de rejeição é genérica.

#### Scenario: Weak password is rejected authoritatively by the backend
- **WHEN** qualquer fluxo (criação, troca voluntária, troca obrigatória, reset) recebe uma senha fraca
- **THEN** o backend retorna `IDENTITY.PASSWORD_TOO_WEAK` e nada é persistido, mesmo que o Web não tivesse validado

#### Scenario: Generated temporary password satisfies the policy
- **WHEN** `TemporaryPasswordGenerator` produz uma senha temporária
- **THEN** ela satisfaz a mesma política de força; nunca é gerada uma senha temporária fraca

#### Scenario: Rejection message does not reveal the failing criterion
- **WHEN** uma senha é rejeitada por fraca
- **THEN** a mensagem é genérica, sem detalhar qual critério (comprimento, variedade) falhou

### Requirement: Mandatory password change flow after admin reset
O sistema SHALL fornecer um fluxo explícito de troca obrigatória via `PATCH /api/auth/mandatory-password-change`, autorizado pelo **estado persistido autoritativo da conta** (`account.mustChangePassword === true`), verificado dentro do caso de uso — não pela mera presença da claim no token nem pelo decorator `@AllowPasswordChange()` (que apenas libera, não exige a flag). A autorização é pela **flag, não pelo papel**. O contrato recebe apenas `newPassword`, diferentemente da troca voluntária que exige a senha atual.

#### Scenario: Endpoint receives new password only
- **WHEN** um usuário autenticado com `mustChangePassword == true` envia `PATCH /api/auth/mandatory-password-change { newPassword }`
- **THEN** o backend aceita o fluxo (autorizado pelo estado da conta), sem exigir `currentPassword`

#### Scenario: Account without the flag is rejected regardless of role
- **WHEN** qualquer conta com `account.mustChangePassword === false` — inclusive `OWNER` ou `ADMIN` — chama `PATCH /api/auth/mandatory-password-change`
- **THEN** o caso de uso retorna `FORBIDDEN` **antes de qualquer escrita**; a senha NÃO é alterada (fecha o bypass da troca voluntária que exige senha atual)

#### Scenario: Strong password accepted, flag cleared, sessions revoked, token reissued — all atomic
- **WHEN** `newPassword` é forte e a conta tem `mustChangePassword == true`
- **THEN** dentro de `runInTransactionResult`: (1) persiste o novo hash, (2) limpa `mustChangePassword`, (3) revoga todas as outras sessões (`sessionId != atual`), (4) **emite o novo token** com `mustChangePassword == false` — tudo na mesma transação; a emissão do token faz parte da operação atômica, não é feita depois no controller

#### Scenario: New token breaks the redirection loop
- **WHEN** a nova senha é persistida e o novo token contém `mustChangePassword == false`
- **THEN** o usuário acessa `/dashboard` diretamente, sem voltar para `/trocar-senha`, e nenhum token antigo com claim desatualizada mantém acesso

#### Scenario: Voluntary change endpoint is blocked while flag is set
- **WHEN** um token com `mustChangePassword == true` chama `PATCH /api/auth/password` (voluntário)
- **THEN** o guard retorna `403 IDENTITY.MUST_CHANGE_PASSWORD`, permitindo apenas o fluxo obrigatório

#### Scenario: Rollback on token emission failure
- **WHEN** a senha é persistida com sucesso mas a emissão do novo token falha
- **THEN** a transação é revertida; a senha antiga permanece; nenhuma sessão é revogada
