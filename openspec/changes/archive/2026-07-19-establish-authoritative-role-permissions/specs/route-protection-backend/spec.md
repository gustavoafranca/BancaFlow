## ADDED Requirements

### Requirement: ToggleAccountStatusUseCase authorizes via the permission catalog, not a raw role check
`ToggleAccountStatusUseCase` SHALL substituir sua checagem de papel bruto (`actorRole !== 'OWNER' && actorRole !== 'ADMIN'`) pela consulta à porta `hasPermission(actorRole, 'identity.accounts.toggle-status')` do catálogo autoritativo de Access Control. A invariante contextual "`ADMIN` nunca altera o status de uma conta `OWNER`" SHALL permanecer como validação explícita no domínio de Identity, executada após a checagem de permissão, e NÃO SHALL ser representada como uma `PermissionKey`. A negação de permissão SHALL retornar o mesmo erro de autorização já padronizado (`FORBIDDEN`) usado pelas demais checagens de autorização do sistema.

#### Scenario: Action allowed when the actor role holds the permission
- **WHEN** `hasPermission(actorRole, 'identity.accounts.toggle-status')` retorna `true` e a invariante contextual (alvo não é `OWNER` quando o ator é `ADMIN`) é satisfeita
- **THEN** `ToggleAccountStatusUseCase` executa a ação normalmente

#### Scenario: Action denied when the permission is not granted
- **WHEN** `hasPermission(actorRole, 'identity.accounts.toggle-status')` retorna `false` (papel `USER`)
- **THEN** `ToggleAccountStatusUseCase` recusa a ação e retorna `FORBIDDEN`, sem avaliar a invariante contextual

#### Scenario: Contextual invariant still blocks ADMIN targeting OWNER even with permission granted
- **WHEN** o ator é `ADMIN` (permissão `identity.accounts.toggle-status` concedida pelo catálogo) e o alvo da operação possui papel `OWNER`
- **THEN** `ToggleAccountStatusUseCase` recusa a ação e retorna `FORBIDDEN`, pois a invariante contextual de Identity — não o catálogo de permissões — proíbe essa combinação

#### Scenario: Unknown permission key referenced by a use case is a configuration error
- **WHEN** um caso de uso referencia uma `PermissionKey` que não existe no catálogo autoritativo
- **THEN** o sistema trata isso como erro de configuração/programação, detectável antes de produção, não como uma negação de autorização em runtime

### Requirement: AdminResetPasswordUseCase authorizes via the permission catalog, not a raw role check
`AdminResetPasswordUseCase` SHALL substituir sua checagem de papel bruto (`actorRole !== 'OWNER' && actorRole !== 'ADMIN'`) pela consulta à porta `hasPermission(actorRole, 'identity.accounts.reset-password')` do catálogo autoritativo de Access Control. A invariante contextual "`ADMIN` nunca reseta a senha de uma conta `OWNER`" SHALL permanecer como validação explícita no domínio de Identity, executada após a checagem de permissão, e NÃO SHALL ser representada como uma `PermissionKey`.

#### Scenario: Action allowed when the actor role holds the permission
- **WHEN** `hasPermission(actorRole, 'identity.accounts.reset-password')` retorna `true` e a invariante contextual (alvo não é `OWNER` quando o ator é `ADMIN`) é satisfeita
- **THEN** `AdminResetPasswordUseCase` executa a ação normalmente

#### Scenario: Action denied when the permission is not granted
- **WHEN** `hasPermission(actorRole, 'identity.accounts.reset-password')` retorna `false` (papel `USER`)
- **THEN** `AdminResetPasswordUseCase` recusa a ação e retorna `FORBIDDEN`, sem avaliar a invariante contextual

#### Scenario: Contextual invariant still blocks ADMIN targeting OWNER even with permission granted
- **WHEN** o ator é `ADMIN` (permissão `identity.accounts.reset-password` concedida pelo catálogo) e o alvo da operação possui papel `OWNER`
- **THEN** `AdminResetPasswordUseCase` recusa a ação e retorna `FORBIDDEN`, pois a invariante contextual de Identity — não o catálogo de permissões — proíbe essa combinação

### Requirement: Self-service use cases authorize via the permission catalog, with real consumers for every self-service key
`GetAuthenticatedUserContextUseCase`, `UpdateOwnProfileUseCase` e `ChangePasswordUseCase` SHALL consultar `hasPermission` para, respectivamente, `identity.profile.read-own`, `identity.profile.update-own` e `identity.password.change-own`, antes de executar a operação. Nenhuma `PermissionKey` do catálogo autoritativo SHALL permanecer sem um consumidor real que a invoque via `hasPermission`.

#### Scenario: Own profile read is authorized via the catalog
- **WHEN** um ator autenticado com qualquer papel (`OWNER`, `ADMIN` ou `USER`) consulta `GET /api/auth/me`
- **THEN** `GetAuthenticatedUserContextUseCase` consulta `hasPermission(actorRole, 'identity.profile.read-own')` antes de compor o contexto de exibição

#### Scenario: Own profile update is authorized via the catalog
- **WHEN** um ator autenticado com qualquer papel atualiza o próprio nome/e-mail via `PATCH /api/auth/me`
- **THEN** `UpdateOwnProfileUseCase` consulta `hasPermission(actorRole, 'identity.profile.update-own')` antes de aplicar a mudança

#### Scenario: Own password change is authorized via the catalog
- **WHEN** um ator autenticado troca a própria senha via `PATCH /api/auth/password`
- **THEN** `ChangePasswordUseCase` consulta `hasPermission(account.role, 'identity.password.change-own')` (papel da própria conta já carregada) antes de validar a senha atual

#### Scenario: No catalog key is left without a real consumer
- **WHEN** as 9 `PermissionKey`s do catálogo autoritativo são inventariadas
- **THEN** cada uma corresponde a pelo menos um caso de uso real que a consulta via `hasPermission` — nenhuma existe apenas em catálogo/mapa/testes
