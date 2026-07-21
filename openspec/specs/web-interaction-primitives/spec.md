# web-interaction-primitives Specification

## Purpose
TBD - created by archiving change refine-tenant-user-administration-experience. Update Purpose after archive.
## Requirements
### Requirement: Theme tokens apply to portaled overlays
O Web SHALL aplicar os tokens do tema ativo em um escopo herdado por conteúdos renderizados em portal, incluindo Dialog, Drawer, Select e futuros overlays. A solução SHALL usar os mesmos valores de `ThemeProvider`/`toDesignTokens`, cobrir modo claro e escuro, e não SHALL depender de cores hardcoded por componente.

#### Scenario: Dialog and drawer inherit dark tokens through portal
- **WHEN** o usuário abre um Dialog ou Drawer em modo escuro
- **THEN** o conteúdo portaled usa `--popover`, `--popover-foreground`, `--border` e demais tokens do tema escuro, sem fundo branco inesperado

#### Scenario: Theme switch updates an open overlay
- **WHEN** o tema é alternado enquanto um overlay compatível permanece aberto
- **THEN** o overlay aberto reflete os tokens do novo tema sem precisar ser fechado e reaberto

### Requirement: Shared Select primitive is accessible and theme-aware
O Web SHALL fornecer um primitive `Select` compartilhado em `apps/web/src/shared/components/ui`, temático, acessível por teclado e leitor de tela, compatível com formulários e filtros, e renderizado por portal que herda os tokens do tema ativo. Se o select nativo não garantir popup escuro confiável, o primitive SHALL usar Radix Select, a mesma família tecnológica já adotada por Dialog.

#### Scenario: Select supports keyboard and selected state
- **WHEN** o usuário foca o Select e usa teclado para abrir, navegar e confirmar uma opção
- **THEN** a opção selecionada é anunciada, o valor muda uma única vez e o foco permanece coerente

#### Scenario: Select exposes invalid and disabled states
- **WHEN** o Select recebe erro de validação ou `disabled`
- **THEN** ele expõe `aria-invalid`/descrição de erro quando aplicável, impede interação quando desabilitado e usa tokens visuais correspondentes

### Requirement: Destructive action tokens and Button variant are canonical
O Web SHALL definir tokens destrutivos canônicos e `Button variant="destructive"` para ações destrutivas ou sensíveis. Módulos SHALL NOT espalhar vermelho hardcoded quando uma variante/tokens compartilhados atenderem o caso.

#### Scenario: Destructive button has contrast in both themes
- **WHEN** `Button variant="destructive"` é renderizado em claro e escuro
- **THEN** texto, fundo, borda, hover, focus-visible e disabled mantêm contraste aprovado e coerência visual

### Requirement: Shared Tabs and Collapsible primitives exist when required by reusable patterns
O Web SHALL fornecer primitives compartilhados mínimos de Tabs e Collapsible/Accordion quando uma tela introduzir esses padrões como contrato reutilizável. Esses primitives SHALL suportar teclado, foco visível, labels acessíveis, estado controlado/não controlado quando necessário e tokens do tema ativo.

#### Scenario: Tabs are operable by keyboard
- **WHEN** o usuário navega entre abas por teclado
- **THEN** a aba ativa e seu painel associado são anunciados corretamente e o conteúdo não ativo não recebe foco indevido

#### Scenario: Collapsible group announces expanded state
- **WHEN** o usuário expande ou recolhe um grupo
- **THEN** o controle atualiza `aria-expanded` e o conteúdo associado aparece ou desaparece sem quebrar a ordem de foco

<!--
  "Resource list-detail drawer pattern is canonical" (proposta original desta
  change) foi removida antes do archive: totalmente coberta (com mais detalhe,
  incluindo o cenário de Escape) por `canonical-drawer`'s "Resource list-detail
  rows open the Drawer accessibly", já em main via
  `standardize-frontend-drawer-and-settings-nav`. Mantê-la aqui duplicaria a
  mesma regra sob duas capabilities diferentes.
-->

