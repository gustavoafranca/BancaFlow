---
name: plan-spec-roadmap
description: Planejar roadmaps de produto e software orientados a capacidades e specs, manter planos de capacidade e diagramas Excalidraw, conduzir discovery e decisões, avaliar readiness, preparar prompts autocontidos para futuras specs ou changes OpenSpec e revisar rastreabilidade após implementação. Usar quando Codex precisar iniciar ou retomar um roadmap, decompor capacidades, documentar domínio/arquitetura/segurança/testes, decidir se um plano está READY_FOR_SPEC, gerar o prompt de spec de um plano, reconciliar descobertas com plano/spec ou auditar plano, spec, código, testes e documentação. Funciona com projetos single-tenant ou multi-tenant, backend, frontend ou full-stack, com ou sem DDD e OpenSpec.
---

# Planejar roadmap orientado a specs

## Princípios

- Tratar o texto do plano como fonte normativa; usar o diagrama como apoio editável.
- Separar discovery, plano, spec, implementação, revisão, documentação e arquivamento.
- Diferenciar módulo, incremento, change e capability spec; não forçar relação 1:1.
- Organizar artefatos por área estável quando isso reduzir ambiguidade; nunca agrupar por estado transitório do workflow.
- Nunca criar código de produção durante planejamento ou geração de prompt.
- Nunca executar uma change nem avançar gates sem pedido explícito e evidência.
- Perguntar em blocos pequenos quando uma decisão crítica não puder ser inferida com segurança.
- Preservar decisões existentes ao retomar trabalho; registrar conflitos e alternativas rejeitadas.

## Iniciar ou retomar

1. Ler instruções locais e localizar contexto, roadmap, planos, prompts, diagramas e specs existentes.
2. Se faltar contexto estável, criar ou preencher `assets/project-context-template.md`.
3. Para um roadmap novo, copiar `assets/system-roadmap-template.md` para `.docs/plans/00-system-roadmap.md`.
4. Antes do primeiro plano novo, decidir se o projeto permanece plano ou usa uma área estável como `foundation`, `operations` ou um bounded context. Ler [artifact-organization.md](references/artifact-organization.md).
5. Para cada capacidade, copiar `assets/capability-plan-template.md` para `.docs/plans/NN-capability.md` ou `.docs/plans/<area>/NN-capability.md`, preenchendo links relativos e a área.
6. Espelhar a área em `.docs/diagrams/<area>/` quando o plano for agrupado. Manter prompts na convenção já adotada pelo projeto, salvo decisão explícita de agrupá-los.
7. Antes de editar, distinguir fato, decisão, hipótese, pendência e conflito. Não sobrescrever decisões silenciosamente.
8. Ordenar capacidades por valor, risco e dependências; capacidade não é tabela, entidade ou tela.

Ler [roadmap-state-machine.md](references/roadmap-state-machine.md) para transições e retomadas. Ler [capability-plan-template.md](references/capability-plan-template.md) ao criar ou revisar um plano.

## Conduzir o plano

1. Identificar objetivo, atores, permissões, escopo, fora de escopo e dependências.
2. Modelar apenas o que for aplicável: linguagem ubíqua, contexts, agregados, entidades, VOs, serviços, invariantes, estados, casos de uso, portas/adapters, eventos, persistência, Backend, Web, segurança, tenancy, auditoria, idempotência e testes.
3. Marcar explicitamente seções não aplicáveis e justificar brevemente.
4. Registrar cada decisão crítica com status, motivação, alternativas e impacto.
5. Atualizar o Excalidraw sem destruir elementos existentes. Ler [diagram-playbook.md](references/diagram-playbook.md).
6. Executar `python scripts/validate_plans.py <arquivos-ou-diretorios>` para diagnóstico somente leitura.
7. Avaliar Definition of Ready conforme [quality-gates.md](references/quality-gates.md). Manter `DECISIONS_PENDING` enquanto houver decisão crítica aberta.
8. Antes de gerar prompt, decompor a capacidade em increments verticais e mapear cada um às capability specs. Ler [change-decomposition.md](references/change-decomposition.md).
9. Aplicar estado e readiness por incremento; não considerar a capacidade inteira implementada enquanto houver increments planejados pendentes.
10. Mapear skills locais aplicáveis por fase: planejamento, proposta/spec, implementação e revisão. Durante o plano, usar skills de implementação apenas como fonte de restrições e organização futura; não executá-las nem confundir sua existência com implementação autorizada.

## Gerar prompt de spec

Ao receber “gere o prompt da spec do plano X”:

1. Localizar plano recursivamente, roadmap, contexto, instruções locais e artefatos relacionados; não assumir que capacidades ficam diretamente na raiz de `.docs/plans`.
2. Recalcular a Definition of Ready e conferir artefatos/histórico; o rótulo `READY_FOR_SPEC` sozinho não é evidência. Se houver incoerência, parar e listar bloqueios concretos.
3. Exigir a seleção de exatamente um incremento `READY_FOR_SPEC`; se houver mais de um candidato e o usuário não escolher, apresentar os candidatos.
4. Usar o nome de change do incremento, em kebab-case, e verificar colisões.
5. Copiar `assets/spec-prompt-template.md` para `.docs/prompts/NN-change-name.md` ou para a área de prompts já adotada pelo projeto e preencher apenas o prompt. Preservar numeração global quando essa for a convenção existente.
6. Declarar os demais increments como fora de escopo e preservar suas dependências.
7. Preservar fontes, decisões, alternativas rejeitadas, fora de escopo, cenários, entregas aplicáveis, skills locais, testes, segurança, tenancy, migração e conflitos com o código.
8. Distinguir no prompt as skills usadas para propor/revisar a spec das skills reservadas à aplicação futura. Citar uma skill futura somente se ela existir e estiver completa/validada; caso ainda esteja em construção, registrar dependência condicional sem bloquear o planejamento que não dependa dela.
9. Solicitar proposta/spec, nunca implementação. Não executar OpenSpec nem marcar `SPEC_PROPOSED` antes de a change existir.

Ler [spec-prompt-template.md](references/spec-prompt-template.md) antes de gerar o prompt.

## Reconciliar e revisar

- Se a spec ou a implementação revelar conflito, registrar evidência no plano e retornar ao gate adequado antes de prosseguir.
- Usar `DECISIONS_PENDING` para conflito de regra/escopo/contrato sem decisão; manter o estado somente quando a divergência for editorial e não alterar a DoR.
- Atualizar o estado global do roadmap quando o conflito afetar múltiplas capacidades, dependências ou sequência; caso contrário, atualizar e referenciar apenas a capacidade.
- Atualizar os frames afetados do diagrama quando o conflito mudar jornada, domínio, portas, eventos ou dependências.
- Após implementação, comparar plano, spec, código, testes e documentação por evidência rastreável.
- Não usar testes verdes como prova isolada de conformidade ou autorização de arquivamento.
- Relatar conformidade, divergências, lacunas e itens não verificáveis separadamente.
- Usar [quality-gates.md](references/quality-gates.md) para Definition of Done e critérios de revisão.

## Entregáveis padrão

```text
.docs/plans/00-system-roadmap.md
.docs/plans/NN-capability.md
.docs/plans/<area>/NN-capability.md
.docs/prompts/NN-change-name.md
.docs/diagrams/NN-capability.excalidraw
.docs/diagrams/<area>/NN-capability.excalidraw
```

Os caminhos com `<area>` são opcionais. Manter nomes e caminhos locais quando o projeto já possuir convenção equivalente; não mover artefatos existentes sem pedido explícito.
