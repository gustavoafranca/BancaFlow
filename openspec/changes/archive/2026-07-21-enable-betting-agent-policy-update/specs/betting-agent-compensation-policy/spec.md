## MODIFIED Requirements

### Requirement: Policy is persisted in a history-compatible structure

O sistema SHALL persistir a política em estrutura versionável por vigência (`EffectivePeriod`), compatível com histórico, sem reescrever ou apagar vigências passadas. O sistema SHALL permitir alterar a política vigente de um `BettingAgent` existente, fechando a vigência da política atual (`effectiveTo` = início da nova vigência) e abrindo uma nova política vigente (`effectiveFrom` = agora, `effectiveTo` em aberto) — nunca sobrescrevendo ou removendo a linha anterior. Consulta de histórico de vigências passadas e agendamento de vigência futura permanecem fora de escopo.

#### Scenario: Policy stored as a versionable effective period
- **WHEN** a política inicial é persistida
- **THEN** ela é gravada com um `EffectivePeriod` que permite adicionar vigências futuras sem sobrescrever a inicial

#### Scenario: Changing the policy closes the previous one and opens a new one
- **WHEN** a política de um `BettingAgent` existente é alterada com sucesso
- **THEN** a política anterior é preservada com `effectiveTo` igual ao início da nova vigência, e a nova política é persistida como vigente (`effectiveTo` em aberto), sem apagar ou sobrescrever a anterior

#### Scenario: History and future scheduling remain out of scope
- **WHEN** o incremento é entregue
- **THEN** nenhuma consulta de histórico de vigências passadas nem agendamento de vigência futura é exposta; a alteração de política sempre começa imediatamente (`effectiveFrom` = agora)

## ADDED Requirements

### Requirement: Only OWNER or ADMIN may change an existing policy

O sistema SHALL permitir alterar a política de remuneração de um `BettingAgent` existente somente para atores com a permissão `participants.betting-agents.update` (hoje concedida a OWNER e ADMIN, nunca a USER). A alteração SHALL ser rejeitada para atores sem essa permissão, e SHALL respeitar o isolamento por Banca (recurso de outra Banca, ou inexistente, responde como não encontrado).

#### Scenario: OWNER changes the policy
- **WHEN** um ator com papel OWNER envia uma nova política válida para um `BettingAgent` existente da própria Banca
- **THEN** a alteração é aceita e a nova política passa a vigorar

#### Scenario: ADMIN changes the policy
- **WHEN** um ator com papel ADMIN envia uma nova política válida para um `BettingAgent` existente da própria Banca
- **THEN** a alteração é aceita e a nova política passa a vigorar

#### Scenario: Actor without permission is rejected
- **WHEN** um ator sem a permissão `participants.betting-agents.update` tenta alterar a política de um `BettingAgent`
- **THEN** o sistema rejeita a operação e a política vigente permanece inalterada

#### Scenario: Betting agent from another Banca is not found
- **WHEN** um ator autorizado tenta alterar a política de um `BettingAgent` que pertence a outra Banca (ou não existe)
- **THEN** o sistema responde como recurso não encontrado, sem revelar a existência do recurso em outra Banca

### Requirement: Policy change validates the same rules as policy creation

O sistema SHALL validar uma política alterada com exatamente as mesmas regras aplicadas na criação: somente os tipos `PERCENTAGE_ON_SALES`, `FIXED_WEEKLY` e `FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES` são aceitos, `FIXED_PER_ENTRY` SHALL ser rejeitado, e cada tipo SHALL validar seus próprios valores obrigatórios. Uma alteração inválida SHALL ser rejeitada sem persistir nenhuma mudança.

#### Scenario: Valid new policy type is accepted
- **WHEN** a alteração informa um tipo válido (`PERCENTAGE_ON_SALES`, `FIXED_WEEKLY` ou `FIXED_WEEKLY_PLUS_PERCENTAGE_ON_SALES`) com valores válidos para esse tipo
- **THEN** a política é aceita e passa a vigorar como a política atual

#### Scenario: FIXED_PER_ENTRY is rejected on change
- **WHEN** a alteração informa política do tipo `FIXED_PER_ENTRY`
- **THEN** o sistema rejeita a operação como tipo não suportado, e a política vigente anterior permanece ativa

#### Scenario: Invalid values are rejected on change
- **WHEN** a alteração informa um tipo válido com valores ausentes ou inválidos (ex.: percentual fora da faixa, valor fixo negativo)
- **THEN** o sistema rejeita a operação com erro de validação, e a política vigente anterior permanece ativa
