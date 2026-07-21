## ADDED Requirements

### Requirement: Protected capability changes update the permission catalog in the same change
Toda nova capability, rota, endpoint ou ação protegida SHALL, na mesma change, declarar uma `PermissionKey` estável no catálogo oficial, metadados de apresentação em português (`label`, `description`, `order`, agrupamento), decisão explícita de concessão para `OWNER`, `ADMIN` e `USER`, enforcement backend por `PermissionChecker`/`hasPermission`, gate de rota/menu/ação no frontend quando pertinente, presença automática na matriz de Perfis de acesso e testes correspondentes.

#### Scenario: New protected endpoint has complete catalog entry
- **WHEN** uma change adiciona um endpoint protegido
- **THEN** a mesma change inclui `PermissionKey`, metadados, decisão por papel, enforcement backend, exposição na matriz e testes de endpoint protegido

#### Scenario: Planned capability does not create disconnected key
- **WHEN** uma capability ainda é apenas planejada e não possui endpoint, rota ou ação real
- **THEN** a change documenta a intenção sem criar uma chave desconectada de uso real

### Requirement: Permission catalog integrity fails on silent divergence
O módulo Access Control SHALL possuir proteção automatizada que falha quando há chave duplicada, chave sem metadados de apresentação, papel sem decisão explícita, matriz exposta divergente do catálogo/mapeamento, ou capability protegida adicionada sem cobertura prevista de enforcement e UI pertinente.

#### Scenario: Missing role decision fails integrity test
- **WHEN** uma `PermissionKey` existe no catálogo mas algum papel não possui decisão explícita de conceder ou negar
- **THEN** o teste de integridade falha antes do merge
