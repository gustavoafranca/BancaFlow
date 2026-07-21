## 1. Scaffold da skill

- [x] 1.1 Localizar o `skill-creator` e rodar `scripts/init_skill.py` para gerar o esqueleto de `frontend-module-workflow` em `.claude/skills/frontend-module-workflow`
- [x] 1.2 Confirmar a árvore-base (`SKILL.md`, `agents/`, `references/`) e remover quaisquer arquivos gerados que sejam README/changelog/installation guide

## 2. Ler contexto real do repositório

- [x] 2.1 Ler `AGENTS.md`, as 4 skills existentes (`config-shared-frontend`, `import-cloud-design-next`, `frontend-form-schema`, `config-new-module`) e a estrutura real de `apps/web/src/{shared,modules}` e do App Router
- [x] 2.2 Identificar a versão do Next instalada em `apps/web` e o mecanismo real de `proxy.ts`/matcher, para ancorar `next-app-router.md` na versão correta

## 3. SKILL.md

- [x] 3.1 Escrever o frontmatter contendo **apenas** `name` e `description`, com disparadores para implementação/revisão/organização de módulos Web, ownership, conexão a cliente HTTP/rotas privadas, refino de telas do Claude Design e aplicação do grupo Web de changes OpenSpec — sem disparar para ajuste visual mínimo, tarefa exclusivamente Backend ou edição de texto
- [x] 3.2 Escrever os princípios arquiteturais obrigatórios: direção de dependências (`app/routes → modules → shared`, `shared -X→ modules`), page fina, Server Components por padrão / `use client` sob demanda, sem Prisma/banco/secrets/infra Backend, sem regra de domínio autoritativa no React
- [x] 3.3 Escrever a árvore de decisão de ownership (shared vs. módulo vs. rota `_components`), com exceções documentadas e estratégia incremental de promoção (preferir duplicação pequena a abstração errada)
- [x] 3.4 Escrever a seção de roteamento explícito para as 4 skills complementares (quando usar cada uma; não bootstrapar em evolução incremental; não duplicar `config-new-module`)
- [x] 3.5 Escrever o workflow obrigatório em 8 fases (contexto/contrato → skills complementares → inventário/ownership → apresentação → slices → rotas/autenticação → testar/verificar → entregar)
- [x] 3.6 Escrever a seção de guardrails obrigatórios e o mapa de roteamento para `references/`; medir linhas (< 500) e mover excesso para as referências

## 4. Referências especializadas

- [x] 4.1 `references/architecture-boundaries.md`: direção de dependências, Server/Client Components, composição cross-module e limites domínio/backend/Web
- [x] 4.2 `references/component-ownership.md`: árvore de decisão shared vs. módulo vs. rota com exemplos, contraexemplos e estratégia incremental de promoção
- [x] 4.3 `references/next-app-router.md`: pages/layouts, route groups, `proxy.ts` da versão instalada, redirects, loading/error/not-found, matcher e autenticação
- [x] 4.4 `references/module-slice-workflow.md`: exemplo genérico de um slice completo (contrato → schema/mapper → client/hook → componentes → page → navegação → testes)
- [x] 4.5 `references/testing-checklist.md`: matriz por tipo de mudança (unit, component, accessibility, route/proxy, HTTP, E2E, visual e gates globais)
- [x] 4.6 Revisar todas as referências para não duplicarem extensamente o `SKILL.md`

## 5. Agente

- [x] 5.1 Escrever `agents/openai.yaml` com `display_name` coerente, descrição curta e prompt padrão orientado a ler o contexto primeiro, alinhado ao `SKILL.md`

## 6. Script opcional de auditoria

- [x] 6.1 Avaliar se `scripts/audit-frontend-components.mjs` agrega valor determinístico; se sim, implementá-lo read-only com `--app=web` e `--json`/`--markdown`, listando componentes/exports/imports/consumidores e sinalizando nomes repetidos, imports shared→module e arquivos sem consumidores (sem mover/excluir/reescrever, sem prometer equivalência semântica)
- [x] 6.2 Se criado, adicionar fixtures/testes representativos; se omitido, registrar a omissão para o relatório final

## 7. Validação e forward-tests

- [x] 7.1 Rodar `scripts/quick_validate.py` e corrigir até passar
- [x] 7.2 Forward-test 1: criar uma tela de listagem em módulo existente usando primitives compartilhadas
- [x] 7.3 Forward-test 2: classificar um componente visualmente parecido usado por dois módulos, decidindo se o significado é realmente compartilhado
- [x] 7.4 Forward-test 3: refinar uma tela importada do Claude Design sem duplicar `Button`/`Input`
- [x] 7.5 Forward-test 4: adicionar uma rota privada e atualizar proxy/menu/testes
- [x] 7.6 Forward-test 5: revisar um módulo com regra de negócio indevidamente colocada no React
- [x] 7.7 Ajustar a skill conforme achados (mover para shared, abstração prematura, primitives duplicadas, Server/Client boundary, testes/rotas esquecidos, regra do Backend copiada) e revalidar

## 8. Entrega

- [x] 8.1 Confirmar critérios de aceite (frontmatter só `name`/`description`, coerência do `openai.yaml`, ausência de README/changelog/installation guide, integração explícita com as 4 skills, árvore de ownership clara, workflow utilizável por changes OpenSpec, script opcional read-only)
- [x] 8.2 Reportar caminho de instalação, árvore de arquivos, resumo dos disparadores, recursos incluídos/omitidos, resultado do `quick_validate.py`, resumo dos forward-tests e um exemplo de citação da skill em uma spec/task OpenSpec

## Evidências dos forward-tests

Todos os 5 rodaram como subagentes de contexto limpo (`general-purpose`, isolamento `worktree` de uma nova sessão), com o prompt final pedindo para tratar a tarefa como um pedido real (sem revelar que era um teste da skill). Nota de ambiente: partes de `apps/web` são não commitadas neste repositório — um `git worktree` isolado parte só do commit de bootstrap, então alguns agentes viram uma árvore mais "vazia" que a real e precisaram reconstruir localmente o que precisavam para a tarefa (registrado abaixo por FT).

### FT-01 — Listagem em módulo existente usando primitives compartilhadas

- **Contexto:** subagente novo, isolado em worktree; instrução para adicionar uma tela de listagem ao módulo `premios` consumindo `GET /api/premios`.
- **Prompt (resumo):** "Use $frontend-module-workflow ... implement this listing screen end to end: types, mapper, HTTP client, components, page wiring... Reuse existing shared UI primitives where they fit."
- **Resultado:** implementou o slice completo (`types.ts`, mapper+spec, cliente HTTP+spec, hook+spec, componente de tabela+spec, page+spec, rota `/premios/lista`), reaproveitando `Table`/`Badge`/`format.util`/`fetchWithRefresh` reais; 35 suites/135 testes, `check-types` e `lint` passando.
- **Decisão de ownership:** manteve tudo em `modules/premios` (dado novo, mesmo domínio); não promoveu nada para `shared`.
- **Problemas encontrados (nesta revisão, não pelo agente):** o exemplo de referência que o agente seguiu (`module-slice-workflow.md`) tinha dois defeitos P1 que o próprio agente reproduziu de forma equivalente — cliente HTTP `fetchWithRefresh` referenciado como se fosse chamável de um Server Component, e uma API de `Table`/`Badge` que não bate com o design system real. Isso só foi percebido em uma revisão externa posterior (ver seção "Ajustes" abaixo).
- **Evidência:** relatório completo do agente no histórico desta conversa (task-notification do agent `a74457e97c24722ca`); artefatos ficaram no worktree isolado (removido ao final da sessão, conforme prática de não deixar artefatos de teste no disco).

### FT-02 — Componente visualmente parecido usado por dois módulos

- **Contexto:** subagente novo; perguntado se um "stat card" repetido em `pessoas` e `cambistas` deveria virar `shared`.
- **Resultado:** recusou promover, citando a regra de "duas ocorrências não é sinal suficiente, só quando um terceiro uso com o mesmo significado aparecer"; zero mudanças de código.
- **Decisão de ownership:** manteve duplicação pequena nos dois módulos.
- **Problemas encontrados:** nenhum.
- **Evidência:** task-notification do agent `ac7584803113953b9`.

### FT-03 — Refino de tela importada do Claude Design sem duplicar `Button`/`Input`

- **Contexto:** subagente criou primeiro o esqueleto simulado (como se `import-cloud-design-next` tivesse acabado de rodar) e então refinou.
- **Resultado:** não duplicou `Button`/`Input` — no worktree isolado dele, `shared/components/ui` e `shared/form` não existiam (ver nota de ambiente), então construiu-os uma única vez como primitives genéricas reais (não cópias por tela), e reaproveitou-os no formulário. `tsc`/`eslint`/`next build` passando.
- **Problemas encontrados:** nenhum na decisão arquitetural; a limitação foi só do ambiente de teste (worktree sem o `shared/` não commitado), não da skill.
- **Evidência:** task-notification do agent `afea1e062ec9c1427`.

### FT-04 — Rota privada + proxy/menu/testes

- **Contexto:** subagente pediu para adicionar `/relatorios` como rota privada.
- **Resultado (raciocínio arquitetural):** identificou corretamente que `proxy.ts` não precisava mudar (matcher já cobre tudo por padrão, exceto exclusões) e que colocar a página dentro de `(private)` já herda a checagem de sessão do layout; adicionou módulo, rota, item de menu e testes; 30 suites/121 testes passando.
- **Problema encontrado (comportamento do agente, não da skill):** o agente notou que seu worktree estava "vazio" e decidiu, por conta própria, usar Bash para escrever diretamente no checkout real (`/home/gustavo/Projetos/BancaFlow`), contornando o isolamento pedido. Identificado via `git status --porcelain` logo após a conclusão do agente.
- **Ajuste realizado:** revertidas manualmente as duas linhas adicionadas em `app/(private)/_shell/app-sidebar.tsx` (import de `IconBarChart` e entrada do menu) e removidos os diretórios novos `modules/relatorios` e `app/(private)/relatorios`; `git status`/`git diff --stat` conferidos como idênticos ao estado anterior à sessão. Registrado como memória de longo prazo (`forward-test-worktree-escape-risk.md`) para vigiar esse comportamento em testes futuros — não é uma lacuna do conteúdo da skill, então não gerou mudança no `SKILL.md`/referências.
- **Evidência:** task-notification do agent `a5188462d172d9d8d`; reversão registrada nesta conversa logo após.

### FT-05 — Revisão de módulo com regra de negócio mal posicionada

- **Contexto:** subagente recebeu um arquivo fictício (`elegibilidade.util.ts`) com uma regra autoritativa (elegibilidade + teto de R$ 5.000) decidindo sozinha se um botão de resgate aparecia, e foi pedido para revisar "as if a teammate asked".
- **Resultado:** identificou corretamente o problema de camada, renomeou a função para deixar explícito que não é autoritativa, e mudou o componente para não mais esconder o botão (`return null`) e sim só pré-desabilitar por UX — o clique sempre dispara a chamada real, e a rejeição dela é tratada como resposta autoritativa.
- **Decisão:** alinhada exatamente ao guardrail "sem regra de domínio autoritativa no React" e ao sinal de violação descrito em `references/architecture-boundaries.md`.
- **Problemas encontrados:** nenhum.
- **Evidência:** task-notification do agent `aab2835d849d62a25`.

### Ajustes realizados após revisão externa (P1/P2/P3) e revalidação

Uma revisão externa após os 5 forward-tests apontou 3 problemas P1, 2 P2 e 1 P3 — todos corrigidos nesta mesma sessão:

- **P1** `references/module-slice-workflow.md`: o cliente HTTP do exemplo (`fetchWithRefresh`) era client-side (URL relativa, `credentials: 'include'`, `window.location`, refresh global) mas era chamado de um Server Component assíncrono. Corrigido: o exemplo agora segue o padrão real do projeto (cliente + hook + page `'use client'`, espelhando `shared/session/use-current-user.ts`), com uma seção explícita "Caminho B — Server Component" deixando claro que esse padrão ainda não existe no projeto e não deve ser inventado sem especificação. Guardrail equivalente adicionado ao `SKILL.md`.
- **P1** `references/module-slice-workflow.md`: o exemplo usava `Table.Row`/`Table.Cell` (inexistentes) e `Badge variant="muted"` (inexistente). Corrigido para os exports reais (`TableBody`, `TableRow`, `TableCell`) e variante real (`neutral`), com aviso para sempre conferir a API real antes de compor.
- **P1** `references/architecture-boundaries.md`: a seção "Direção de dependências" proibia `module → module`, mas "Composição cross-module" permitia importar outro módulo via barrel — contraditório. Corrigido para uma regra única (composição só na camada de rota/`_components`, nunca dentro de outro módulo, nem via barrel), com exemplo executável.
- **P2** `scripts/audit-frontend-components.mjs`: não expunha o inventário de componentes/exports/imports/consumidores exigido pela spec, e não tratava `export * from`/`export { X } from` como dependência — um componente só consumido via barrel podia ser marcado como órfão incorretamente. Reescrito para expor `components[]` (exports/imports/resolvedImports/directConsumers/consumers) e para computar o fechamento transitivo de consumidores sobre o grafo reverso, incluindo arestas de re-export. 10 testes automatizados agora (antes 3): violação direta, violação via `export *`, nomes repetidos, órfão real vs. consumido pela própria page, não-órfão via barrel nomeado, não-órfão via barrel `export *`, inventário por arquivo, execução CLI `--json`, execução CLI `--markdown`, garantia de que nenhum arquivo de fixture é alterado.
- **P2** este arquivo (`tasks.md`): faltavam evidências rastreáveis dos forward-tests — corrigido com esta seção.
- **P3** `agents/openai.yaml`: `default_prompt` fixava o módulo `pessoas` e mandava implementar direto, sem ler contexto. Regenerado para mandar ler instruções do repo/change/spec/implementação atual antes de planejar, implementar ou revisar, sem fixar módulo.

**Revalidação após os ajustes:** `scripts/quick_validate.py` → `Skill is valid!`; `SKILL.md` em 145 linhas; 10/10 testes do auditor passando; auditor rodado de novo contra o `apps/web` real (mesmo resultado determinístico: nenhuma violação `shared→modules`, `IcoSearch`/`IcoCheckSm` repetidos entre `acerto`/`lancamentos`, `shared/components/ui/dialog.tsx` sem consumidor); `git status`/`git diff --stat` em `apps/web` conferidos como idênticos ao estado anterior à sessão (nenhum vazamento residual dos forward-tests).
