## Why

O módulo `/cambistas` (INC-02, change `enable-betting-agent-management`) ficou com dívida de UI: o drawer de Cambista diverge do padrão de abas dos drawers de Prêmios e Pessoas, a visualização de dados no modo view é pobre (campos empilhados/concatenados), e só o drawer foi migrado para Tailwind — a página `cambistas.page.tsx` ainda usa `useTheme()` + `style` inline, deixando dois padrões visuais no mesmo módulo. É polimento de UI/UX sobre o INC-02 já implementado, sem reabrir decisões de produto.

## What Changes

- **Drawer — abas no topo do painel:** mover o `TabsList` (Cadastro / Endereço / Contato) para fora da área rolável (`DrawerBody`), logo abaixo do header de identificação, seguindo o drawer de Prêmios; as abas ficam **acima** do controle de Status em add/view/edit.
- **Drawer — reconciliar Status:** posicionar o controle Ativo/Inativo (`SelectionButtonGroup`) de forma única e consistente, adotando o padrão de Pessoas (Status **dentro da aba Cadastro**, no topo dela). Elimina o Status flutuando entre header e abas. Gating por `participants.betting-agents.update` preservado.
- **Drawer — view mais rica:** no modo view, substituir `ReadOnlyField` empilhados/concatenados por **field cards em grid** (padrão Prêmios) em Tailwind: Cadastro (Código, Nome, Apelido, Política legível), Endereço legível não concatenado com estado "sem endereço" explícito, e Contato listando cada telefone com máscara BR + rótulo, com estado "sem telefone" explícito.
- **Migração Tailwind da página:** substituir todo `useTheme()` + `style` inline de `cambistas.page.tsx` (header, grid de stats, `StatCard`, search bar, `Pagination`, linhas da tabela, `StateMessage`, ícones SVG locais) por classes Tailwind + tokens semânticos e primitives compartilhadas.
- **Consistência de estado:** alinhar a variant do Badge "Inativo" entre lista e drawer (hoje `neutral` na lista vs `danger` no drawer).
- **Correção dos cards de estatística:** (a) Ativos/Inativos que hoje contam só a página atual (`state.page.data`) enquanto `total` é global — aplicar comportamento correto/coerente ao paginar (ou rotular escopo "nesta página" sem tocar backend); (b) remover a redundância do card "Talões" idêntico a "Total". Decisões registradas.
- Sem mudança de backend, DTO, endpoint, schema, permissões ou regra de domínio; sem nova rota, menu, biblioteca de UI ou migration.

## Capabilities

### New Capabilities
<!-- Nenhuma capability nova. -->

### Modified Capabilities
- `betting-agent-catalog`: refina os requisitos observáveis de apresentação do drawer e da listagem de Cambista — posicionamento de abas/Status, visualização em field cards no modo view (endereço/telefones legíveis e estados vazios explícitos), consistência de Badge de status entre lista e detalhe, e coerência/escopo dos cards de estatística ao paginar (sem alterar contrato de backend).
- `web-design-migration`: estende a invariante de consolidação de estilo ao módulo `cambistas`, exigindo que todo código tocado/criado use Tailwind + tokens semânticos, sem `useTheme()`/`style` inline, com paridade visual preservada.

## Impact

- **Código (Web apenas):**
  - `apps/web/src/modules/cambistas/components/betting-agent-drawer.tsx` — reestrutura abas/Status e view em field cards; possível subcomponente `<FieldCard label value />`.
  - `apps/web/src/modules/cambistas/pages/cambistas.page.tsx` — migração completa para Tailwind + tokens; reuso de primitives (`Badge`, `Button`, `Pagination`, ícones de `@/shared/components/icons`); correção dos stat cards.
- **Testes:** atualizar/estender `betting-agent-drawer` e `cambistas.page.spec.tsx` para a nova estrutura de abas/Status, view em field cards e página migrada.
- **Gates:** lint, testes e build do workspace `apps/web` verdes.
- **Sem impacto:** backend, contratos de API, schema Prisma, permissões, regras de domínio, rotas/menu. Agregados globais para stat cards, se exigirem API, ficam como follow-up.
