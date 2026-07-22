## MODIFIED Requirements

### Requirement: Permission catalog is a closed, enumerated set defined in source code

O sistema SHALL manter um catálogo fechado de `PermissionKey`, definido como união literal TypeScript no código-fonte, contendo exatamente as seguintes chaves nesta fase: `identity.profile.read-own`, `identity.profile.update-own`, `identity.password.change-own`, `identity.accounts.list`, `identity.accounts.read`, `identity.accounts.create`, `identity.accounts.update`, `identity.accounts.change-role`, `identity.accounts.toggle-status`, `identity.accounts.reset-password`, `identity.accounts.sessions.read`, `identity.accounts.sessions.revoke`, `participants.betting-agents.create`, `participants.betting-agents.list`, `participants.betting-agents.read`, `participants.betting-agents.update`, `access-control.role-permissions.read`. O catálogo NÃO SHALL ser editável em runtime nesta fase (sem tabela, sem UI de administração de permissões). Cada nova chave administrativa de conta (`identity.accounts.*`) SHALL corresponder a exatamente um endpoint real de `[[tenant-user-administration]]`; nenhuma chave é adicionada sem um consumidor real. A chave `participants.betting-agents.update` SHALL corresponder exatamente aos endpoints de edição de perfil e de transição de status de `BettingAgent` especificados em `[[betting-agent-catalog]]`.

#### Scenario: Known permission key is recognized
- **WHEN** um consumidor referencia uma `PermissionKey` pertencente ao conjunto fechado acima (ex.: `identity.accounts.list`)
- **THEN** o sistema reconhece a chave como válida e prossegue com a checagem de permissão

#### Scenario: Unknown permission key raises a configuration error at the parsing boundary, not a denial
- **WHEN** uma fronteira não tipada (ex.: valor externo convertido via `parsePermissionKey`) recebe uma string que não pertence ao conjunto fechado de `PermissionKey`
- **THEN** o sistema retorna um erro de configuração (`ACCESS_CONTROL.UNKNOWN_PERMISSION_KEY`), distinto de uma negação de autorização (`FORBIDDEN`); nenhum chamador interno tipado pode produzir esse erro, pois `PermissionKey` restringe o valor em tempo de compilação

#### Scenario: Each new administrative account key maps to exactly one endpoint
- **WHEN** uma das sete novas chaves `identity.accounts.list|read|create|update|change-role|sessions.read|sessions.revoke` é adicionada ao catálogo
- **THEN** ela corresponde a exatamente um endpoint administrativo de conta especificado em `[[tenant-user-administration]]`, sem chave desconectada de um caso de uso real

#### Scenario: New betting-agent update key is recognized
- **WHEN** um consumidor referencia a `PermissionKey` `participants.betting-agents.update`
- **THEN** o sistema reconhece a chave como válida e prossegue com a checagem de permissão, sem exigir tabela nem UI de administração de permissões

### Requirement: Role-permission mapping is fixed, fully enumerated and global

O sistema SHALL manter um mapeamento fixo (`RolePermissionMap`) entre cada `AccountRole` (`OWNER|ADMIN|USER`) e o subconjunto exato de `PermissionKey`s que autoriza, conforme a tabela normativa: `OWNER` autoriza todas as 17 chaves; `ADMIN` autoriza `identity.profile.read-own`, `identity.profile.update-own`, `identity.password.change-own`, `participants.betting-agents.create`, `participants.betting-agents.update`, `participants.betting-agents.list` e `participants.betting-agents.read`; `USER` autoriza `identity.profile.read-own`, `identity.profile.update-own`, `identity.password.change-own`, `participants.betting-agents.list` e `participants.betting-agents.read`. Nenhuma chave `identity.accounts.*` nem `access-control.role-permissions.read` é concedida a `ADMIN` ou `USER` nesta fase — administração de conta e leitura da matriz completa são exclusivas de `OWNER`. `participants.betting-agents.update` NÃO SHALL ser concedida a `USER` — apenas `OWNER` e `ADMIN` administram o ciclo de vida e os dados cadastrais de Cambista. O mapeamento SHALL ser definido em código-fonte e idêntico para todas as Bancas.

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
- **WHEN** o papel do ator é `ADMIN` e a `PermissionKey` consultada é `identity.profile.read-own`, `identity.profile.update-own`, `identity.password.change-own`, `participants.betting-agents.create`, `participants.betting-agents.update`, `participants.betting-agents.list` ou `participants.betting-agents.read`
- **THEN** o sistema autoriza

#### Scenario: USER denied on administrative permissions
- **WHEN** o papel do ator é `USER` e a `PermissionKey` consultada é qualquer `identity.accounts.*`, `participants.betting-agents.create`, `participants.betting-agents.update` ou `access-control.role-permissions.read`
- **THEN** o sistema nega a autorização

#### Scenario: USER authorized on self-service permissions
- **WHEN** o papel do ator é `USER` e a `PermissionKey` consultada é `identity.profile.read-own`, `identity.profile.update-own`, `identity.password.change-own`, `participants.betting-agents.list` ou `participants.betting-agents.read`
- **THEN** o sistema autoriza

#### Scenario: Mapping does not vary by Banca
- **WHEN** o mesmo papel é avaliado em Bancas diferentes para a mesma `PermissionKey`
- **THEN** o resultado da checagem é idêntico, independentemente da Banca
