# Prompt — Criar skill de arquitetura e implementação de módulos no frontend

Use este prompt com a skill `skill-creator` para criar uma skill versionada no projeto que oriente a implementação, revisão e evolução de funcionalidades Web dentro de módulos existentes ou recém-criados.

## Como usar

1. Inicie uma conversa com acesso à skill `skill-creator`.
2. Forneça o conteúdo integral deste arquivo.
3. Crie a skill em `.claude/skills/frontend-module-workflow`.
4. Valide a skill e execute forward-tests antes de referenciá-la em changes OpenSpec reais.

Este prompt cria uma **skill**, não implementa uma funcionalidade e não cria uma change OpenSpec.

## Lacuna que a skill deve preencher

O projeto já possui:

- `config-shared-frontend`: bootstrap do shared, shell e rotas-base;
- `import-cloud-design-next`: importação mecânica de telas/assets do Claude Design;
- `frontend-form-schema`: forms e schemas;
- `config-new-module`: scaffold mínimo full-stack e entrada inicial no menu.

Nenhuma delas cobre de ponta a ponta o trabalho recorrente de receber uma spec de funcionalidade e decidir:

- onde cada componente deve viver;
- como reaproveitar o design system;
- como estruturar módulo, página, dados, cliente HTTP e hooks;
- como respeitar Server/Client Components;
- como conectar rotas privadas e navegação;
- como impedir regra de negócio duplicada no Web;
- quais testes e gates executar.

A nova skill deve complementar, não duplicar nem substituir, essas skills.

## Solicitação ao `skill-creator`

Crie uma skill chamada:

`frontend-module-workflow`

Local obrigatório:

`.claude/skills/frontend-module-workflow`

Use o processo oficial da `skill-creator`:

1. inicializar com `scripts/init_skill.py`;
2. criar `SKILL.md` conciso, em forma imperativa/infinitiva e abaixo de 500 linhas;
3. criar `agents/openai.yaml` coerente com a skill;
4. aplicar progressive disclosure;
5. criar apenas scripts/referências úteis;
6. validar com `scripts/quick_validate.py`;
7. executar forward-tests com contexto limpo;
8. não criar README, changelog ou guia de instalação dentro da skill.

## Gatilhos da descrição

O frontmatter deve conter somente `name` e `description`. A descrição deve disparar para pedidos como:

- “implemente o frontend deste módulo seguindo a spec”;
- “crie as telas e componentes do módulo financeiro”;
- “revise se este componente deve ser shared”;
- “organize um módulo no Next App Router”;
- “conecte esta funcionalidade ao cliente HTTP e às rotas privadas”;
- “importe/refine esta tela do Claude Design dentro do módulo correto”;
- “aplique as tarefas Web desta change OpenSpec”;
- “revise a arquitetura frontend deste módulo”.

Evitar disparar para qualquer ajuste visual mínimo, tarefa exclusivamente Backend ou simples edição de texto.

## Princípios arquiteturais obrigatórios

A skill deve ensinar e exigir:

```text
app/routes → modules → shared
app/routes → shared
shared -X→ modules
```

- `app/**/page.tsx` fino, apenas compondo páginas/componentes;
- Server Components por padrão;
- `use client` somente quando eventos, estado ou APIs do browser exigirem;
- shared independente de bounded context;
- módulo proprietário da linguagem, telas, schemas, view models e interações específicas;
- `_components` para código exclusivo de uma rota;
- composição cross-module no App Router ou em APIs públicas explícitas;
- nenhuma dependência de Prisma, banco, secrets ou infraestrutura Backend;
- nenhuma duplicação de entidade rica ou regra de negócio autoritativa no React;
- validação Web para UX, mantendo domínio/backend autoritativos;
- clientes HTTP e efeitos separados de primitives visuais;
- acessibilidade, responsividade e legibilidade como requisitos, não acabamento opcional;
- nomes e arquivos consistentes com as convenções reais do projeto.

## Regra de ownership de componentes

A skill deve aplicar esta decisão, documentando exceções:

### Shared

Mover/criar em `apps/web/src/shared/components` quando for:

- primitive do design system;
- composição genérica de forms;
- shell/branding/layout realmente global;
- feedback genérico;
- componente reutilizado por múltiplos módulos com o mesmo significado;
- API deliberadamente pública e estável do design system.

Shared nunca importa módulo ou contém DTO/texto/regra de um domínio.

### Módulo

Manter em `apps/web/src/modules/<domain>` quando expressar:

- linguagem do bounded context;
- tela/page interna do módulo;
- schema, view model, mapper, hook ou cliente específico;
- componente reutilizado dentro do próprio módulo;
- estado/interação particular daquela funcionalidade.

### Rota

Manter em `app/**/_components` quando o componente for exclusivo do fluxo/página e ainda não possuir API estável para o módulo.

Não promover baseado apenas em semelhança visual ou possibilidade hipotética de reuso. Preferir duplicação pequena e temporária a abstração errada; consolidar quando o significado for realmente compartilhado.

## Workflow obrigatório

### Fase 1 — Ler contexto e contrato

- ler `AGENTS.md`, skills locais e guias da versão instalada do Next;
- ler proposal/design/specs/tasks da change quando houver OpenSpec;
- identificar bounded context, rotas, contratos HTTP e critérios de aceite;
- inspecionar implementação/testes atuais antes de editar;
- distinguir fatos, inferências e decisões ausentes;
- não perguntar algo descobrível no repositório.

### Fase 2 — Selecionar skills complementares

Definir roteamento explícito:

- bootstrap/reconstrução do shared: `config-shared-frontend`, somente com confirmação para sobrescrita;
- importação de `.dc.html`/Claude Design: `import-cloud-design-next` primeiro, depois refino;
- formulário/schema: `frontend-form-schema`;
- scaffold full-stack inicial: `config-new-module`;
- implementação/revisão Web contínua: esta skill.

Ler e obedecer cada skill selecionada. Não executar bootstrap quando a tarefa é apenas evolução incremental.

### Fase 3 — Inventariar e planejar ownership

- listar componentes e consumidores relacionados à funcionalidade;
- procurar primitive/componente equivalente antes de criar;
- classificar cada arquivo como shared, módulo, rota ou legado;
- detectar ciclos, imports proibidos e duplicações;
- planejar mudanças pequenas e ordem de migração;
- preservar arquivos do usuário e evitar `--force` sem autorização.

### Fase 4 — Modelar a apresentação

- definir page, componentes, estados e view models;
- definir loading, empty, error, success e forbidden;
- separar dados do contrato HTTP dos tipos necessários à UI;
- decidir Server/Client boundary;
- planejar acessibilidade, teclado e responsividade;
- manter tokens e primitives do design system.

### Fase 5 — Implementar por slices

Para cada fluxo:

1. estabilizar tipos/contrato consumido;
2. criar/adaptar schema e mapper;
3. criar cliente HTTP/hook quando necessário;
4. compor componentes shared existentes;
5. criar componentes específicos no módulo/rota;
6. conectar a page e navegação;
7. implementar estados e erros;
8. testar antes de seguir ao próximo fluxo.

Não colocar fetch em primitive, regra autoritativa em componente ou acesso cross-module por caminho interno.

### Fase 6 — Rotas e autenticação

- manter tabela/matriz de rotas públicas, condicionais e privadas;
- atualizar `proxy.ts`/matcher quando uma rota protegida for criada;
- manter backend como autoridade da sessão;
- evitar loops entre login, troca obrigatória e dashboard;
- não aceitar `tenantId` do body como autoridade;
- preservar host/subdomínio no acesso ao backend;
- registrar comportamento para tenant inexistente/inativo quando a funcionalidade depender disso.

### Fase 7 — Testar e verificar

- testar schemas e forms;
- testar componentes com Testing Library e acessibilidade;
- testar hooks/clientes HTTP, erros e retry;
- testar redirects/proxy quando afetados;
- testar tenant e sessão nos estados relevantes;
- executar lint, check-types, testes e build proporcionais ao risco;
- revisar visualmente viewports e estados;
- procurar imports proibidos, ciclos, exports/assets órfãos e duplicações introduzidas.

### Fase 8 — Entregar

- listar arquivos criados/movidos/alterados;
- explicar ownership shared vs. módulo;
- informar testes executados;
- registrar pendências reais e decisões humanas;
- atualizar tasks OpenSpec imediatamente após comprovação;
- não marcar concluído somente porque compila.

## Recursos sugeridos

Estrutura recomendada:

```text
frontend-module-workflow/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── architecture-boundaries.md
│   ├── component-ownership.md
│   ├── next-app-router.md
│   ├── module-slice-workflow.md
│   └── testing-checklist.md
└── scripts/
    └── audit-frontend-components.mjs   # somente se realmente útil
```

O script opcional de auditoria deve ser read-only por padrão e:

- aceitar `--app=web` e `--json`/`--markdown`;
- listar componentes, exports, imports e consumidores;
- sinalizar nomes repetidos, imports shared→module e arquivos sem consumidores;
- nunca mover, excluir ou reescrever automaticamente;
- não prometer detectar equivalência semântica apenas por AST/nome;
- ter testes ou fixtures representativas.

Não criar gerador de módulo que duplique `config-new-module`.

## Referências esperadas

### `architecture-boundaries.md`

Direção de dependências, Server/Client Components, composição cross-module e limites entre domínio/backend/Web.

### `component-ownership.md`

Árvore de decisão shared vs. módulo vs. rota, exemplos, contraexemplos e estratégia incremental de promoção.

### `next-app-router.md`

Pages/layouts, route groups, `proxy.ts` da versão instalada, redirects, loading/error/not-found, matcher e autenticação.

### `module-slice-workflow.md`

Exemplo genérico de um slice completo: contrato → schema/mapper → client/hook → componentes → page → navegação → testes.

### `testing-checklist.md`

Matriz por tipo de mudança: unit, component, accessibility, route/proxy, HTTP, E2E, visual e gates globais.

## Integração com OpenSpec

A skill deve aceitar tarefas como:

```text
Use a skill frontend-module-workflow para aplicar somente o grupo Web da change <nome>.
Respeite os arquivos permitidos e marque cada tarefa apenas após testes.
```

Ao gerar ou revisar `tasks.md`, recomendar grupos com escopo claro:

1. contrato e tipos;
2. shared necessário;
3. módulo/feature;
4. rotas/navegação;
5. testes e integração.

Se Backend e Web puderem avançar em paralelo, exigir que o contrato HTTP já esteja definido. Evitar subagentes concorrentes editando barrels, layout privado, `proxy.ts` ou menu.

## Guardrails

- não mover tudo para shared;
- não executar `config-shared-frontend` sobre projeto existente sem confirmação;
- não sobrescrever import do Claude Design sem `--force` autorizado;
- não criar regra de domínio no Web;
- não usar index/barrel para esconder ciclo;
- não criar `layout.tsx` por módulo quando existe shell único;
- não duplicar menu ou shell;
- não instalar dependência sem necessidade comprovada;
- não alterar identidade visual por preferência;
- não excluir componente/asset apenas por busca textual inconclusiva;
- não editar Backend/domínio fora do escopo solicitado;
- não enfraquecer testes para concluir.

## Forward-tests obrigatórios

Executar com agentes de contexto limpo, passando somente a skill e artefatos brutos:

1. criar uma tela de listagem em módulo existente usando primitives compartilhadas;
2. classificar um componente visualmente parecido usado por dois módulos, decidindo se o significado é realmente compartilhado;
3. refinar uma tela importada do Claude Design sem duplicar `Button`/`Input`;
4. adicionar uma rota privada e atualizar proxy/menu/testes;
5. revisar um módulo com regra de negócio indevidamente colocada no React.

Revisar os resultados e ajustar a skill se os agentes:

- moverem componentes específicos para shared;
- criarem abstrações prematuras;
- duplicarem primitives;
- ignorarem Server/Client boundaries;
- esquecerem testes/rotas;
- copiarem regra do Backend para o frontend.

## Critérios de aceite da skill

- frontmatter válido e gatilhos precisos;
- `SKILL.md` conciso e sem duplicar referências;
- `agents/openai.yaml` coerente;
- integração explícita com as quatro skills existentes;
- árvore de decisão de ownership clara;
- workflow utilizável por changes OpenSpec;
- nenhum recurso decorativo;
- script opcional testado e read-only;
- `quick_validate.py` aprovado;
- forward-tests revisados;
- skill instalada em `.claude/skills/frontend-module-workflow`.

## Resultado esperado

Ao terminar, informar:

- caminho da skill;
- arquivos criados;
- resumo dos gatilhos;
- recursos e scripts incluídos ou deliberadamente omitidos;
- resultado da validação;
- resultado dos forward-tests;
- exemplo de como citar a skill em uma spec/task OpenSpec.
