## ADDED Requirements

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

## MODIFIED Requirements

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
