## Why

`apps/web` foi montado em grande parte a partir de layouts importados do Claude Design (`import-cloud-design-next`) e do scaffold de `config-shared-frontend`, sem uma auditoria posterior de arquitetura. O resultado tem duplicação de primitives (ex.: `theme-toggle` existe em `src/components/ui/`, `src/shared/components/ui/` e `(private)/_shell/theme.tsx`), fronteiras `shared` vs. módulo não aplicadas, a rota raiz `/` ainda é o template inicial do Next (“To get started, edit the page.tsx file.”), o módulo `identity` é apenas placeholder visual e o comportamento de host sem tenant válido não está definido. Precisamos revisar a arquitetura agora, antes de novos módulos serem adicionados sobre uma base inconsistente, preservando a fidelidade visual já aprovada.

Esta change é uma **proposta e especificação**, não autoriza refatoração imediata: nada de mover componentes, alterar rotas ou mudar comportamento na etapa de proposta.

## What Changes

- Exigir um **inventário verificável** de todos os componentes, páginas, layouts, hooks, contexts, schemas, clientes HTTP, utilitários e assets de `apps/web`, com consumidores, boundary server/client e classificação de ownership.
- Definir e aplicar uma **política de classificação** `shared` vs. `módulo` vs. `app/**/_components`, sem transformar `shared` em pasta genérica e sem abstração prematura.
- Fixar a **direção de dependências** do frontend compatível com DDD/Arquitetura Limpa: `app/routes → modules → shared`, `shared -X→ modules`, Server Components como default e Client Components apenas quando necessário.
- Planejar uma **migração incremental** (em fases, com checkpoints verdes) do design importado, preservando aparência, responsividade, acessibilidade, tokens, `cn`/variantes, assets locais e um único `AdminShell`/navegação.
- Tornar **determinístico** o comportamento de `/`, `/login`, `/trocar-senha` e rotas privadas por sessão e tenant, encerrando o `/` como página-template.
- Registrar uma **decisão arquitetural explícita** para host sem tenant cadastrado (host inválido, reservado, inexistente, inativo), com recomendação de resolução autoritativa no backend + página genérica sem branding. **BREAKING** de comportamento apenas para a rota `/`, hoje sem função definida.
- Definir o **conjunto de testes e portões de qualidade** (primitives, módulos, acessibilidade, schemas/forms, `proxy.ts`, rewrite/forwarded host, cliente HTTP/silent refresh, tenant conhecido/inexistente/inativo/inválido, E2E de login→troca→dashboard, imports proibidos/ciclos, órfãos, `lint`/`check-types`/`test`/`build`).

## Capabilities

### New Capabilities
- `web-component-inventory`: inventário e auditoria verificável de todo componente/página/hook/schema/cliente/asset do Web, incluindo consumidores, boundary server/client, estado (usado/duplicado/órfão/legado) e detecção de duplicações, primitives recriadas e regras de negócio na UI.
- `web-component-ownership`: política de classificação de ownership entre `shared/components`, `modules/<domain>` e `app/**/_components`, com critérios de promoção e regra de não-abstração-prematura.
- `web-frontend-boundaries`: regras de dependência e DDD no frontend — direção de imports, proibição de `shared → modules`, isolamento entre módulos, `page.tsx` fino, default Server Component e limites de acesso a persistência/segredos.
- `web-design-migration`: matriz de migração incremental em fases com checkpoints verdes, preservando fidelidade visual, responsividade, acessibilidade, tokens e assets locais, sem reexecutar scripts que sobrescrevam o Web existente.
- `web-frontend-testing`: estratégia de testes e portões de qualidade que provam rotas, autenticação, isolamento por host, reuso de componentes, acessibilidade e ausência de imports proibidos/órfãos.

### Modified Capabilities
- `route-protection-frontend`: adicionar comportamento determinístico da rota raiz `/` por sessão/tenant e o tratamento de host sem tenant válido (página genérica sem branding), sem introduzir loops entre `/`, `/login`, `/trocar-senha` e `/dashboard`, mantendo o backend autoritativo sobre sessão, conta e tenant.

## Impact

- **Código Web afetado:** `apps/web/src/app/**` (incl. `page.tsx`, `(private)/_shell/**`, `login/**`, `trocar-senha/**`), `apps/web/src/modules/**`, `apps/web/src/shared/**`, `apps/web/src/components/**`, `apps/web/src/proxy.ts`, `apps/web/next.config.ts`, `apps/web/public/design-imports/**`.
- **Testes:** `apps/web` (Jest + Testing Library), `proxy.spec.ts`, `next.config.spec.ts`, novos testes de primitives/módulos/acessibilidade/tenant.
- **Backend (potencial, pendente de decisão):** possível novo endpoint público mínimo de contexto de host/tenant para a rota `/` e host inexistente; se confirmado, será proposto com contrato mínimo, rate limiting/cache e análise de enumeração — não será inventado silenciosamente.
- **Especificações relacionadas:** `route-protection-frontend` (modificada), com dependência conceitual de `request-routing-and-proxy`, `banca-context-resolution`, `session-management` e `authentication` (não modificadas nesta change).
- **Skills usadas como critério na aplicação:** `config-shared-frontend`, `import-cloud-design-next`, `frontend-form-schema`, `config-new-module` (e, se existir, `frontend-module-workflow`) — como referência, sem reexecutar scripts destrutivos.
