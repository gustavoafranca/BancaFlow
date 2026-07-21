## Purpose

Define o catálogo autoritativo, fechado e enumerado de permissões (`PermissionKey`) e o mapeamento fixo papel → permissões (`RolePermissionMap`) usados por todo o backend como única fonte de verdade para decisões de autorização baseadas em papel. Garante que o módulo `access-control` seja a fronteira central de checagem de permissão, sem depender de `modules/identity`, e expõe os dois endpoints de leitura consumidos pelo Web (matriz completa restrita a `OWNER`/`ADMIN`, e permissões efetivas do próprio ator para qualquer papel autenticado).

---
## Requirements
### Requirement: Permission catalog is a closed, enumerated set defined in source code
O sistema SHALL manter um catálogo fechado de `PermissionKey`, definido como união literal TypeScript no código-fonte, contendo exatamente as seguintes chaves nesta fase: `identity.profile.read-own`, `identity.profile.update-own`, `identity.password.change-own`, `identity.accounts.list`, `identity.accounts.read`, `identity.accounts.create`, `identity.accounts.update`, `identity.accounts.change-role`, `identity.accounts.toggle-status`, `identity.accounts.reset-password`, `identity.accounts.sessions.read`, `identity.accounts.sessions.revoke`, `participants.betting-agents.create`, `participants.betting-agents.list`, `participants.betting-agents.read`, `access-control.role-permissions.read`. O catálogo NÃO SHALL ser editável em runtime nesta fase (sem tabela, sem UI de administração de permissões). Cada nova chave administrativa de conta (`identity.accounts.*`) SHALL corresponder a exatamente um endpoint real de `[[tenant-user-administration]]`; nenhuma chave é adicionada sem um consumidor real.

#### Scenario: Known permission key is recognized
- **WHEN** um consumidor referencia uma `PermissionKey` pertencente ao conjunto fechado acima (ex.: `identity.accounts.list`)
- **THEN** o sistema reconhece a chave como válida e prossegue com a checagem de permissão

#### Scenario: Unknown permission key raises a configuration error at the parsing boundary, not a denial
- **WHEN** uma fronteira não tipada (ex.: valor externo convertido via `parsePermissionKey`) recebe uma string que não pertence ao conjunto fechado de `PermissionKey`
- **THEN** o sistema retorna um erro de configuração (`ACCESS_CONTROL.UNKNOWN_PERMISSION_KEY`), distinto de uma negação de autorização (`FORBIDDEN`); nenhum chamador interno tipado pode produzir esse erro, pois `PermissionKey` restringe o valor em tempo de compilação

#### Scenario: Each new administrative account key maps to exactly one endpoint
- **WHEN** uma das sete novas chaves `identity.accounts.list|read|create|update|change-role|sessions.read|sessions.revoke` é adicionada ao catálogo
- **THEN** ela corresponde a exatamente um endpoint administrativo de conta especificado em `[[tenant-user-administration]]`, sem chave desconectada de um caso de uso real

### Requirement: Role-permission mapping is fixed, fully enumerated and global
O sistema SHALL manter um mapeamento fixo (`RolePermissionMap`) entre cada `AccountRole` (`OWNER|ADMIN|USER`) e o subconjunto exato de `PermissionKey`s que autoriza, conforme a tabela normativa: `OWNER` autoriza todas as 16 chaves; `ADMIN` autoriza `identity.profile.read-own`, `identity.profile.update-own`, `identity.password.change-own`, `participants.betting-agents.create`, `participants.betting-agents.list` e `participants.betting-agents.read`; `USER` autoriza `identity.profile.read-own`, `identity.profile.update-own`, `identity.password.change-own`, `participants.betting-agents.list` e `participants.betting-agents.read`. Nenhuma chave `identity.accounts.*` nem `access-control.role-permissions.read` é concedida a `ADMIN` ou `USER` nesta fase — administração de conta e leitura da matriz completa são exclusivas de `OWNER`. O mapeamento SHALL ser definido em código-fonte e idêntico para todas as Bancas.

#### Scenario: OWNER is authorized for any existing permission
- **WHEN** o papel do ator é `OWNER` e a `PermissionKey` consultada pertence ao catálogo
- **THEN** o sistema autoriza

#### Scenario: ADMIN authorized for all catalog entries in this phase
- **WHEN** um catálogo anterior a esta fase autorizava `ADMIN` para todas as chaves então existentes
- **THEN** esse modelo foi substituído nesta versão — ver "ADMIN is denied all account-administration and matrix-read permissions" e "ADMIN keeps self-service and participant-catalog permissions" para o comportamento atual

#### Scenario: ADMIN is denied all account-administration and matrix-read permissions
- **WHEN** o papel do ator é `ADMIN` e a `PermissionKey` consultada é qualquer `identity.accounts.*` ou `access-control.role-permissions.read`
- **THEN** o sistema nega a autorização, mesmo que `ADMIN` já tivesse essa permissão em uma versão anterior do catálogo

#### Scenario: ADMIN keeps self-service and participant-catalog permissions
- **WHEN** o papel do ator é `ADMIN` e a `PermissionKey` consultada é `identity.profile.read-own`, `identity.profile.update-own`, `identity.password.change-own`, `participants.betting-agents.create`, `participants.betting-agents.list` ou `participants.betting-agents.read`
- **THEN** o sistema autoriza

#### Scenario: USER denied on administrative permissions
- **WHEN** o papel do ator é `USER` e a `PermissionKey` consultada é qualquer `identity.accounts.*`, `participants.betting-agents.create` ou `access-control.role-permissions.read`
- **THEN** o sistema nega a autorização

#### Scenario: USER authorized on self-service permissions
- **WHEN** o papel do ator é `USER` e a `PermissionKey` consultada é `identity.profile.read-own`, `identity.profile.update-own`, `identity.password.change-own`, `participants.betting-agents.list` ou `participants.betting-agents.read`
- **THEN** o sistema autoriza

#### Scenario: Mapping does not vary by Banca
- **WHEN** o mesmo papel é avaliado em Bancas diferentes para a mesma `PermissionKey`
- **THEN** o resultado da checagem é idêntico, independentemente da Banca

### Requirement: Permission check is a total function; boundary parsing is a separate concern
O sistema SHALL expor uma porta de checagem de permissão `hasPermission(actorRole: AccountRoleType, permissionKey: PermissionKey): boolean`, pura, sem efeitos colaterais e **total** — nunca lança, pois seu parâmetro `permissionKey` já é restrito ao conjunto fechado pelo tipo `PermissionKey`. A validação de valores não tipados (strings vindas de fronteiras externas) SHALL ser feita por uma função separada, `parsePermissionKey(value: unknown)`, nunca por `hasPermission`.

#### Scenario: hasPermission never throws for a typed key
- **WHEN** qualquer chamador interno invoca `hasPermission` com uma `PermissionKey` tipada
- **THEN** a função retorna `true` ou `false`, sem lançar exceção, independentemente da chave

#### Scenario: Boundary values are validated before reaching hasPermission
- **WHEN** um valor não tipado precisa ser usado como permissão (ex.: em log, teste ou futura extensão dinâmica)
- **THEN** o sistema usa `parsePermissionKey` para validar/convertê-lo antes de qualquer chamada a `hasPermission`

### Requirement: Permission check port is the single source of role-based authorization decisions, without exception
Todo módulo consumidor cuja autorização hoje corresponde a uma das 9 `PermissionKey`s do catálogo SHALL substituir sua checagem de papel bruto por `hasPermission`, sem exceção para o próprio endpoint de leitura da matriz nem para nenhum caso de uso já implementado que possua uma chave catalogada. Invariantes contextuais sobre a relação ator/alvo (ex.: papel não pode gerenciar outro papel específico, autoproteção, isolamento de tenant) NÃO SHALL ser representadas como `PermissionKey` — permanecem validações explícitas no domínio de origem, executadas após a checagem de permissão.

#### Scenario: Consumer replaces raw role check with the port
- **WHEN** um caso de uso de qualquer módulo precisa decidir se um `actorRole` autoriza uma ação já catalogada
- **THEN** o caso de uso consulta exclusivamente a porta de checagem de permissão, sem manter em paralelo uma checagem de papel bruto equivalente

#### Scenario: No exception for the catalog's own read endpoint
- **WHEN** o próprio controller de Access Control decide se um ator pode ler a matriz completa
- **THEN** ele consulta `hasPermission(actorRole, 'access-control.role-permissions.read')`, exatamente como qualquer outro consumidor, sem checagem de papel bruto direta

#### Scenario: Contextual invariant is not modeled as a permission
- **WHEN** uma regra depende da relação entre ator e alvo (ex.: um ator nunca gerencia outro com papel `OWNER`) e não apenas do papel do ator isoladamente
- **THEN** essa regra é validada no domínio do módulo de origem, não é representada como uma `PermissionKey` do catálogo

### Requirement: Access Control depends only on shared, never on Identity
O tipo `AccountRoleType` (união literal `OWNER|ADMIN|USER`, sem lógica) SHALL residir em `@bancaflow/shared`. O módulo `access-control` NÃO SHALL depender de `modules/identity`; módulos consumidores (incluindo `modules/identity` e `modules/participants`) SHALL depender da porta pública de `access-control`.

#### Scenario: Access Control module has no dependency on Identity internals
- **WHEN** o módulo `access-control` é implementado
- **THEN** ele importa `AccountRoleType` de `@bancaflow/shared` e não importa nenhum arquivo de `modules/identity`

#### Scenario: Identity consumes the public port without creating a cycle
- **WHEN** `modules/identity` consulta `hasPermission` exposta por `access-control`
- **THEN** não existe caminho de dependência de `access-control` de volta para `modules/identity`

### Requirement: Any authenticated actor reads only their own effective permissions
O sistema SHALL expor `GET /api/access-control/me/permissions`, retornando exclusivamente as `PermissionKey`s efetivas do papel do ator autenticado (conforme `RolePermissionMap`), com `label` de apresentação por permissão, disponível a qualquer papel (`OWNER|ADMIN|USER`) sem exigir uma `PermissionKey` própria para o acesso a este endpoint.

#### Scenario: Any authenticated role reads their own permissions
- **WHEN** qualquer usuário autenticado consulta `GET /api/access-control/me/permissions`
- **THEN** o sistema retorna somente as `PermissionKey`s (com `label`) autorizadas para o `actorRole` do próprio ator, nunca a matriz completa de outros papéis

### Requirement: Role-permission matrix is restricted to OWNER via the catalog itself
O sistema SHALL expor `GET /api/access-control/role-permissions`, retornando a matriz completa papel × permissão para os três papéis reais (`OWNER|ADMIN|USER`), autorizado via `hasPermission(actorRole, 'access-control.role-permissions.read')` — nesta fase, apenas `OWNER` autoriza essa chave. Cada entrada de permissão retornada SHALL incluir metadados de apresentação (`label`, `description`, `order`), agrupados por capacidade (`capability`, com seu próprio `label`/`order`), para que o Web não precise inventar rótulos nem exibir chaves técnicas cruas.

#### Scenario: OWNER or ADMIN reads the full matrix with presentation metadata
- **WHEN** um comportamento anterior a esta fase permitia `ADMIN` ler a matriz completa
- **THEN** esse acesso foi revogado nesta versão — ver "Only OWNER reads the full matrix with presentation metadata" e "ADMIN is denied the full matrix" para o comportamento atual

#### Scenario: Only OWNER reads the full matrix with presentation metadata
- **WHEN** um `OWNER` autenticado consulta `GET /api/access-control/role-permissions`
- **THEN** o sistema retorna a matriz completa papel × permissão para `OWNER`, `ADMIN` e `USER`, com `label`/`description`/`order` por permissão e por capacidade, nunca os perfis fictícios do protótipo

#### Scenario: ADMIN is denied the full matrix
- **WHEN** um `ADMIN` autenticado tenta consultar `GET /api/access-control/role-permissions`
- **THEN** o sistema nega o acesso (`FORBIDDEN`, via `hasPermission` negando `access-control.role-permissions.read` para `ADMIN` nesta fase), sem retornar a matriz de outros papéis

#### Scenario: USER is denied the full matrix
- **WHEN** um `USER` autenticado tenta consultar `GET /api/access-control/role-permissions`
- **THEN** o sistema nega o acesso (`FORBIDDEN`), sem retornar a matriz de outros papéis

#### Scenario: No write endpoint exists for the catalog
- **WHEN** um cliente tenta modificar o catálogo ou o mapeamento via API
- **THEN** não existe endpoint de escrita disponível para essa operação nesta fase

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

