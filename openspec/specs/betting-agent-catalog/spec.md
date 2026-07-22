## Purpose

Define `BettingAgent` (Cambista) as a separate aggregate linked to a `Party` within the same Banca — its manually assigned, immutable, tenant-scoped code, atomic creation alongside `Party`, authorization via the authoritative permission catalog, strict tenant isolation on reads, and projection-based list/detail queries.

---

## Requirements

### Requirement: BettingAgent is a separate aggregate linked to one Party in the same Banca

O sistema SHALL modelar `BettingAgent` como agregado separado de `Party` (D18), com `BettingAgentId`, `BancaId`, `PartyId`, `BettingAgentCode`, `BettingAgentStatus` e política vigente. `BettingAgent` e sua `Party` SHALL pertencer sempre à mesma Banca. Neste incremento, uma `Party` SHALL possuir no máximo um `BettingAgent` na mesma Banca. O estado inicial SHALL ser `ACTIVE`.

#### Scenario: BettingAgent starts ACTIVE and references one Party in the same Banca
- **WHEN** um Cambista é criado com sucesso
- **THEN** o `BettingAgent` recebe estado `ACTIVE`, referencia exatamente uma `Party` e compartilha o mesmo `bancaId` dela

#### Scenario: Party has at most one BettingAgent per Banca
- **WHEN** já existe um `BettingAgent` para uma `Party` na Banca e uma segunda associação é tentada na mesma Banca
- **THEN** o sistema rejeita a operação preservando a invariante de no máximo um `BettingAgent` por `Party` naquela Banca

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

### Requirement: Code uniqueness is scoped to the Banca

O sistema SHALL garantir unicidade do código por Banca via constraint composta `(bancaId, code)`. Duas Bancas diferentes SHALL poder usar o mesmo código. Dentro da mesma Banca, um código duplicado SHALL ser bloqueado com erro estável, sem vazar detalhes do banco. Uma corrida para o mesmo código dentro da mesma Banca SHALL produzir exatamente um sucesso e um conflito determinístico resolvido pela constraint única.

#### Scenario: Same code allowed in different Bancas
- **WHEN** a Banca `farizeu` já possui o código `"001"` e a Banca `botafogo` cria o código `"001"`
- **THEN** ambas as criações têm sucesso

#### Scenario: Duplicate code blocked in the same Banca
- **WHEN** a Banca `farizeu` já possui o código `"001"` e uma nova criação usa `"001"` na mesma Banca
- **THEN** o sistema retorna um erro estável de código duplicado e não persiste o novo Cambista

#### Scenario: Race for the same code yields one success
- **WHEN** duas requisições concorrentes tentam criar o código `"050"` na mesma Banca
- **THEN** exatamente uma tem sucesso e a outra recebe conflito determinístico reforçado pela constraint `(bancaId, code)`

### Requirement: Atomic creation of Party and BettingAgent

O sistema SHALL criar `Party`, seus contatos/endereço inicial, o `BettingAgent` e sua política inicial na mesma transação usando o mecanismo transacional compartilhado. Falha em qualquer etapa SHALL produzir rollback completo, sem deixar `Party` ou `BettingAgent` parcial.

#### Scenario: Failure at any step rolls back everything
- **WHEN** a persistência do `BettingAgent` falha após a `Party` ter sido gravada na mesma transação
- **THEN** a transação é revertida por completo e nenhuma `Party`, contato, endereço ou `BettingAgent` permanece no banco

#### Scenario: Success commits all aggregates atomically
- **WHEN** todas as etapas de criação têm sucesso
- **THEN** `Party`, contatos, endereço inicial, `BettingAgent` e política inicial são confirmados juntos

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

### Requirement: Strict tenant isolation on read operations

O sistema SHALL incluir obrigatoriamente o filtro por `bancaId` do contexto autenticado em toda leitura de `BettingAgent`. Busca por ID sem tenant SHALL ser proibida. Recurso de outra Banca NÃO SHALL revelar sua existência.

#### Scenario: Get by id is tenant-scoped
- **WHEN** um usuário da Banca A consulta pelo ID um `BettingAgent` que pertence à Banca B
- **THEN** o sistema responde como não encontrado, sem revelar a existência do recurso

#### Scenario: List never crosses tenants
- **WHEN** um usuário da Banca A lista Cambistas
- **THEN** a página retornada contém apenas Cambistas da Banca A

### Requirement: List and detail return projections, never entities or ORM models

`ListBettingAgents` SHALL retornar uma página filtrável por código, nome e apelido, com paginação, como projeção/DTO. `GetBettingAgent` SHALL retornar o detalhe de um Cambista da própria Banca como projeção/DTO. As leituras NÃO SHALL retornar entidades de domínio nem modelos Prisma, e os DTOs NÃO SHALL carregar regra de domínio ou acoplamento ao ORM.

#### Scenario: List supports search and pagination
- **WHEN** um OWNER lista Cambistas filtrando por parte do código, nome ou apelido com paginação
- **THEN** o sistema retorna uma projeção paginada com os Cambistas correspondentes da própria Banca

#### Scenario: Detail returns a projection
- **WHEN** um OWNER consulta o detalhe de um Cambista da própria Banca
- **THEN** o sistema retorna um DTO de detalhe sem expor entidade de domínio ou modelo Prisma

#### Scenario: Not found for missing or foreign id
- **WHEN** o ID consultado não existe na Banca autenticada
- **THEN** o sistema retorna não encontrado

### Requirement: Creation is audited

O sistema SHALL registrar o autor (criador) e a data de criação do `BettingAgent` conforme as convenções de auditoria existentes, usando um `Clock` injetável para datas determinísticas.

#### Scenario: Creator and creation date are recorded
- **WHEN** um Cambista é criado com sucesso
- **THEN** o registro persiste quem criou e quando, com data proveniente do `Clock`

### Requirement: Betting-agent drawer places tabs above Status at the top of the panel

O drawer de Cambista SHALL posicionar o grupo de abas (Cadastro / Endereço / Contato) no topo do painel, fora da área rolável do corpo, logo abaixo do header de identificação — coerente com o drawer de Prêmios. O controle de Status (Ativo/Inativo) SHALL aparecer **abaixo** das abas, dentro da aba Cadastro (no topo dela), nunca flutuando entre o header e as abas. Esse posicionamento SHALL valer nos modos add, view e edit.

#### Scenario: Abas ficam acima do Status em todos os modos
- **WHEN** o drawer é aberto em qualquer modo (add, view ou edit)
- **THEN** as abas Cadastro/Endereço/Contato aparecem no topo do painel, fora do corpo rolável, e o controle de Status aparece abaixo delas dentro da aba Cadastro

#### Scenario: Controle de Status respeita o gating de permissão
- **WHEN** o usuário não possui a permissão `participants.betting-agents.update`
- **THEN** o controle de ativar/inativar não é exibido, mantendo o comportamento de gating atual, e as abas continuam no topo do painel

### Requirement: View mode presents betting-agent data as field cards

No modo view, o drawer de Cambista SHALL apresentar os dados em field cards legíveis (rótulo + valor), em vez de campos empilhados ou concatenados em uma única linha. Cadastro SHALL exibir Código/Talão, Nome, Apelido e a Política em rótulo legível (não editável). Endereço SHALL ser apresentado de forma legível e não concatenada numa linha única. Contato SHALL listar cada telefone individualmente com número formatado em máscara BR e rótulo quando houver. Estados "sem endereço" e "sem telefone" SHALL ter representação vazia explícita e discreta.

#### Scenario: Endereço presente é exibido de forma legível
- **WHEN** o Cambista possui endereço com logradouro, número, bairro e cidade
- **THEN** os campos aparecem em field cards legíveis (não em uma única linha concatenada)

#### Scenario: Cambista sem endereço mostra estado vazio explícito
- **WHEN** o Cambista não possui endereço cadastrado
- **THEN** a aba Endereço exibe um estado vazio explícito e discreto, sem string concatenada residual

#### Scenario: Telefones são listados individualmente com máscara BR
- **WHEN** o Cambista possui um ou mais telefones
- **THEN** cada telefone é listado como um item com o número formatado em máscara BR e o rótulo quando existir, em vez de unidos por vírgula

#### Scenario: Cambista sem telefone mostra estado vazio explícito
- **WHEN** o Cambista não possui telefones
- **THEN** a aba Contato exibe um estado vazio explícito e discreto

### Requirement: Status badge is visually consistent between list and drawer

A cor/variant do Badge de status do Cambista SHALL ser consistente entre a listagem e o drawer para o mesmo estado. Em particular, o Badge "Inativo" SHALL usar a mesma variant nos dois lugares.

#### Scenario: Badge Inativo idêntico na lista e no drawer
- **WHEN** um Cambista está `INACTIVE` e é exibido tanto na listagem quanto no drawer
- **THEN** o Badge "Inativo" usa a mesma variant visual nos dois contextos

### Requirement: Statistics cards are coherent under pagination and free of redundancy

Os cards de estatística da listagem de Cambistas SHALL apresentar valores coerentes ao paginar: contagens de Ativos/Inativos SHALL refletir agregados globais ou, quando indisponíveis sem alterar o backend, SHALL ser rotuladas explicitamente com o escopo "nesta página". Os cards NÃO SHALL conter uma métrica redundante que apenas repita o valor de outro card (o card "Talões" idêntico a "Total" SHALL ser removido ou receber um significado próprio).

#### Scenario: Ativos/Inativos coerentes ao paginar
- **WHEN** o usuário navega entre páginas da listagem
- **THEN** os cards de Ativos/Inativos ou refletem agregados globais consistentes, ou deixam claro que representam apenas "nesta página"

#### Scenario: Sem card duplicado Talões=Total
- **WHEN** os cards de estatística são renderizados
- **THEN** não existe um card cujo valor apenas duplica outro (o antigo "Talões"=="Total" não persiste)
