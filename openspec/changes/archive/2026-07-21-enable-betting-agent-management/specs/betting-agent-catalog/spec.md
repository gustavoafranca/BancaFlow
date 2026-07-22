## ADDED Requirements

### Requirement: BettingAgent status can be toggled between ACTIVE and INACTIVE after creation

O sistema SHALL permitir alternar o `BettingAgentStatus` de um Cambista existente entre `ACTIVE` e `INACTIVE`, de forma explícita, autorizado via `participants.betting-agents.update`. A transição NÃO SHALL apagar ou ocultar o histórico do Cambista (criação, edições anteriores, política vigente); apenas altera o status corrente. A transição SHALL ser idempotente: repetir a mesma transição (ex.: inativar um Cambista já inativo) SHALL manter o status sem erro. A transição SHALL respeitar o isolamento por tenant, sendo tratada como não encontrada para Cambista de outra Banca.

#### Scenario: Active BettingAgent can be deactivated
- **WHEN** um OWNER ou ADMIN inativa um Cambista `ACTIVE` da própria Banca
- **THEN** o status muda para `INACTIVE` e é refletido imediatamente na listagem e no detalhe

#### Scenario: Inactive BettingAgent can be reactivated
- **WHEN** um OWNER ou ADMIN ativa um Cambista `INACTIVE` da própria Banca
- **THEN** o status muda para `ACTIVE` e é refletido imediatamente na listagem e no detalhe

#### Scenario: Repeating the same transition is idempotent
- **WHEN** um Cambista já `INACTIVE` recebe uma nova solicitação para inativar
- **THEN** o sistema mantém o status `INACTIVE` sem erro

#### Scenario: Status transition preserves history
- **WHEN** um Cambista é inativado
- **THEN** seus dados cadastrais, política vigente e histórico de criação permanecem inalterados, apenas o status muda

#### Scenario: Status transition is tenant-scoped
- **WHEN** um usuário da Banca A tenta alterar o status de um Cambista da Banca B
- **THEN** o sistema responde como não encontrado, sem revelar a existência do recurso

## MODIFIED Requirements

### Requirement: BettingAgentCode is manual, digits-only text, immutable, and never reused

O sistema SHALL exigir o `BettingAgentCode` informado manualmente. O código SHALL ser tratado como texto contendo somente dígitos, com trim externo e zeros à esquerda preservados, e NUNCA SHALL ser convertido para número. O código SHALL ser imutável e NÃO SHALL ser reutilizado por outro cadastro. Código não numérico ou vazio SHALL ser rejeitado. O endpoint de edição de perfil NÃO SHALL aceitar alteração de `code`; qualquer valor de `code` presente no payload de edição SHALL ser ignorado, preservando o código original.

#### Scenario: Leading zeros are preserved
- **WHEN** o código informado é `"001"`
- **THEN** o valor persistido e retornado permanece `"001"`, nunca `1`

#### Scenario: Non-numeric code is rejected
- **WHEN** o código informado contém letras ou símbolos (ex.: `"A12"`, `"12-3"`)
- **THEN** o sistema rejeita a criação com erro de validação e nada é persistido

#### Scenario: External whitespace is trimmed
- **WHEN** o código informado é `"  042  "`
- **THEN** o valor normalizado persistido é `"042"`

#### Scenario: Edit endpoint cannot change the code
- **WHEN** uma edição de perfil envia um `code` diferente do atual
- **THEN** o sistema ignora o valor enviado e o código do Cambista permanece o original, sem erro que impeça a edição dos demais campos

### Requirement: Authorization is delegated to the authoritative permission catalog

O sistema SHALL autorizar `CreateBettingAgent`, `ListBettingAgents`, `GetBettingAgent`, `UpdateBettingAgentProfile` e `SetBettingAgentStatus` server-side via `hasPermission(actorRole, permissionKey)` do catálogo autoritativo de `modules/access-control` (`participants.betting-agents.create|list|read|update`), sem checagem de papel bruto paralela. A escrita de criação SHALL exigir `participants.betting-agents.create`, concedida apenas a `OWNER` e `ADMIN`; `USER` SHALL ser negado na criação. A edição de perfil e a transição de status SHALL exigir `participants.betting-agents.update`, concedida apenas a `OWNER` e `ADMIN`; `USER` SHALL ser negado em ambas. A leitura (`list`/`read`) SHALL seguir o catálogo, que concede a `OWNER`, `ADMIN` e `USER` (lookup operacional read-only). Ocultar controles no Web NÃO SHALL substituir a autorização no Backend.

> Nota de reconciliação (aplicação): o catálogo autoritativo (change `enable-tenant-user-administration`, já aplicado) concede a `USER` `participants.betting-agents.list|read`. Esta spec adere ao catálogo como fonte única de verdade, relaxando a leitura original de D23 ("USER sem acesso") para "USER sem acesso de escrita; lookup read-only concedido". O bloqueio server-side incondicional permanece para criação, edição e transição de status.

#### Scenario: OWNER and ADMIN can create, list and read the catalog
- **WHEN** um OWNER ou ADMIN autenticado executa criação, listagem ou consulta de detalhe
- **THEN** a operação é autorizada e processada dentro do seu tenant

#### Scenario: USER is blocked on creation
- **WHEN** um USER autenticado chama o endpoint de criação de Cambista
- **THEN** o Backend nega a operação (falta `participants.betting-agents.create`) independentemente do estado da UI

#### Scenario: USER has read-only operational lookup
- **WHEN** um USER autenticado lista ou consulta o detalhe de Cambistas da própria Banca
- **THEN** a operação é autorizada pelo catálogo (`participants.betting-agents.list|read`) e permanece isolada por tenant

#### Scenario: OWNER and ADMIN can edit profile and toggle status
- **WHEN** um OWNER ou ADMIN autenticado edita o perfil ou altera o status de um Cambista da própria Banca
- **THEN** a operação é autorizada (`participants.betting-agents.update`) e processada dentro do seu tenant

#### Scenario: USER is blocked on edit and status change
- **WHEN** um USER autenticado chama o endpoint de edição de perfil ou de transição de status de um Cambista
- **THEN** o Backend nega a operação (falta `participants.betting-agents.update`) independentemente do estado da UI
