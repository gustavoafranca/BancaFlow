## ADDED Requirements

### Requirement: Self-service update of own name and email
O sistema SHALL permitir que o próprio ator autenticado atualize `name` e/ou `email` da própria conta `UserAccount`, sem depender de papel (`OWNER`, `ADMIN` e `USER` têm o mesmo direito sobre si mesmos). `email` SHALL permanecer opcional (`null` é um valor válido). Nenhum outro campo (`username`, `role`, `status`, credencial) SHALL ser alterado por esta operação.

#### Scenario: Actor updates own name and email
- **WHEN** um ator autenticado envia `PATCH /api/auth/me` com `name` e `email` válidos e o `version` corrente da própria conta
- **THEN** o sistema persiste o novo nome e e-mail e retorna `200 { success: true }` (confirmação mínima; não retorna a projeção completa da conta)

#### Scenario: Web reads authoritative data after a successful update
- **WHEN** o Web recebe `200 { success: true }` de `PATCH /api/auth/me`
- **THEN** o Web consulta novamente `GET /api/auth/me` para obter nome, e-mail e `version` autoritativos antes de considerar a edição concluída, em vez de fabricar localmente um valor incrementado

#### Scenario: Actor updates only the name
- **WHEN** um ator autenticado envia `PATCH /api/auth/me` somente com `name` válido, mantendo o `email` atual
- **THEN** o sistema atualiza apenas o nome, preservando o e-mail já persistido

#### Scenario: Actor clears the optional email
- **WHEN** um ator autenticado envia `PATCH /api/auth/me` com `email: null`
- **THEN** o sistema persiste `email = null` sem exigir um e-mail

#### Scenario: Any role can update their own profile
- **WHEN** um ator com papel `OWNER`, `ADMIN` ou `USER` executa esta operação sobre a própria conta
- **THEN** a operação é permitida igualmente, sem checagem adicional de papel

### Requirement: Invalid profile data is rejected without persisting
O sistema SHALL validar `name` e `email` segundo as regras de domínio (`PersonName`, `Email`) antes de persistir qualquer alteração. Falha de validação SHALL impedir qualquer escrita. Um corpo que não informe nenhum de `name`/`email` (apenas `version`) SHALL ser rejeitado como requisição inválida, sem aplicar mutação nem persistir — esta operação nunca existe apenas para incrementar a versão.

#### Scenario: Invalid name is rejected
- **WHEN** um ator envia `PATCH /api/auth/me` com `name` vazio ou que viole as regras de `PersonName`
- **THEN** o sistema retorna um erro de validação determinístico e nenhuma alteração é persistida

#### Scenario: Invalid email is rejected
- **WHEN** um ator envia `PATCH /api/auth/me` com `email` malformado
- **THEN** o sistema retorna um erro de validação determinístico e nenhuma alteração é persistida

#### Scenario: Body with only version is rejected
- **WHEN** um ator envia `PATCH /api/auth/me` contendo somente `version`, sem `name` nem `email`
- **THEN** o sistema retorna um erro de validação determinístico, sem chamar `save` e sem incrementar a versão persistida

### Requirement: Optimistic concurrency on own profile update
O sistema SHALL exigir o `version` corrente da conta (obtido de uma leitura anterior de `GET /api/auth/me`) em toda atualização de perfil. O sistema SHALL rejeitar a atualização de forma determinística e SHALL NOT sobrescrever silenciosamente quando o `version` informado não corresponder ao `version` persistido, seja no momento em que a própria operação lê a conta, seja no momento em que a escrita é persistida.

#### Scenario: Stale version detected before any write
- **WHEN** um ator envia `PATCH /api/auth/me` com um `version` que já não corresponde ao `version` persistido no momento em que o sistema lê a conta (outra escrita concorrente ocorreu antes desta requisição começar a processar)
- **THEN** o sistema retorna `409 IDENTITY.CONCURRENCY_CONFLICT` imediatamente, sem aplicar qualquer mutação e sem tentar persistir

#### Scenario: Version conflict lost at write time is rejected deterministically
- **WHEN** um ator envia `PATCH /api/auth/me` com um `version` que ainda corresponde ao lido no início da operação, mas outra escrita concorrente altera a conta antes da persistência desta requisição
- **THEN** o sistema retorna `409 IDENTITY.CONCURRENCY_CONFLICT` e nenhuma alteração é persistida

#### Scenario: Matching version succeeds
- **WHEN** um ator envia `PATCH /api/auth/me` com o `version` que ainda corresponde ao persistido
- **THEN** a atualização é aplicada e a versão persistida é incrementada

### Requirement: Profile update does not revoke sessions
Diferente de operações que alteram papel ou senha, a atualização de nome/e-mail do próprio ator SHALL NOT revogar sessões ativas, pois não altera nenhuma claim do access token.

#### Scenario: Session remains valid after profile update
- **WHEN** um ator atualiza com sucesso seu próprio nome e/ou e-mail
- **THEN** a sessão atual e quaisquer outras sessões ativas do mesmo ator permanecem válidas, sem exigir novo login

### Requirement: Profile update is scoped to the authenticated actor
O sistema SHALL derivar `userId` e `bancaId` exclusivamente do contexto autenticado (`AuthContext`), nunca de corpo, query ou parâmetro de rota. Não existe alvo de terceiro nesta operação.

#### Scenario: Unauthenticated request is rejected
- **WHEN** uma requisição a `PATCH /api/auth/me` chega sem sessão autenticada válida
- **THEN** o sistema rejeita a requisição antes de qualquer leitura ou escrita de conta, com o mesmo comportamento já estabelecido pelo guard para os demais endpoints autenticados
