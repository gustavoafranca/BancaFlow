# Decomposição de capacidade em increments e changes

## Conceitos

- **Módulo/bounded context:** fronteira duradoura de ownership no código e no domínio.
- **Incremento:** resultado vertical menor, observável e ordenado por dependência.
- **Change OpenSpec:** envelope temporário para especificar, implementar, revisar e arquivar um incremento.
- **Capability spec:** contrato comportamental que uma change adiciona ou modifica.

Não forçar relação 1:1. Um módulo pode receber várias changes, e uma change pode alterar mais de uma capability spec coerente.

## Como decompor

1. Listar jornadas e resultados de negócio da capacidade completa.
2. Identificar a menor fundação que entrega valor de ponta a ponta.
3. Separar jornadas que possam ser implementadas, testadas e revisadas depois sem duplicar a fundação.
4. Manter domínio, Backend e Web na mesma change quando forem necessários ao resultado.
5. Registrar dependências explícitas entre increments.
6. Mapear cada incremento às capability specs que adiciona ou modifica.
7. Aplicar readiness e estados separadamente a cada incremento.

## Sinais de change grande demais

Reavaliar e dividir quando houver dois ou mais destes sinais:

- mais de uma jornada independente com valor próprio;
- ciclos de vida distintos para múltiplos agregados;
- integração externa ou migração separável da entrega principal;
- vários grupos de permissão sem relação direta;
- rollout ou rollback que precisaria ocorrer por partes;
- tarefas que poderiam ser arquivadas sem esperar as demais;
- revisão difícil de explicar em uma única frase de resultado.

Complexidade inevitável da fundação não deve ser escondida em changes por camada. Se o primeiro incremento precisa criar domínio, persistência, API e UI para entregar valor, essas partes permanecem juntas.

## Anti-padrões

- uma change apenas para entidades, outra apenas para Prisma e outra apenas para Web;
- uma única change para todo o bounded context presente e futuro;
- duplicar decisões normativas em cada prompt em vez de referenciar o plano;
- incluir incrementos posteriores como tarefas opcionais na primeira change;
- marcar a capacidade inteira como implementada quando somente um incremento terminou.

## Tabela mínima

```markdown
| Incremento | Resultado vertical | Escopo principal | Dependências | Change candidata | Estado |
|---|---|---|---|---|---|
| INC-01 | resultado observável | domínio + Backend + Web necessários | Identity, Tenancy | `implement-example-mvp` | `READY_FOR_SPEC` |
```

## Mapa de specs

```markdown
| Incremento | Capability specs | Operação esperada |
|---|---|---|
| INC-01 | `example-registration`, `example-catalog` | ADDED |
| INC-02 | `example-registration` | MODIFIED |
```

O prompt de spec deve selecionar exatamente um incremento e declarar os demais como fora de escopo, mesmo quando compartilham o mesmo plano de capacidade.
