# Prompt — Padronizar drawer de Cambista e migrar o módulo para Tailwind

> Ajuste **exclusivamente Web** (`apps/web`), de **layout/UX + padronização de estilo**. Backend, contratos de API, schema, regras de negócio e permissões **não mudam**. Não criar rota, menu, endpoint nem migration.

## Missão

Fechar a dívida de UI da change `enable-betting-agent-management` (INC-02) no módulo `/cambistas`, em duas frentes complementares:

1. **Padronizar o drawer** de Cambista para ficar consistente com o padrão de abas do drawer de Prêmios e melhorar a **visualização dos dados no modo view** (field cards, como em Prêmios).
2. **Migração Tailwind como padrão:** **tudo o que for feito/tocado neste módulo DEVE usar Tailwind + tokens semânticos** — nada de `style` inline nem `useTheme`. O drawer já foi migrado; a página `cambistas.page.tsx` **ainda não** e deve ser migrada nesta passada, estabelecendo Tailwind como o padrão único do módulo (sem dois padrões visuais convivendo).

É polimento sobre o INC-02 já implementado — não reabrir decisões de produto do INC-02.

## Fontes e precedência (ler antes de codar)

1. instruções do repositório e `apps/web/AGENTS.md` (esta versão do Next.js tem breaking changes — ler os guias em `node_modules/next/dist/docs/` antes de escrever código de rota/componente);
2. `.docs/prompts/21-frontend-ui-standards.md` — padrões visuais e o Drawer compartilhado canônico;
3. `.docs/prompts/22-enable-betting-agent-management.md` — a change que originou o drawer atual (não reabrir escopo);
4. **Referência de layout-alvo:** o drawer de Prêmios em `apps/web/src/modules/premios/pages/premios.page.tsx` (bloco do drawer ~L794–L900): header com destaque + **abas Dados/Validação/Histórico no topo do header** (fora da área rolável), seguido do corpo rolável com **field cards** em grid `1fr 1fr`;
5. **Referência estrutural de modos add/view/edit + abas:** `apps/web/src/modules/pessoas/pages/pessoas.page.tsx` (abas no topo via `TabsList` fora do `DrawerBody`; Status vive **dentro** da aba de dados);
6. primitives compartilhadas: `apps/web/src/shared/components/ui/drawer.tsx` e `apps/web/src/shared/components/ui/tabs.tsx` (respeitar os contratos existentes).

Em divergência de estilo, seguir `21-frontend-ui-standards.md` e os tokens semânticos Tailwind (`muted-foreground`, `border`, `destructive` etc.), **sem** reintroduzir `style`+`useTheme` inline.

## Estado atual (a corrigir)

Arquivo: `apps/web/src/modules/cambistas/components/betting-agent-drawer.tsx`.

- As abas **Cadastro / Endereço / Contato** (`Tabs`) estão **dentro do `DrawerBody`** (área rolável), diferente de Prêmios/Pessoas, onde as abas ficam **no topo do painel/header**.
- No modo view/edit (`AgentDetail`), a seção **Status** (`SelectionButtonGroup` Ativo/Inativo) foi posicionada **acima das abas**, flutuando fora delas — inconsistente com Prêmios (abas no topo) e com Pessoas (Status dentro da aba de dados).
- No modo view, a "visualização dos dados" usa `ReadOnlyField` empilhados e concatenados (ex.: Endereço numa única linha juntando rua/número/bairro/cidade; Telefones unidos por vírgula) — funcional, mas pobre visualmente comparado ao grid de field cards de Prêmios.
- A página `apps/web/src/modules/cambistas/pages/cambistas.page.tsx` **inteira ainda usa `useTheme()`+`style` inline** (header, grid de stats, `StatCard`, search bar, `Pagination`, linhas da tabela, `StateMessage`, ícones SVG locais) — só o drawer foi migrado para Tailwind na INC-02, deixando dois padrões visuais convivendo no mesmo módulo.

## Objetivo do ajuste

### 1. Abas acima do Status, no topo do painel (padrão Prêmios)

- Mover o `TabsList` (Cadastro / Endereço / Contato) para o **topo do painel do drawer**, **acima do campo/seção de Status**, seguindo o posicionamento do drawer de Prêmios (abas logo abaixo do header de identificação, fora da área de conteúdo rolável). As abas devem ficar **acima de Status** tanto no modo add quanto no view/edit.
- Reconciliar a posição do controle de **Status** (ativar/inativar): escolher explicitamente **um** dos dois padrões de referência e aplicar de forma consistente — preferir o de **Pessoas** (Status **dentro da aba Cadastro**, no topo dela) por ser o mais próximo do fluxo de dados do Cambista; se optar pelo de Prêmios (Status no header, acima das abas), justificar. Em nenhum caso o Status deve continuar flutuando entre o header e as abas como hoje. Manter o gating por `participants.betting-agents.update` (`canUpdate`) exatamente como está.
- Preservar todo o comportamento atual: modos add/view/edit, `DrawerFooter` (`mode`/`onEdit`/`onSave`), navegação por teclado entre abas, `PhoneInput`, `DuplicateAlert`, banners de erro, e o reflexo imediato de status no Badge da linha e nos cards de estatística.

### 2. Visualização de dados (modo view) mais rica, no padrão Prêmios

- No **modo view**, substituir os `ReadOnlyField` empilhados por um layout de **field cards em grid** (referência: `premios.page.tsx`, aba Dados — `gridTemplateColumns: '1fr 1fr'` com cartões rótulo+valor), traduzido para **Tailwind + tokens semânticos** (nada de `style` inline).
  - **Cadastro:** Código/Talão, Nome, Apelido, Política (rótulo legível da política, não editável) como cartões.
  - **Endereço:** exibir os campos de forma legível (ex.: Logradouro/Número e Bairro/Cidade como cartões separados ou uma composição clara), em vez de uma única linha concatenada; tratar o estado **sem endereço** com um vazio explícito e discreto.
  - **Contato:** listar cada telefone como um item legível (número **formatado** com máscara BR + rótulo quando houver), em vez de unir tudo por vírgula.
- O **modo edit** e o **modo add** mantêm os inputs atuais (`Field`, `PhoneListEditor`, `PhoneInput`); a melhoria visual é do **view**. Se compensar, extrair um subcomponente de apresentação (ex.: `<FieldCard label value />`) reutilizável dentro do drawer.

### 3. Migração Tailwind do módulo (padrão obrigatório)

Regra: **todo elemento de UI tocado ou criado nesta change usa Tailwind + tokens semânticos**; `style={{...}}` inline e `useTheme()` são proibidos no código novo/alterado deste módulo. Como a página `cambistas.page.tsx` inteira ainda está em `useTheme()`+inline (header, grid de stats, `StatCard`, search bar, `Pagination`, linhas da tabela, `StateMessage`, ícones SVG locais), migrá-la nesta passada para alinhar ao drawer já convertido:

- Substituir `useTheme()`+`style` por classes Tailwind e tokens semânticos (`bg-card`, `text-muted-foreground`, `border`, `destructive` etc.), suportando tema claro/escuro pelos tokens (não por ramificação em JS).
- Reusar as primitives compartilhadas existentes (`Badge`, `Button`, inputs, `Pagination` se houver em `shared/components/ui`) em vez de reimplementar; preferir ícones de `@/shared/components/icons` a SVGs bespoke recriados na página.
- Garantir **paridade visual** (sem regressão) e consistência de cores de estado entre lista e drawer (ex.: variant do Badge "Inativo" igual nos dois — hoje diverge: `neutral` na lista vs `danger` no drawer).
- Aproveitar a migração para corrigir dois defeitos de dados dos cards de estatística (ambos na página): (a) **Ativos/Inativos** hoje contam só a página atual (`state.page.data`), enquanto `total` é global → ao paginar os números ficam inconsistentes; decidir e aplicar um comportamento correto (idealmente agregados do backend; se indisponível sem tocar backend, rotular claramente o escopo "nesta página"); (b) o card **"Talões" é idêntico a "Total"** (mesmo valor) — remover a redundância ou dar-lhe um significado real. Registrar a decisão tomada.

## Fora de escopo (obrigatório)

- Qualquer mudança de backend, DTO, endpoint, schema Prisma, permissões ou regra de domínio.
- Tornar a Política editável (permanece INC-03), alterar `code`, ou mexer no fluxo de duplicidade/`DuplicateAlert`.
- Introduzir biblioteca de UI/ícones nova; portar `style`+`useTheme` inline de Prêmios/Pessoas como está (Prêmios é referência **visual**, não fonte de markup — a migração Tailwind vale para o módulo Cambistas, não para reescrever Prêmios/Pessoas nesta change).
- Migrar módulos além de `cambistas` para Tailwind (Prêmios, Pessoas, Acerto etc. seguem em changes próprias); aqui o padrão Tailwind se aplica ao que for tocado neste módulo.
- Alterar contratos de backend/DTO só para resolver os cards de estatística: se agregados globais exigirem mudança de API, apenas registrar como follow-up e aplicar a solução Web possível (rótulo de escopo), sem tocar backend.

## Critérios de aceitação

- As abas Cadastro/Endereço/Contato aparecem **no topo do painel, acima do Status**, em add/view/edit, visualmente coerentes com o drawer de Prêmios.
- O controle de Status tem posição única e consistente (padrão Pessoas ou Prêmios, decidido e justificado), sem flutuar entre header e abas.
- No modo view, os dados aparecem em field cards/grid legível (Cadastro, Endereço e Contato), telefones formatados com máscara BR, endereço não concatenado numa linha só, estado "sem endereço/sem telefone" tratado explicitamente.
- **Zero `style` inline e zero `useTheme` no código tocado do módulo** (drawer **e** `cambistas.page.tsx`): apenas Tailwind + tokens semânticos e as primitives compartilhadas. Um grep por `useTheme`/`style={{` no módulo `cambistas` após a change não retorna ocorrências em código produtivo.
- Paridade visual da página migrada (sem regressão) e cores de estado consistentes entre lista e drawer (Badge "Inativo" igual nos dois).
- Cards de estatística corrigidos: Ativos/Inativos coerentes ao paginar (ou rotulados por escopo), e sem card duplicado "Talões"="Total"; decisão registrada.
- Sem regressão funcional: modos add/view/edit, salvar edição, ativar/inativar refletindo no Badge da linha e nos cards de estatística, navegação por teclado nas abas, gating por permissão (`create`/`update`), estados loading/erro/vazio.
- Atualizar/estender os testes Web (`betting-agent-drawer` / `cambistas.page.spec.tsx`) para a nova estrutura de abas/Status, a visualização de view e a página migrada; lint, testes e build do workspace `apps/web` verdes.

## Saída solicitada

Implementar no módulo `apps/web/src/modules/cambistas` — o drawer (`components/betting-agent-drawer.tsx`) e a página (`pages/cambistas.page.tsx`), além de subcomponentes de apresentação locais se justificado. Ao final, rodar lint/test/build do `apps/web`, listar os arquivos alterados, e resumir: (1) a decisão de posicionamento do Status, (2) a decisão sobre os cards de estatística, e (3) o resultado do grep confirmando ausência de `style` inline/`useTheme` no módulo. Não marcar como concluído sem os gates verdes.
