## ADDED Requirements

### Requirement: Settings area uses a fixed internal sidebar navigated by route
`/configuracoes` SHALL apresentar uma navegação lateral própria e fixa, interna à área de Configurações, substituindo a navegação anterior por `Tabs`. Cada seção (ex.: Geral, Usuários, Perfis de acesso, Turnos, Configuração do Jogo, Segurança, Auditoria) SHALL corresponder a uma sub-rota real sob `/configuracoes/**`, permitindo deep-link direto a qualquer seção.

#### Scenario: Each section is a real route
- **WHEN** o usuário acessa diretamente a URL de uma sub-rota de Configurações (ex.: `/configuracoes/usuarios`)
- **THEN** a seção correspondente é renderizada sem depender de clique prévio em outra parte da UI

#### Scenario: Selected item is highlighted
- **WHEN** o usuário está em uma sub-rota de Configurações
- **THEN** o item correspondente na sidebar aparece destacado como selecionado

#### Scenario: Root settings route redirects to an accessible section
- **WHEN** o usuário acessa `/configuracoes` diretamente
- **THEN** o sistema direciona para a primeira seção acessível ao usuário (ex.: Geral ou Usuários), sem página em branco

### Requirement: Settings sidebar is internal and does not replace the main menu
A sidebar de Configurações SHALL ser interna a essa área e SHALL NOT substituir ou se sobrepor ao menu principal da aplicação (`_shell`). A estrutura SHALL permitir adicionar novas seções futuramente sem exigir alteração no layout da sidebar.

#### Scenario: Main application menu remains visible
- **WHEN** o usuário navega para qualquer sub-rota de Configurações
- **THEN** o menu principal do shell privado continua visível e funcional, sem ser substituído pela sidebar de Configurações

#### Scenario: Adding a new section does not require layout changes
- **WHEN** uma nova seção é adicionada à área de Configurações
- **THEN** ela é incluída como um novo item de rota na sidebar existente, sem exigir reestruturação do layout

### Requirement: Settings sidebar supersedes the high-level tabs organization
A navegação da área de Configurações SHALL usar a sidebar interna por rota como forma canônica de organização, substituindo qualquer organização anterior por abas de alto nível (`Tabs`) entre Usuários e Perfis de acesso. Nenhuma tela de Configurações SHALL manter `Tabs` como mecanismo de navegação de topo entre seções.

#### Scenario: No high-level tabs remain for section navigation
- **WHEN** a área de Configurações é inspecionada após esta change
- **THEN** a navegação entre Usuários, Perfis de acesso e demais seções ocorre pela sidebar interna por rota, e não há `TabsList`/`TabsTrigger` atuando como navegação de topo entre seções

### Requirement: Unready settings sub-area communicates unavailability honestly
Um item da sidebar interna de Configurações que aponte para uma seção ainda não implementada (ex.: Turnos, Configuração do Jogo, Segurança, Auditoria) SHALL levar a um estado explícito de capability indisponível — sem dado fabricado e sem ação que simule persistência — OU SHALL ser omitido da sidebar até a capability existir. Nenhuma página placeholder SHALL aparentar estar pronta.

#### Scenario: Unready sub-area shows honest unavailable state
- **WHEN** o usuário acessa uma sub-rota de Configurações cuja capability ainda não existe no Backend
- **THEN** a página exibe o mesmo estado explícito de "capability indisponível" já usado no restante do sistema, sem lista/matriz fictícia e sem botão que simule criar/editar/salvar

#### Scenario: Unready sub-area is otherwise omitted from the sidebar
- **WHEN** a decisão for não exibir uma seção ainda não implementada
- **THEN** o item correspondente não aparece na sidebar, em vez de aparecer levando a uma página que finge estar pronta

### Requirement: Settings sidebar items respect permissions
Um item da sidebar de Configurações cuja seção o usuário não tem permissão de visualizar SHALL ficar oculto. A rota correspondente SHALL permanecer protegida mesmo se acessada diretamente pela URL, seguindo o mesmo gate por `PermissionKey` já usado (nunca por papel bruto).

#### Scenario: Item without permission is hidden
- **WHEN** o usuário não possui a `PermissionKey` associada a uma seção de Configurações
- **THEN** o item correspondente não aparece na sidebar

#### Scenario: Direct URL access to an unauthorized section is blocked
- **WHEN** um usuário sem a `PermissionKey` necessária acessa diretamente a sub-rota daquela seção
- **THEN** a rota exibe o mesmo estado de sem-permissão já usado no restante do sistema, sem vazar dado
