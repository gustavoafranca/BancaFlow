# canonical-drawer Specification

## Purpose
TBD - created by archiving change standardize-frontend-drawer-and-settings-nav. Update Purpose after archive.
## Requirements
### Requirement: A single shared Drawer component is the only drawer implementation
O Web SHALL fornecer um único componente de Drawer compartilhado em `apps/web/src/shared/components/ui` (estendendo `DialogContent variant="drawer"` ou substituindo-o por um primitive equivalente na mesma família Radix), usado por todo fluxo de Criar, Editar ou Visualizar registro. Nenhum módulo SHALL implementar seu próprio drawer.

#### Scenario: Only one drawer implementation exists
- **WHEN** o código-fonte do Web é auditado por implementações de painel lateral de criação/edição/visualização
- **THEN** existe exatamente um componente compartilhado consumido por todos os módulos, sem drawer local duplicado em `modules/**`

#### Scenario: New module reuses the shared Drawer
- **WHEN** um novo módulo precisa de fluxo de criação, edição ou visualização em painel lateral
- **THEN** ele compõe o Drawer compartilhado com seu próprio conteúdo de domínio, em vez de criar um novo componente de drawer

### Requirement: Drawer header shows dynamic title and window controls
O Drawer SHALL exibir um título dinâmico conforme o contexto (ex.: "Novo Usuário", "Editar Usuário", "Novo Perfil"), um botão de fechar e um botão de maximizar/restaurar, com layout visual equivalente ao drawer de referência de Pessoas e Vínculos.

#### Scenario: Title reflects create, edit, and view modes
- **WHEN** o Drawer é aberto em modo de criação, edição ou visualização
- **THEN** o título exibido corresponde ao modo e ao recurso (ex.: "Novo Usuário" vs. "Editar Usuário")

#### Scenario: Close button closes the drawer
- **WHEN** o usuário aciona o botão de fechar
- **THEN** o Drawer fecha e o foco retorna ao elemento que o abriu

#### Scenario: Maximize toggles between expanded and restored width
- **WHEN** o usuário aciona o botão de maximizar
- **THEN** o Drawer ocupa praticamente toda a largura da tela; ao acionar novamente, retorna à largura anterior

### Requirement: Drawer supports mouse and keyboard resizing with bounds
O Drawer SHALL permitir redimensionamento horizontal por arraste do mouse e por teclado, respeitando uma largura mínima e máxima configuráveis. A largura ajustada SHALL persistir enquanto a instância do Drawer permanecer aberta.

#### Scenario: Mouse drag resizes within bounds
- **WHEN** o usuário arrasta a borda do Drawer com o mouse
- **THEN** a largura muda continuamente sem ultrapassar os limites mínimo e máximo configurados

#### Scenario: Keyboard resizing is available
- **WHEN** o usuário foca o controle de redimensionamento e usa as teclas de seta
- **THEN** a largura do Drawer muda em incrementos previsíveis, respeitando os mesmos limites do arraste por mouse

### Requirement: Drawer body scrolls independently and supports tabs
O corpo do Drawer SHALL ter scroll independente do restante da página. Quando o cadastro possuir muitas informações, o conteúdo SHALL ser organizado em abas reutilizando o primitive de `Tabs` compartilhado, em vez de um formulário único extremamente longo.

#### Scenario: Body scroll does not move the page behind it
- **WHEN** o conteúdo do corpo do Drawer excede a altura visível
- **THEN** apenas o corpo do Drawer rola, sem mover o restante da página

#### Scenario: Long registration uses tabs instead of one long form
- **WHEN** um cadastro exposto no Drawer possui múltiplos grupos de informação (ex.: Dados, Permissões, Segurança, Sessões)
- **THEN** o conteúdo é dividido em abas usando o primitive `Tabs` compartilhado, seguindo o padrão visual já adotado no projeto

### Requirement: Drawer footer actions depend on mode and permission
O rodapé do Drawer SHALL ser fixo e SHALL variar conforme o modo: em criação, `Fechar` e `Salvar` (ação principal); em edição, `Excluir` (quando permitido), `Fechar` e `Salvar Alterações` (ação principal); em visualização, `Fechar` e `Editar` (quando permitido). Ações sem a permissão correspondente SHALL ficar ocultas, não apenas desabilitadas. Ações destrutivas SHALL abrir um modal de confirmação e usar `Button variant="destructive"`.

#### Scenario: Create mode footer shows close and save
- **WHEN** o Drawer está em modo de criação
- **THEN** o rodapé mostra `Fechar` e `Salvar` como ação principal, sem opção de excluir

#### Scenario: Edit mode footer shows delete when permitted
- **WHEN** o Drawer está em modo de edição e o usuário tem permissão de exclusão
- **THEN** o rodapé mostra `Excluir`, `Fechar` e `Salvar Alterações` como ação principal

#### Scenario: Missing permission hides the action instead of disabling it
- **WHEN** o usuário não tem permissão de editar ou excluir o recurso aberto no Drawer
- **THEN** o botão correspondente (`Salvar`/`Salvar Alterações` ou `Excluir`) não é renderizado

#### Scenario: Destructive action requires confirmation
- **WHEN** o usuário aciona `Excluir` no rodapé do Drawer
- **THEN** um modal de confirmação usando `Button variant="destructive"` é exibido antes de qualquer exclusão efetiva

### Requirement: Drawer supports loading state
O Drawer SHALL suportar um estado de carregamento que bloqueia as ações do rodapé e comunica visualmente o carregamento, sem fechar o Drawer nem perder o conteúdo já preenchido.

#### Scenario: Loading disables footer actions
- **WHEN** o Drawer está em estado de carregamento (ex.: salvando ou buscando dados)
- **THEN** as ações do rodapé ficam desabilitadas e um indicador de carregamento é exibido

### Requirement: Resource list-detail rows open the Drawer accessibly
Para listas/tabelas de recurso detalhável, o Web SHALL usar o padrão linha abre Drawer, acionável por clique, Enter ou Espaço, com foco gerenciado, fechamento por Escape, retorno de foco ao elemento acionador e sem propagação para controles internos da linha. Tabelas analíticas, relatórios, seleção em massa e formulários curtos contextualizados não são obrigados a usar este padrão quando houver justificativa.

#### Scenario: Row opens drawer by mouse and keyboard
- **WHEN** uma linha de recurso detalhável é clicada ou acionada por Enter/Espaço
- **THEN** o Drawer abre com título acessível, foco gerenciado e estado selecionado perceptível

#### Scenario: Escape closes the drawer and returns focus
- **WHEN** o Drawer está aberto e o usuário pressiona Escape
- **THEN** o Drawer fecha e o foco retorna ao elemento que o abriu

#### Scenario: Nested row control does not open the drawer
- **WHEN** o usuário aciona um controle interativo dentro de uma linha de recurso (ex.: um botão de ação rápida)
- **THEN** somente a ação desse controle é executada e o Drawer de detalhe não abre por propagação acidental

### Requirement: Selection Button Group represents choice, never action
O Web SHALL fornecer um componente compartilhado de Selection Button Group (`apps/web/src/shared/components/ui/selection-button-group.tsx`) para qualquer seleção de estado ou opção mutuamente exclusiva (ex.: Tipo, Status, Perfil, Situação, Turno), reaproveitando os mesmos tokens de cor já usados por `Badge`. Botões de ação reais (Salvar, Editar, Excluir, Redefinir senha, Fechar, Cancelar, Bloquear) SHALL NOT usar este componente — permanecem `Button` tradicional no rodapé do Drawer. Nenhuma tela SHALL usar um `Button` comum para representar a escolha de um valor de estado.

#### Scenario: Selection exposes radiogroup/radio semantics with a single checked option
- **WHEN** um Selection Button Group é renderizado com um valor atual
- **THEN** o grupo expõe `role="radiogroup"` com um `aria-label` descritivo, cada opção expõe `role="radio"`, apenas a opção correspondente ao valor atual aparece marcada, e as setas do teclado navegam entre as opções

#### Scenario: Selecting a different option only proposes the change
- **WHEN** o usuário seleciona uma opção diferente da atual em um contexto que exige confirmação (ex.: Papel, Status de conta)
- **THEN** a seleção abre o mesmo modal de confirmação já usado pelas ações sensíveis, e o valor exibido só muda de fato após a confirmação

#### Scenario: Individual option can be disabled without disabling the whole group
- **WHEN** uma opção específica não representa uma transição permitida no contexto atual
- **THEN** apenas essa opção fica desabilitada, sem impedir a seleção das demais

#### Scenario: Reused visual language, no per-screen styling
- **WHEN** o mesmo componente é usado em Pessoas (Tipo, Status) e em Usuários (Perfil, Status de conta)
- **THEN** ambos usam exatamente o mesmo tamanho, padding, border-radius, espaçamento e tokens de cor — nenhuma tela define estilo próprio para esse padrão

### Requirement: Drawer overlay inherits active theme tokens
O overlay do Drawer, renderizado por portal, SHALL herdar os tokens do tema ativo (claro/escuro) do mesmo mecanismo já usado por `Dialog`/`Select`, sem cor hardcoded por instância e sem exigir fechar/reabrir ao trocar de tema.

#### Scenario: Drawer inherits dark tokens through portal
- **WHEN** o usuário abre um Drawer em modo escuro
- **THEN** o conteúdo usa os tokens do tema escuro, sem fundo claro inesperado

#### Scenario: Theme switch updates an open drawer
- **WHEN** o tema é alternado enquanto um Drawer permanece aberto
- **THEN** o Drawer aberto reflete os tokens do novo tema sem precisar ser fechado e reaberto

