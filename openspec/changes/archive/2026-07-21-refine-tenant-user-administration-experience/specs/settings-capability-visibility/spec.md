## ADDED Requirements

<!--
  "Settings is organized into high-level tabs for OWNER" (proposta original desta
  change) foi removida antes do archive: `standardize-frontend-drawer-and-settings-nav`
  já substituiu a navegação por abas de Configurações por uma sidebar interna
  roteada (`settings-area-navigation`), que cobre as mesmas duas garantias desta
  change — OWNER vê Usuários/Perfis de acesso navegáveis
  ("Settings area uses a fixed internal sidebar navigated by route",
  "Settings sidebar supersedes the high-level tabs organization") e quem não tem
  permissão não vê a capability ("Settings sidebar items respect permissions",
  "Account menu shows the settings item only for accounts with
  account-administration permission"). Manter o requisito de abas aqui
  contradiria o main. Reason/Migration equivalentes já registrados no histórico
  de `standardize-frontend-drawer-and-settings-nav`.
-->

### Requirement: Access profiles screen presents fixed roles legibly
A tela **Perfis de acesso** SHALL deixar explícito que `OWNER`, `ADMIN` e `USER` são papéis fixos do sistema, não cadastros editáveis nesta versão. A matriz SHALL ser projeção do catálogo autoritativo, agrupada por capability/tópico, com legenda claro para permitido/não permitido, estado inicial recolhido ou compacto, busca/leitura rápida, responsividade e acessibilidade.

#### Scenario: Permissions are grouped and collapsible
- **WHEN** o `OWNER` abre Perfis de acesso
- **THEN** as permissões aparecem agrupadas por capability em grupos recolhíveis, usando labels e descrições em português quando disponíveis

#### Scenario: Empty catalog state is honest
- **WHEN** o backend retorna catálogo vazio
- **THEN** a tela exibe estado vazio acessível, sem inventar chaves ou perfis locais
