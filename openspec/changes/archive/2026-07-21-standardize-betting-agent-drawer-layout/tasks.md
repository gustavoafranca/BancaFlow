## 1. Preparação e referências

- [x] 1.1 Reler `apps/web/AGENTS.md` e os guias em `node_modules/next/dist/docs/` relevantes a rota/componente antes de editar código
- [x] 1.2 Revisar referências de layout: drawer de Prêmios (`premios.page.tsx` ~L794–L900) e estrutura de abas/Status de Pessoas (`pessoas.page.tsx`); e os contratos de `shared/components/ui/drawer.tsx` e `tabs.tsx`
- [x] 1.3 Confirmar util de formatação de telefone BR reutilizável (usada por `PhoneInput`/`PhoneField`) e existência de primitive `Pagination`/ícones equivalentes em `@/shared/components/ui` e `@/shared/components/icons`

## 2. Drawer — abas e Status (padrão Pessoas/Prêmios)

- [x] 2.1 Mover o `TabsList` (Cadastro/Endereço/Contato) para o topo do painel do drawer, fora do `DrawerBody` rolável, mantendo `TabsContent` no corpo (D2), nos modos add/view/edit
- [x] 2.2 Reposicionar o controle de Status (`SelectionButtonGroup`) para dentro da aba Cadastro, no topo dela (padrão Pessoas, D1); remover o Status flutuando entre header e abas
- [x] 2.3 Preservar o gating por `participants.betting-agents.update` (`canUpdate`) — sem permissão, a seção de Status não renderiza
- [x] 2.4 Validar navegação por teclado entre abas e o reflexo imediato do Status no Badge da linha e nos stat cards

## 3. Drawer — view em field cards (Tailwind)

- [x] 3.1 Criar subcomponente local `<FieldCard label value />` (rótulo+valor) em Tailwind + tokens semânticos (D3), substituindo `ReadOnlyField`
- [x] 3.2 Aba Cadastro (view): Código/Talão, Nome, Apelido, Política (rótulo legível, não editável) em grid `grid-cols-2` de field cards
- [x] 3.3 Aba Endereço (view): apresentar Logradouro/Número e Bairro/Cidade de forma legível não concatenada; estado "sem endereço" com vazio explícito e discreto
- [x] 3.4 Aba Contato (view): listar cada telefone individualmente com máscara BR + rótulo quando houver; estado "sem telefone" com vazio explícito
- [x] 3.5 Manter inputs de add/edit (`Field`, `PhoneListEditor`, `PhoneInput`) inalterados; garantir zero `style` inline/`useTheme` no drawer

## 4. Página `cambistas.page.tsx` — migração Tailwind

- [x] 4.1 Substituir `useTheme()`+`style` inline do header/descrição e do botão "Adicionar Cambista" por Tailwind + tokens (D4)
- [x] 4.2 Migrar grid de stats, `StatCard`, search bar, `StateMessage` e linhas da tabela para Tailwind + tokens, reusando primitives compartilhadas
- [x] 4.3 Migrar `Pagination` (usar primitive compartilhada se existir; senão manter local em Tailwind) — nenhuma primitive compartilhada de paginação existe no repo; mantida local em Tailwind
- [x] 4.4 Substituir ícones SVG bespoke por `@/shared/components/icons` quando houver equivalente; fallback de SVG local estilizado por token (sem `style` inline) — `IconCheck`/`IconX` substituem os SVGs locais de Ativo/Inativo
- [x] 4.5 Alinhar variant do Badge "Inativo" na lista ao drawer (`danger`), mantendo `success` para Ativo (D5)

## 5. Correção dos stat cards

- [x] 5.1 Rotular Ativos/Inativos com escopo "nesta página" (agregados globais como follow-up de backend, fora de escopo) mantendo "Total" global (D6a)
- [x] 5.2 Remover o card redundante "Talões" (idêntico a "Total") (D6b)
- [x] 5.3 Registrar as decisões dos stat cards na saída da change

## 6. Testes e gates

- [x] 6.1 Atualizar/estender `betting-agent-drawer` (estrutura de abas/Status e view em field cards, telefones formatados, estados vazios) — coberto via `cambistas.page.spec.tsx` (único spec do módulo, já cobria o drawer via integração)
- [x] 6.2 Atualizar/estender `cambistas.page.spec.tsx` (página migrada, Badge consistente, stat cards corrigidos) — 7 testes novos adicionados (20 no total, todos verdes)
- [x] 6.3 Rodar grep por `useTheme`/`style={{` no módulo `cambistas` e confirmar zero ocorrências em código produtivo
- [x] 6.4 Rodar lint, testes e build do workspace `apps/web` e confirmar verdes
- [x] 6.5 Listar arquivos alterados e resumir: (1) decisão de posicionamento do Status, (2) decisão dos stat cards, (3) resultado do grep
