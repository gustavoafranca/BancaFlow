# Inventário e auditoria do frontend `apps/web`

> Deliverable da change OpenSpec `review-web-frontend-architecture` — Fase 1 (auditoria e inventário).
> **Atualizado pós-migração** (tarefa 1.2 revisitada após revisão de código): a versão anterior deste
> documento era uma fotografia PRÉ-migração (Fases 2–9 ainda não existiam) e ficou desatualizada —
> descrevia `app/page.tsx` como o template intocado do `create-next-app`, listava `Button`/`Input`
> do design system como órfãos, e não mencionava nenhum dos 9 módulos hoje em `apps/web/src/modules/**`,
> `/unavailable`, `useCurrentUser`, o endpoint de backend `GET /api/tenant-context` nem a lógica de
> host-availability do `proxy.ts`. Esta revisão relê `apps/web/src/**` como existe agora e corrige
> cada linha stale, preservando o formato e o que continua verdadeiro.
> Data da revisão: 2026-07-18. Alias `@/` → `apps/web/src`. Next.js 16 (usa `src/proxy.ts`, não `middleware.ts`).
> Baseline verificado nesta revisão: `jest` 119/119 verde (29 suítes), `tsc --noEmit` limpo, `eslint` limpo
> (script `check-types` já existe em `package.json`, gap identificado na versão anterior deste relatório
> e fechado na tarefa 10.4).

## 1.1 Guias e configuração lidos

- `README.md`, `apps/web/README.md`, `apps/web/AGENTS.md` (regra "This is NOT the Next.js you know").
- `apps/web/package.json` (Next 16.2.10, React 19.2.4 pinado, Tailwind v4, RHF 7, `clsx`/`tailwind-merge`/`cva`/`@radix-ui/react-slot` **+ novo** `@radix-ui/react-dialog` (primitive `Dialog`, Fase 4), dep de workspace `@bancaflow/identity`; **devDependency nova** `@playwright/test`; scripts `test:e2e` (`playwright test`) e `check-types` (`next typegen && tsc --noEmit`) adicionados desde a versão anterior deste relatório).
- `tsconfig.json` (único alias `@/* → ./src/*`, `strict`, `moduleResolution: bundler`).
- `jest.config.ts` (via `next/jest`; **não lê `paths`** → `moduleNameMapper` replica `@/`; React force-mapeado para `apps/web/node_modules` por causa das duas cópias em workspace; **novo** `testPathIgnorePatterns` inclui `<rootDir>/e2e/` — o Playwright tem seu próprio runner e quebraria sob `jsdom`), `jest.setup.ts` (só `@testing-library/jest-dom`), `postcss.config.mjs` (Tailwind v4 CSS-first, sem `tailwind.config.js`).
- `next.config.ts` (rewrite único `/api/:path* → BACKEND_INTERNAL_URL`, preserva `Host`/`X-Forwarded-Host` — inalterado desde a versão anterior).
- **Novo**: `apps/web/playwright.config.ts` e `apps/web/e2e/README.md` (ver §1.2 "E2E de browser").
- **Novo**: `openspec/changes/review-web-frontend-architecture/design.md`, decisões D6 (host sem tenant → endpoint público + página genérica não enumerável) e D9 (exceção formal para primitives bespoke remanescentes) — referenciadas em §1.3/§1.5.

## 1.2 Inventário por arquivo

Legenda estado: **U**=usado · **O**=órfão · **D**=duplicado/quase · **L**=legado/placeholder.
Classificação proposta: **shared** · **módulo** · **rota** (`app/**/_components`/rota) · **remover**.

### App shell / raiz

| Arquivo | Boundary | Exports | Consumidores | Estado | Classificação |
|---|---|---|---|---|---|
| `app/layout.tsx` | server | `RootLayout` | root | U | rota |
| `app/page.tsx` (`/`) | server | `RootPage` | — | **U** — rota raiz determinística real: lê o cookie de sessão via `parseAccessToken`/`cookies()` e usa `redirect()` para `/login` (sem sessão), `/trocar-senha` (`mustChangePassword`) ou `/dashboard`. **NÃO é mais o template do `create-next-app`** (era o estado da versão anterior deste relatório, já corrigido na tarefa 7.1). Redundante em parte com `proxy.ts` (que já cobre `/` no matcher), mas cobre o caso "sessão válida" que o proxy deixa passar sem servir conteúdo. | rota |
| `app/page.spec.tsx` | test (node env) | — | — | **novo** U | teste |
| `proxy.ts` | server (node) | `proxy`, `config` | Next (roda antes de toda rota do matcher) | U — **responsabilidade ampliada**: (1) consulta `GET /api/tenant-context` (fail-open em erro de rede/resposta não-2xx) e reescreve para `/unavailable` quando `available !== true`, cobrindo `/`, `/login` e as rotas privadas com o mesmo comportamento (D6); (2) gate de sessão como antes (cookie ausente/ilegível → `/login`, exceto o próprio `/login` que fica acessível anônimo para não criar loop; `mustChangePassword` força `/trocar-senha`). Corrige o `Host` do fetch interno para o `Host` do browser (`request.headers.get('host')`), não o host em que o Next está ligado — documentado inline como achado empírico. Matcher exclui `api`, assets estáticos, `favicon.ico` **e `unavailable`** (nova exclusão, para a página ficar visitável sem sessão). | rota/infra |
| `proxy.spec.ts` | test | — | — | U (15 casos: sessão + `/login` sem loop + `expired=1` + tenant-context com `Host` correto e sem SSRF) | teste |
| `app/unavailable/page.tsx` | server | `UnavailablePage` | rewrite do `proxy.ts` (host sem tenant válido) | **novo** U | rota |
| `app/login-to-dashboard-flow.spec.tsx` | test (jsdom) | — | — | **novo** U — characterization test de componente (mocka `auth.client`/`next/navigation`) do fluxo login → troca obrigatória → dashboard; complementar ao E2E de browser real em `e2e/` (ver seção dedicada) | teste |

### `src/shared/**`

| Arquivo | Boundary | Exports | Consumidores | Estado | Classificação |
|---|---|---|---|---|---|
| `shared/lib/class-name.util.ts` | util | `cn` | todas as primitives de `shared/components/ui` | U | shared |
| `shared/lib/format.util.ts` | util | `initials`, `formatCurrency`, `formatCurrencyAbs`, `formatSignedCurrency`, `formatCentsToReais` | `app-navbar`, `acerto` (util/drawers/page), `cambistas`, `perfil`, `pessoas`, `premios` (util/FeedRow/page), `lancamentos/data` | **novo** U — consolida os antigos `fmt`/`initials`/`initialsOf` duplicados (política de sinal preservada como 3 funções nomeadas por comportamento em vez de forçar uma unificação que mudaria a saída visual) | shared |
| `shared/lib/format.util.spec.ts` | test | — | — | U | teste |
| `shared/lib/turno.util.ts` | util | `Turno`, `TURNO_LABELS`, `TURNO_BADGE_VARIANT` | `acerto` (lib/page/DetailDrawer/types), `lancamentos/data` | **novo** U/**D parcial** — ver §1.3: `lancamentos/types.ts` e `modules/premios/types.ts` **redefinem seu próprio** `Turno` em vez de importar este | shared |
| `shared/lib/turno.util.spec.ts` | test | — | — | U | teste |
| `shared/lib/role.util.ts` | util | `roleLabel` | `app-navbar`, `perfil` | **novo** U | shared |
| `shared/api/auth.client.ts` | client | `login`, `refresh`, `logout`, `logoutAll`, `changePassword`, `mandatoryPasswordChange`, `getCurrentUser` (**novo**), tipos (`AuthenticatedUserContext`, `AccountRoleName`, …) | `login`: login form. `logout`/`logoutAll`: **agora fiados** (`app-navbar` dropdown, `app-sidebar` rodapé — tarefa 7.4/Q2). `mandatoryPasswordChange`: `trocar-senha`. `getCurrentUser`: só via `useCurrentUser` (`app-navbar`, `acerto`, `lancamentos`, `perfil`, `premios`) | U **parcial** — `refresh` e `changePassword` continuam **exportados e sem consumidor** (o silent-refresh de verdade usa `refreshSession` de `refresh-on-expire.ts`, uma função diferente; a troca de senha **voluntária** não tem nenhum botão que a acione hoje — só a obrigatória via `mandatoryPasswordChange`) | shared |
| `shared/api/auth.client.spec.ts` | test | — | — | U | teste |
| `shared/form/validator.ts` | lib | `v`, `Infer` | `login.schema.ts`, `change-password.schema.ts` | U | shared |
| `shared/session/parse-token.ts` | server | `parseAccessToken`, `isTokenExpired`, `toSession` | `proxy.ts`, `app/page.tsx`, `(private)/layout.tsx` | U — **`toSession` continua descartado** em `(private)/layout.tsx:25` (`void toSession(claims)`); a identidade hardcoded que essa sessão descartada motivava foi resolvida por um caminho **diferente** (fetch client-side a `GET /api/auth/me` via `useCurrentUser`, não pela propagação do `Session` do server) — a chamada a `toSession` no layout server hoje não tem efeito prático, ver §1.3 | shared |
| `shared/session/refresh-on-expire.ts` | client | `refreshSession`, `redirectToLoginExpired`, `fetchWithRefresh` | `auth.client.ts` (`logout`, `logoutAll`, `changePassword`, `mandatoryPasswordChange`, `getCurrentUser`) | U | shared |
| `shared/session/refresh-on-expire.spec.ts` | test | — | — | U | teste |
| `shared/session/session.types.ts` | types | `AccountRole`, `AccessTokenClaims`, `Session`, cookies | `proxy`, `layout`, `parse-token` | U | shared |
| `shared/session/use-current-user.ts` | client hook (`use client`) | `useCurrentUser`, `CurrentUserState` | `app-navbar`, `acerto.page`, `lancamentos.page`, `perfil.page`, `premios.page` | **novo** U — hook de exibição sobre `getCurrentUser()` (`GET /api/auth/me`); estado `loading`/`success`/`error`, nunca fabrica dado durante o carregamento (elimina "João Silva"/"Banca São Jorge" hardcoded — tarefa 7.3) | shared |
| `shared/session/use-current-user.spec.ts` | test | — | — | U | teste |
| `shared/theme/theme-provider.tsx` | client | `ThemeProvider`, `useTheme`, `ThemeColors` | `(private)/layout.tsx` e, transitivamente, todas as páginas privadas/shell | **novo local** U — **movido** de `(private)/_shell/theme.tsx` (Fase 4/5; o caminho antigo foi removido de vez na Fase 9, não é mais nem um re-export). Paleta DARK/LIGHT ainda hardcoded em `c` (inline styles), mas agora também expõe as mesmas cores como CSS custom properties (`--primary`, `--background`, etc., via `toDesignTokens`) consumidas pelas primitives Tailwind/CVA — fonte única entre os dois sistemas de estilo | shared |
| `shared/components/icons.tsx` | server | ~24 `Icon*` (componentes SVG parametrizados por `size`/props, não `ReactNode` pré-instanciado) | `app-navbar`, `app-sidebar`, e os `components/icons.tsx` de 7 dos 9 módulos (`acerto`, `cambistas`, `configuracoes`, `dashboard`, `lancamentos`(parcial, ver §1.3)`, `perfil`, `pessoas`, `premios`) + páginas desses módulos diretamente | **novo** U — consolida os ícones genuinamente duplicados que antes existiam em `_shell/icons.tsx` + ~9 fábricas bespoke por página; ícones de uso único permanecem locais ao módulo até um 2º consumidor real (política documentada inline, `web-component-ownership`) | shared |
| `shared/components/icons.spec.tsx` | test | — | — | U | teste |
| `shared/components/ui/button.tsx` | server (primitive, sem `use client`) | `Button`, `buttonVariants` | `login-form`, `change-password-form`, `cambistas.page`, `dashboard.page` | **U** — **não é mais órfão** (correção principal desta revisão: a versão anterior do relatório listava `button.tsx`/`input.tsx` como sem consumidor). Variante `brand` reproduz o CTA das telas de auth | shared |
| `shared/components/ui/button.spec.tsx` | test | — | — | U | teste |
| `shared/components/ui/input.tsx` | server (primitive) | `Input` | `login-form`, `change-password-form`, `cambistas.page` | **U** — idem `button.tsx`, corrigido de "órfão" para consumido | shared |
| `shared/components/ui/input.spec.tsx` | test | — | — | U | teste |
| `shared/components/ui/table.tsx` | server (primitive) | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` | `cambistas.page`, `dashboard.page` | **novo** U — `<table>` nativo (não `div role="table"`), substitui as "tabelas" CSS grid bespoke **só nesses dois módulos**; os outros 6 continuam com grid bespoke (ver D9, §1.3) | shared |
| `shared/components/ui/table.spec.tsx` | test | — | — | U | teste |
| `shared/components/ui/dialog.tsx` | client (`use client`) | `Dialog`, `DialogTrigger`, `DialogClose`, `DialogPortal`, `DialogOverlay`, `DialogContent` (variantes `modal`/`drawer`), `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription` | **nenhum** fora do próprio spec | **novo O** — primitive construída (Fase 4, sobre `@radix-ui/react-dialog`) mas **sem nenhum consumidor de produção ainda**: os drawers/modais bespoke de `acerto` (`AcertoDrawer`, `DetailDrawer`, `PrintModal`), `pessoas`, `premios` e `configuracoes` continuam com overlay/posicionamento próprios (D9) e não foram convertidos para `<Dialog>`. Órfão candidato distinto do caso antigo: aqui a infraestrutura existe e está testada, só falta migração dos consumidores | shared (adotar — trabalho pendente, não regressão) |
| `shared/components/ui/dialog.spec.tsx` | test | — | — | U | teste |
| `shared/components/ui/badge.tsx` | server (primitive) | `Badge`, `badgeVariants` (`neutral`/`success`/`warning`/`info`/`purple`/`danger`) | `cambistas.page`; variantes também referenciadas por tipo em `shared/lib/turno.util.ts` | **novo** U | shared |
| `shared/components/ui/badge.spec.tsx` | test | — | — | U | teste |
| `shared/components/ui/theme-toggle.tsx` | client | `ThemeToggle` (props `dark`/`onToggle`/`className` — controlado, sem provider acoplado) | `app-navbar`, `login-layout` | **U** — **consolidado em primitive única** (tarefa 4.2/5.2): substitui as 3 implementações antigas (o stub órfão neste mesmo caminho, a versão real de `src/components/ui/theme-toggle.tsx` — caminho que **não existe mais**, removido — e os dois toggles hand-rolled inline do `app-navbar`, incluindo o item "Trocar Tema" do dropdown, também removido) | shared |
| `shared/components/ui/theme-toggle.spec.tsx` | test | — | — | U | teste |

> `src/components/**` (o antigo `components/ui/theme-toggle.tsx` real, duplicando o stub de `shared/`) **não existe mais** — removido na consolidação da Fase 4/9. Não há mais diretório `src/components/`.

### Auth (`app/login`, `app/trocar-senha`)

| Arquivo | Boundary | Notas | Estado | Classificação |
|---|---|---|---|---|
| `login/page.tsx` | server | lê `searchParams.expired`; **corrigido (P1)** para priorizar `expired=1` e não reavaliar claims nesse caso (evita o loop `/login?expired=1` ↔ `/dashboard` de sessão revogada, tarefa 7.2) | U | rota |
| `login/page.spec.tsx` | test | **novo** — 2 casos do fix de `expired=1` | U | teste |
| `login/_components/login-layout.tsx` | client | **migrado**: importa `ThemeToggle` de `@/shared/components/ui/theme-toggle` (antes `@/components/ui/theme-toggle`, caminho removido) | U | rota |
| `login/_components/login-card.tsx` | server | compõe brand+form | U | rota |
| `login/_components/login-form.tsx` | client | ~224 linhas; **agora usa** `Button`/`Input` de `shared/components/ui` (antes `<input>`/`<button>` ad-hoc) | U | rota/módulo |
| `login/_components/login.schema.ts` | lib | VOs username/password (regra na UI) | U | módulo identity |
| `login/_components/brand-header.tsx` | server | `next/image`, `public/design-imports/login/bancaflow.png` | U | rota |
| `login/_components/auth-illustration.tsx` | server | ~155 linhas, feature list hardcoded; usa `public/design-imports/login/{fundo,bancaflow}.png` | U | rota |
| `trocar-senha/page.tsx` | server | fora de `(private)` de propósito | U | rota |
| `trocar-senha/change-password-form.tsx` | client | **agora usa** `Button`/`Input` de `shared/components/ui` (antes ad-hoc) | U | rota/módulo |
| `trocar-senha/change-password-form.spec.tsx` | test | **novo** | U | teste |
| `trocar-senha/change-password.schema.ts` | lib | replica política de senha forte | U | módulo identity |

### `app/(private)/_shell`

| Arquivo | Boundary | Notas | Estado | Classificação |
|---|---|---|---|---|
| `layout.tsx` | server async | defense-in-depth; **`void toSession(claims)` continua descartado** (ver nota em `parse-token.ts` acima — hoje sem efeito prático, a identidade real chega por `useCurrentUser` client-side) | U | rota |
| `_shell/app-frame.tsx` | client | navbar+sidebar; agora importa `useTheme` de `@/shared/theme/theme-provider` (antes `./theme` local) | U | shared (shell) |
| `_shell/app-navbar.tsx` | client | ~304 linhas; **identidade hardcoded removida** (tarefa 7.3): `displayName`/`displayEmail`/`displayRole`/`displayBanca`/`displayInitials` vêm de `useCurrentUser()`, vazios enquanto carrega/erro, nunca fabricados; **"Sair" e "Sair de todos os dispositivos" agora chamam `logout()`/`logoutAll()` reais** (tarefa 7.4, antes sem handler); toggle de tema consolidado no `<ThemeToggle>` compartilhado (item redundante do dropdown removido) | U | shared (shell) |
| `_shell/app-navbar.spec.tsx` | test | **novo** — mocka `auth.client`/`next/navigation`/`next/image` | U | teste |
| `_shell/app-sidebar.tsx` | client | ~161 linhas; **`MENU` sem `/caixa` e `/relatorios`** (tarefa 9.2/Q3 — os imports `IconCreditCard`/`IconBarChart`, que ficaram sem uso, também foram removidos); botão "Sair" do rodapé agora chama `logout()` real | U | shared (shell) + nav em layout |
| ~~`_shell/theme.tsx`~~ | — | **removido** (Fase 9) — era um re-export de `shared/theme/theme-provider`; caminho não existe mais | — | — |
| ~~`_shell/icons.tsx`~~ | — | **removido** (Fase 9) — era um re-export de `shared/components/icons`; caminho não existe mais | — | — |

### Rotas privadas (`app/(private)/<domínio>/page.tsx`) — wrappers finos, Server Components

Todas seguem o mesmo padrão de 3-5 linhas: importam a página real de `@/modules/<domínio>` (via barrel) e a renderizam sem lógica própria. Nenhuma delas tem `use client` — o boundary client vive dentro do módulo.

| Arquivo | Importa de | Estado | Classificação |
|---|---|---|---|
| `(private)/dashboard/page.tsx` | `@/modules/dashboard` → `DashboardPage` | U | rota |
| `(private)/cambistas/page.tsx` | `@/modules/cambistas` → `CambistasPage` | U | rota |
| `(private)/pessoas/page.tsx` | `@/modules/pessoas` → `PessoasPage` | U | rota |
| `(private)/lancamentos/page.tsx` | `@/modules/lancamentos` → `LancamentosPage` | U | rota |
| `(private)/acerto/page.tsx` | `@/modules/acerto` → `AcertoPage` | U | rota |
| `(private)/premios/page.tsx` | `@/modules/premios` → `PremiosPage` | U | rota |
| `(private)/configuracoes/page.tsx` | `@/modules/configuracoes` → `ConfiguracoesPage` | U | rota |
| `(private)/perfil/page.tsx` | `@/modules/perfil` → `PerfilPage` | U | rota |
| `(private)/identity/page.tsx` | `@/modules/identity` → `DashboardPage` | U — **import profundo corrigido** (tarefa 9.3): antes `../../../modules/identity/pages/dashboard.page`, agora só o barrel `@/modules/identity` | rota |

> Confirmado por grep (tarefa 6.7/10.3, `npx madge --circular`/`--orphans`): as 9 rotas acima são as únicas dependentes de `modules/**`; nenhum ciclo; nenhum import cross-module entre os 9 módulos; nenhum `shared/**` importando `modules/**`.

### `src/modules/**` — os 9 módulos de negócio

Todo `pages/*.page.tsx` de módulo é `'use client'` (usa `useTheme()`/estado local) — decisão preservada da versão anterior deste relatório, ainda válida: as telas dependem de estado de UI (tema, drawers, filtros) sem dado vindo do servidor nesta change. Cada módulo segue a mesma forma: `index.ts` (barrel), `types.ts`, `data/*.sample.ts` (mock em memória, sem API), `lib/*.ts` (quando há regra pura extraída), `components/*.tsx`, `pages/*.page.tsx` (+ `*.spec.tsx` correspondente).

#### `modules/acerto/`

| Arquivo | Exports | Consumidores | Estado | Classificação |
|---|---|---|---|---|
| `index.ts` | `AcertoPage`, tipos `Entry`/`Pessoa`/`LastAcerto`/`EntryTipo` | `(private)/acerto/page.tsx` | U | módulo |
| `types.ts` | `Pessoa`, `Despesa`, `Ajuste`, `EntryTipo`, `Entry`, `LastAcerto`, `Ext`, `ext()` | módulo | U | módulo |
| `data/acerto.sample.ts` | dados mock em memória | `acerto.page` | U | módulo |
| `lib/acerto.util.ts` | re-exporta `fmt`/`fmtSaldo`/`initialsOf` (sob os nomes já usados aqui) de `shared/lib/format.util`; `TURNO_BG`/`TURNO_COL` (cor de chip **local**, diferente da `Badge` estática); `FORMA_LABELS`; `tipoMetaFor`; `todayStr`/`offsetDate`/`offsetMonth`/`fmtNow` | `acerto.page`, `AcertoDrawer`, `DetailDrawer`, `PrintModal` | U | módulo |
| `components/icons.tsx` | `Ico*` locais (poucos, uso único) | `AcertoDrawer`, `DetailDrawer`, `PrintModal` | U | módulo |
| `components/AcertoDrawer.tsx` | `AcertoDrawer` | `acerto.page` | U — mantém `canDo = hasValor && !!formaPag` como gating só do botão (ver §1.5) | módulo |
| `components/DetailDrawer.tsx` | `DetailDrawer` | `acerto.page` | U | módulo |
| `components/PrintModal.tsx` | `PrintModal` | `acerto.page` | U — **operador/banca agora vêm da sessão real** (`useCurrentUser`, props `operador`/`bancaNome`), antes hardcoded | módulo |
| `pages/acerto.page.tsx` | `AcertoPage` | `(private)/acerto/page.tsx` | U — ~455 linhas; usa `useCurrentUser`; `canAcerto = entryCount > 0` revalidado dentro de `confirmAcerto` além do `disabled` do botão (mitiga parcialmente o gating só-de-UI) | módulo |
| `pages/acerto.page.spec.tsx` | — | — | U | teste |

#### `modules/cambistas/`

| Arquivo | Exports | Consumidores | Estado | Classificação |
|---|---|---|---|---|
| `index.ts` | `CambistasPage`, tipos `Cambista`/`Dono`/`CambistaStatus` | `(private)/cambistas/page.tsx` | U | módulo |
| `types.ts` | `Dono`, `CambistaStatus`, `Cambista` | módulo | U | módulo |
| `data/cambistas.sample.ts` | `DONOS`, `AVATAR_GRADS`, `CAMBISTAS` | `cambistas.page` | U | módulo |
| `components/icons.tsx` | ícones locais (poucos) | `cambistas.page` | U | módulo |
| `pages/cambistas.page.tsx` | `CambistasPage` | `(private)/cambistas/page.tsx` | U — ~228 linhas; **único módulo, junto de `dashboard`, que já usa `Button`/`Input`/`Table`/`Badge` do design system compartilhado** em vez de recriar primitives | módulo |
| `pages/cambistas.page.spec.tsx` | — | — | U | teste |

#### `modules/configuracoes/`

| Arquivo | Exports | Consumidores | Estado | Classificação |
|---|---|---|---|---|
| `index.ts` | `ConfiguracoesPage`, tipos, `buildDefaultPerms`/`ACTS`/`PERM_MODS`/`PERM_LABELS` | `(private)/configuracoes/page.tsx` | U | módulo |
| `types.ts` | `DrawerItem`, `Submenu`, `Mode`, `ProfileUser`, `PermissionMatrix` | módulo | U | módulo |
| `data/configuracoes.sample.ts` | dados mock | `configuracoes.page` | U | módulo |
| `lib/permissions.ts` | `ACTS`, `PERM_LABELS`, `PERM_MODS`, `buildDefaultPerms()` | `configuracoes.page` | U — **regra isolada e testada** (extraída de dentro de `page.tsx`, tarefa 6.5), mas **matriz de permissões continua só dado de amostra da tela**: não existe endpoint/domínio de RBAC no backend (o JWT só emite `role: OWNER|ADMIN|USER`); comentário no próprio arquivo documenta o limite de escopo (`web-frontend-boundaries`) — risco de autorização-só-na-UI **não resolvido**, apenas isolado (ver §1.5) | módulo |
| `lib/permissions.spec.ts` | — | 6 testes | U | teste |
| `components/icons.tsx` | ícones locais; comentário indica que a maioria já veio de `shared/components/icons` (só `IcoUsers` duplicado byte-a-byte foi removido na Fase 9) | `configuracoes.page` | U | módulo |
| `pages/configuracoes.page.tsx` | `ConfiguracoesPage` | `(private)/configuracoes/page.tsx` | U — ~581 linhas; **ainda recria** botão/input/tabela/drawer bespoke em vez das primitives compartilhadas — exceção formal D9 (ver §1.3) | módulo |
| `pages/configuracoes.page.spec.tsx` | — | — | U | teste |

#### `modules/dashboard/`

| Arquivo | Exports | Consumidores | Estado | Classificação |
|---|---|---|---|---|
| `index.ts` | `DashboardPage`, tipos `RecentEntryRow`/`SystemStatusItem` | `(private)/dashboard/page.tsx` | U | módulo |
| `types.ts` | `RecentEntryRow`, `SystemStatusItem` | módulo | U | módulo |
| `data/dashboard.sample.ts` | `RECENT`, `SYSTEM_STATUS` | `dashboard.page` | U | módulo |
| `components/icons.tsx` | ícones locais | `dashboard.page` | U | módulo |
| `pages/dashboard.page.tsx` | `DashboardPage` | `(private)/dashboard/page.tsx` | U — ~286 linhas; icon factory removida a favor de `IconPlus` compartilhado + **usa `Button`/`Table`** do design system (junto de `cambistas`, os únicos dois módulos migrados de fato para as primitives) | módulo |
| `pages/dashboard.page.spec.tsx` | — | — | U | teste |

#### `modules/identity/` (placeholder, não migrado — pré-existente)

| Arquivo | Exports | Consumidores | Estado | Classificação |
|---|---|---|---|---|
| `index.ts` | `DashboardPage`, `export * from './data'`, `export * from './components/identity-dashboard.component'` | `(private)/identity/page.tsx` | U/**L** — barrel normalizado (tarefa 9.3, mesmo padrão de named re-export dos outros 8 módulos), mas o conteúdo continua o scaffold placeholder original | módulo |
| `data/index.ts` | `export {}` | — | **O/L** — ainda vazio | módulo |
| `components/identity-dashboard.component.tsx` | `IdentityDashboardComponent` | `dashboard.page` (deste módulo) | L — texto estático "Estrutura inicial do módulo identity" | módulo |
| `pages/dashboard.page.tsx` | `DashboardPage` | `index.ts`, `(private)/identity/page.tsx` | L | módulo |

> **Smell estrutural que persiste** (não é regressão desta revisão, mas continua sem solução): `modules/identity` é um placeholder de scaffold **não relacionado** ao domínio de identidade real — login, troca de senha, sessão e o cliente HTTP de auth vivem em `app/login/**`, `app/trocar-senha/**`, `shared/session/**` e `shared/api/auth.client.ts`, não aqui. A rota `/identity` continua existindo e servindo esse placeholder desconectado do fluxo real de autenticação — dois "identity" no código com significados diferentes.

#### `modules/lancamentos/`

| Arquivo | Exports | Consumidores | Estado | Classificação |
|---|---|---|---|---|
| `index.ts` | `LancamentosPage`, tipos `Cambista`/`Despesa`/`Entry`/`Turno` | `(private)/lancamentos/page.tsx` | U | módulo |
| `types.ts` | `Turno` (**própria**, `'manha'\|'tarde'\|'noite'`), `Cambista`, `Despesa`, `Entry` | módulo | U/**D** — redefine `Turno` em vez de importar de `shared/lib/turno.util.ts` (mesmos valores, tipo duplicado — ver §1.3) | módulo |
| `data/lancamentos.sample.ts` | dados+helpers mock | `lancamentos.page` | U — usa `shared/lib/format.util` e `shared/lib/turno.util` internamente | módulo |
| `components/icons.tsx` | `svg()` (helper local, **ainda no padrão antigo de `ReactNode` pré-instanciado**, não parametrizado) + ~15 `Ico*` | `lancamentos.page` | U/**D conhecido e documentado** — comentário no próprio arquivo reconhece que a convergência para o componente JSX compartilhado (`shared/components/icons`) foi **adiada para a Fase 9** dado o volume de call-sites que usam a convenção `{IcoX}` em vez de `<IconX/>`; risco desproporcional para a migração feita até aqui | módulo |
| `pages/lancamentos.page.tsx` | `LancamentosPage` | `(private)/lancamentos/page.tsx` | U — **maior arquivo do frontend, ~1773 linhas**; usa `useCurrentUser` (operador real, não mais hardcoded); continua com tabela/inputs bespoke (D9) | módulo |
| `pages/lancamentos.page.spec.tsx` | — | — | U | teste |

#### `modules/perfil/`

| Arquivo | Exports | Consumidores | Estado | Classificação |
|---|---|---|---|---|
| `index.ts` | `PerfilPage`, tipos `TabId`/`DeviceSession`/`LogRow` | `(private)/perfil/page.tsx` | U | módulo |
| `types.ts` | `TabId`, `DeviceSession`, `LogRow` | módulo | U | módulo |
| `data/perfil.sample.ts` | `buildSessions(c)`, `buildActivityLog(c)` | `perfil.page` | U | módulo |
| `components/icons.tsx` | ícones locais | `perfil.page` | U | módulo |
| `pages/perfil.page.tsx` | `PerfilPage` | `(private)/perfil/page.tsx` | U — ~549 linhas; **identidade real via `useCurrentUser`/`roleLabel`** ("Nível 5" fabricado removido, tarefa 6.6); **não há botão que chame `changePassword()` voluntário** — a troca de senha exposta na UI de perfil continua sem wiring real (ver §1.4) | módulo |
| `pages/perfil.page.spec.tsx` | — | — | U | teste |

#### `modules/pessoas/`

| Arquivo | Exports | Consumidores | Estado | Classificação |
|---|---|---|---|---|
| `index.ts` | `PessoasPage`, tipos `Pessoa`/`Tipo`/`DrawerMode`/`DrawerTab` | `(private)/pessoas/page.tsx` | U | módulo |
| `types.ts` | `Tipo`, `Pessoa`, `DrawerMode`, `DrawerTab` | módulo | U | módulo |
| `data/pessoas.sample.ts` | `ALL_CAMBISTAS`, `AVATAR_BY_TIPO`, `PESSOAS` | `pessoas.page` | U | módulo |
| `components/icons.tsx` | `svg()` local (padrão antigo) + `IcoLink`/`IcoLinkSm`/`IcoStar`/`IcoArrow`/`IcoMaximizeExpand`/`IcoMaximizeCollapse` | `pessoas.page` | U | módulo |
| `pages/pessoas.page.tsx` | `PessoasPage` | `(private)/pessoas/page.tsx` | U — ~839 linhas; drawer redimensionável bespoke preservado como estrutura própria (nota da Fase 6 no design.md); continua com modal/tabela ad-hoc (D9) | módulo |
| `pages/pessoas.page.spec.tsx` | — | — | U | teste |

#### `modules/premios/`

| Arquivo | Exports | Consumidores | Estado | Classificação |
|---|---|---|---|---|
| `index.ts` | `PremiosPage`, tipos (incl. `Turno` **própria**), `computeSettlement` | `(private)/premios/page.tsx` | U | módulo |
| `types.ts` | `Situacao`, `Tratamento`, `Turno` (**própria**, `'Manhã'\|'Tarde'\|'Noite'` — **capitalizado, valores diferentes** de `shared/lib/turno.util.ts` e de `modules/lancamentos/types.ts`), `Cambista`, `Premio`, `SitMeta`, `TratMeta`, `RowVM` | módulo | U/**D mais grave** — terceira definição incompatível de "turno" no código (ver §1.3) | módulo |
| `data/premios.sample.ts` | dados mock (`DEBITOS`/`BASE_PREMIOS` em memória) | `premios.page` | U | módulo |
| `lib/premios.util.ts` | `fmt`, `TURNO_BG`, `TURNO_COL` (re-exports/wrappers locais) | `premios.page`, `FeedRow` | U | módulo |
| `lib/settlement.ts` | `SettlementInput`, `SettlementResult`, `computeSettlement()` | `premios.page` | U — **regra financeira isolada e testada** (extraída de `savePremio` dentro de `page.tsx`, tarefa 6.2), mas comentário no próprio arquivo documenta que **continua sendo a única fonte da regra**: não existe endpoint de backend para prêmios/débitos/acerto nesta change — tornar isso autoritativo exige uma capability de backend nova, fora do escopo desta revisão (`web-frontend-boundaries`) | módulo |
| `lib/settlement.spec.ts` | — | 6 testes | U | teste |
| `components/icons.tsx` | `svg()` local (padrão antigo) + `IcoPremios` | `premios.page`, `FeedRow` | U | módulo |
| `components/FeedRow.tsx` | `FeedRow` | `premios.page` | U — usa `useCurrentUser` indiretamente via props vindas da página | módulo |
| `pages/premios.page.tsx` | `PremiosPage` | `(private)/premios/page.tsx` | U — ~1090 linhas; `criadoPor`/`validadoPor`/nome da banca no comprovante vêm de `useCurrentUser()` (não mais hardcoded); `canSave` revalidado dentro de `savePremio`; continua com UI bespoke (D9) | módulo |
| `pages/premios.page.spec.tsx` | — | — | U | teste |

### `e2e/` — E2E de browser real (Playwright, novo)

| Arquivo | Notas | Estado | Classificação |
|---|---|---|---|
| `apps/web/playwright.config.ts` | `testDir: './e2e'`, sem `webServer` (não orquestra backend/DB/frontend automaticamente — decisão documentada: mais frágil que exigir os serviços já no ar); `baseURL` via `E2E_BASE_URL`, default `http://pw-e2e.localhost:3000` | **novo** U | teste/infra |
| `e2e/README.md` | pré-requisitos (Postgres + backend + `npm run seed:e2e` + frontend), host `pw-e2e.localhost` (resolve nativamente via RFC 6761, sem editar `/etc/hosts`), troubleshooting de instalação do Chromium sem `sudo` | **novo** | doc |
| `e2e/login-to-dashboard.e2e.spec.ts` | 2 testes contra navegador real: login → `mustChangePassword` força `/trocar-senha` → troca → `/dashboard` sem refresh manual, com asserção do cookie `access_token` real (`httpOnly: true`); sessão persiste após reload. `beforeEach` roda `npm run seed:e2e` no backend (recria banca/usuário do zero, efeito colateral real no Postgres) | **novo** U — este é o único teste que exercita cookies HttpOnly reais, o rewrite `/api/:path*`, o `proxy.ts` e a resolução de tenant por `Host` fim a fim; o characterization test de componente (`app/login-to-dashboard-flow.spec.tsx`) mocka a borda HTTP e não prova nada disso | teste |

> Achado da tarefa 3.2/7.2: este E2E foi quem detectou os dois bugs P1/P2 corrigidos nas Fases 7/6 (loop de sessão revogada em `/login`; exceção D9 de primitives bespoke) — evidência de que a suíte de componente sozinha não seria suficiente para este fluxo.

### `public/**`

- Usados de fato (grep confirmado): `design-imports/dashboard/logo.png` (navbar, hardcoded independentemente do módulo atual), `design-imports/login/{bancaflow,fundo}.png` (brand-header, auth-illustration).
- **Órfãos confirmados** (sem nenhuma referência em `src/**`): `design-imports/{acerto,cambistas,configuracoes,lancamentos,perfil,pessoas,premios}/logo.png` (7 arquivos — só o de `dashboard` é usado, e é usado para TODOS os módulos via hardcode no navbar) e **todos** os `design-imports/login/illustration-1..12.svg` (nenhum é importado por `auth-illustration.tsx`, apesar do nome sugerir um carrossel).
- `public/{file,globe,next,vercel,window}.svg` — assets do template `create-next-app`, ainda presentes e ainda não referenciados por nada em `src/**` (mesma observação da versão anterior deste relatório; `app/page.tsx` deixou de ser o template, mas os assets do template não foram limpos).

## 1.3 Duplicações e smells

- **Dois sistemas de estilo paralelos, agora com fronteira parcialmente cruzada**: o DS Tailwind/`cn`/CVA (`shared/components/ui`) hoje tem consumidores reais fora das telas de auth — `cambistas` e `dashboard` usam `Button`/`Input`/`Table`/`Badge` de verdade. Mas a maior parte da área privada (`pessoas`, `lancamentos`, `premios`, `configuracoes`, `perfil`, `acerto` + o shell) continua em inline styles via `useTheme().c`, recriando botão/input/tabela(CSS grid)/drawer/dropdown bespoke. **Isto é conhecido e aceito, não um achado novo**: é uma exceção formal e com escopo definido, registrada em `design.md` D9 (2026-07-18) e refletida em `specs/web-design-migration/spec.md` ("Pre-existing bespoke widgets may remain as a scoped, documented exception") — decisão explícita de não reescrever agora por falta de tooling de comparação visual automatizada (sem Playwright/Cypress de snapshot, sem Chromatic/Percy), com a conversão completa deferida para uma change futura dedicada.
- **`ThemeToggle` consolidado**: das 3 implementações que existiam (stub órfão em `shared/components/ui`, versão real em `src/components/ui` — caminho removido —, toggle hand-rolled inline no `app-navbar`), sobra uma única primitive controlada em `shared/components/ui/theme-toggle.tsx`, usada por `login-layout` e `app-navbar`. **Resolvido.**
- **Ícones SVG**: consolidados em `shared/components/icons.tsx` para os glifos genuinamente duplicados (antes redefinidos em 4 lugares: `_shell/icons.tsx` — removido —, `lancamentos`, `acerto`, factories inline de `dashboard`/`perfil`). Ícones de uso único permanecem locais por módulo (política documentada, não um smell). **Residual, documentado e aceito**: `lancamentos/components/icons.tsx` e alguns outros `components/icons.tsx` de módulo ainda usam o padrão antigo `svg(size, children)` que retorna um `ReactNode` já resolvido em vez de um componente parametrizável — o comentário no próprio arquivo de `lancamentos` reconhece isso e adia a conversão para a Fase 9 dado o volume de call-sites (`{IcoX}` em vez de `<IconX/>`).
- **Helpers de formatação**: consolidados em `shared/lib/format.util.ts` (`formatCurrency`/`formatCurrencyAbs`/`formatSignedCurrency`/`initials`/`formatCentsToReais`), com `acerto/lib/acerto.util.ts` e `lancamentos` reexportando sob os nomes locais já usados nesses módulos. **Resolvido.**
- **Mapa de turno duplicado — piorou, não foi totalmente resolvido**: `shared/lib/turno.util.ts` criou a fonte única (`Turno = 'manha'|'tarde'|'noite'`, `TURNO_LABELS`, `TURNO_BADGE_VARIANT`), mas **dois módulos continuam com seu próprio tipo `Turno`**: `modules/lancamentos/types.ts` redefine o mesmo union de valores (`'manha'|'tarde'|'noite'`, apenas duplicado); `modules/premios/types.ts` define um union **diferente e incompatível**, capitalizado (`'Manhã'|'Tarde'|'Noite'`). Três representações do mesmo conceito de domínio no código hoje, não intercambiáveis sem mapeamento manual.
- **Primitives recriadas por rota**: inputs, botões, tabelas (CSS grid), dialogs/drawers/modais, badges — bespoke em `pessoas`, `lancamentos`, `premios`, `configuracoes`, `perfil`, `acerto` e no shell. Ver D9 acima — exceção formal, não descoberta nova desta revisão.
- **`Dialog` primitive sem consumidor**: diferente do caso de `button`/`input` (que passaram de órfãos a usados), `shared/components/ui/dialog.tsx` foi **construída** na Fase 4 (sobre `@radix-ui/react-dialog`, testada) mas **nenhum** dos drawers/modais bespoke (`AcertoDrawer`, `DetailDrawer`, `PrintModal`, os de `pessoas`/`premios`/`configuracoes`) foi migrado para usá-la — está dentro do mesmo guarda-chuva da exceção D9, mas vale registrar separadamente: é infraestrutura pronta e não adotada, não um problema de design.
- **Componentes gigantes** (cresceram desde a versão anterior, pela extração de lógica para `lib/`, não pela adição de UI nova): `lancamentos/pages/lancamentos.page.tsx` (~1773), `premios/pages/premios.page.tsx` (~1090), `pessoas/pages/pessoas.page.tsx` (~839), `configuracoes/pages/configuracoes.page.tsx` (~581), `perfil/pages/perfil.page.tsx` (~549), `acerto/pages/acerto.page.tsx` (~455).
- **Imports profundos**: **resolvido** — `identity/page.tsx` agora importa só `@/modules/identity` (barrel), confirmado por grep em todas as 9 rotas privadas (tarefa 6.7/9.3).
- **`modules/identity` continua um placeholder desconectado** do fluxo real de identidade (login/sessão/auth client vivem fora dele) — ver nota em §1.2. Não é órfão (tem consumidor real, a rota `/identity`), mas é um scaffold legado sem relação com a autenticação de verdade — smell estrutural, não uma questão de import.
- **`use client` possivelmente desnecessário**: sem mudança desde a versão anterior — todas as páginas privadas dependem de `useTheme()`/estado local, então o boundary client é justificado hoje; permanece um ponto a reavaliar numa futura conversão de shell para tokens CSS puros (que eliminaria a dependência de contexto React para cor).

## 1.4 Órfãos (exportados sem consumidor)

- `shared/components/ui/dialog.tsx` (`Dialog`/`DialogContent`/etc.) — construída e testada, **sem consumidor de produção** (ver §1.3).
- `auth.client.ts`: `refresh` e `changePassword` — **ainda exportados e não consumidos**. `logout`/`logoutAll` **saíram da lista de órfãos** (agora fiados no navbar/sidebar, tarefa 7.4/Q2).
- `modules/identity/data/index.ts` (`export {}`) — continua vazio.
- Assets: os 7 `design-imports/<módulo>/logo.png` (exceto `dashboard`) e os 12 `design-imports/login/illustration-*.svg` — nenhum referenciado em `src/**` (achado novo desta revisão, não estava na versão anterior porque a auditoria de assets não tinha sido cruzada com os novos módulos).
- `public/{file,globe,next,vercel,window}.svg` — assets do template, ainda não referenciados por nada.

**Resolvido desde a versão anterior**: `shared/components/ui/button.tsx`/`input.tsx` (agora consumidos), `modules/identity/index.ts` (barrel agora é o único caminho de import, sem furo), links de sidebar `/caixa`/`/relatorios` (removidos do `MENU`, Q3), `app/page.tsx` (não é mais peso morto — é a rota raiz real).

## 1.5 Regras de negócio/autorização apenas na UI

- **Política de senha** replicada no cliente: inalterado — `trocar-senha/change-password.schema.ts` e `login/_components/login.schema.ts`. Backend permanece autoritativo, mas o texto da regra ainda vive independente na UI.
- **Matriz de permissões por perfil** (`configuracoes/lib/permissions.ts`, `buildDefaultPerms`): **isolada e testada** (6 testes) desde a versão anterior deste relatório, que tinha essa lógica inline em `page.tsx`. **Continua sendo só dado de amostra** — nenhum endpoint/domínio de RBAC existe no backend; o comentário no próprio arquivo (`web-frontend-boundaries`) documenta essa limitação de escopo explicitamente como conhecida e deliberada, não corrigida agora.
- **Regras financeiras de acerto/prêmios** (`premios/lib/settlement.ts`, `computeSettlement`): **isolada e testada** (6 testes), mesma situação — continua a única fonte da regra sobre dados mock (`DEBITOS`/`BASE_PREMIOS` em memória, sem persistência real); tornar isso autoritativo exige uma capability de backend nova, fora do escopo desta change.
- **Gating de acerto**: `acerto/pages/acerto.page.tsx` (`canAcerto`) e `AcertoDrawer.tsx` (`canDo`) — agora **revalidados dentro das funções de confirmação** (`confirmAcerto`), não só via `disabled` do botão, o que reduz (mas não elimina — ainda não há endpoint de backend que rejeite a operação) o risco de bypass.
- **Identidade hardcoded — resolvido**: "João Silva / Administrador / Banca São Jorge / joao@bancasaojorge.com" foi removido de `app-navbar.tsx`, `perfil.page.tsx`, `PrintModal.tsx` e dos "criadoPor"/"validadoPor" de `premios.page.tsx`; todos agora usam `useCurrentUser()` sobre `GET /api/auth/me`, com estado vazio (não fabricado) durante carregamento/erro. **Nuance que persiste**: o `Session` parseado no server em `(private)/layout.tsx:25` continua descartado (`void toSession(claims)`) — a solução adotada foi um caminho client-side paralelo (fetch a `/api/auth/me`), não a propagação do `Session` já disponível no layout; a chamada a `toSession` ali hoje não tem efeito prático (nem positivo nem negativo — é código morto silencioso, não um risco de segurança).
- **Troca de senha voluntária sem UI**: achado novo desta revisão — `changePassword()` existe em `auth.client.ts` mas nenhuma tela (nem `perfil`, que seria o lugar natural) tem um formulário/botão que a chame. Só a troca **obrigatória** (`mandatoryPasswordChange`) está com UI.

## 1.6 Fronteiras confirmadas (a preservar)

- `grep`/`madge --circular`/`madge --orphans` (tarefa 10.3, reexecutados nesta revisão): **nenhum** arquivo de `src/shared/**` importa `src/modules/**`; **nenhum** componente global (`shared/**`) importa de `modules/**` ou `app/**`; **nenhum** import cross-module entre os 9 módulos de `modules/**`.
- Todas as 9 rotas privadas em `app/(private)/*/page.tsx` são wrappers finos que só importam do respectivo módulo via barrel `@/modules/<x>` — nenhum import profundo remanescente.
- Direção de dependências confirmada: `app → modules → shared` (nunca o inverso), preservada em todas as migrações das Fases 6-9.

**Ponto de partida ainda saudável**: a direção de dependências permanece limpa após 9 fases de migração — o objetivo original desta auditoria (preservar a fronteira, não introduzir `shared → modules`) foi cumprido.

## 2. Decisões e ownership (Fase 2)

> Esta seção registra decisões tomadas durante a Fase 2 e **já implementadas** nas Fases 4-9 — mantida como registro histórico da decisão, com nota do estado real ao lado de cada item.

### 2.1 Política de ownership aplicada (resumo por destino) — status de implementação

- **shared/components/ui**: `Button`, `Input` **adotados como canônicos e consumidos** (cambistas, dashboard, telas de auth). `ThemeToggle` **consolidado**. `Table`/`Dialog`/`Badge` **criados** (Fase 4) — `Table`/`Badge` têm consumidores reais (cambistas, dashboard); `Dialog` **ainda não tem** (ver §1.3/§1.4). Ícones e helpers genéricos (`fmt`→`format.util.ts`, `initials`) **viraram fonte única em `shared`**.
- **shared (shell/tokens)**: `_shell/{theme,icons}` **viraram `shared/theme/theme-provider.tsx` e `shared/components/icons.tsx`** (não re-exports — os caminhos antigos foram removidos na Fase 9); `app-frame`/`app-navbar`/`app-sidebar` continuam em `_shell/` (casca é específica do layout privado, não promovida a `shared/`). Um único `AppFrame`, uma única navegação (`MENU` em `app-sidebar.tsx`, sem `/caixa`/`/relatorios` — Q3).
- **modules/identity**: `login.schema.ts`/`change-password.schema.ts` continuam em `app/login`/`app/trocar-senha` (não foram movidos para dentro de `modules/identity`); `modules/identity` em si **continua o placeholder original**, não a home real do domínio de identidade (ver smell em §1.2/§1.3).
- **modules/<domain>**: **implementado para os 9 módulos** — `lancamentos`, `premios`, `acerto`, `pessoas`, `cambistas`, `configuracoes`, `perfil`, `dashboard`, `identity` (este último só estruturalmente, não em conteúdo).
- **app/**/_components / rota**: preservado para o que é exclusivo do fluxo de auth (`login/_components`, `trocar-senha`), que não migrou para `modules/` — decisão consciente, não pendência.
- **remover** (fase 9): **executado** — stub `shared/components/ui/theme-toggle.tsx` original consolidado (o caminho continua existindo, mas como a única versão real, não um stub); `app/page.tsx` template **substituído** (não removido — virou a rota raiz real); exports órfãos de `auth.client.ts` **parcialmente resolvidos** (`logout`/`logoutAll` fiados; `refresh`/`changePassword` continuam órfãos); barrels/placeholders de `modules/identity` **normalizados mas não removidos** (o módulo continua existindo como placeholder, decisão explícita da tarefa 9.3: "não é órfão", tem consumidor real via `/identity`); assets do template **não limpos** (ainda em `public/`, ver §1.2/§1.4).

### 2.2–2.3 Decisões (ver design.md Open Questions) — status

- **Q1 = Opção 2, implementada**: página `/unavailable` (genérica, não enumerável) + `GET /api/tenant-context` (público, sempre 200, `{ available: boolean }`) — D6 em `design.md`.
- **Q2 = Sim, implementada**: UI ligada ao contexto real via `GET /api/auth/me` + `useCurrentUser` (não ao `Session` do server, que segue descartado — ver nota em §1.5); `logout`/`logoutAll` fiados.
- **Q3 = Removido do menu, implementada**: `/caixa` e `/relatorios` fora do `MENU` de `app-sidebar.tsx`.
- **Q4 = Não existe** `frontend-module-workflow`: usadas as skills atuais como critério (sem mudança).

### 2.4 Matriz de migração e escopos disjuntos

Fases 1→10 conforme `tasks.md`/`design.md` (Migration Plan). Estado real ao fim desta revisão (não altera `tasks.md`, só documenta aqui o que o código reflete):

- Fases 1, 3, 4, 5, 7, 8, 9: **concluídas** e refletidas no código conforme descrito acima.
- Fase 6 (reorganização por módulo): **concluída estruturalmente para os 9 módulos**; duas exceções documentadas e aceitas permanecem — `premios`/`configuracoes` têm a regra de negócio isolada em `lib/` e testada, mas ainda **sem** fonte autoritativa de backend (fora de escopo desta change); D9 aceita a recriação de primitives em 6 módulos + shell como exceção formal.
- Fase 10: testes (119 em 29 suítes), `lint`/`check-types`/`test`/`build` verdes confirmados nesta revisão; checklist visual por viewport (tarefa 10.5) e revisão humana final antes do archive **não fazem parte deste inventário** — são gates fora do escopo de "atualizar o inventário de componentes".

> **Baseline verificado nesta revisão (2026-07-18)**: `jest` 119/119 verde (29 suítes, `apps/web`), `tsc --noEmit` limpo, `eslint` limpo. `check-types` já existe como script em `package.json` (gap fechado desde a versão anterior deste relatório).
