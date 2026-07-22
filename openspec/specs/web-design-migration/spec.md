## Purpose

Definir como o design importado do Claude Design é migrado com segurança para a estrutura final do Web — em fases com checkpoints verdes, convergindo os sistemas de estilo paralelos, e preservando fidelidade visual, responsividade e acessibilidade.

---
## Requirements
### Requirement: Migration proceeds in phased checkpoints
A migração do design importado SHALL seguir uma matriz em fases — (1) inventário e characterization tests; (2) consolidação das primitives compartilhadas; (3) migração de componentes compostos realmente globais; (4) organização por módulo e por rota; (5) remoção de duplicações apenas depois de todos os consumidores migrarem; (6) limpeza de exports/assets não usados; (7) validação visual e funcional final. Cada fase SHALL manter build e testes verdes, sem mudança massiva sem checkpoints.

#### Scenario: Each phase keeps build and tests green
- **WHEN** uma fase da migração é concluída
- **THEN** `lint`, `check-types`, `test` e `build` do Web permanecem verdes antes de iniciar a próxima fase

#### Scenario: Duplication is removed only after consumers migrate
- **WHEN** uma primitive/componente duplicado é candidato à remoção
- **THEN** a remoção ocorre somente após todos os consumidores passarem a usar o dono consolidado

### Requirement: Consolidate the two parallel styling systems
O sistema SHALL convergir os dois sistemas de estilo hoje paralelos — o design system Tailwind/`cn`/CVA (`shared/components/ui`, usado apenas nas telas de auth) e o sistema de inline styles via `useTheme().c` (usado por toda a área privada) — para primitives e tokens canônicos únicos, reutilizando as primitives compartilhadas em vez de recriá-las por rota.

#### Scenario: Route stops recreating a primitive
- **WHEN** uma rota renderiza botão, input, tabela, dialog/drawer ou badge
- **THEN** ela usa a primitive compartilhada canônica em vez de recriá-la inline

#### Scenario: Duplicated icon and helper sets are consolidated
- **WHEN** ícones ou helpers (ex.: `fmt`, `initials`) hoje redefinidos em múltiplas áreas são migrados
- **THEN** passam a ter uma fonte única compartilhada, sem cópias divergentes por rota

#### Scenario: Pre-existing bespoke widgets may remain as a scoped, documented exception
- **WHEN** um widget bespoke já existente (ex.: drawer redimensionável, dropdown de busca com autocomplete, input de máscara de dinheiro com captura de teclado própria) teria alto risco de regressão visual se convertido sem tooling de comparação visual automatizada
- **THEN** ele PODE permanecer bespoke, desde que a exceção esteja registrada em design.md com escopo explícito (quais rotas/componentes, por quê), ícones/helpers genuinamente duplicados continuem sendo consolidados, e código NOVO escrito depois da exceção use as primitives canônicas em vez de recriá-las

### Requirement: Preserve visual fidelity, responsiveness, and accessibility
A migração SHALL preservar a aparência e o comportamento aprovados no Claude Design, a responsividade mobile/tablet/desktop, a acessibilidade (teclado, foco, labels, roles, contraste), os tokens do tema e as variantes canônicas (`cn`/variantes), os assets locais em `public` (sem URLs temporárias do design) e uma única navegação com um único `AdminShell`. O script de `config-shared-frontend` NÃO SHALL ser reexecutado sobre o Web existente sem análise e confirmação, pois pode recriar arquivos.

#### Scenario: Approved appearance is retained after migration
- **WHEN** uma tela importada é refatorada para primitives compartilhadas
- **THEN** aparência, responsividade por viewport e comportamento aprovados permanecem equivalentes ao design aprovado

#### Scenario: Single shell and navigation remain
- **WHEN** a área privada é reorganizada
- **THEN** permanece um único `AdminShell` e uma única navegação, sem menu duplicado ou shell por módulo

#### Scenario: Destructive scaffold scripts are not auto-run
- **WHEN** uma skill de scaffold (ex.: `config-shared-frontend`) poderia sobrescrever arquivos existentes
- **THEN** seu script não é executado automaticamente sem análise e confirmação explícita

#### Scenario: Assets are local, not temporary design URLs
- **WHEN** um asset importado é usado por uma tela
- **THEN** ele referencia arquivo local em `public/`, sem URL temporária do Claude Design

### Requirement: Overlay, select, drawer and destructive styles use canonical tokens
Novos overlays, selects, drawers e confirmações destrutivas SHALL usar primitives e tokens canônicos do design system, preservando as cores, espaçamentos, tipografia e responsividade aprovados. Módulos SHALL NOT duplicar tokens manualmente em cada modal/drawer.

#### Scenario: New admin overlay avoids local color patching
- **WHEN** um novo overlay administrativo é implementado
- **THEN** ele usa tokens compartilhados herdados pelo portal, não cores branco/preto/vermelho hardcoded locais

### Requirement: Cambistas module is fully migrated to Tailwind semantic tokens

Todo código de UI tocado ou criado no módulo `apps/web/src/modules/cambistas` SHALL usar classes Tailwind + tokens semânticos (`bg-card`, `text-muted-foreground`, `border`, `destructive`, etc.) e as primitives compartilhadas existentes. O módulo NÃO SHALL usar `useTheme()` nem `style={{ ... }}` inline em código produtivo após a change, e o suporte a tema claro/escuro SHALL vir dos tokens, não de ramificação em JavaScript. A migração SHALL preservar paridade visual (sem regressão).

#### Scenario: Página e drawer sem useTheme/inline style
- **WHEN** um grep por `useTheme` ou `style={{` é executado no módulo `cambistas` após a change
- **THEN** não há ocorrências em código produtivo (`betting-agent-drawer.tsx` e `cambistas.page.tsx` incluídos)

#### Scenario: Primitives compartilhadas reusadas em vez de reimplementadas
- **WHEN** a página migrada precisa de Badge, Button, inputs, paginação ou ícones
- **THEN** ela reusa as primitives de `@/shared/components/ui` e os ícones de `@/shared/components/icons`, sem recriar SVGs bespoke locais

#### Scenario: Paridade visual preservada
- **WHEN** a página é migrada de `useTheme()`+inline para Tailwind
- **THEN** a aparência aprovada (layout, cores de estado, densidade) é mantida sem regressão, incluindo tema claro e escuro

