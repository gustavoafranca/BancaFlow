## ADDED Requirements

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

O sistema SHALL permitir associar zero, um ou vários telefones (`PartyContact`) a uma `Party`. Cada telefone SHALL ser normalizado e validado como `Phone`. Telefones e endereços completos NÃO SHALL ser registrados em logs.

#### Scenario: Multiple phones coexist on the same Party
- **WHEN** a criação informa dois ou mais telefones válidos
- **THEN** todos são persistidos como `PartyContact` da mesma `Party`

#### Scenario: Invalid phone is rejected
- **WHEN** a criação informa um telefone que não passa na validação de `Phone`
- **THEN** o sistema rejeita a operação e nenhum contato é persistido

### Requirement: Initial address starts active and preserves single-active invariant

Quando informado, o endereço inicial (`PartyAddress`) SHALL começar ativo com uma vigência (`EffectivePeriod`) iniciando na criação. Uma `Party` SHALL possuir no máximo um endereço ativo. Bairro e cidade SHALL preservar o valor de exibição e expor um valor normalizado para busca/agrupamento.

#### Scenario: Initial address is active on creation
- **WHEN** a criação informa um endereço válido
- **THEN** o endereço é persistido com vigência ativa iniciando na data de criação e é o único endereço ativo da `Party`

#### Scenario: Neighborhood and city are normalized for analytics
- **WHEN** dois endereços informam bairro `"Centro"` e `" centro "` (com espaços/caixa diferentes)
- **THEN** ambos preservam a exibição original mas produzem o mesmo valor normalizado para agrupamento

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

### Requirement: Party and children mutated only through the Party aggregate

As entidades filhas `PartyContact` e `PartyAddress` SHALL ser persistidas em tabelas próprias mas alteradas somente pelo agregado `Party` via `PartyRepository`. Não SHALL existir repositório público próprio para `PartyContact` ou `PartyAddress`.

#### Scenario: Children persisted through Party aggregate
- **WHEN** uma `Party` é criada com contatos e endereço
- **THEN** os `PartyContact` e o `PartyAddress` são persistidos atomicamente pelo `PartyRepository`, sem repositório público independente
