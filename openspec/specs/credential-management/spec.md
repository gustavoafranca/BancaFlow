## Purpose

Define password storage, voluntary and administrative password changes, and enforcement of mandatory password changes on next login. Ensures credentials are secure and recovery workflows are controlled.

---
## Requirements
### Requirement: Store password as bcrypt hash
O sistema SHALL armazenar senhas exclusivamente como hash bcrypt com custo configurável (padrão: 12). Nunca armazenar ou logar a senha em texto puro.

#### Scenario: Password is stored as hash
- **WHEN** uma conta é criada com senha `"dev@123"`
- **THEN** o banco contém somente o hash bcrypt correspondente; a senha original não é acessível

### Requirement: Voluntary password change
Um usuário autenticado SHALL poder alterar voluntariamente a própria senha informando a senha atual (validada contra hash) e a nova senha (rejeitada se fraca pela política autoritativa do domínio). Senha atual incorreta SHALL retornar um código de erro determinístico e distinto (`IDENTITY.CURRENT_PASSWORD_INCORRECT`) mapeado para `400`, nunca o mesmo código/status usado para token ausente, inválido, ou sessão revogada/expirada (`IDENTITY.INVALID_CREDENTIALS`/`401`) — a ambiguidade entre os dois faria um cliente que trata `401` como sessão expirada redirecionar incorretamente o usuário para login após uma simples senha digitada errada.

#### Scenario: Successful voluntary change
- **WHEN** o usuário fornece a senha atual correta e uma nova senha **forte**
- **THEN** a senha é atualizada, `passwordChangedAt` é renovado, **todas as OUTRAS sessões são revogadas** (não a atual), novo token é emitido com `mustChangePassword = false`

#### Scenario: Wrong current password rejects change with a distinct error code
- **WHEN** o usuário fornece a senha atual incorreta
- **THEN** o sistema retorna `400 IDENTITY.CURRENT_PASSWORD_INCORRECT` sem revelar informação adicional; nada é alterado

#### Scenario: Wrong current password is not confused with an authentication failure
- **WHEN** o usuário fornece a senha atual incorreta em uma sessão válida e não expirada
- **THEN** o código de erro retornado é distinto de `IDENTITY.INVALID_CREDENTIALS` e de qualquer código mapeado para `401`, e a sessão do usuário permanece válida (nenhuma revogação ocorre)

#### Scenario: Weak new password rejects change
- **WHEN** o usuário fornece nova senha fraca
- **THEN** o sistema retorna `400 IDENTITY.PASSWORD_TOO_WEAK`; nada é alterado

#### Scenario: Session revocation is transactional
- **WHEN** troca voluntária bem-sucedida ocorre
- **THEN** em transação: (1) persistir hash novo, (2) revogar outras sessões, (3) emitir novo token. Se qualquer etapa falha, tudo é revertido.

### Requirement: Administrative password reset with temporary password
Uma conta com papel `OWNER` SHALL poder redefinir a senha de conta `ADMIN` ou `USER` autorizada da própria banca via `PATCH /api/auth/admin/reset-password` (`{ targetUserId }` no corpo, exatamente como hoje), gerando uma senha temporária **forte** (satisfazendo política) que é devolvida uma única vez e obriga troca no próximo acesso. Este endpoint mantém seu contrato e caminho atuais nesta change — apenas a permissão que o autoriza (`identity.accounts.reset-password`) passa a ser exclusiva de `OWNER`, e passa a aplicar a política de alvo (`assertAdministrableTarget`). Nesta versão, `ADMIN` não redefine senha de outra conta. Nenhum `OWNER` redefine a própria senha por este endpoint — autosserviço de senha continua exclusivo de `PATCH /api/auth/password`.

#### Scenario: Admin resets password
- **WHEN** um comportamento anterior a esta fase permitia `ADMIN` redefinir a senha de outra conta
- **THEN** esse acesso foi revogado nesta versão — ver "Owner resets password of an account in the same banca" e "ADMIN cannot reset any account password in this version" para o comportamento atual

#### Scenario: Admin cannot reset password of another banca
- **WHEN** um comportamento anterior a esta fase distinguia bloqueio cross-banca de `ADMIN` com `403`
- **THEN** essa distinção foi substituída nesta versão por uma resposta uniforme `404` para alvo inexistente ou de outra banca — ver "Target account not found or from another banca returns 404, never 403"

#### Scenario: Admin cannot reset owner
- **WHEN** um comportamento anterior a esta fase previa `ADMIN` tentando redefinir a senha de `OWNER`
- **THEN** esse cenário deixou de existir nesta versão — `ADMIN` não redefine senha de conta alguma (ver "ADMIN cannot reset any account password in this version")

#### Scenario: Owner resets password of an account in the same banca
- **WHEN** um `OWNER` da banca `farizeu` redefine a senha de uma conta `ADMIN` ou `USER` da banca `farizeu`
- **THEN** a conta recebe uma nova senha (temporária, forte), `mustChangePassword = true` é definido e todas as sessões ativas da conta são revogadas **na mesma transação**

#### Scenario: Target account not found or from another banca returns 404, never 403
- **WHEN** um `OWNER` da banca `farizeu` informa um `targetUserId` inexistente ou pertencente à banca `botafogo`
- **THEN** o sistema retorna `404` em ambos os casos, sem distinguir os dois na mensagem

#### Scenario: ADMIN cannot reset any account password in this version
- **WHEN** uma conta `ADMIN` tenta redefinir a senha de outra conta
- **THEN** o sistema retorna `403`, pois `identity.accounts.reset-password` não autoriza `ADMIN` nesta versão

#### Scenario: Owner cannot reset their own password through this endpoint
- **WHEN** um `OWNER` autenticado informa o próprio `userId` como `targetUserId` em `PATCH /api/auth/admin/reset-password`
- **THEN** o sistema retorna `403` (alvo resolvido, mas é o próprio ator); a troca da própria senha continua exclusiva de `PATCH /api/auth/password`

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

### Requirement: Administrative temporary password is human-readable and strong
A senha temporária gerada para criação administrativa e reset administrativo SHALL usar CSPRNG e formato humano memorizável com entropia documentada de pelo menos 64 bits, satisfazendo `StrongPassword` sem enfraquecer sua política. A senha SHALL usar palavras ASCII sem acentos, neutras, sem conteúdo ofensivo, separadores e sufixos não ambíguos, e nunca SHALL derivar de nome, username, e-mail, banca ou outro dado previsível.

#### Scenario: Generated human password satisfies StrongPassword
- **WHEN** o gerador concreto produz uma senha temporária
- **THEN** a senha possui maiúscula, minúscula, número, símbolo, tamanho mínimo e é aceita por `StrongPassword`

#### Scenario: Generated password is not logged or persisted in plain text
- **WHEN** criação ou reset administrativo conclui
- **THEN** apenas o hash é persistido, a senha em texto puro aparece somente na resposta autorizada e não é enviada a logs, telemetria ou erros

#### Scenario: Generator failure prevents persistence
- **WHEN** o gerador falha ou produz valor inválido
- **THEN** o use case retorna falha segura e nenhuma credencial é alterada

