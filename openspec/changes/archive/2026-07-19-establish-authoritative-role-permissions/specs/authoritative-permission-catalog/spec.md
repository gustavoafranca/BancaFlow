## ADDED Requirements

### Requirement: Permission catalog is a closed, enumerated set defined in source code
O sistema SHALL manter um catálogo fechado de `PermissionKey`, definido como união literal TypeScript no código-fonte, contendo exatamente as seguintes chaves nesta fase: `identity.profile.read-own`, `identity.profile.update-own`, `identity.password.change-own`, `identity.accounts.toggle-status`, `identity.accounts.reset-password`, `participants.betting-agents.create`, `participants.betting-agents.list`, `participants.betting-agents.read`, `access-control.role-permissions.read`. O catálogo NÃO SHALL ser editável em runtime nesta fase (sem tabela, sem UI de administração de permissões).

#### Scenario: Known permission key is recognized
- **WHEN** um consumidor referencia uma `PermissionKey` pertencente ao conjunto fechado acima (ex.: `identity.accounts.toggle-status`)
- **THEN** o sistema reconhece a chave como válida e prossegue com a checagem de permissão

#### Scenario: Unknown permission key raises a configuration error at the parsing boundary, not a denial
- **WHEN** uma fronteira não tipada (ex.: valor externo convertido via `parsePermissionKey`) recebe uma string que não pertence ao conjunto fechado de `PermissionKey`
- **THEN** o sistema retorna um erro de configuração (`ACCESS_CONTROL.UNKNOWN_PERMISSION_KEY`), distinto de uma negação de autorização (`FORBIDDEN`); nenhum chamador interno tipado pode produzir esse erro, pois `PermissionKey` restringe o valor em tempo de compilação

### Requirement: Role-permission mapping is fixed, fully enumerated and global
O sistema SHALL manter um mapeamento fixo (`RolePermissionMap`) entre cada `AccountRole` (`OWNER|ADMIN|USER`) e o subconjunto exato de `PermissionKey`s que autoriza, conforme a tabela normativa: `OWNER` autoriza todas as 9 chaves; `ADMIN` autoriza todas as 9 chaves; `USER` autoriza somente `identity.profile.read-own`, `identity.profile.update-own` e `identity.password.change-own`. O mapeamento SHALL ser definido em código-fonte e idêntico para todas as Bancas.

#### Scenario: OWNER is authorized for any existing permission
- **WHEN** o papel do ator é `OWNER` e a `PermissionKey` consultada pertence ao catálogo
- **THEN** o sistema autoriza

#### Scenario: ADMIN authorized for all catalog entries in this phase
- **WHEN** o papel do ator é `ADMIN` e a `PermissionKey` consultada pertence ao catálogo desta fase
- **THEN** o sistema autoriza, pois todas as 9 chaves atuais incluem `ADMIN`

#### Scenario: USER denied on administrative permissions
- **WHEN** o papel do ator é `USER` e a `PermissionKey` consultada é `identity.accounts.toggle-status`, `identity.accounts.reset-password`, `participants.betting-agents.create`, `participants.betting-agents.list`, `participants.betting-agents.read` ou `access-control.role-permissions.read`
- **THEN** o sistema nega a autorização

#### Scenario: USER authorized on self-service permissions
- **WHEN** o papel do ator é `USER` e a `PermissionKey` consultada é `identity.profile.read-own`, `identity.profile.update-own` ou `identity.password.change-own`
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

### Requirement: Role-permission matrix is restricted to OWNER and ADMIN via the catalog itself
O sistema SHALL expor `GET /api/access-control/role-permissions`, retornando a matriz completa papel × permissão para os três papéis reais (`OWNER|ADMIN|USER`), autorizado via `hasPermission(actorRole, 'access-control.role-permissions.read')`. Cada entrada de permissão retornada SHALL incluir metadados de apresentação (`label`, `description`, `order`), agrupados por capacidade (`capability`, com seu próprio `label`/`order`), para que o Web não precise inventar rótulos nem exibir chaves técnicas cruas.

#### Scenario: OWNER or ADMIN reads the full matrix with presentation metadata
- **WHEN** um `OWNER` ou `ADMIN` autenticado consulta `GET /api/access-control/role-permissions`
- **THEN** o sistema retorna a matriz completa papel × permissão para `OWNER`, `ADMIN` e `USER`, com `label`/`description`/`order` por permissão e por capacidade, nunca os perfis fictícios do protótipo

#### Scenario: USER is denied the full matrix
- **WHEN** um `USER` autenticado tenta consultar `GET /api/access-control/role-permissions`
- **THEN** o sistema nega o acesso (`FORBIDDEN`, via `hasPermission` negando `access-control.role-permissions.read`), sem retornar a matriz de outros papéis

#### Scenario: No write endpoint exists for the catalog
- **WHEN** um cliente tenta modificar o catálogo ou o mapeamento via API
- **THEN** não existe endpoint de escrita disponível para essa operação nesta fase

### Requirement: Any authenticated actor reads only their own effective permissions
O sistema SHALL expor `GET /api/access-control/me/permissions`, retornando exclusivamente as `PermissionKey`s efetivas do papel do ator autenticado (conforme `RolePermissionMap`), com `label` de apresentação por permissão, disponível a qualquer papel (`OWNER|ADMIN|USER`) sem exigir uma `PermissionKey` própria para o acesso a este endpoint.

#### Scenario: Any authenticated role reads their own permissions
- **WHEN** qualquer usuário autenticado consulta `GET /api/access-control/me/permissions`
- **THEN** o sistema retorna somente as `PermissionKey`s (com `label`) autorizadas para o `actorRole` do próprio ator, nunca a matriz completa de outros papéis
