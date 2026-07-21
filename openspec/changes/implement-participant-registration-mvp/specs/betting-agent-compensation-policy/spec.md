## ADDED Requirements

### Requirement: Initial compensation policy is mandatory at creation

O sistema SHALL exigir uma política de remuneração (`CompensationPolicy`) na criação do `BettingAgent` (D27). Um `BettingAgent` ativo SHALL sempre possuir exatamente uma política vigente. A política inicial SHALL começar na data de criação do `BettingAgent`, usando um `EffectivePeriod` com início obrigatório e fim aberto. Criação sem política SHALL ser rejeitada.

#### Scenario: Creation without policy is rejected
- **WHEN** uma criação de Cambista não informa política de remuneração
- **THEN** o sistema rejeita a operação e nenhum `Party` ou `BettingAgent` é persistido

#### Scenario: Initial policy starts at creation date
- **WHEN** um Cambista é criado com política válida
- **THEN** a política é persistida como vigente com `EffectivePeriod` iniciando na data de criação e fim aberto

### Requirement: Only the three approved policy types are accepted

O sistema SHALL modelar `CompensationPolicy` como uma união discriminada aceitando somente `PERCENTAGE_ON_SALES`, `FIXED_WEEKLY` e `FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES`. O tipo `FIXED_PER_ENTRY` SHALL ser rejeitado. Cada tipo SHALL validar seus próprios valores (percentual e/ou valor fixo) conforme suas regras; tipo desconhecido ou valores inválidos SHALL ser rejeitados. Dinheiro NÃO SHALL usar ponto flutuante binário.

#### Scenario: Percentage-on-sales policy is accepted
- **WHEN** a criação informa política `PERCENTAGE_ON_SALES` com percentual válido
- **THEN** a política é aceita e persistida com o percentual informado

#### Scenario: Fixed-weekly-plus-percentage policy is accepted
- **WHEN** a criação informa política `FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES` com valor fixo semanal e percentual válidos
- **THEN** a política é aceita e persistida com ambos os valores

#### Scenario: FIXED_PER_ENTRY is rejected
- **WHEN** a criação informa política do tipo `FIXED_PER_ENTRY`
- **THEN** o sistema rejeita a operação como tipo não suportado neste incremento

#### Scenario: Invalid policy values are rejected
- **WHEN** a criação informa um tipo válido com valores ausentes ou inválidos (ex.: percentual fora da faixa, valor fixo negativo)
- **THEN** o sistema rejeita a operação com erro de validação e nada é persistido

### Requirement: Policy is persisted in a history-compatible structure

O sistema SHALL persistir a política em estrutura versionável por vigência (`EffectivePeriod`), compatível com histórico futuro, sem reescrever snapshots. Neste incremento o sistema NÃO SHALL implementar alteração de vigência, encerramento de política, agendamento futuro nem consulta de histórico — apenas a política inicial.

#### Scenario: Policy stored as a versionable effective period
- **WHEN** a política inicial é persistida
- **THEN** ela é gravada com um `EffectivePeriod` que permite adicionar vigências futuras sem sobrescrever a inicial

#### Scenario: No policy change operations in this increment
- **WHEN** o incremento é entregue
- **THEN** nenhuma operação de alteração, encerramento, agendamento ou histórico de política é exposta; somente a definição da política inicial na criação
