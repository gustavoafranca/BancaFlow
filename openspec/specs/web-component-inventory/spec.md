## Purpose

Manter um inventário verificável de todo artefato de frontend (componentes, páginas, layouts, hooks, contexts, schemas, clientes HTTP, utilitários e assets) e identificar duplicação e cheiros estruturais, como base factual para a reorganização do Web.

---
## Requirements
### Requirement: Complete verifiable component inventory exists
O sistema SHALL manter um inventário verificável de todo artefato de frontend em `apps/web/src/**` — componentes, páginas, layouts, hooks, contexts, schemas, clientes HTTP, utilitários e assets efetivamente usados. Para cada item o inventário SHALL registrar: nome e caminho; exports e principais imports; páginas/módulos consumidores; responsabilidade em uma linha; se é Server Component ou Client Component com justificativa do boundary; dependências externas; estado (usado, não usado, duplicado, quase duplicado ou legado); classificação proposta (shared, módulo, fluxo/página ou remoção futura); e risco/estratégia de migração.

#### Scenario: Every source artifact appears in the inventory
- **WHEN** um arquivo existe em `apps/web/src/**` (rota, módulo, shared ou componente) ou em `apps/web/public/**` como asset referenciado
- **THEN** ele consta no inventário com caminho, exports, consumidores, boundary e classificação preenchidos

#### Scenario: Ownership is justified, not inferred from name
- **WHEN** um componente é classificado como shared, módulo ou fluxo/página
- **THEN** a classificação cita consumidores reais e o motivo da mudança, não apenas a semelhança de nome

### Requirement: Audit detects duplication and structural smells
O inventário SHALL identificar explicitamente pelo menos: nomes duplicados; JSX/estilos quase idênticos; primitives recriadas fora do design system; componentes globais que importam módulos de negócio; imports profundos que poderiam usar barrel estável; arquivos exportados mas não consumidos; componentes excessivamente grandes; uso desnecessário de `use client`; regras de negócio ou autorização implementadas apenas na UI; e inconsistências entre assets, tokens, variantes e breakpoints.

#### Scenario: Duplicated primitive is flagged with the surviving owner
- **WHEN** existe mais de uma implementação do mesmo primitive (ex.: `theme-toggle` em `src/components/ui/`, `src/shared/components/ui/` e `(private)/_shell/theme.tsx`)
- **THEN** a auditoria aponta cada ocorrência, qual é realmente consumida e qual é o dono proposto para consolidação

#### Scenario: Orphan export is flagged
- **WHEN** um arquivo exporta símbolos que nenhum outro arquivo importa
- **THEN** a auditoria marca o export como órfão candidato à remoção futura, sem removê-lo na etapa de auditoria

#### Scenario: UI-only business or authorization rule is flagged
- **WHEN** uma regra de negócio ou de autorização existe apenas em componente/UI sem contrapartida autoritativa no backend/domínio
- **THEN** a auditoria registra o achado como risco a ser corrigido, mantendo o backend como fonte da verdade

### Requirement: Inventory maps selects and overlay primitives before migration
O inventário Web SHALL mapear selects nativos, dialogs, drawers, dropdowns, popovers e primitives duplicados antes de qualquer migração, registrando consumidor, dono proposto, risco visual, acessibilidade e estratégia de substituição.

#### Scenario: Native select occurrence is classified
- **WHEN** um `<select>` nativo existe em `apps/web/src/**`
- **THEN** o inventário registra seu caminho, uso, se pertence ao escopo da change atual e se deve migrar para o `Select` compartilhado

