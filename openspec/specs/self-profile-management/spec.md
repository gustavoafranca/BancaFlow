## Purpose

Define self-service management of the authenticated actor's own `UserAccount` profile (`name` and `email`) via `PATCH /api/auth/me`, with domain validation, optimistic concurrency using the `version` exposed by the authenticated user context, and scoping strictly to the authenticated actor without revoking sessions.

---

## Requirements

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

### Requirement: Account menu navigates to the own profile page
O sistema SHALL apresentar o item **Meu Perfil** do menu da conta (dropdown do shell privado) como navegação real para `/perfil`, com semântica de link (`href` navegável, não somente um manipulador de clique), para qualquer ator autenticado (`OWNER`, `ADMIN` ou `USER`), sem depender do papel do ator.

#### Scenario: Authenticated user navigates via mouse click
- **WHEN** um usuário autenticado abre o menu da conta e clica em **Meu Perfil**
- **THEN** o sistema navega para `/perfil` e o menu da conta se fecha

#### Scenario: Authenticated user navigates via keyboard
- **WHEN** um usuário autenticado abre o menu da conta por teclado, foca **Meu Perfil** e ativa com `Enter`
- **THEN** o sistema navega para `/perfil` da mesma forma que no clique de mouse, e o menu da conta se fecha

#### Scenario: Any role reaches the same profile navigation
- **WHEN** um ator com papel `OWNER`, `ADMIN` ou `USER` abre o menu da conta
- **THEN** o item **Meu Perfil** está presente e navega para `/perfil` da mesma forma, sem checagem adicional de papel

#### Scenario: Dropdown closes without a full page reload
- **WHEN** a navegação por **Meu Perfil** ocorre
- **THEN** ela usa navegação client-side do App Router (sem recarregar a página inteira) e o estado de aberto do menu da conta é explicitamente fechado como parte da mesma interação

### Requirement: Own profile page renders only authoritative data
`/perfil` SHALL renderizar somente dados e ações sustentados por um contrato real de Backend hoje implementado (`GET`/`PATCH /api/auth/me`, `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:sessionId`, `PATCH /api/auth/password`). A página SHALL NOT apresentar valores estáticos de auditoria/atividade, contadores ou estados de segurança que não tenham fonte autoritativa correspondente.

#### Scenario: Static membership and last-access values are absent
- **WHEN** `/perfil` é renderizada
- **THEN** a página não exibe nenhum valor fixo de "Membro desde" ou "Último acesso" que não venha de `GET /api/auth/me`

#### Scenario: Fabricated quick statistics are absent
- **WHEN** `/perfil` é renderizada
- **THEN** a página não exibe contadores fixos de ações, sessões ativas ou dias online que não venham de um contrato real

#### Scenario: Demonstrative two-factor toggle is absent
- **WHEN** `/perfil` é renderizada
- **THEN** a página não exibe um controle de autenticação de dois fatores que apenas alterna estado local sem qualquer persistência ou endpoint real

#### Scenario: Sample-driven sessions and activity remain absent; the Activity tab is not restored
- **WHEN** `/perfil` é renderizada
- **THEN** a página não exibe lista de sessões nem registro de atividade construídos a partir de dados de amostra locais (ex.: um módulo de dados de exemplo do tipo `*.sample.ts`), e nenhuma aba **Atividade** é apresentada — a aba **Segurança** existente SHALL exibir somente sessões reais obtidas de `GET /api/auth/sessions` (ver [[session-management]]), nunca dados de amostra

#### Scenario: Real profile fields remain intact
- **WHEN** `/perfil` é renderizada para um ator autenticado
- **THEN** nome e e-mail continuam editáveis via `PATCH /api/auth/me` com concorrência otimista, e username, papel e Banca continuam exibidos como somente leitura a partir de `GET /api/auth/me`

#### Scenario: Existing loading, error, and conflict states remain intact
- **WHEN** `/perfil` está carregando, falha ao carregar, está em edição, salva com sucesso ou encontra conflito de versão
- **THEN** o comportamento e a mensagem correspondentes, já implementados, permanecem inalterados por esta reconciliação

### Requirement: Security tab is available to any authenticated role
`/perfil` SHALL apresentar uma aba **Segurança** ao lado de **Informações**, disponível igualmente para `OWNER`, `ADMIN` e `USER`, sem checagem adicional de papel — a mesma política de "própria conta, qualquer papel" já aplicada à edição de nome/e-mail.

#### Scenario: Any role sees the Security tab
- **WHEN** um ator com papel `OWNER`, `ADMIN` ou `USER` abre `/perfil`
- **THEN** a aba **Segurança** está presente e acessível da mesma forma, sem checagem adicional de papel

### Requirement: Security tab lists the actor's own active sessions with the current one marked
A aba **Segurança** SHALL listar as sessões ativas do próprio ator autenticado via `GET /api/auth/sessions`, identificando a sessão atual através do campo `isCurrent` retornado pelo Backend (ver [[session-management]]), exibindo criação e expiração de cada sessão e um rótulo de dispositivo derivado de `deviceInfo` quando disponível, com um rótulo honesto de fallback quando ausente ou não reconhecido. Nenhuma localização, endereço IP ou registro de atividade SHALL ser exibido.

#### Scenario: Active sessions are listed from the authoritative endpoint
- **WHEN** a aba Segurança é aberta
- **THEN** o Web chama `GET /api/auth/sessions` e renderiza exatamente as sessões retornadas, sem dado de amostra

#### Scenario: Current session is marked and has no revoke action
- **WHEN** a lista de sessões é exibida
- **THEN** a sessão com `isCurrent: true` é rotulada como sessão atual e não oferece uma ação de encerramento própria

#### Scenario: Other sessions offer to end the session
- **WHEN** a lista contém sessões com `isCurrent: false`
- **THEN** cada uma delas oferece uma ação acessível para encerrar aquela sessão especificamente

#### Scenario: Missing or unrecognized device info uses an honest fallback
- **WHEN** uma sessão não possui `deviceInfo` ou seu valor não é reconhecido pela heurística de rótulo do Web
- **THEN** a UI exibe um rótulo honesto indicando que o dispositivo não foi identificado, sem inventar um nome de dispositivo

### Requirement: Ending another session refetches the authoritative list
Ao encerrar uma sessão que não é a atual, o sistema SHALL chamar `DELETE /api/auth/sessions/:sessionId` e, após a resposta, SHALL recarregar a listagem autoritativa de `GET /api/auth/sessions` antes de considerar a interface atualizada — nunca removendo a sessão da lista local por suposição otimista.

#### Scenario: Ending a session requires accessible confirmation
- **WHEN** o ator aciona o encerramento de uma sessão que não é a atual
- **THEN** o sistema solicita confirmação acessível antes de enviar `DELETE /api/auth/sessions/:sessionId`

#### Scenario: List reflects the authoritative state after ending a session
- **WHEN** o encerramento de uma sessão é confirmado com sucesso
- **THEN** o Web recarrega `GET /api/auth/sessions` e a sessão encerrada não aparece mais na lista renderizada

#### Scenario: Session already gone at refetch time is treated as reconciled, not as an error
- **WHEN** a sessão-alvo já não está mais ativa no momento em que o Web recarrega a listagem (ex.: expirou ou já foi encerrada por outra aba)
- **THEN** a interface simplesmente reflete a lista atual sem exibir uma mensagem de erro para essa condição

#### Scenario: Another actor's or another banca's session is never revealed or actionable
- **WHEN** a listagem de sessões é exibida
- **THEN** nenhuma sessão de outro `userId` ou de outra `bancaId` aparece na lista nem é alvo de qualquer ação de encerramento

### Requirement: Security tab supports voluntary password change with current password confirmation
A aba **Segurança** SHALL oferecer um formulário de troca voluntária de senha com os campos senha atual, nova senha e confirmação da nova senha, enviando ao Backend somente `currentPassword` e `newPassword` (a confirmação nunca é enviada; existe só para o Web). Após sucesso, o sistema SHALL limpar os campos sensíveis do formulário, informar ao usuário que as demais sessões foram encerradas, e recarregar a listagem de sessões, restando apenas a sessão atual. O sistema SHALL NOT chamar manualmente uma rotina de refresh de token após o sucesso — o Backend já reemite o cookie de access token dentro da própria resposta transacional.

#### Scenario: Successful change clears sensitive fields and refetches sessions
- **WHEN** o ator informa a senha atual correta e uma nova senha forte e confirmada, e o Backend responde com sucesso
- **THEN** os campos de senha do formulário são limpos, uma mensagem informa que as demais sessões foram encerradas, e a lista de sessões é recarregada mostrando somente a sessão atual

#### Scenario: Incorrect current password shows a distinct, non-ambiguous message
- **WHEN** o Backend retorna o código de senha atual incorreta (ver [[credential-management]])
- **THEN** o formulário exibe uma mensagem específica de senha atual incorreta, distinta de qualquer mensagem de sessão expirada, e nenhum redirecionamento para login ocorre

#### Scenario: Weak new password is rejected without submitting
- **WHEN** a nova senha não atende à política de força reaproveitada do domínio
- **THEN** o Web rejeita a submissão localmente com mensagem acessível, e nenhuma requisição é enviada ao Backend

#### Scenario: Mismatched confirmation is rejected without submitting
- **WHEN** a confirmação da nova senha não é idêntica à nova senha informada
- **THEN** o Web rejeita a submissão localmente com mensagem acessível, e nenhuma requisição é enviada ao Backend

#### Scenario: Duplicate submission is blocked while a request is in flight
- **WHEN** o ator aciona a submissão do formulário de troca de senha enquanto uma requisição anterior ainda está em andamento
- **THEN** o sistema impede o envio de uma segunda requisição concorrente para o mesmo formulário

#### Scenario: Transactional failure preserves the previous password and sessions
- **WHEN** a troca de senha falha por qualquer motivo após a validação (ex.: falha técnica na persistência ou na emissão do novo token)
- **THEN** a senha anterior permanece válida e nenhuma sessão é revogada

### Requirement: Voluntary password change form reuses the domain-derived strength validator without duplicating it
O schema de validação client-safe da troca voluntária de senha em `/perfil` SHALL reaproveitar os mesmos Value Objects client-safe de força de senha e confirmação já usados pela troca obrigatória em `/trocar-senha`, sem duplicar a regra em uma cópia divergente, e sem que o módulo de perfil importe arquivos da rota `/trocar-senha`.

#### Scenario: Password strength rule is shared, not duplicated
- **WHEN** a regra de força de senha é alterada em sua definição compartilhada
- **THEN** tanto `/trocar-senha` quanto o formulário de troca voluntária em `/perfil` refletem a mudança, sem exigir edição em dois lugares

#### Scenario: Mandatory password change screen keeps sending only the new password
- **WHEN** o formulário de troca obrigatória em `/trocar-senha` é submetido
- **THEN** o corpo enviado ao Backend contém somente `newPassword`, exatamente como antes desta change
