---
name: frontend-module-workflow
description: >-
  Orientar a implementação e revisão contínuas de funcionalidades dentro de módulos existentes do frontend Web (Next.js App Router, apps/web/src/{app,modules,shared}). Usar para implementar ou organizar uma tela/fluxo de um módulo a partir de uma spec/change OpenSpec, decidir se um componente deve ser promovido para shared ou permanecer no módulo/rota, conectar uma feature ao cliente HTTP e a rotas privadas, refinar uma tela recém-importada do Claude Design dentro do módulo correto, ou aplicar somente o grupo Web de uma change OpenSpec. NÃO usar para ajustes visuais mínimos e isolados, tarefas exclusivamente de Backend/Prisma/domínio, edição simples de texto/copy, bootstrap inicial do shared/ (ver config-shared-frontend), importação mecânica de .dc.html (ver import-cloud-design-next), scaffold estrutural de um módulo novo (ver config-new-module) ou construção isolada de schema/form (ver frontend-form-schema).
---

# Frontend Module Workflow

Orquestra a implementação e revisão **contínuas** de módulos no frontend Web (`apps/web`, Next.js App Router). Cobre arquitetura, ownership de componentes, conexão a dados e rotas — não substitui as skills de bootstrap/import/scaffold, apenas assume o trabalho de evolução incremental que elas não cobrem.

## Princípios arquiteturais obrigatórios

- **Direção de dependências**: `app/**` (rotas) pode importar `modules/*` e `shared/`; `modules/*` pode importar `shared/`; `shared/` **nunca** importa de `modules/*` nem contém DTO/texto/regra de um bounded context específico.
- **Page fina**: todo `app/**/page.tsx` só compõe — importa um componente do módulo (ou de `_components` locais) e retorna. Nenhuma lógica de dados, estado ou estilo mora na page.
- **Server Components por padrão**: só adicionar `'use client'` no componente que realmente precisa de evento, estado local ou API de browser. Fetch e efeitos nunca vivem dentro de uma primitive puramente visual.
- **Módulo dono da sua linguagem**: telas, schemas, view models, mappers, hooks e clientes HTTP específicos de um domínio vivem em `modules/<domain>`, nunca em `shared/`.
- **Zero infraestrutura de Backend no Web**: nenhuma dependência de Prisma, banco, secret ou pacote de infraestrutura do backend dentro de `apps/web`.
- **Zero regra de domínio autoritativa no React**: validação no Web é só UX (feedback imediato); a regra que decide o resultado sempre vem do backend/domínio.

Detalhes e exemplos: [references/architecture-boundaries.md](references/architecture-boundaries.md).

## Ownership de componentes (decisão rápida)

Antes de criar ou mover um componente, decidir onde ele vive:

| Sinal | Destino |
|---|---|
| Primitive de design system (botão, input, dialog, tabela genérica), composição de form genérica, shell/branding/layout global, feedback genérico (empty state, toast), API pública estável do design system | `apps/web/src/shared/components` |
| Expressa a linguagem do bounded context, tela interna do módulo, schema/view model/mapper/hook/cliente específico, interação particular do domínio | `apps/web/src/modules/<domain>` |
| Exclusivo de um fluxo/página, sem API estável ainda | `app/**/_components` |

**Regra de ouro**: promover para `shared` só quando o **significado** for realmente compartilhado — nunca por semelhança visual ou reuso hipotético. Preferir duplicação pequena e temporária a uma abstração errada. Consolidar depois, quando o padrão se confirmar em uso real.

Árvore completa, exemplos e contraexemplos: [references/component-ownership.md](references/component-ownership.md).

## Roteamento para skills complementares

Esta skill cobre a evolução incremental de um módulo já existente. Ela **não** faz bootstrap nem scaffold — para isso, rotear:

| Situação | Skill |
|---|---|
| `shared/` ainda não existe ou precisa ser reconstruído do zero | `config-shared-frontend` (só com confirmação explícita antes de sobrescrever) |
| Existe um `.dc.html`/link do Claude Design ainda não importado | `import-cloud-design-next` primeiro, **depois** esta skill refina a tela dentro do módulo |
| Precisa criar/ajustar schema de formulário e validação | `frontend-form-schema` |
| Módulo/rota/pacote `modules/<module>` ainda não existe (fundação estrutural) | `config-new-module` |
| Módulo já existe e a tarefa é implementar, organizar ou revisar uma feature | **esta skill** |

**Nunca**: rodar `config-shared-frontend` sobre um projeto com `shared/` já populado sem confirmação; criar um gerador de módulo que duplique `config-new-module`; sobrescrever um import do Claude Design sem `--force` autorizado.

## Workflow obrigatório (8 fases)

Seguir em ordem — não pular direto para código.

### Fase 1 — Ler contexto e contrato

- Ler `apps/web/AGENTS.md`/`CLAUDE.md` e a spec/proposal/design/tasks da change OpenSpec envolvida, se houver.
- Inspecionar a implementação atual do módulo (`modules/<domain>`), a rota correspondente em `app/**` e os testes existentes.
- Não perguntar ao usuário o que já é descobrível no repositório.

### Fase 2 — Selecionar skills complementares

Aplicar a tabela de roteamento acima. Se a tarefa depende de bootstrap/import/scaffold que ainda não aconteceu, rotear primeiro e só então continuar aqui.

### Fase 3 — Inventariar e planejar ownership

Listar os componentes que a feature vai precisar. Para cada um, aplicar a decisão de ownership (shared/módulo/rota) **antes** de escrever código. Registrar o que já existe e pode ser reutilizado.

### Fase 4 — Modelar a apresentação

Definir o(s) view model(s)/schema(s) da tela a partir do contrato (DTO da API ou spec). Mapear a resposta HTTP para o shape que a UI consome — o mapeamento vive no módulo, não em `shared`.

### Fase 5 — Implementar por slices

Implementar cada fluxo nesta ordem, testando antes do próximo:

1. Contrato/tipos (espelhar o DTO do backend)
2. Schema/mapper (`data/*.schema.ts`, mapper de DTO → view model)
3. Cliente HTTP/hook (`data/*.client.ts`, hook de leitura/mutação)
4. Composição de componentes `shared` já existentes
5. Componentes de módulo/rota (novos, específicos do domínio)
6. Página e navegação (`app/**/page.tsx` fino + item de menu, se aplicável)
7. Estados de carregamento/erro/vazio
8. Testes do slice

### Fase 6 — Rotas e autenticação

- Ao criar uma rota privada nova, atualizar `apps/web/src/proxy.ts`/matcher (ver [references/next-app-router.md](references/next-app-router.md)).
- Backend é sempre a autoridade da sessão; nunca aceitar `tenantId`/`codigoBanca` do body como autoridade — o tenant vem do host/subdomínio confiável.
- Preservar o host/subdomínio em qualquer chamada ao backend.
- Evitar loops entre `/login`, `/trocar-senha` e `/dashboard` (revisar as guard clauses existentes no proxy/layout antes de adicionar uma nova).

Guardrails completos: [references/next-app-router.md](references/next-app-router.md) · [references/architecture-boundaries.md](references/architecture-boundaries.md).

### Fase 7 — Testar e verificar

Rodar a matriz de testes cabível ao tipo de mudança (unit, component, acessibilidade, rota/proxy, HTTP, E2E, visual) — ver [references/testing-checklist.md](references/testing-checklist.md). Não marcar uma tarefa como concluída apenas porque o código compila.

### Fase 8 — Entregar

Reportar: arquivos criados/movidos/alterados, decisão de ownership tomada para cada componente novo (shared vs. módulo vs. rota) e por quê, quais testes rodaram, e pendências reais (não afirmar "tudo pronto" se algo ficou faltando).

Exemplo completo de um slice ponta a ponta: [references/module-slice-workflow.md](references/module-slice-workflow.md).

## Integração com OpenSpec

- Ao receber uma tarefa do tipo "aplicar somente o grupo Web da change `<nome>`": editar apenas os arquivos do escopo Web permitido e marcar cada task do `tasks.md` só depois que os testes daquela task passarem.
- Ao gerar/revisar um `tasks.md` para o grupo Web, recomendar esta ordem: (1) contrato e tipos, (2) shared necessário, (3) módulo/feature, (4) rotas/navegação, (5) testes e integração.
- Se Backend e Web avançam em paralelo, exigir o contrato HTTP definido antes de iniciar o Web, e evitar que subagentes concorrentes editem simultaneamente barrels, o layout privado, `proxy.ts` ou o menu.

## Guardrails obrigatórios

- Nunca mover tudo para `shared` "por via das dúvidas".
- Nunca rodar `config-shared-frontend` sobre um projeto com `shared/` existente sem confirmação explícita.
- Nunca sobrescrever um import do Claude Design sem `--force` autorizado.
- Nunca criar regra de domínio autoritativa dentro de um componente Web.
- Nunca importar `fetchWithRefresh` (ou qualquer cliente HTTP client-side que dependa de `credentials`/`window`) dentro de um Server Component — ver [references/module-slice-workflow.md](references/module-slice-workflow.md) para os dois caminhos (client vs. server) e nunca misturá-los.
- Nunca compor um componente `shared`/design system a partir de uma API assumida — abrir o arquivo real e conferir exports/props/variantes antes de usá-lo.
- Nunca importar um `modules/<outro-domain>` de dentro de outro módulo, mesmo via barrel (`index.ts`) — a composição entre módulos acontece em `app/**` (rota/layout/`_components`), nunca dentro do núcleo de outro módulo.
- Nunca usar um `index.ts`/barrel para esconder um ciclo de dependência.
- Nunca criar um `layout.tsx` por módulo quando já existe uma casca (`AppFrame`/shell) única.
- Nunca duplicar o menu ou o shell existente.
- Nunca instalar uma dependência nova sem necessidade comprovada.
- Nunca mudar identidade visual (cores, tema, tokens) por preferência pessoal.
- Nunca apagar um componente/asset só com base em busca textual inconclusiva.
- Nunca editar Backend/domínio fora do escopo pedido.
- Nunca enfraquecer um teste só para "fazer passar".

## Auditoria opcional (read-only)

```bash
node .claude/skills/frontend-module-workflow/scripts/audit-frontend-components.mjs --app=web --markdown
node .claude/skills/frontend-module-workflow/scripts/audit-frontend-components.mjs --app=web --json
```

Lista componentes/exports/imports/consumidores em `apps/web/src` e sinaliza (sem mover, excluir ou reescrever nada): imports `shared → modules`, nomes de componente repetidos entre módulos, e arquivos de componente sem consumidor local. Um nome repetido é um sinal para revisar manualmente com [references/component-ownership.md](references/component-ownership.md) — o script **não** afirma equivalência semântica entre componentes de nomes iguais.

## Mapa de referências

| Arquivo | Quando ler |
|---|---|
| [references/architecture-boundaries.md](references/architecture-boundaries.md) | Dúvida sobre direção de dependências, Server/Client Components, composição cross-module, limite domínio/backend/Web |
| [references/component-ownership.md](references/component-ownership.md) | Decidir onde um componente deve viver, com exemplos e contraexemplos |
| [references/next-app-router.md](references/next-app-router.md) | Pages/layouts, route groups, `proxy.ts`/matcher, redirects, loading/error/not-found, autenticação |
| [references/module-slice-workflow.md](references/module-slice-workflow.md) | Exemplo completo de um slice (contrato → schema/mapper → client/hook → componentes → page → navegação → testes) |
| [references/testing-checklist.md](references/testing-checklist.md) | Matriz de testes por tipo de mudança |
