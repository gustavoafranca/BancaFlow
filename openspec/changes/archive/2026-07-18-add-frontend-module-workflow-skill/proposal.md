## Why

O trabalho recorrente de receber uma spec de funcionalidade e implementá-la no frontend Web — decidir onde cada componente vive, como reaproveitar o design system, como estruturar módulo/página/dados/cliente HTTP/hooks, como respeitar Server/Client Components, como conectar rotas privadas e navegação e como impedir regra de negócio duplicada no React — hoje não é coberto por nenhuma skill. As skills existentes (`config-shared-frontend`, `import-cloud-design-next`, `frontend-form-schema`, `config-new-module`) cobrem apenas bootstrap, importação mecânica, forms/schemas e scaffold inicial. Falta uma skill que oriente arquitetura e implementação contínua de módulos no frontend, sem duplicar nem substituir as existentes.

## What Changes

- Criar uma nova skill do projeto `frontend-module-workflow` em `.claude/skills/frontend-module-workflow`, usando o processo oficial da `skill-creator`.
- Gerar `SKILL.md` conciso (< 500 linhas), em forma imperativa/infinitiva, com frontmatter contendo **apenas** `name` e `description`, e disparadores para implementação/revisão/organização de módulos Web (App Router), ownership de componentes, conexão a cliente HTTP/rotas privadas, refino de telas do Claude Design e aplicação do grupo Web de changes OpenSpec — sem disparar para ajuste visual mínimo, tarefa exclusivamente Backend ou edição de texto.
- Ensinar e exigir a direção de dependências `app/routes → modules → shared`, `app/routes → shared`, `shared -X→ modules`; Server Components por padrão e `use client` só quando necessário; page fina; nenhuma dependência de Prisma/banco/secrets/infra Backend; nenhuma regra de domínio autoritativa no React.
- Aplicar uma árvore de decisão de ownership de componentes (shared vs. módulo vs. rota `_components`) com exceções documentadas e estratégia incremental de promoção (preferir duplicação pequena a abstração errada).
- Definir um workflow obrigatório em 8 fases (ler contexto/contrato → selecionar skills complementares → inventariar/planejar ownership → modelar apresentação → implementar por slices → rotas e autenticação → testar/verificar → entregar), com roteamento explícito para as 4 skills existentes.
- Gerar `agents/openai.yaml` coerente com o `SKILL.md`.
- Gerar referências com progressive disclosure em `references/`: `architecture-boundaries.md`, `component-ownership.md`, `next-app-router.md`, `module-slice-workflow.md`, `testing-checklist.md`.
- Criar o script opcional `scripts/audit-frontend-components.mjs` **somente se realmente útil**, read-only por padrão, com `--app=web` e `--json`/`--markdown`, sem mover/excluir/reescrever e com fixtures/testes representativos.
- Integrar com OpenSpec: aceitar tarefas do tipo "aplicar somente o grupo Web da change <nome>" e recomendar grupos de `tasks.md` com escopo claro (contrato/tipos → shared → módulo/feature → rotas/navegação → testes/integração).
- Validar com `scripts/quick_validate.py` e executar 5 forward-tests com contexto limpo.
- **Não** criar README, changelog ou installation guide dentro da skill; **não** criar gerador de módulo que duplique `config-new-module`.

## Capabilities

### New Capabilities
- `frontend-module-workflow-skill`: a skill `frontend-module-workflow` — sua estrutura de arquivos, frontmatter e disparadores, os princípios arquiteturais obrigatórios (direção de dependências, Server/Client boundary, limites domínio/Backend/Web), a árvore de decisão de ownership de componentes, o workflow obrigatório em 8 fases, o roteamento para as skills complementares, as referências especializadas, o script opcional de auditoria read-only, a integração com OpenSpec, os guardrails e os critérios de aceite/validação/forward-tests.

### Modified Capabilities
<!-- Nenhuma. As specs existentes descrevem a aplicação BancaFlow; esta change adiciona uma capability de tooling/autoria independente. -->

## Impact

- **Novos arquivos**: árvore da skill em `.claude/skills/frontend-module-workflow/` (`SKILL.md`, `agents/openai.yaml`, `references/*.md`, e opcionalmente `scripts/audit-frontend-components.mjs` com fixtures).
- **Dependências**: usa o processo da `skill-creator` (`scripts/init_skill.py`, `scripts/quick_validate.py`); não adiciona dependências de runtime ao BancaFlow.
- **Sem impacto** no código de aplicação, APIs ou banco do BancaFlow — a skill é um artefato de orientação/autoria. Quando executada sobre um módulo, ela orienta e implementa Web dentro dos limites já definidos por convenções do projeto (`apps/web/src/{shared,modules}`, App Router, `proxy.ts`).
- **Relação com skills existentes**: complementa `config-shared-frontend`, `import-cloud-design-next`, `frontend-form-schema` e `config-new-module` via roteamento explícito, sem duplicá-las.
- **Riscos**: agentes moverem componentes específicos para shared / criarem abstrações prematuras (mitigado pela árvore de ownership e forward-tests); ignorarem Server/Client boundary; duplicarem primitives ao refinar telas do Claude Design; copiarem regra do Backend para o React (mitigado pelos guardrails e forward-test dedicado).
