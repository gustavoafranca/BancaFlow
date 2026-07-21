# Prompt — Criar skill genérica de planejamento orientado a specs

**Este prompt cria uma skill; não cria change OpenSpec nem código do sistema.**

Use o criador oficial de skills para criar uma skill pessoal e reutilizável chamada `plan-spec-roadmap`.

## Missão

Receber contexto de um projeto, organizar roadmap por capacidades, conduzir decisões, manter planos/diagramas e, apenas quando um plano estiver pronto, gerar prompt autocontido para futura spec/OpenSpec change. Ser independente de BancaFlow, stack, linguagem e arquitetura.

## Responsabilidades

1. Ler contexto e instruções locais.
2. Criar/manter plano mestre e planos individuais.
3. Separar discovery, plano, spec, implementação, revisão, documentação e arquivamento.
4. Perguntar em blocos pequenos, registrar decisões identificadas e não inventar regra crítica.
5. Ordenar capacidades por valor/dependências.
6. Quando aplicável, modelar linguagem ubíqua, contexts, agregados, entidades, VOs, serviços, invariantes, casos de uso, portas/adapters, eventos, persistência, Backend, Web, segurança, tenancy, auditoria, idempotência e testes.
7. Criar/atualizar Excalidraw editável por plano.
8. Validar Definition of Ready.
9. Gerar prompt de spec preservando decisões/fora de escopo.
10. Após implementação, confrontar plano, spec, código, testes e documentação sem afirmar conformidade sem evidência.

## Estrutura padrão

```text
.docs/plans/00-system-roadmap.md
.docs/plans/NN-capability.md
.docs/prompts/NN-change-name.md
.docs/diagrams/NN-capability.excalidraw
```

Nunca criar código de produção na fase de plano/prompt.

## Estados/gates

`DISCOVERY → DECISIONS_PENDING → READY_FOR_SPEC → SPEC_PROPOSED → SPEC_APPROVED → IMPLEMENTING → IMPLEMENTED → REVIEWED → DOCUMENTED → ARCHIVED`

Decisão crítica bloqueia `READY_FOR_SPEC`; prompt não é spec; spec completa não é implementação revisada; testes verdes não autorizam arquivamento; descoberta na implementação volta ao plano/spec; nunca executar change sem pedido explícito.

## Template obrigatório

Identificação/estado; objetivo; change/prompt/diagrama; dependências; escopo/fora; atores/permissões; glossário; decisões; domínio; agregados/entidades/VOs/serviços; invariantes/estados/concorrência/idempotência; casos de uso/falhas; portas/adapters; eventos; persistência; Backend/Web; segurança/tenancy/auditoria; testes/aceitação; riscos/hipóteses; Definition of Ready/Done. Item não aplicável deve ser explícito.

## Regras

- capacidade não é tabela, entidade ou tela;
- não criar agregado gigante;
- distinguir domínio, aplicação e infraestrutura;
- evitar entidade anêmica quando houver comportamento;
- usar VO para valor/validação/normalização/igualdade conceitual;
- serviço de domínio só quando regra não cabe em entidade/VO;
- caso de uso orquestra; controller/página não decide negócio;
- porta nasce da necessidade do núcleo, não para copiar classe concreta;
- registrar alternativas rejeitadas relevantes.

## Excalidraw

Frames: atores/jornada; sucessos/falhas; domínio/agregados; portas/adapters; dependências/eventos; legenda/regras/pendências. Evitar diagrama monolítico, preservar editabilidade e elementos existentes. O texto do plano é normativo.

## Ao pedir “gere o prompt da spec do plano X”

Localizar plano/roadmap/contexto/instruções; exigir `READY_FOR_SPEC`; parar e listar bloqueios; definir change kebab-case; criar apenas o prompt; incluir fontes, decisões, fora de escopo, cenários, entregas Negócio/Backend/Web aplicáveis, skills locais existentes, testes, segurança, tenancy, migração e conflitos com código; pedir proposta, não implementação; não executar OpenSpec nem marcar `SPEC_PROPOSED` antes de a change existir. Sem OpenSpec, usar formato equivalente mantendo gates.

## Arquivos da skill

```text
plan-spec-roadmap/
  SKILL.md
  agents/openai.yaml
  references/roadmap-state-machine.md
  references/capability-plan-template.md
  references/spec-prompt-template.md
  references/diagram-playbook.md
  references/quality-gates.md
  assets/system-roadmap-template.md
  assets/capability-plan-template.md
  assets/spec-prompt-template.md
```

Adicionar validador somente leitura em `scripts/` apenas se verificar headings, estados, duplicações, links e incompatibilidade entre decisão crítica e `READY_FOR_SPEC`. Nunca autocorrigir.

Criar template de contexto para propósito, stack, repositório, arquitetura, capacidades, identidade/tenancy/autorização, convenções, ferramentas, skills, requisitos não funcionais, decisões e restrições. Suportar single/multi-tenant e backend/frontend/full-stack.

## Validação

Testar em diretórios temporários: ERP multi-tenant com subdomínio/DDD/OpenSpec; estoque single-tenant sem OpenSpec; prompt bloqueado por decisão crítica; plano atualizado após conflito na spec; retomada de roadmap parcial sem sobrescrever decisões.

Nenhum artefato final depende do BancaFlow. Usar frontmatter válido, descrição rica em gatilhos, `SKILL.md` enxuto com referências e sem README paralelo. Validar com ferramentas oficiais, informar arquivos/testes/limitações/exemplos e não instalar/publicar sem autorização.

Antes de criar arquivos, ler integralmente os recursos oficiais do criador de skills e apresentar plano curto. Depois implementar e validar.
