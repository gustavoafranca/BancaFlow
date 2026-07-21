# Máquina de estados do roadmap

## Estados

`DISCOVERY → DECISIONS_PENDING → READY_FOR_SPEC → SPEC_PROPOSED → SPEC_APPROVED → IMPLEMENTING → IMPLEMENTED → REVIEWED → DOCUMENTED → ARCHIVED`

| Estado | Evidência mínima | Próximo gate permitido |
|---|---|---|
| `DISCOVERY` | objetivo e fontes iniciais identificados | `DECISIONS_PENDING` ou `READY_FOR_SPEC` |
| `DECISIONS_PENDING` | pendências críticas nomeadas e responsáveis definidos | `READY_FOR_SPEC` |
| `READY_FOR_SPEC` | Definition of Ready satisfeita | geração de prompt/spec |
| `SPEC_PROPOSED` | change/spec existe e é rastreável ao plano | aprovação explícita |
| `SPEC_APPROVED` | aprovação registrada | implementação explícita |
| `IMPLEMENTING` | execução autorizada e vinculada à spec | `IMPLEMENTED` ou retorno ao plano/spec |
| `IMPLEMENTED` | entregas e testes executados com evidência | revisão |
| `REVIEWED` | comparação entre plano, spec, código e testes | documentação |
| `DOCUMENTED` | documentação aplicável atualizada | arquivamento explícito |
| `ARCHIVED` | Definition of Done e política de arquivo satisfeitas | encerrado |

## Regras de transição

- Manter a sequência; não inferir aprovação ou autorização.
- Decisão crítica aberta bloqueia `READY_FOR_SPEC`.
- Prompt preparado não equivale a spec existente.
- Spec completa não equivale a implementação revisada.
- Testes verdes não autorizam arquivamento.
- Descoberta que altera regra, escopo ou contrato durante spec/implementação retorna ao plano e à spec.
- Registrar transição com data, evidência, autor/decisor quando disponível e motivo.

## Retomada segura

1. Inventariar artefatos existentes antes de editar.
2. Extrair decisões, pendências e último estado com evidência.
3. Sinalizar inconsistências sem escolher silenciosamente uma versão.
4. Preservar conteúdo válido e acrescentar histórico de mudança.
5. Retomar do último gate comprovado, não do estado declarado sem suporte.
6. Se não houver baseline comprovável, registrar “baseline desconhecido” no inventário; não inventar transição histórica.
7. Manter decisão transversal no roadmap e decisão local no plano da capacidade; usar referência cruzada quando uma decisão transversal impactar uma capacidade, sem duplicar seu texto como duas fontes.
8. Aplicar templates por preenchimento incremental: não substituir seções existentes. Tratar conteúdo sem fonte ou validação vigente como hipótese até confirmação.

## Decisões

Classificar como `CRITICAL`, `IMPORTANT` ou `LOCAL` e como `OPEN`, `DECIDED`, `SUPERSEDED` ou `REJECTED`. Uma decisão `CRITICAL/OPEN` impede readiness. Ao substituir decisão, manter a anterior como `SUPERSEDED` e apontar a nova.
