## Context

`apps/web` (Next.js 16, App Router, React 19, Tailwind v4, RHF + validator `v`) foi montado a partir de duas fontes: o scaffold de `config-shared-frontend` e telas importadas do Claude Design via `import-cloud-design-next`. Não houve auditoria arquitetural posterior. O inventário preliminar (auditoria de todos os arquivos de `apps/web/src/**`) revelou:

- **Dois sistemas de estilo paralelos e desconexos**: o design system Tailwind/`cn`/CVA em `src/shared/components/ui` (`Button`, `Input`) é usado **apenas** nas telas de auth; toda a área privada usa inline styles via `useTheme().c` (paleta hardcoded em `(private)/_shell/theme.tsx`). As primitives compartilhadas estão órfãs.
- **Duplicação**: `ThemeToggle` existe em `src/components/ui/theme-toggle.tsx` (usado) e `src/shared/components/ui/theme-toggle.tsx` (stub órfão), além de um toggle hand-rolled no `app-navbar.tsx`. Conjuntos de ícones SVG são redefinidos em 4 lugares; helpers (`fmt`, `initials`, mapas de turno) duplicados entre `lancamentos/_components/data.ts` e `acerto/_components/shared.tsx`.
- **Primitives recriadas por rota**: inputs, botões, tabelas (CSS grid), dialogs/drawers/modais e badges são bespoke em quase todas as páginas privadas.
- **Páginas gigantes**: `lancamentos` (~1768), `premios` (~1325), `pessoas` (~947), `configuracoes` (~767), `perfil` (~661), `dashboard` (~385). `page.tsx` de rota concentra marcação e lógica.
- **Regras de negócio/autorização só na UI**: política de senha (`change-password.schema.ts`), matriz de permissões por perfil (`configuracoes/page.tsx` `buildDefaultPerms`), cálculo financeiro de acerto (`premios/page.tsx` `savePremio`), gating de acerto (`acerto`). Identidade do usuário **hardcoded** ("João Silva / Banca São Jorge") em navbar/configuracoes/perfil/premios, enquanto o `Session` parseado em `(private)/layout.tsx` é descartado (`void toSession(claims)`).
- **Rota raiz `/`**: ainda é o template `create-next-app`, fora do matcher do `proxy.ts`, sem comportamento por sessão/tenant.
- **Tenant por host**: o Web é intencionalmente tenant-agnóstico; o backend resolve `codigoBanca` do `Host`/`X-Forwarded-Host` (`TenantResolverMiddleware`, apenas em `POST /api/auth/login`). Não há endpoint público de contexto de host, e host inválido/desconhecido hoje só se manifesta como erro genérico de login.
- **Órfãos**: `Button`/`Input`/`theme-toggle` de `shared`, barrel de `modules/identity` (a rota `/identity` importa o page por caminho relativo profundo furando o barrel/alias), exports `refresh`/`logout`/`logoutAll`/`changePassword` do `auth.client.ts` (botões "Sair" sem handler), links de sidebar `/caixa` e `/relatorios` sem página.
- **Fronteiras limpas hoje**: nenhum arquivo de `shared/**` importa `modules/**`; nenhum componente global importa módulo. Este é o ponto de partida a preservar.

Constraints herdados dos guias/skills: `apps/web/AGENTS.md` — "This is NOT the Next.js you know", ler `node_modules/next/dist/docs/` antes de codar; usar `src/proxy.ts` (não `middleware.ts`); manter `/api` same-origin e preservar `Host`; validação com `v` de `@bancaflow/shared`, sem Zod; alias único `@/`; `next/jest` não lê `paths` (manter `moduleNameMapper` em sincronia); Tailwind v4 CSS-first (sem `tailwind.config.js`).

## Goals / Non-Goals

**Goals:**
- Produzir um inventário verificável com ownership justificado para cada artefato.
- Definir e aplicar a política `shared` vs. `módulo` vs. `app/**/_components` sem inflar `shared`.
- Consolidar os dois sistemas de estilo em primitives/tokens canônicos, preservando a fidelidade visual aprovada.
- Tornar determinístico `/`, `/login`, `/trocar-senha` e rotas privadas por sessão/tenant.
- Definir comportamento explícito, seguro e não enumerável para host sem tenant válido.
- Estabelecer portões de teste/qualidade (rotas, auth, tenant, reuso, acessibilidade, imports proibidos, órfãos, build verde).

**Non-Goals:**
- Reescrever backend/domínio sem necessidade demonstrada.
- Alterar a identidade visual aprovada.
- Criar abstrações por preferência estética ou mover tudo para `shared`.
- Duplicar regras de negócio no Web ou simular DDD com entidades ricas no React.
- Substituir bibliotecas sem evidência.
- Executar scripts que sobrescrevam o Web existente, ou arquivar a change antes de revisão humana.

## Decisions

### D1. Ownership por reuso real e independência de contexto, não por nome
`shared` recebe apenas primitives/composições independentes de bounded context; código de domínio vai ao módulo; código de fluxo único fica colocado em `app/**/_components`. Promoção só com segundo consumidor real ou intenção de design system justificada. **Alternativa rejeitada**: mover tudo que "parece genérico" para `shared` — inflaria a pasta e criaria acoplamento reverso.

### D2. Consolidar em um único design system, migrando a área privada para primitives compartilhadas
Adotar as primitives Tailwind/`cn`/CVA (hoje órfãs) como canônicas e migrar a área privada, extraindo tokens da paleta `useTheme().c` para variantes/tokens do design system. **Alternativa rejeitada**: promover o sistema `useTheme().c` inline como padrão — perpetua inline styles, dificulta variantes e testes de acessibilidade. **Alternativa rejeitada**: reescrever tudo de uma vez — viola os checkpoints incrementais.

### D3. Migração incremental em 7 fases com build/testes verdes por fase (ver Migration Plan)
Characterization tests primeiro; remover duplicação só após todos os consumidores migrarem. **Alternativa rejeitada**: big-bang.

### D4. Rota `/` determinística resolvida no servidor
Substituir o template por resolução server-side: sem sessão → `/login`; sessão + `mustChangePassword` → `/trocar-senha`; sessão normal → `/dashboard`. Coerente com `proxy.ts` e `(private)/layout.tsx`, sem loop. Usuário autenticado em `/login` também é redirecionado. **Alternativa rejeitada**: landing pública genérica em `/` — não agrega valor no MVP multi-tenant e adia a decisão de tenant.

### D5. Backend permanece autoritativo sobre sessão e tenant; o Next não decide existência de tenant no browser
Manter a resolução de `codigoBanca` no backend a partir do `Host`/`X-Forwarded-Host`. O Web não consulta banco nem confia em `tenantId` do cliente. Ligar a UI ao `Session` real (parar de descartar `toSession`) para eliminar a identidade hardcoded.

### D6. Host sem tenant válido → página genérica não enumerável (recomendada), com dependência de decisão sobre endpoint público
Três opções avaliadas (do prompt):
1. **Encaminhar todo host sintaticamente válido para `/login`** e mostrar erro genérico só após tentativa. Simples, zero backend novo; porém `/` não consegue distinguir tenant inexistente antes do login e a UX de "endereço indisponível" fica pobre.
2. **Consultar contexto público mínimo no backend** e exibir página genérica de endereço indisponível/404. Melhor UX e comportamento determinístico em `/`; exige **novo endpoint público** de contexto por host.
3. **Tratar host inválido/reservado/inexistente/inativo com respostas distintas** — rejeitada por enumeração/vazamento.

**Recomendação**: Opção 2 com resposta **deliberadamente não enumerável** (inexistente e inativo indistinguíveis, sem branding). Isso requer um endpoint público mínimo do backend — ver Open Questions Q1; **não** será inventado silenciosamente. Enquanto a decisão de endpoint não for aprovada, a Opção 1 é o fallback seguro e já compatível com o comportamento atual do backend (fail-closed → erro genérico).

### D7. Boundaries server/client e `page.tsx` fino
Server Component é o default; `use client` só com estado/eventos/browser API. `page.tsx` delega a composições. Remover `use client` desnecessário identificado no inventário.

### D8. Skills como critério, sem execução destrutiva
`config-shared-frontend` é referência de design system/shell/menu único, mas seu script **não** deve ser reaplicado sobre o Web existente sem análise/confirmação (pode recriar arquivos). `import-cloud-design-next` explica origem de telas/assets/esqueletos e exige reuso antes de criação. `frontend-form-schema` é a referência de RHF + schemas `v` + componentes de form compartilhados. `config-new-module` cria apenas scaffold mínimo — não substitui a implementação arquitetural de uma funcionalidade Web. Se existir uma futura skill `frontend-module-workflow`, ela será o critério principal para módulos Web na aplicação.

### D9. Exceção formal e com escopo definido para primitives bespoke remanescentes (decisão pós-revisão, 2026-07-18)

Uma revisão de código encontrou que, apesar da Fase 4 ter consolidado `Button`/`Input`/`Table`/`Dialog`/`Badge` canônicos, os módulos migrados na Fase 6 (`pessoas`, `lancamentos`, `premios`, `configuracoes`, `perfil`, `acerto`) e o shell continuam recriando marcação bespoke em vez de usar essas primitives — violando literalmente `web-design-migration` ("Route stops recreating a primitive"). Levantamento factual (grep, 2026-07-18):

- `<button>`/`<input>`/`<textarea>` brutos (nenhum uso de `<Button>`/`<Input>`/`<Table>`/`<Dialog>`/`<Badge>` compartilhados): `pessoas` (8/3/1), `lancamentos` (15/9/2), `premios` (8/6/1), `configuracoes` (8/9/2), `perfil` (6/8/0), `acerto` (3/4/0); shell (`app-navbar.tsx`/`app-sidebar.tsx`): 2/1 botões.
- Layout de tabela via CSS grid (não `<Table>`) em todos os 6 módulos.
- Widgets bespoke com estado próprio: `acerto` tem `AcertoDrawer`/`DetailDrawer`/`PrintModal` (drawers/modal bespoke, não `Dialog`); `lancamentos`/`acerto`/`premios` têm dropdown de busca de talão/cambista (autocomplete bespoke); `lancamentos` tem input de máscara de dinheiro com captura de teclado customizada (`cashKey`/`parsePaste`).

**Decisão**: aceitar formalmente esse estado como exceção de escopo desta change, em vez de reabrir um esforço de reescrita completo agora. Razão: reescrever esses widgets arrisca regressão visual real sem qualquer tooling de comparação visual automatizada no projeto (não há Playwright/Cypress com snapshot visual, nem Chromatic/Percy — ver D2/risco already registrado). A extração de composição/lógica de domínio para `modules/<domain>` (o objetivo primário da Fase 6, que FOI cumprido) tem prioridade sobre a convergência total de primitives.

**Escopo da exceção**: os 6 módulos listados acima e o shell PODEM manter marcação bespoke (botões/inputs/tabelas/drawers/dropdowns simples ou complexos) desde que:
1. Ícones e helpers genuinamente duplicados (mesmo nome, mesmo shape) continuem sendo consolidados quando encontrados (já feito na Fase 9 — ex.: `IcoUsers`/`IconUsers` em `configuracoes`).
2. Novas telas ou novos componentes escritos DAQUI EM DIANTE (fora desta change) usem as primitives canônicas — a exceção cobre só o que já existe, não autoriza recriar bespoke em código novo.
3. Um follow-up (change futura, ex.: `migrate-legacy-pages-to-design-system`) trate a conversão completa quando houver tooling de regressão visual disponível, ou quando o time aceitar o risco de regressão manual controlada tela por tela.

**Alternativa rejeitada**: converter tudo agora — alto esforço, alto risco de regressão silenciosa (sem tooling para detectar), e escopo desproporcional para uma change cujo objetivo primário já foi entregue (extração de domínio para módulos).

## Risks / Trade-offs

- [Migrar a área privada para o design system pode desviar do visual aprovado] → Characterization tests + checklist visual por viewport antes/depois; extrair tokens da paleta atual em vez de reinventar cores.
- [Páginas gigantes (`lancamentos` ~1768 linhas) dificultam refactor seguro] → Migrar uma rota por vez, começando por primitives isoladas; nunca alterar barrels/layout/navegação concorrentemente.
- [Remover órfãos pode apagar código que será usado em breve (ex.: `logout`, `Button`)] → Remover só na fase 6, após confirmar ausência de consumidor e após fiar a UI ao `Session`/logout real, se essa fiação for planejada.
- [Endpoint público de contexto por host pode permitir enumeração de tenants] → Resposta não enumerável, rate limiting/cache e contrato mínimo; decisão explícita antes de implementar.
- [Reexecutar `config-shared-frontend` sobrescreveria arquivos] → Proibido nesta change; usar apenas como referência.
- [`next/jest` não lê `paths`] → Manter `moduleNameMapper` em sincronia com o alias `@/` ao mover arquivos.
- [Ligar UI ao `Session` real muda o que a tela exibe] → Tratado como correção deliberada (identidade hardcoded é bug), coberto por teste.

## Migration Plan

Fases (cada uma mantém `lint`/`check-types`/`test`/`build` verdes):
1. **Inventário e characterization tests** — congelar comportamento atual (rotas, auth, telas por viewport). Sem movimentação.
2. **Consolidar primitives compartilhadas** — adotar `Button`/`Input` canônicos; criar dialog/table/badge/toggle compartilhados a partir do que hoje é bespoke; unificar ícones/helpers.
3. **Componentes compostos realmente globais** — shell/branding/feedback genéricos; um único `AdminShell`/navegação.
4. **Organização por módulo e por rota** — mover código de domínio para `modules/<domain>`, fluxo único para `_components`; `page.tsx` fino.
5. **Rotas e autenticação** — `/` determinístico; usuário autenticado em `/login`; ligar UI ao `Session`; remover identidade hardcoded.
6. **Host sem tenant** — implementar Opção 1 (fallback) ou Opção 2 conforme Q1; página genérica não enumerável.
7. **Limpeza de duplicações/órfãos + validação final** — remover duplicatas após consumidores migrarem; validação visual/funcional/arquitetural.

Rollback: cada fase é um checkpoint independente; reverter a fase mantém as anteriores verdes. Escopos de escrita disjuntos (auditoria, shared, módulos, rotas) podem usar subagentes separados, com integração pelo agente principal; **nunca** alterar concorrentemente barrels, layouts ou arquivos de navegação.

## Open Questions (resolvidas em 2026-07-17)

- **Q1 — RESOLVIDA: Opção 2.** Adotar endpoint público mínimo de contexto por host + página genérica não enumerável. Contrato mínimo (entrada: `Host`; saída: apenas existência/atividade de forma indistinguível), com rate limiting/cache e análise de enumeração. A alteração de backend entra no escopo desta change.
- **Q2 — RESOLVIDA: Sim, nesta change.** Ligar a UI ao `Session` real, remover a identidade hardcoded e fiar `logout`/`logoutAll`. Isso libera a remoção dos exports órfãos de `auth.client.ts` na fase 9.
- **Q3 — RESOLVIDA: Remover do menu.** `/caixa` e `/relatorios` saem do `MENU`; o menu passa a listar só rotas existentes.
- **Q4 — RESOLVIDA: Não existe `frontend-module-workflow`.** Usar as skills atuais (`config-shared-frontend`, `import-cloud-design-next`, `frontend-form-schema`, `config-new-module`) como critério na reorganização por módulo.
