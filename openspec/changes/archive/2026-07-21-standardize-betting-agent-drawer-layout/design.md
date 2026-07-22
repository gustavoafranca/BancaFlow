## Context

O módulo `/cambistas` foi entregue no INC-02 (`enable-betting-agent-management`) com um drawer único (create/view/edit) já migrado para Tailwind, mas com dívidas de UI:

- **Drawer:** as abas Cadastro/Endereço/Contato vivem **dentro** do `DrawerBody` (rolável), e o controle de Status (`SelectionButtonGroup`) foi colocado **acima** das abas, flutuando entre header e conteúdo — divergindo dos drawers de Prêmios (abas no topo do header) e de Pessoas (Status dentro da aba de dados). No modo view os dados usam `ReadOnlyField` empilhados/concatenados (endereço em linha única, telefones unidos por vírgula).
- **Página:** `cambistas.page.tsx` inteira ainda usa `useTheme()` + `style` inline (header, stats grid, `StatCard`, search bar, `Pagination`, linhas da tabela, `StateMessage`, ícones SVG locais), coexistindo com o drawer já em Tailwind.
- **Defeitos de dados nos stat cards:** Ativos/Inativos contam só `state.page.data` (página atual) enquanto `total` é global; o card "Talões" repete o valor de "Total".

Restrições fortes: **Web apenas** (`apps/web`); sem tocar backend, DTO, endpoint, schema, permissões ou regra de domínio; sem nova rota/menu/lib/migration. Esta versão do Next.js tem breaking changes — consultar `node_modules/next/dist/docs/` antes de escrever código de rota/componente. Referências de layout: drawer de Prêmios (`premios.page.tsx` ~L794–L900) e estrutura de Pessoas (`pessoas.page.tsx`). Precedência de estilo: `.docs/prompts/21-frontend-ui-standards.md` + tokens semânticos.

## Goals / Non-Goals

**Goals:**
- Padronizar o drawer de Cambista: abas no topo do painel (fora do rolável), acima do Status; Status dentro da aba Cadastro (padrão Pessoas).
- Enriquecer o modo view com field cards em grid (padrão Prêmios), traduzido para Tailwind + tokens.
- Migrar `cambistas.page.tsx` inteira para Tailwind + tokens semânticos e primitives compartilhadas, eliminando `useTheme()`/`style` inline do módulo.
- Corrigir consistência do Badge "Inativo" (lista vs drawer) e os defeitos dos stat cards.
- Manter todo o comportamento funcional e o gating de permissões; testes/lint/build verdes.

**Non-Goals:**
- Qualquer mudança de backend, DTO, endpoint, schema, permissões ou regra de domínio.
- Tornar a Política editável (INC-03), alterar `code`, mexer no fluxo de duplicidade/`DuplicateAlert`.
- Introduzir nova biblioteca de UI/ícones; reescrever Prêmios/Pessoas (são referência visual, não fonte de markup).
- Migrar outros módulos para Tailwind.

## Decisions

### D1 — Status dentro da aba Cadastro (padrão Pessoas)
Adotar o padrão de Pessoas: o `SelectionButtonGroup` de Status vive **dentro da aba Cadastro, no topo dela**, com as abas no topo do painel. Alternativa considerada: padrão Prêmios (Status no header, acima das abas). Escolha por Pessoas porque o Status do Cambista é parte do fluxo de dados cadastrais e o Cambista não tem um "valor de destaque" no header como o prêmio tem. Gating por `canUpdate` (`participants.betting-agents.update`) mantido: sem permissão, a seção de Status não renderiza.

### D2 — Abas fora do `DrawerBody`
Mover o `TabsList` para fora da área rolável, logo abaixo do header do `DrawerContent`, mantendo o corpo (`TabsContent`) rolável. Respeitar o contrato das primitives `drawer.tsx` e `tabs.tsx` sem alterá-las (mudança confinada ao módulo). Como `Tabs` (Radix) exige que `TabsList` e `TabsContent` compartilhem o mesmo provider, o `Tabs` raiz envolve header-slot + corpo; se o `DrawerContent` não expuser slot de header customizado, posicionar as abas como primeiro bloco não-rolável dentro do container do drawer, acima do `DrawerBody`.

### D3 — `<FieldCard label value />` local reutilizável
Extrair um subcomponente de apresentação `FieldCard` (rótulo + valor, Tailwind + tokens) usado no modo view em grid `grid-cols-2` (Cadastro/Endereço) e como item de lista (Contato). Substitui `ReadOnlyField`. Endereço deixa de ser concatenado: Logradouro/Número e Bairro/Cidade como cartões separados; telefones formatados com a máscara BR (reusar util de formatação já usada pelo `PhoneInput`/`PhoneField`). Estados vazios ("sem endereço"/"sem telefone") como cartão discreto. Modos add/edit mantêm `Field`/`PhoneListEditor`/`PhoneInput` intactos.

### D4 — Migração Tailwind da página
Reescrever `cambistas.page.tsx`, `StatCard`, `Pagination`, `StateMessage` e ícones locais em Tailwind + tokens (`bg-card`, `border`, `text-muted-foreground`, `destructive`), sem ramificar tema em JS. Reusar `Badge`/`Button`/`Input`/`Table` de `@/shared/components/ui` e trocar SVGs bespoke por ícones de `@/shared/components/icons` quando houver equivalente; se um ícone não existir no set compartilhado, manter um SVG local mínimo mas estilizado por classe/token (sem `style` inline). Verificar se existe primitive `Pagination` compartilhada antes de manter a local.

### D5 — Badge "Inativo" consistente
Alinhar a variant do Badge de status entre lista e drawer. Hoje a lista usa `neutral` e o drawer usa `danger`. Padronizar para a variant do drawer (`danger`) na lista também, mantendo `success` para Ativo — cor de estado única entre os dois contextos.

### D6 — Stat cards
(a) Ativos/Inativos: como agregados globais exigiriam mudança de API (fora de escopo), rotular explicitamente o escopo "nesta página" para Ativos/Inativos, mantendo "Total" global; registrar follow-up para agregados no backend. (b) Remover o card "Talões" (duplicata de "Total"); não inventar métrica sem dado disponível. Decisão registrada na saída da change.

## Risks / Trade-offs

- **Reposicionar abas fora do `DrawerBody` pode conflitar com o layout do `DrawerContent`** → confinar a mudança ao módulo, sem alterar a primitive; validar rolagem e foco por teclado entre abas após a mudança.
- **Regressão visual na migração da página** → migrar mapeando cada valor do tema para o token equivalente; comparar claro/escuro; cobrir por `cambistas.page.spec.tsx`.
- **Máscara BR de telefone divergente do input** → reusar a mesma util de formatação usada por `PhoneInput`/`PhoneField` para garantir paridade.
- **Stat cards "nesta página" podem confundir** → rótulo explícito de escopo evita números inconsistentes silenciosos; follow-up documentado para agregados globais.
- **Ícone compartilhado ausente** → fallback é SVG local estilizado por token (sem `style` inline), preservando a regra da migração.
