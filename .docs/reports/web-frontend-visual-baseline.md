# Checklist visual por viewport — baseline pré-migração (tarefa 3.3)

Baseline registrado por leitura de código (grep de classes responsivas Tailwind
`sm:`/`md:`/`lg:`/`xl:` e de lógica JS de responsividade — `matchMedia`,
`innerWidth`, `@media`) em 2026-07-17, antes de qualquer migração de design
system (Fase 4) ou de módulo (Fase 6). Não há Playwright/screenshot automatizado
neste projeto; este documento é o baseline funcional/estrutural a ser conferido
manualmente (ou por captura de tela ad hoc) na tarefa 10.5, comparando o
comportamento pós-migração contra o que está descrito aqui.

**Achado importante (não óbvio): a área privada hoje não é responsiva.**
`(private)/_shell/app-frame.tsx` usa `marginLeft: 70`/`paddingTop: 54` fixos em
pixel, sem media query nem colapso de sidebar em telas estreitas. Nenhuma das 8
páginas privadas (`dashboard`, `lancamentos`, `premios`, `pessoas`, `cambistas`,
`configuracoes`, `perfil`, `acerto`) usa breakpoint Tailwind ou lógica JS de
adaptação por viewport — os únicos usos de `window.innerWidth` encontrados
(`pessoas/page.tsx:160-161`, `configuracoes/page.tsx:223-224`) são para
redimensionamento manual (arraste) da largura de um drawer, não para layout
responsivo. **A migração (Fases 4-6) NÃO deve inventar um novo comportamento
mobile/tablet que não existia** — o requisito de "preservar responsividade" (spec
`web-design-migration`) se aplica ao que existe hoje: um layout fixo, otimizado
para desktop, que deve continuar renderizando igual em mobile/tablet (mesmo que
sub-ótimo), sem quebrar.

## Shell (`(private)/_shell/**`)
- **Desktop (≥1024px):** navbar fixa no topo (54px), sidebar fixa à esquerda
  (70px), conteúdo com `margin-left: 70px` e `padding-top: 54px`, sem scroll
  horizontal. Comportamento de referência.
- **Tablet (768–1023px):** idêntico ao desktop (nenhuma regra diferente) — sem
  colapso de sidebar; conteúdo pode ficar apertado, mas isso é o baseline atual.
- **Mobile (<768px):** idêntico (fixed layout) — sem menu hambúrguer, sem
  sidebar retrátil por toque. Este é o comportamento atual a preservar
  (não a "consertar" como parte desta migração, salvo decisão explícita futura).

## Telas de autenticação (`app/login`, `app/trocar-senha`) — único ponto com breakpoint real
- `login-layout.tsx`: painel de ilustração (`auth-illustration.tsx`) usa
  `lg:flex`/`lg:w-[58%]`; formulário usa `lg:w-[42%]`.
  - **Desktop (≥1024px, `lg`):** dois painéis lado a lado — ilustração à
    esquerda (58%), formulário à direita (42%).
  - **Tablet/Mobile (<1024px):** ilustração oculta (`lg:flex` não ativo abaixo de
    `lg`); formulário ocupa a largura total.
  - `trocar-senha` reutiliza o mesmo `login-layout`/estrutura — mesmo
    comportamento de breakpoint.

## Páginas privadas — comportamento de referência (desktop, fixo)
Para cada uma, o baseline é: layout fixo (sem breakpoint), tabela via CSS grid
com larguras de coluna fixas em `px`/`%` definidas inline por arquivo, drawer/
modal sobreposto com `position: fixed`, paleta de cores por `useTheme().c`
(dark/light).
- `dashboard/page.tsx` — cards de métricas + grid, sem breakpoint.
- `lancamentos/page.tsx` (maior arquivo, 1768 linhas) — tabela CSS grid com
  colunas fixas, filtros no topo, sem breakpoint.
- `premios/page.tsx` — tabela + drawer de acerto, sem breakpoint.
- `pessoas/page.tsx` — tabela + drawer redimensionável por arraste
  (`window.innerWidth`-based, não é breakpoint).
- `cambistas/page.tsx` — tabela simples, sem breakpoint.
- `configuracoes/page.tsx` — matriz de permissões + drawer redimensionável
  (mesma lógica de arraste de `pessoas`).
- `perfil/page.tsx` — formulário read-only com `defaultValue`s fixos, sem
  breakpoint.
- `acerto/page.tsx` + `_components/{AcertoDrawer,DetailDrawer,PrintModal}` —
  drawers/modal sobrepostos, sem breakpoint.

## Acessibilidade — baseline mínimo já presente (a preservar)
- Formulários de auth (`login-form.tsx`, `change-password-form.tsx`) já usam
  `label`/`htmlFor`, `aria-invalid`, `aria-describedby`, `role="alert"` e
  `aria-live="assertive"` nos erros — este é o padrão a replicar ao migrar
  formulários das páginas privadas para as primitives compartilhadas.
- Páginas privadas (tabelas/drawers bespoke) não foram auditadas para
  `role`/foco/contraste nesta auditoria inicial — a Fase 4/10 deve cobrir isso
  ao introduzir as primitives `Table`/`Dialog` compartilhadas (que devem nascer
  acessíveis por padrão), em vez de tentar auditar cada implementação bespoke
  que será substituída.

## Como usar este documento na tarefa 10.5
Após cada migração de módulo (Fase 6), comparar manualmente (visual + DOM) a
tela migrada contra a descrição acima: mesma disposição em desktop, mesma
ausência de quebra em tablet/mobile (sem overflow horizontal novo, sem
elementos cortados que não estivessem cortados antes), mesmo comportamento de
breakpoint `lg` nas telas de auth.
