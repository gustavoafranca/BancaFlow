# Prompt — OpenSpec: revisar arquitetura, componentes compartilhados e rotas do Web

Use este prompt para propor uma change OpenSpec de revisão e evolução do frontend do BancaFlow, atualmente criado em grande parte a partir de layouts compartilhados do Claude Design.

## Como usar

1. Execute `/openspec-propose review-web-frontend-architecture`.
2. Forneça o conteúdo completo deste arquivo como instrução.
3. Revise `proposal.md`, `design.md`, os delta specs e `tasks.md` antes de implementar.
4. Somente depois execute `/openspec-apply-change review-web-frontend-architecture`.

Este prompt cria uma **proposta e uma especificação**, não autoriza refatoração imediata. Na etapa de proposta, não mover componentes, não alterar rotas e não modificar comportamento.

## Change obrigatória

Crie, usando a skill `openspec-propose`, a change:

`review-web-frontend-architecture`

Gere todos os artefatos até a change ficar pronta para aplicação:

- `proposal.md`;
- `design.md`;
- delta specs por capability;
- `tasks.md` incremental e verificável;
- validação OpenSpec estrita.

## Objetivo

Revisar integralmente `apps/web` e planejar uma arquitetura frontend coesa, simples de entender e compatível com DDD e Arquitetura Limpa, sem perder a fidelidade visual das telas importadas do Claude Design.

A proposta deve:

1. inventariar todos os componentes, páginas, layouts, hooks, contexts, schemas, clientes HTTP, utilitários e assets realmente usados;
2. encontrar componentes duplicados ou quase duplicados;
3. definir quais componentes pertencem a `apps/web/src/shared/components`;
4. manter componentes específicos no módulo, fluxo ou página proprietária;
5. corrigir imports e dependências sem transformar `shared` em pasta genérica para qualquer código;
6. preservar acessibilidade, responsividade, tokens visuais e comportamento atual;
7. definir o comportamento de `/`, login, dashboard e host sem tenant válido;
8. criar testes que provem rotas, autenticação, isolamento por host e reuso dos componentes.

## Skills obrigatórias e relação entre elas

Leia integralmente antes de propor:

- `.claude/skills/config-shared-frontend/SKILL.md`;
- `.claude/skills/import-cloud-design-next/SKILL.md`;
- `.claude/skills/frontend-form-schema/SKILL.md`;
- `.claude/skills/config-new-module/SKILL.md`;
- `apps/web/AGENTS.md` e os guias relevantes da versão instalada do Next.js em `node_modules/next/dist/docs/`.

Use as skills como critérios, não execute seus scripts nesta etapa.

Registre no `design.md`:

- `config-shared-frontend` é referência do design system, shell único e menu único, mas seu script não deve ser reaplicado sobre o Web existente sem análise e confirmação, pois ele pode recriar arquivos;
- `import-cloud-design-next` explica a origem das telas, assets e esqueletos importados, e exige reuso antes de criação;
- `frontend-form-schema` é a referência para React Hook Form, schemas `v`, mensagens e componentes compartilhados de formulário;
- `config-new-module` cria apenas um scaffold mínimo; não substitui a implementação arquitetural de uma funcionalidade Web;
- se existir uma futura skill `frontend-module-workflow`, registrá-la nas tarefas de aplicação como critério principal para módulos Web.

## Fonte de verdade e leitura obrigatória

Antes de desenhar a solução, inspecione integralmente:

- `README.md`;
- `apps/web/README.md`;
- `apps/web/AGENTS.md`;
- `apps/web/package.json`, `tsconfig.json`, `next.config.ts`, configuração Jest e Tailwind/PostCSS;
- todo `apps/web/src/app/**`;
- todo `apps/web/src/modules/**`;
- todo `apps/web/src/shared/**`;
- todo `apps/web/src/components/**`, se existir;
- `apps/web/public/**`, especialmente assets importados;
- `design-import/**`, `.dc.html`, relatórios e HTML/CSS extraídos, quando existirem;
- testes do Web;
- contrato HTTP documentado em `apps/backend/src/modules/**/README.md`;
- DTOs/controllers do backend apenas quando necessários para confirmar o contrato consumido;
- `modules/**` somente para compreender linguagem e bounded contexts, sem duplicar regras no React;
- specs OpenSpec vigentes e changes relacionadas a Identity/Tenancy.

A implementação e os testes atuais prevalecem sobre prompts antigos e sobre o HTML exportado do Claude Design. O design importado é referência visual, não fonte de regra de negócio.

## Capability 1 — Inventário e auditoria de componentes

A proposta deve exigir um inventário verificável contendo, para cada componente:

- nome e caminho;
- exports e principais imports;
- páginas/módulos consumidores;
- responsabilidade;
- `server component` ou `client component` e justificativa do boundary;
- dependências externas;
- estado: usado, não usado, duplicado, quase duplicado ou legado;
- classificação proposta: shared, módulo, fluxo/página ou remoção futura;
- risco e estratégia de migração.

Detectar pelo menos:

- nomes duplicados;
- JSX/estilos muito semelhantes;
- primitives recriadas fora do design system;
- componentes globais que importam módulos de negócio;
- imports profundos que poderiam usar barrel estável;
- arquivos exportados mas não consumidos;
- componentes excessivamente grandes;
- uso desnecessário de `use client`;
- regras de negócio ou autorização implementadas apenas na UI;
- inconsistências entre assets, tokens, variantes e breakpoints.

Não decidir compartilhamento somente pelo nome. Confirmar consumidores e motivo de mudança.

## Capability 2 — Regra de classificação shared vs. módulo

Definir e aplicar esta política:

### `apps/web/src/shared/components`

Somente componentes independentes de bounded context, por exemplo:

- primitives do design system (`Button`, `Input`, `Dialog`, `Table`);
- composição genérica de formulários;
- feedback genérico (`EmptyState`, loading, error boundary, toast);
- shell, branding e elementos de layout realmente globais;
- componentes reutilizados por dois ou mais módulos quando possuem o mesmo significado;
- componentes deliberadamente públicos do design system, mesmo antes do segundo consumidor, quando essa intenção estiver justificada.

Shared não pode importar `src/modules/**` nem conter regras, DTOs ou textos específicos de um domínio.

### `apps/web/src/modules/<domain>`

Manter no módulo:

- componentes que expressam linguagem do bounded context;
- páginas internas e composições do módulo;
- schemas, mappers, tipos de apresentação e clientes específicos;
- componentes usados por várias páginas do mesmo módulo;
- estados e regras de interação específicos do módulo.

### `app/**/_components`

Manter junto da rota:

- componente exclusivo de uma página/fluxo;
- composição dependente do layout daquela rota;
- código sem API pública estável para o módulo.

Promover para módulo/shared apenas quando o reuso real ou a responsabilidade justificar. Não criar abstração prematura.

## Capability 3 — Dependências e DDD no frontend

Planejar a direção:

```text
app/routes → modules → shared
app/routes → shared
shared -X→ modules
```

Regras obrigatórias:

- `app/**/page.tsx` deve ser fino e compor pages/components;
- módulos não devem importar detalhes internos de outros módulos; composição cross-module pertence ao App Router ou a uma API pública explícita;
- componentes não acessam Prisma, banco, secrets ou entidades de persistência;
- regras de negócio autoritativas permanecem no domínio/backend;
- validação Web melhora UX, mas não substitui validação do domínio;
- DTOs HTTP devem ser adaptados para view models quando a tela não precisa do contrato cru;
- efeitos HTTP ficam em clientes/hooks apropriados, não espalhados em primitives visuais;
- Server Components são o default; usar Client Components apenas para estado, eventos ou APIs do browser;
- manter nomes, arquivos e exports simples, em inglês, seguindo as convenções atuais do projeto.

Não simular DDD criando entidades ricas duplicadas no frontend. No Web, bounded contexts organizam linguagem, componentes, dados e fluxos de apresentação.

## Capability 4 — Migração incremental do design importado

O `design.md` deve incluir uma matriz de migração em fases:

1. inventário e characterization tests;
2. consolidação das primitives compartilhadas;
3. migração de componentes compostos realmente globais;
4. organização por módulo e por rota;
5. remoção de duplicações apenas depois de todos os consumidores migrarem;
6. limpeza de exports/assets não usados;
7. validação visual e funcional final.

Cada fase deve manter build e testes verdes. Não fazer uma mudança massiva sem checkpoints. Não sobrescrever o design system com o script da `config-shared-frontend`.

Preservar:

- aparência e comportamento aprovados no Claude Design;
- responsividade mobile/tablet/desktop;
- acessibilidade por teclado, foco, labels, roles e contraste;
- tokens do tema e `cn`/variantes canônicas;
- assets locais em `public`, sem URLs temporárias do design;
- uma única navegação e um único `AdminShell`.

## Capability 5 — Rotas, autenticação e tenant

Especificar com cenários verificáveis:

### Login e dashboard

- login bem-sucedido com `mustChangePassword=false` redireciona para `/dashboard`;
- login com `mustChangePassword=true` redireciona para `/trocar-senha`;
- troca obrigatória bem-sucedida redireciona para `/dashboard` sem refresh manual de token;
- usuário autenticado normal que visita `/login` deve ir para `/dashboard`;
- usuário anônimo que visita rota privada deve ir para `/login`;
- evitar loops entre `/login`, `/trocar-senha` e `/dashboard`;
- backend permanece autoritativo sobre sessão, conta e tenant.

### Rota raiz por host

Para um host de tenant conhecido, como `http://farizeu.localhost:3000/`:

- sem sessão válida: redirecionar para `/login`;
- sessão válida e sem troca obrigatória: redirecionar para `/dashboard`;
- sessão válida com troca obrigatória: redirecionar para `/trocar-senha`.

### Host sem tenant cadastrado

Registrar uma decisão arquitetural explícita. Comparar pelo menos:

1. encaminhar todo host sintaticamente válido para login e manter erro genérico somente após tentativa;
2. consultar contexto público mínimo no backend e exibir uma página genérica de endereço indisponível/404;
3. tratar host inválido, reservado, tenant inexistente e tenant inativo com respostas distintas ou deliberadamente não enumeráveis.

Recomendação inicial: usar resolução autoritativa do backend e uma página genérica, sem nome/branding do tenant, para host inexistente/inválido; não consultar banco diretamente no Next e não confiar em `tenantId` enviado pelo browser. Se isso exigir um novo endpoint público de contexto, incluir a alteração Backend na proposta, com contrato mínimo, rate limiting/cache quando necessário e análise de enumeração. Não inventar o endpoint silenciosamente.

Cobrir também:

- `localhost` sem subdomínio;
- subdomínio reservado;
- formato inválido;
- tenant inativo;
- ambiente local `.localhost`, produção e proxy confiável;
- preservação de `Host`/`X-Forwarded-Host` no rewrite;
- página 404 real e status HTTP quando tecnicamente possível no App Router.

## Capability 6 — Testes e qualidade

Planejar e executar na futura aplicação:

- testes de primitives compartilhadas e variantes;
- testes de componentes de módulo;
- testes de acessibilidade com Testing Library;
- testes de schemas/forms via `frontend-form-schema`;
- testes de `proxy.ts` e redirects de `/`, `/login`, `/trocar-senha` e rotas privadas;
- testes do `next.config.ts`/rewrite e forwarded host;
- testes de cliente HTTP e silent refresh;
- testes de tenant conhecido, inexistente, inativo e host inválido;
- E2E/browser para login → troca obrigatória → dashboard;
- visual regression ou checklist visual por viewport para telas importadas;
- busca por imports proibidos e ciclos;
- detecção de componentes/exports/assets órfãos;
- `npm run lint`, `npm run check-types`, `npm run test` e `npm run build`.

Não alterar snapshots ou afrouxar testes apenas para fazer a refatoração passar.

## Estrutura esperada de tarefas

Organizar `tasks.md` em fases pequenas:

1. auditoria e inventário, sem movimentações;
2. decisões arquiteturais e matriz de ownership;
3. testes de caracterização;
4. design system/shared primitives;
5. componentes compostos compartilhados;
6. reorganização de cada módulo, um por vez;
7. rotas e autenticação;
8. comportamento de tenant inexistente;
9. limpeza de duplicações e órfãos;
10. validação visual, funcional e arquitetural.

Quando houver escopos de escrita disjuntos, permitir subagentes separados para auditoria, shared, módulos e rotas, seguidos por integração do agente principal. Não permitir alterações concorrentes nos mesmos barrels, layouts ou arquivos de navegação.

## Critérios de aceite

A futura aplicação só estará concluída quando:

1. existir inventário de todos os componentes e consumidores;
2. cada componente possuir ownership justificado;
3. não houver duplicação evitável de primitives;
4. shared não importar módulos;
5. módulos não dependerem de detalhes internos de outros módulos;
6. páginas do App Router forem composições finas;
7. login e troca obrigatória terminarem em `/dashboard` conforme o estado;
8. `/` tiver comportamento determinístico por sessão/tenant;
9. host sem tenant tiver comportamento explícito, seguro e testado;
10. aparência, responsividade e acessibilidade forem preservadas;
11. links/assets/imports/exports forem válidos e sem órfãos relevantes;
12. lint, types, testes e build estiverem verdes;
13. `openspec validate review-web-frontend-architecture --strict` passar.

## Fora de escopo da proposta

- reescrever o Backend ou o domínio sem necessidade demonstrada;
- alterar identidade visual aprovada;
- criar abstrações por preferência estética;
- mover tudo para shared;
- duplicar regras de negócio no Web;
- substituir bibliotecas sem evidência;
- executar automaticamente scripts que sobrescrevam o Web existente;
- arquivar a change antes de revisão humana.

## Resultado esperado

Ao terminar a proposta, informar:

- change criada e localização;
- capabilities e artefatos gerados;
- resumo do inventário preliminar;
- decisões pendentes, especialmente tenant inexistente;
- skills que serão usadas durante a aplicação;
- ordem incremental de implementação;
- comando `/openspec-apply-change review-web-frontend-architecture`.
