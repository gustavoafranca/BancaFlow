# Organização de artefatos por área

## Objetivo

Evitar uma pasta plana confusa sem trocar uma lista simples por hierarquia excessiva. O roadmap mestre continua sendo o índice normativo de todas as capacidades.

## Estrutura

Manter contexto e roadmap na raiz. Agrupar planos e diagramas de capacidades somente quando houver uma área estável:

```text
.docs/plans/
  00-project-context.md
  00-system-roadmap.md
  <area>/
    NN-capability.md
.docs/diagrams/
  <area>/
    NN-capability.excalidraw
```

Prompts podem permanecer em `.docs/prompts/` com sequência global. Agrupá-los somente quando o projeto já usar essa convenção ou quando houver decisão explícita; não inferir que a estrutura de prompts precisa espelhar a dos planos.

## Escolher uma área

Usar uma área quando ela representar ownership ou trilha duradoura, por exemplo:

- `foundation`: Identity, Tenancy, Access Control e infraestrutura transversal;
- `operations`: capacidades operacionais relacionadas;
- um bounded context estável como `participants` ou `finance`.

Usar slug kebab-case, um único nível de subpasta e significado documentado no roadmap. Preferir uma pasta plana enquanto houver poucas capacidades sem agrupamento natural.

Nunca agrupar por estado transitório, como:

- `ready`, `pending`, `done` ou `archived`;
- sprint, pessoa responsável ou data;
- camada técnica isolada como `backend`, `frontend` ou `database` quando o plano é vertical.

## Compatibilidade e migração

- Inventariar caminhos recursivamente antes de numerar.
- Manter numeração global entre áreas quando o projeto já usa prefixos `NN`.
- Não renumerar nem mover planos, diagramas ou prompts existentes sem pedido explícito.
- Para introduzir agrupamento em projeto existente, aplicar primeiro aos novos artefatos e registrar a convenção no roadmap/contexto.
- Se mover artefatos for autorizado, atualizar links no roadmap, plano, prompt e diagrama; validar todos os caminhos relativos.
- Não duplicar um plano na raiz e na área. O roadmap deve apontar para uma única fonte normativa.

## Links

Preencher os placeholders do template com caminhos relativos calculados a partir do arquivo final:

- plano na raiz → roadmap normalmente no mesmo diretório; diagrama normalmente em `../diagrams/`;
- plano em `<area>` → roadmap normalmente em `../`; diagrama normalmente em `../../diagrams/<area>/`.

Não copiar literalmente os placeholders. Executar o validador no diretório `.docs/plans` para verificar links e colisões de numeração em todas as áreas.
