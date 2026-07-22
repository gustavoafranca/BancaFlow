## Purpose

Define the registration of participants (`Party`) scoped to a Banca — an optional personal profile with contacts and address, possible-duplicate detection, and the aggregate boundary through which `Party` and its children are mutated. Serves as the identity foundation consumed by the betting-agent catalog.

---

## Requirements

### Requirement: Party PERSON belongs to the authenticated Banca

O sistema SHALL criar uma `Party` do tipo `PERSON` sempre vinculada ao `bancaId` do contexto autenticado. O `bancaId` NÃO SHALL ser aceito do corpo da requisição como fonte de autoridade. Neste incremento, somente `Party` do tipo `PERSON` é aceita; `ORGANIZATION` é rejeitada.

#### Scenario: Party is scoped to authenticated tenant
- **WHEN** um OWNER autenticado na Banca `farizeu` cria um Cambista
- **THEN** a `Party` resultante recebe `bancaId = farizeuId` derivado do contexto autenticado, ignorando qualquer `bancaId` presente no corpo

#### Scenario: ORGANIZATION party type is rejected
- **WHEN** uma requisição tenta criar uma `Party` do tipo `ORGANIZATION`
- **THEN** o sistema rejeita a operação e nenhuma `Party` é persistida

### Requirement: Optional personal profile with mandatory fields when present

O sistema SHALL permitir criar uma `Party` sem nome, sem apelido, sem telefones e sem endereço. Nome e apelido SHALL ser opcionais. Quando um endereço inicial é informado, bairro (`Neighborhood`) e cidade (`City`) SHALL ser obrigatórios; rua e número podem ser omitidos. E-mail e documentos (CPF) NÃO SHALL ser coletados.

#### Scenario: Party created with no personal data
- **WHEN** a criação informa apenas os dados obrigatórios do Cambista (código e política) sem nome, apelido, telefone ou endereço
- **THEN** a `Party` é criada válida, identificada operacionalmente pelo código do BettingAgent, sem gravar nome artificial

#### Scenario: Address requires neighborhood and city
- **WHEN** a criação informa um endereço sem bairro ou sem cidade
- **THEN** o sistema rejeita a operação com erro de validação e nada é persistido

#### Scenario: Address without street and number is accepted
- **WHEN** a criação informa um endereço com bairro e cidade preenchidos mas sem rua e número
- **THEN** o endereço é aceito e persistido como endereço inicial ativo

### Requirement: Party accepts multiple phone contacts

O sistema SHALL permitir associar zero, um ou vários telefones (`PartyContact`) a uma `Party`, tanto na criação quanto em edições posteriores. Cada telefone SHALL ser normalizado e validado como `Phone`. Cada `PartyContact` SHALL aceitar um rótulo (`label`) textual opcional (ex.: "Celular", "Casa"), sem validação de formato além de trim. Telefones e endereços completos NÃO SHALL ser registrados em logs. Uma edição SHALL reconciliar a lista completa de contatos informada como o novo estado desejado: contatos ausentes na lista informada SHALL ser removidos, contatos cujo telefone normalizado já existir SHALL ter apenas o rótulo atualizado (preservando o registro), e contatos novos SHALL ser criados.

#### Scenario: Multiple phones coexist on the same Party
- **WHEN** a criação informa dois ou mais telefones válidos
- **THEN** todos são persistidos como `PartyContact` da mesma `Party`

#### Scenario: Invalid phone is rejected
- **WHEN** a criação ou edição informa um telefone que não passa na validação de `Phone`
- **THEN** o sistema rejeita a operação e nenhuma alteração de contato é persistida

#### Scenario: Label is optional and free text
- **WHEN** um telefone é informado sem rótulo
- **THEN** o `PartyContact` é persistido com rótulo ausente, sem erro de validação

#### Scenario: Editing adds a new phone
- **WHEN** uma edição informa a lista atual de telefones acrescida de um novo telefone válido
- **THEN** o novo telefone é persistido como `PartyContact` adicional, sem afetar os demais

#### Scenario: Editing removes a phone
- **WHEN** uma edição informa a lista de telefones omitindo um telefone anteriormente persistido
- **THEN** o `PartyContact` correspondente é removido e não aparece mais no detalhe da `Party`

#### Scenario: Editing updates only the label of an existing phone
- **WHEN** uma edição informa o mesmo telefone normalizado já persistido com um rótulo diferente
- **THEN** o `PartyContact` existente é preservado e apenas o rótulo é atualizado

### Requirement: Initial address starts active and preserves single-active invariant

Quando informado, o endereço inicial (`PartyAddress`) SHALL começar ativo com uma vigência (`EffectivePeriod`) iniciando na criação. Uma `Party` SHALL possuir no máximo um endereço ativo em qualquer momento, inclusive após edições posteriores. Bairro e cidade SHALL preservar o valor de exibição e expor um valor normalizado para busca/agrupamento. Uma edição que substitui o endereço SHALL encerrar a vigência do endereço anteriormente ativo (`effectiveTo`) e iniciar um novo `PartyAddress` ativo, sem apagar fisicamente o registro anterior. Uma edição que remove o endereço SHALL apenas encerrar a vigência ativa, sem criar um novo endereço.

#### Scenario: Initial address is active on creation
- **WHEN** a criação informa um endereço válido
- **THEN** o endereço é persistido com vigência ativa iniciando na data de criação e é o único endereço ativo da `Party`

#### Scenario: Neighborhood and city are normalized for analytics
- **WHEN** dois endereços informam bairro `"Centro"` e `" centro "` (com espaços/caixa diferentes)
- **THEN** ambos preservam a exibição original mas produzem o mesmo valor normalizado para agrupamento

#### Scenario: Editing replaces the active address
- **WHEN** uma edição informa um novo endereço válido para uma `Party` que já possui endereço ativo
- **THEN** o endereço anterior tem sua vigência encerrada e o novo endereço passa a ser o único endereço ativo

#### Scenario: Editing removes the active address
- **WHEN** uma edição omite o endereço de uma `Party` que possuía endereço ativo
- **THEN** a vigência do endereço ativo é encerrada e a `Party` passa a não ter endereço ativo, sem novo endereço criado

### Requirement: Possible duplicate raises a confirmable alert, never a block

O sistema SHALL detectar possível duplicidade dentro da própria Banca quando o telefone normalizado coincidir, ou quando o par nome+apelido normalizado coincidir com um Cambista existente. A detecção SHALL retornar apenas candidatos mínimos da própria Banca e SHALL exigir confirmação explícita para prosseguir. Sem confirmação, nenhuma linha SHALL ser persistida. Com confirmação, a criação prossegue sem criar constraint artificial. Homônimos e telefone compartilhado NUNCA SHALL ser bloqueados.

#### Scenario: Possible duplicate without confirmation persists nothing
- **WHEN** a criação informa um telefone ou nome+apelido que coincide com um Cambista existente na mesma Banca e o pedido não traz confirmação explícita
- **THEN** o sistema retorna um alerta de possível duplicidade com candidatos mínimos e não persiste nenhuma `Party` ou `BettingAgent`

#### Scenario: Confirmed duplicate proceeds
- **WHEN** o mesmo pedido é reenviado com confirmação explícita de possível duplicidade
- **THEN** a criação prossegue e cria a nova `Party` e o novo `BettingAgent` normalmente

#### Scenario: Duplicate candidates are tenant-scoped and minimal
- **WHEN** uma possível duplicidade é detectada
- **THEN** os candidatos retornados pertencem exclusivamente à Banca autenticada e expõem apenas identificação mínima, nunca dados de outra Banca

### Requirement: Party's registration data can be edited after creation

O sistema SHALL permitir editar nome, apelido, contatos e endereço de uma `Party` já existente, autorizado via `participants.betting-agents.update` do catálogo autoritativo. A edição SHALL operar sobre a `Party` existente vinculada ao `BettingAgent`, NUNCA criando uma nova `Party` ou um novo `BettingAgent`. `bancaId` SHALL vir do contexto autenticado; uma edição direcionada a uma `Party` de outra Banca SHALL ser tratada como inexistente. A edição, incluindo a reconciliação de contatos e endereço, SHALL ocorrer em uma única transação; falha em qualquer etapa SHALL produzir rollback completo.

#### Scenario: Edit updates the existing Party
- **WHEN** um OWNER ou ADMIN edita nome, apelido, contatos ou endereço de um Cambista existente da própria Banca
- **THEN** a `Party` existente é atualizada e nenhuma nova `Party` ou `BettingAgent` é criado

#### Scenario: Edit is tenant-scoped
- **WHEN** um usuário da Banca A tenta editar um Cambista que pertence à Banca B
- **THEN** o sistema responde como não encontrado, sem revelar a existência do recurso

#### Scenario: Edit failure rolls back completely
- **WHEN** a reconciliação de contatos ou endereço falha durante uma edição
- **THEN** a transação é revertida por completo e nenhuma alteração parcial permanece persistida

### Requirement: Party and children mutated only through the Party aggregate

As entidades filhas `PartyContact` e `PartyAddress` SHALL ser persistidas em tabelas próprias mas alteradas somente pelo agregado `Party` via `PartyRepository`. Não SHALL existir repositório público próprio para `PartyContact` ou `PartyAddress`.

#### Scenario: Children persisted through Party aggregate
- **WHEN** uma `Party` é criada com contatos e endereço
- **THEN** os `PartyContact` e o `PartyAddress` são persistidos atomicamente pelo `PartyRepository`, sem repositório público independente
