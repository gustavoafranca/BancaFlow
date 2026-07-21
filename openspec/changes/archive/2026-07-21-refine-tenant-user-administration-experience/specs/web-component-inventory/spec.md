## ADDED Requirements

### Requirement: Inventory maps selects and overlay primitives before migration
O inventário Web SHALL mapear selects nativos, dialogs, drawers, dropdowns, popovers e primitives duplicados antes de qualquer migração, registrando consumidor, dono proposto, risco visual, acessibilidade e estratégia de substituição.

#### Scenario: Native select occurrence is classified
- **WHEN** um `<select>` nativo existe em `apps/web/src/**`
- **THEN** o inventário registra seu caminho, uso, se pertence ao escopo da change atual e se deve migrar para o `Select` compartilhado
