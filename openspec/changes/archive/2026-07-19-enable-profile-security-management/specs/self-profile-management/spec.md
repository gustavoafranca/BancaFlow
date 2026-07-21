## MODIFIED Requirements

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

## ADDED Requirements

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
