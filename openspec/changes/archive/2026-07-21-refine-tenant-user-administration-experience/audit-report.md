# Auditoria inicial — refine-tenant-user-administration-experience

## 1.1 — Estado de `enable-tenant-user-administration`

- `openspec validate enable-tenant-user-administration --strict` → **válido**.
- `openspec list --json` → 60/62 tasks concluídas (2 tasks residuais não bloqueiam este refinamento; nenhuma delas afeta tema, senha temporária, Select, drawer ou paginação).
- Catálogo/matriz de permissões, endpoints tenant-scoped, criação/reset de usuário com senha temporária, listagem paginada, menu protegido por `PermissionKey`, tela `/configuracoes` e modal único de logout já existem e funcionam. Este refinamento parte dessa entrega, não a reconstrói.

## 1.2 — Ocorrências atuais de `<select>`, Dialog/Drawer, Tabs/Accordion/Collapsible, botões destrutivos e overlays

### `<select>` nativo (7 ocorrências, 3 módulos)

**No escopo desta change (migram para `Select` compartilhado):**
- `apps/web/src/modules/configuracoes/components/usuarios-section.tsx:187` — filtro "Papel"
- `apps/web/src/modules/configuracoes/components/usuarios-section.tsx:206` — filtro "Status"
- `apps/web/src/modules/configuracoes/components/create-account-dialog.tsx:156` — campo "Papel" (react-hook-form)
- `apps/web/src/modules/configuracoes/components/edit-account-dialog.tsx` — campo "Papel" (mesmo padrão de create-account-dialog)

**No escopo, migração condicional (task 8.1 — só se não redesenhar o fluxo):**
- `apps/web/src/modules/premios/pages/premios.page.tsx:595`
- `apps/web/src/modules/premios/pages/premios.page.tsx:695`

**Fora de escopo — follow-up de migração do design system (task 8.2):**
- `apps/web/src/modules/acerto/pages/acerto.page.tsx:274` — select de tipo (estilizado ad hoc, parte do fluxo bespoke de Acerto)
- `apps/web/src/modules/acerto/components/AcertoDrawer.tsx:124` — "Forma de Pagamento" (drawer bespoke de Acerto, fora do escopo de lista-detalhe desta change)

### Dialog / Drawer (`DialogContent variant="drawer"` já existe no primitive)

Primitive compartilhado (`apps/web/src/shared/components/ui/dialog.tsx`) já expõe `variant?: 'modal' | 'drawer'`. Consumidores atuais:
- `logout-modal.tsx` (modal) — refinado no Grupo 7.
- `perfil/components/security-tab.tsx` (modal) — fora de escopo, sem menção nas specs desta change.
- `configuracoes/components/create-account-dialog.tsx`, `edit-account-dialog.tsx`, `account-sessions-dialog.tsx` (modais) — migram para o drawer de usuário no Grupo 6.

Não há usos bespoke de overlay fora do primitive `Dialog` no admin de usuários; os overlays bespoke de `acerto`/`premios` (`AcertoDrawer`, drawers de Prêmios) são referência de comportamento (D4), não migram nesta change.

### Tabs / Accordion / Collapsible

**Não existe nenhum primitive compartilhado de Tabs, Accordion ou Collapsible em `apps/web/src/shared/components/ui/**` hoje.** Confirmado por busca no diretório. Precisam ser criados do zero (tasks 2.5, 5.1, 5.2).

### `Select` compartilhado

**Não existe `apps/web/src/shared/components/ui/select.tsx` hoje.** `@radix-ui/react-select` **não está** em `apps/web/package.json` (apenas `@radix-ui/react-dialog` e `@radix-ui/react-slot`). Precisa ser criado e a dependência adicionada (task 2.4).

### Botões destrutivos / vermelho

- `apps/web/src/shared/components/ui/button.tsx` não tem `variant="destructive"` hoje.
- `--destructive`/`--destructive-foreground` já existem em `globals.css` (`#E5484D`/`#FFFFFF`), mas **nunca são lidos por `ThemeColors`/`toDesignTokens`** — são estáticos, não trocam com o tema (o que está correto para um vermelho de marca único).
- O vermelho real usado em todo o app é `#E05555` / `rgba(224,85,85,*)`, espalhado como hex cru em ~15 arquivos (perfil, acerto, configuracoes, lancamentos, pessoas, dashboard, premios, shell). Nenhum desses consumidores é tocado por esta change exceto os listados nos Grupos 6 e 7; os demais ficam registrados aqui como débito de migração futura do design system (consistente com `web-component-inventory`).
- Ação desta change: estabelecer os 4 tokens canônicos (`--destructive`, `--destructive-foreground`, `--destructive-muted`, `--destructive-border`) com um tom validado em contraste (`#D14343`/branco ≈ 4.57:1, AA) e aplicá-los apenas em `Button variant="destructive"` e nos componentes explicitamente listados nos Grupos 6/7. Não reescreve os ~15 arquivos com hex cru.

## 1.3 — Changes ativas e reconciliação de permissões

- `implement-participant-registration-mvp` (0/55 tasks, não iniciada): declara `participants.betting-agents.create|list|read` para `OWNER|ADMIN` via `hasPermission` de `modules/access-control`. Não cria nem modifica nenhuma rota/tela tocada por este refinamento. Nenhuma reconciliação de código é necessária agora; quando essa change for implementada, suas novas chaves devem simplesmente seguir o Definition of Done reforçado no Grupo 4 (task 4.4) e aparecerão na matriz automaticamente — sem ação adicional desta change.
- `add-multitenant-subdomain-skill` (0/28 tasks): cria uma skill de autoria (`design-multitenant-subdomain`), sem tocar código de aplicação, API, banco ou permissões do BancaFlow. Nenhuma reconciliação necessária.

## 9.5 — Validação visual manual (claro/escuro, desktop/mobile, overlays abertos)

Capturada com um browser real (Chromium via Playwright, contra backend+Postgres reais) logado como OWNER em `/configuracoes`, com o drawer de criação de usuário e o `Select` de Papel abertos simultaneamente, e o modal de logout em viewport mobile (390×844):

- **Escuro, desktop, drawer + Select abertos**: popover do Select renderiza com fundo escuro (`--popover`/`--popover-foreground` corretos), sem nenhum flash ou retângulo branco — confirma que a correção de tema no documento (tarefa 2.1) cobre o portal do Select corretamente.
- **Claro, desktop, drawer + Select abertos**: mesma composição no tema claro — fundo claro consistente entre a página, o drawer e o popover do Select, contraste de texto adequado, anel de foco visível no trigger, checkmark no item selecionado. Nenhum texto sobreposto.
- **Escuro, mobile (390px), modal de logout**: hierarquia visual clara — "Sair deste dispositivo" em verde (ação recomendada), "Sair de todos os dispositivos" em vermelho (`Button variant="destructive"`, ação sensível secundária), cada um com descrição curta abaixo, botões de largura total sem quebra confusa, "Cancelar" isolado no rodapé.
- Nenhuma ocorrência de popup claro inesperado no tema escuro, nenhum texto cortado/sobreposto nas três composições capturadas.

**Achado durante esta validação (não relacionado a CSS/tema):** abrir o `Select` compartilhado dentro do drawer (`DialogContent`) e fechá-lo deixava `document.body` com `pointer-events: none` permanente em navegador real (a página inteira parava de responder a clique), causado por duas cópias distintas de `@radix-ui/react-dismissable-layer`/`react-focus-scope`/`react-portal`/`react-presence` resolvidas no `node_modules` (uma para `@radix-ui/react-dialog`, outra, com versões patch diferentes, aninhada dentro de `@radix-ui/react-select`) — cada cópia gerencia seu próprio bloqueio de `pointer-events` do body sem saber da outra. Corrigido fixando uma única versão de cada pacote via `overrides` no `package.json` raiz (ver commit desta change), eliminando a cópia duplicada. Adicionado teste de regressão real de navegador em `apps/web/e2e/logout-and-user-administration.e2e.spec.ts` (abre o Select dentro do drawer, fecha por Escape, confirma que a página continua clicável) — sem essa correção, o teste trava/falha.

## 9.6 — lint, check-types, testes e build

- `npm run lint` (turbo, todos os pacotes): passou. Corrigido no processo um erro real introduzido por este refinamento (`no-require-imports`/`no-unsafe-*` em `temporary-password.generator.spec.ts`, por usar `require('node:crypto')` para mockar `randomInt`) — refeito com `jest.mock('node:crypto', ...)` tipado.
- `npm run check-types` (turbo): passou.
- `npm run build` (turbo, 6 pacotes): passou, incluindo `next build` de `apps/web` (rotas de `/configuracoes` geradas normalmente).
- `npm run test` (turbo, todos os pacotes simultaneamente): **falha pré-existente não relacionada** — `acerto.page.spec.tsx` e `premios.page.spec.tsx` excedem o timeout padrão de 5000ms apenas quando todos os workspaces rodam Jest em paralelo (contenção de CPU), não quando executados isoladamente. Confirmado reproduzindo os dois cenários: isolados (`npx jest acerto.page.spec.tsx premios.page.spec.tsx`) → 5/5 passam em 3.5s; suíte completa de `apps/web` isolada (sem os demais workspaces concorrendo) → 236/236 passam. Não é uma regressão desta change.

## 1.4 — Confirmação de ausência de impacto em banco

Nenhum requisito de `proposal.md`, `design.md` ou `specs/**` desta change exige tabela, coluna, relação ou migration Prisma nova. Confirmado antes de iniciar qualquer edição de produto.
