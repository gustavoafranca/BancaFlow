## RENAMED Requirements

- FROM: `### Requirement: Access Profiles screen mirrors the real role-permission matrix, restricted to OWNER and ADMIN`
- TO: `### Requirement: Access Profiles screen mirrors the real role-permission matrix, restricted to OWNER`

## MODIFIED Requirements

### Requirement: Access Profiles screen mirrors the real role-permission matrix, restricted to OWNER
O sistema SHALL apresentar `/configuracoes → Perfis de Acesso` a partir de uma leitura real de `GET /api/access-control/role-permissions`, exibindo exclusivamente os três papéis reais do domínio (`OWNER|ADMIN|USER`). Nesta versão, a tela SHALL permanecer acessível apenas a `OWNER` — `ADMIN` deixou de ter acesso a esta tela, pois a leitura da matriz completa é restrita a `OWNER` no Backend ([[authoritative-permission-catalog]]) — e somente leitura, sem nenhum toggle editável de permissão.

#### Scenario: Access Profiles screen shows the three real roles to OWNER/ADMIN
- **WHEN** um comportamento anterior a esta fase permitia `ADMIN` abrir `/configuracoes → Perfis de Acesso`
- **THEN** esse acesso foi revogado nesta versão — ver "Access Profiles screen shows the three real roles to OWNER" e "ADMIN no longer sees the administrative Access Profiles screen" para o comportamento atual

#### Scenario: Access Profiles screen shows the three real roles to OWNER
- **WHEN** um usuário autenticado com papel `OWNER` abre `/configuracoes → Perfis de Acesso`
- **THEN** a tela exibe a matriz papel × permissão para `OWNER`, `ADMIN` e `USER`, sem exibir os 4 perfis fictícios do protótipo

#### Scenario: ADMIN no longer sees the administrative Access Profiles screen
- **WHEN** um usuário autenticado com papel `ADMIN` tenta acessar `/configuracoes → Perfis de Acesso`
- **THEN** o Web oculta o item de navegação por experiência, e o Backend recusa a chamada correspondente (`GET /api/access-control/role-permissions`) mesmo que a rota fosse acessada diretamente, retornando `403`

#### Scenario: USER does not see the administrative Access Profiles screen
- **WHEN** um usuário autenticado com papel `USER` tenta acessar `/configuracoes → Perfis de Acesso`
- **THEN** o Web oculta o item de navegação por experiência, e o Backend recusa a chamada correspondente mesmo que a rota fosse acessada diretamente

#### Scenario: Screen has no editable permission toggle
- **WHEN** um usuário `OWNER` visualiza `/configuracoes → Perfis de Acesso`
- **THEN** nenhum controle de edição de permissão está presente, evitando sugerir uma capacidade de administração de permissões que não existe nesta fase

#### Scenario: Hiding a Web action is experience, not authorization
- **WHEN** o papel do usuário autenticado não teria permissão para uma ação em outra tela
- **THEN** o Web pode ocultar o controle correspondente por experiência, mas o Backend segue validando a permissão de forma independente, mesmo que o controle estivesse visível
