## MODIFIED Requirements

### Requirement: Tests prove component reuse and accessibility
A suíte SHALL cobrir primitives compartilhadas e suas variantes, componentes de módulo, acessibilidade via Testing Library e schemas/forms conforme `frontend-form-schema`. O comportamento do Drawer compartilhado (foco, Escape, redimensionamento, maximizar/restaurar, rodapé por modo, tema, loading) SHALL ser testado uma única vez, no componente compartilhado, e páginas consumidoras SHALL NOT replicar essa cobertura — apenas a integração específica de domínio (dados, campos, submit) daquela tela.

#### Scenario: Shared primitive variants are covered
- **WHEN** uma primitive compartilhada (ex.: `Button`, `Input`) é testada
- **THEN** suas variantes e estados relevantes têm asserções

#### Scenario: Form schema validation is covered
- **WHEN** um schema/form (`v` + React Hook Form) é testado
- **THEN** entradas inválidas exibem mensagem acessível e não submetem, e entradas válidas submetem o payload esperado

#### Scenario: Drawer primitive is tested once, in isolation
- **WHEN** os testes do Web rodam
- **THEN** o Drawer compartilhado tem cobertura própria de abertura/fechamento, foco e retorno de foco, Escape, redimensionamento por mouse e teclado, maximizar/restaurar, rodapé por modo, loading e herança de tema

#### Scenario: Consuming pages do not duplicate drawer behavior coverage
- **WHEN** uma página ou componente de módulo consome o Drawer compartilhado
- **THEN** seus testes cobrem apenas a integração de domínio (dados exibidos, campos, submissão, erros específicos), sem reimplementar os cenários já cobertos pelo teste do Drawer

## ADDED Requirements

### Requirement: Web test suite runtime does not regress
O tempo total de execução da suíte de testes do Web (`npm run test`) SHALL permanecer igual ou menor que o baseline medido antes desta change (236 testes, 42 suites, ~13s de execução Jest). Consolidar drawers duplicados em um único componente SHALL remover testes redundantes de comportamento de drawer espalhados por página, contribuindo para essa meta.

#### Scenario: Full suite runtime does not exceed baseline
- **WHEN** a suíte completa do Web (`npm run test`) é executada após a consolidação dos drawers
- **THEN** o tempo total de execução é igual ou menor que o baseline registrado antes da mudança

#### Scenario: Duplicate drawer test scenarios are removed
- **WHEN** os testes de páginas que antes tinham drawer próprio (Configurações/Usuários, Pessoas, Acerto) são revisados após a migração
- **THEN** não restam testes duplicados de foco/Escape/resize/maximizar de drawer nessas páginas, pois essa cobertura passou a existir apenas no teste do Drawer compartilhado
