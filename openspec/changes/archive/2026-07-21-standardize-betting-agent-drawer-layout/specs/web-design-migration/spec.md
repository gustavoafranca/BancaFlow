## ADDED Requirements

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
