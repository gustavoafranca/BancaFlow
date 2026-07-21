# Component Ownership

Árvore de decisão para onde um componente deve viver: `shared`, `modules/<domain>`, ou `app/**/_components`.

## Árvore de decisão

```
O componente é usado por MAIS DE UM módulo com o MESMO SIGNIFICADO?
│
├── NÃO → é exclusivo de um fluxo/página específica, sem necessidade de reuso?
│         ├── SIM → app/**/_components (local à rota)
│         └── NÃO → modules/<domain>/components (linguagem do módulo)
│
└── SIM → o significado compartilhado é genérico (não amarrado a um domínio)?
          ├── NÃO (parecido na forma, mas semântica diferente por módulo) →
          │     manter em cada modules/<domain>, aceitar duplicação pequena
          └── SIM (primitive, composição genérica, shell, feedback genérico,
                API pública estável do design system) →
                shared/components
```

## Promoção para `shared` — quando é correto

Promover para `apps/web/src/shared/components` quando o componente for:

- **Primitive de design system**: `Button`, `Input`, `Badge`, `Dialog`, `Table` genérica, `ThemeToggle`.
- **Composição de form genérica**: `FormField`, `FormControl`, `FormMessage`, `FormButtonSubmit` — usados por qualquer schema, sem conhecer o domínio.
- **Shell/branding/layout verdadeiramente global**: `AppFrame`, `AppLogo`, `SidebarMenu` (a estrutura do menu, não os itens de um módulo específico).
- **Feedback genérico**: `EmptyState`, `Toast`/`Sonner` wrapper, spinner de carregamento.
- **API pública e estável do design system**: um componente que qualquer módulo futuro poderia consumir sem precisar saber de onde ele veio.

Exemplo real do projeto: `shared/components/ui/table.tsx` é uma tabela genérica (estrutura, estilos, paginação) sem saber o que está sendo listado — correto em `shared`. Já a lógica de "quais colunas mostrar para uma Pessoa e como formatar seu Tipo" pertence a `modules/pessoas`.

## Quando NÃO promover — similaridade visual não é significado compartilhado

**Contraexemplo central (forward-test 2 desta skill)**: dois módulos (`cambistas` e `pessoas`) têm um "card de resumo" visualmente parecido — mesmo raio de borda, mesmo layout de ícone + valor + label. Isso **não** é motivo para promover para `shared`:

- O significado de cada card é diferente: um mostra métricas de cambista (comissão, volume), o outro mostra métricas de pessoa (tipo, percentual). São dados e regras de exibição diferentes por bounded context, mesmo parecendo iguais hoje.
- Se forem promovidos cedo, qualquer mudança futura em um dos dois (ex.: `cambistas` precisa de um estado extra) força um componente `shared` a crescer parâmetros condicionais para acomodar os dois usos — sinal de abstração errada.
- Ação correta: manter os dois no respectivo módulo, aceitando a duplicação pequena. Se um terceiro módulo aparecer com a mesma necessidade **e** o mesmo significado (não só a mesma forma), aí sim extrair uma primitive genérica (ex.: um `StatCard` em `shared` que recebe ícone/valor/label como props, sem saber o que representam) e fazer os três módulos consumirem essa primitive, mantendo os dados/regras específicos no módulo.

Regra prática: pergunte "se eu mudar o comportamento deste componente para o módulo A, o módulo B quebra ou fica errado?" Se sim, o significado não é compartilhado — não promova.

## `app/**/_components` — exclusivo de rota

- Usado quando o componente é específico de uma página/fluxo e ainda não tem uma API estável que justifique um lugar em `modules/<domain>/components` (ex.: um passo de wizard só usado nessa página).
- Diferente de um componente de módulo: não é reaproveitado por outra tela do mesmo módulo. Se passar a ser reaproveitado, promover para `modules/<domain>/components`, nunca direto para `shared`.

## Estratégia incremental de promoção

1. Comece no lugar mais restrito (rota ou módulo). Não adivinhe reuso futuro.
2. Quando o mesmo **significado** aparecer em um segundo lugar, ainda não promova — copie pequeno se for barato.
3. Só promova para `shared` quando o terceiro uso (ou um caso claramente genérico) confirmar que a abstração é estável e não vai precisar de parâmetros condicionais por domínio.
4. Ao promover, remova o conhecimento de domínio do componente promovido (renomeie props para genéricas, extraia o que for específico para o chamador no módulo).

## Exceções documentadas

- Um componente pode nascer direto em `shared` quando a tarefa **é** construir o design system (ex.: durante `config-shared-frontend` ou ao adicionar uma primitive nova pedida explicitamente como genérica).
- Ícones (`shared/components/icons.tsx`) são um caso de exceção prática: um arquivo central de ícones genéricos é aceitável mesmo com poucos usos, desde que os ícones em si não carreguem semântica de domínio (um ícone específico de um conceito de negócio vai para `modules/<domain>/components/icons.tsx`, como já ocorre em `modules/pessoas/components/icons.tsx`).
