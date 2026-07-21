## Context

O frontend do BancaFlow (`apps/web`, Next.js App Router) já possui skills para bootstrap do shared (`config-shared-frontend`), importação mecânica de telas do Claude Design (`import-cloud-design-next`), forms/schemas (`frontend-form-schema`) e scaffold full-stack inicial (`config-new-module`). Falta uma skill que orquestre a implementação e revisão **contínuas** de funcionalidades dentro de módulos existentes: decidir ownership de componentes, respeitar Server/Client boundaries, conectar cliente HTTP e rotas privadas, impedir regra de negócio duplicada no React e aplicar o grupo Web de changes OpenSpec.

Esta change planeja **a construção da skill** `frontend-module-workflow` seguindo o processo oficial da `skill-creator`. Não implementa nenhuma funcionalidade de produto nem modifica a aplicação.

Restrições relevantes:
- Skill do projeto, instalada obrigatoriamente em `.claude/skills/frontend-module-workflow`.
- Frontmatter do `SKILL.md` limitado a `name` e `description`; `SKILL.md` conciso (< 500 linhas) com progressive disclosure para `references/`.
- Sem README/changelog/installation guide dentro da skill.
- Deve complementar, não duplicar nem substituir, as 4 skills existentes.
- Deve refletir as convenções reais do repositório (`apps/web/src/{shared,modules}`, App Router, `proxy.ts`), sem impor decisões de identidade visual.

## Goals / Non-Goals

**Goals:**
- Empacotar como skill o método de arquitetura/implementação de módulos no frontend.
- Ensinar e exigir a direção de dependências `app/routes → modules → shared` e o Server/Client boundary.
- Fornecer uma árvore de decisão de ownership (shared vs. módulo vs. rota) com exceções e estratégia incremental de promoção.
- Fornecer um workflow em 8 fases que impeça pular direto para código e que roteie para as skills complementares.
- Fornecer referências especializadas com progressive disclosure.
- Integrar com OpenSpec (aplicar apenas o grupo Web; recomendar grupos de tasks com escopo claro).
- Estabelecer guardrails de arquitetura, segurança de rotas/tenant e qualidade de testes.
- Passar `quick_validate.py` e 5 forward-tests; reportar caminho de instalação e exemplos de invocação.

**Non-Goals:**
- Implementar qualquer funcionalidade de produto ou modificar `apps/web`, specs, APIs ou banco.
- Duplicar `config-shared-frontend`, `import-cloud-design-next`, `frontend-form-schema` ou `config-new-module` — em especial, **não** criar um gerador de módulo.
- Prescrever mudanças de identidade visual/design system por preferência.
- Criar scripts decorativos ou documentação de instalação dentro da skill.

## Decisions

**D-A: Formato e ferramenta — usar o processo oficial da `skill-creator`.**
Rationale: o prompt exige `scripts/init_skill.py` + `scripts/quick_validate.py` e estrutura padronizada. Alternativa (escrever à mão) descartada por não garantir conformidade com o validador.

**D-B: Progressive disclosure com `SKILL.md` fino + 5 referências temáticas.**
`SKILL.md` roteia e carrega princípios/ownership/workflow essenciais; o detalhe extenso vive em `architecture-boundaries.md`, `component-ownership.md`, `next-app-router.md`, `module-slice-workflow.md`, `testing-checklist.md`. Alternativa (SKILL.md monolítico) violaria o limite de linhas.

**D-C: Ownership como árvore de decisão explícita (shared/módulo/rota), não heurística vaga.**
Promoção para shared só quando o significado for realmente compartilhado (primitive, composição genérica, shell/branding global, feedback genérico, API pública estável do design system). Preferir duplicação pequena e temporária a abstração errada. Isso é o que impede o forward-test 2 (componente visualmente parecido em dois módulos) de mover indevidamente para shared.

**D-D: Roteamento explícito para as skills complementares, sem duplicá-las.**
`config-shared-frontend` só para bootstrap/reconstrução do shared e apenas com confirmação de sobrescrita; `import-cloud-design-next` primeiro para `.dc.html`, depois refino por esta skill; `frontend-form-schema` para forms/schema; `config-new-module` para scaffold full-stack inicial. Esta skill cobre a evolução incremental — não executar bootstrap quando a tarefa é incremental.

**D-E: Server Components por padrão; `use client` só sob demanda.**
`use client` apenas quando eventos, estado ou APIs do browser exigirem. Fetch e efeitos ficam fora de primitives visuais; regra autoritativa nunca vive em componente.

**D-F: Segurança de rotas e tenant como conteúdo de primeira classe.**
Backend é autoridade da sessão; atualizar `proxy.ts`/matcher quando uma rota protegida for criada; nunca aceitar `tenantId` do body como autoridade; preservar host/subdomínio no acesso ao backend; evitar loops entre login, troca obrigatória de senha e dashboard.

**D-G: Script de auditoria opcional e read-only.**
Criar `scripts/audit-frontend-components.mjs` só se houver validação determinística reutilizável (listar componentes/exports/imports/consumidores; sinalizar nomes repetidos, imports shared→module e arquivos sem consumidores). Nunca move/exclui/reescreve; não promete detectar equivalência semântica por AST/nome; precisa de fixtures/testes. Se não agregar valor, omitir e registrar a omissão.

**D-H: Escopo desta change = criar a skill (não aplicá-la a um módulo real agora).**
A skill é um artefato de orientação. A aplicação a módulos concretos acontece depois, via invocação (inclusive por changes OpenSpec).

## Risks / Trade-offs

- **Agentes moverem componentes específicos para shared / criarem abstração prematura** → Mitigação: árvore de ownership com contraexemplos + estratégia incremental de promoção + forward-tests 1 e 2.
- **Ignorar Server/Client boundary** → Mitigação: princípio explícito no `SKILL.md` e em `architecture-boundaries.md`; forward-test 3 (refino de tela importada).
- **Duplicar primitives ao refinar telas do Claude Design** → Mitigação: exigir busca por primitive equivalente antes de criar; roteamento `import-cloud-design-next` → refino; forward-test 3 (não duplicar `Button`/`Input`).
- **Copiar regra de negócio do Backend para o React** → Mitigação: guardrail "sem regra de domínio no Web" + validação Web apenas para UX; forward-test 5 (revisar módulo com regra indevida).
- **Esquecer rotas/proxy/menu ao adicionar rota privada** → Mitigação: Fase 6 e `testing-checklist.md`; forward-test 4 (rota privada + proxy/menu/testes).
- **`SKILL.md` crescer além do limite** → Mitigação: progressive disclosure; medir linhas antes de finalizar.
- **Frontmatter inválido / desalinhado com `agents/openai.yaml`** → Mitigação: `quick_validate.py` + checagem de coerência.
- **Sobreposição/conflito com skills existentes** → Mitigação: seção de roteamento explícito e critério de aceite de integração; guardrail contra rodar `config-shared-frontend` sobre projeto existente sem confirmação e contra duplicar `config-new-module`.
- **Script decorativo** → Mitigação: D-G condiciona a criação à utilidade real e exige fixtures/testes.

## Migration Plan

1. Rodar `scripts/init_skill.py` para gerar o esqueleto da skill em `.claude/skills/frontend-module-workflow`.
2. Escrever `SKILL.md`, `agents/openai.yaml` e as 5 referências; decidir sobre o script opcional.
3. Rodar `scripts/quick_validate.py`; corrigir até passar.
4. Executar os 5 forward-tests com contexto limpo; ajustar conteúdo conforme achados e revalidar.
5. Reportar caminho de instalação, árvore de arquivos, resumo dos disparadores, recursos incluídos/omitidos, resultado da validação e dos forward-tests, e exemplo de citação em spec/task OpenSpec.

Rollback: por ser um artefato novo e isolado (nenhuma alteração no BancaFlow), o rollback é remover o diretório da skill gerada.

## Open Questions

- **Necessidade do script `audit-frontend-components.mjs`**: só criar se a auditoria read-only agregar valor determinístico durante a implementação; caso contrário, omitir e registrar a omissão no relatório final.
- **Versão do Next instalada**: `next-app-router.md` e a orientação de `proxy.ts`/matcher devem refletir a versão realmente instalada em `apps/web`, lida na Fase 1 — não uma versão assumida.
