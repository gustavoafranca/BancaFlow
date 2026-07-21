# Prompt — Propor spec de alinhamento da navegação de perfil e da superfície de configurações

## Missão

Crie uma proposta OpenSpec completa, sem implementar código, para reconciliar a experiência autenticada de perfil e configurações com as capabilities que realmente existem hoje.

A proposta deve ligar o item **Meu Perfil** do menu da conta à rota `/perfil`, manter nessa página somente informações e ações sustentadas por contratos reais e impedir que `/configuracoes` apresente usuários, papéis, permissões ou integrações simuladas como funcionalidades prontas.

Não transforme esta change na implementação dos increments pendentes dos planos Foundation 08 e 09.

## Change pretendida

- **Nome sugerido:** `align-profile-settings-experience`
- **Área/trilha:** `foundation`
- **Natureza:** integração e reconciliação Web sobre capabilities existentes; nenhuma nova regra de negócio.
- **Resultado vertical:** qualquer usuário autenticado consegue navegar pelo menu da conta até o próprio perfil real; `/perfil` não exibe capabilities fabricadas; `/configuracoes` comunica honestamente o que ainda não foi implementado.
- **Capability specs candidatas:**
  - `self-profile-management` — MODIFIED, para incluir descoberta/navegação e a obrigação de não apresentar dados ou ações sem fonte autoritativa;
  - `settings-capability-visibility` — ADDED, caso a inspeção confirme que não existe uma capability principal equivalente para expressar a superfície honesta de `/configuracoes`.

Não invente uma capability nova se uma spec principal existente já possuir ownership claro sobre o requisito. Registre a escolha no `design.md`.

## Como executar

1. Use a skill `openspec-propose`.
2. Execute `openspec list --json` e confirme que não existe uma change ativa equivalente.
3. Leia todas as fontes obrigatórias deste prompt antes de criar artefatos.
4. Inspecione a implementação real; não presuma que elementos visuais representam funcionalidades entregues.
5. Crie `proposal.md`, `design.md`, delta specs e `tasks.md` para uma única change vertical e pequena.
6. Não implemente código, não aplique a change e não altere os planos durante esta execução.
7. Execute `openspec validate align-profile-settings-experience --strict` ao final.
8. Informe conflitos, dependências e o próximo comando recomendado, sem executar `/opsx:apply` automaticamente.

Se a inspeção provar que a demanda exige reabrir decisões de negócio dos planos 08 ou 09, não as invente dentro da spec: registre o bloqueio e recomende uma execução separada de `plan-spec-roadmap`.

## Fontes obrigatórias e precedência

Leia e confronte, nesta ordem:

1. `apps/web/AGENTS.md` e `apps/web/CLAUDE.md`.
2. `.docs/plans/00-project-context.md`.
3. `.docs/plans/00-bancaflow-mvp-roadmap.md`.
4. `.docs/plans/foundation/08-identity-profile-and-tenant-user-administration.md`.
5. `.docs/plans/foundation/09-authoritative-access-control.md`.
6. `openspec/specs/self-profile-management/spec.md`.
7. `openspec/specs/authenticated-user-context/spec.md`.
8. `openspec/specs/route-protection-frontend/spec.md`.
9. `openspec/specs/web-frontend-boundaries/spec.md`.
10. `openspec/specs/web-frontend-testing/spec.md`.
11. A change arquivada `openspec/changes/archive/2026-07-18-enable-self-profile-management/`.
12. A change arquivada `openspec/changes/archive/2026-07-18-review-web-frontend-architecture/`, apenas nos trechos referentes a `/perfil`, `/configuracoes`, navegação e tenant local.
13. Implementação e testes reais listados abaixo.

Em caso de conflito:

- specs principais sincronizadas prevalecem sobre protótipos e comentários antigos;
- decisões `DECIDED` dos planos 08/09 não podem ser reabertas silenciosamente;
- código demonstrativo não se torna requisito de negócio apenas porque está renderizado;
- qualquer divergência deve aparecer em `proposal.md`/`design.md`, não ser resolvida por suposição.

## Inspeção obrigatória do código atual

### Navegação e sessão

- `apps/web/src/app/(private)/_shell/app-navbar.tsx` e testes;
- `apps/web/src/app/(private)/_shell/app-sidebar.tsx` e testes;
- `apps/web/src/app/(private)/layout.tsx`;
- `apps/web/src/shared/session/current-user-provider.tsx`;
- `apps/web/src/shared/session/use-current-user.ts`;
- `apps/web/src/shared/api/auth.client.ts`;
- rotas finas `apps/web/src/app/(private)/perfil/page.tsx` e `apps/web/src/app/(private)/configuracoes/page.tsx`.

Confirme explicitamente o estado atual do `DropdownItem`: **Meu Perfil** e **Configurações** são elementos com aparência clicável, mas sem `href` ou `onClick` de navegação.

### Perfil

- todo `apps/web/src/modules/perfil/`;
- testes de página, schema, provider e cliente HTTP relacionados;
- usos de `perfil.sample.ts`;
- conteúdo das abas **Informações**, **Segurança** e **Atividade**;
- valores estáticos de “Membro desde”, “Último acesso”, estatísticas, sessões, atividade e 2FA.

Classifique cada elemento visível como:

- **autoritativo e implementado**;
- **implementado no backend, mas ainda sem integração Web aprovada**;
- **demonstrativo/mock sem capability**;
- **fora de escopo desta change**.

### Configurações

- todo `apps/web/src/modules/configuracoes/`;
- `configuracoes.sample.ts`;
- `lib/permissions.ts` e seus testes;
- route wrapper e pontos de navegação para `/configuracoes`;
- clientes HTTP, hooks ou endpoints efetivamente consumidos pela página, se existirem.

Confirme por evidência se existe alguma operação real. A linha de base esperada, que deve ser verificada e não apenas copiada, é:

- usuários vêm de `USUARIOS`/`PROFILE_USERS` demonstrativos;
- perfis e permissões vêm de uma matriz local fabricada;
- turnos e integrações também usam dados/estados locais;
- botões e drawers simulam CRUD sem persistência ou autorização autoritativa;
- a página não consome hoje contratos reais de administração de usuários nem de Access Control.

## Decisões obrigatórias desta proposta

### D1 — “Meu Perfil” é navegação real para qualquer usuário autenticado

- O item **Meu Perfil** do dropdown da conta SHALL navegar para `/perfil`.
- A navegação vale igualmente para `OWNER`, `ADMIN` e `USER`, pois autogestão não depende de papel.
- O controle deve ter semântica real de link/navegação, funcionar por teclado, fechar o dropdown e preservar o comportamento do App Router usado pela versão local do Next.js.
- Antes de especificar a implementação, exigir leitura da documentação local relevante em `node_modules/next/dist/docs/`; não presumir APIs de outra versão do Next.

### D2 — `/perfil` mostra somente o que possui lastro real

Manter na experiência de produção:

- nome e e-mail reais, editáveis pelo titular conforme `self-profile-management`;
- username, papel e Banca reais, somente leitura;
- estados reais de loading, erro, edição, sucesso, conflito e falha de resincronização já implementados;
- sincronização autoritativa compartilhada com o shell via `CurrentUserProvider`.

Remover da renderização de produção nesta change, sem inventar dados substitutos:

- “Membro desde” e “Último acesso” fixos;
- estatísticas rápidas fixas;
- 2FA demonstrativo;
- sessões construídas por `perfil.sample.ts`;
- atividade/auditoria construída por `perfil.sample.ts`;
- abas ou controles que ficariam vazios depois da remoção desses mocks;
- textos que prometem “segurança” ou “preferências” quando a página entregue nesta change contém apenas informações pessoais reais.

Não excluir capabilities reais do backend. Se senha e sessões já possuírem endpoints implementados, registrá-las como candidatas a changes Web verticais futuras; não ligá-las incidentalmente nesta change de reconciliação.

### D3 — `/configuracoes` não pode apresentar protótipo como produto implementado

Enquanto os increments correspondentes não existirem:

- não exibir listas de usuários fictícios;
- não exibir os perfis fictícios `Administrador`, `Operador`, `Cambista` e `Somente Leitura` como modelo real de autorização;
- não exibir toggles de permissão editáveis, contagens ou vínculos fabricados;
- não exibir botões “Novo Usuário”, “Novo Perfil”, “Novo Turno”, “Nova API Key” ou drawers de CRUD sem contrato real;
- não afirmar que alterações foram salvas quando não há persistência.

A rota direta `/configuracoes` deve permanecer segura e renderizável, mas apresentar um estado honesto e acessível de capability ainda não disponível, sem dados de exemplo e sem ação falsa.

O item **Configurações** do dropdown da conta não deve ser transformado em navegação funcional nesta change. Remova sua aparência interativa ou retire-o temporariamente do dropdown até existir pelo menos uma capability real e autorizada para a página. Audite também o menu lateral e trate entradas equivalentes de forma coerente.

Não use `currentUser.role` no Web como substituto de autorização. Ocultar navegação é apenas experiência; quando `/configuracoes` ganhar operações reais, o Backend continuará sendo autoritativo.

### D4 — Planos 08 e 09 continuam separados

Esta change não implementa:

- plano 08, INC-02: listar/pesquisar/criar usuários da Banca;
- plano 08, INC-03: alterar username, papel, status ou senha de terceiros;
- plano 09, INC-04: catálogo autoritativo e matriz real de permissões;
- plano 09, INC-05: perfis personalizados.

O plano 09 permanece `DECISIONS_PENDING` por causa de D44. Não criar `PermissionCatalog`, `PermissionKey`, endpoints de Access Control, matriz papel × permissão nem perfis personalizados nesta proposta.

### D5 — O host local é pré-requisito, não escopo escondido

`http://farizeu.localhost:3000` é um host local válido segundo `route-protection-frontend`, mas existe uma regressão conhecida porque o ambiente atual está configurado somente para `.bancaflow.com.br`.

- Não misture a correção de resolução de tenant nesta change Web.
- Declare dependência explícita de uma change corretiva separada, sugerida como `restore-localhost-tenant-routing`.
- A change de UI não pode ser considerada validada ponta a ponta enquanto `http://farizeu.localhost:3000/` não resolver um tenant ativo.
- Testes unitários/de componente podem usar rotas relativas; o E2E de navegador deve usar o host local canônico depois que a dependência estiver resolvida.

## Escopo

- link real **Meu Perfil** → `/perfil` no menu da conta;
- semântica e acessibilidade corretas do item de navegação;
- fechamento do dropdown após navegação;
- reconciliação visual de `/perfil` com `self-profile-management` já implementada;
- remoção da renderização de dados e ações simuladas em `/perfil`;
- substituição da experiência simulada de `/configuracoes` por estado honesto de capability indisponível;
- reconciliação das entradas de navegação que prometem `/configuracoes` funcional;
- atualização dos testes e documentação Web afetados;
- rastreabilidade explícita com os planos 08/09 e com a dependência de host local.

## Fora de escopo

- qualquer alteração em entidade, caso de uso, Prisma ou endpoint de perfil já entregue;
- correção de `BANCA_HOST_SUFFIX`, proxy, resolver de tenant ou infraestrutura local nesta change;
- criação, listagem ou gestão de usuários de terceiros;
- criação ou edição de papéis/perfis;
- implementação do catálogo de permissões;
- autorização baseada somente no frontend;
- integração incidental de troca de senha, sessões, 2FA ou auditoria;
- turnos, WhatsApp, APIs e webhooks;
- redesign geral do shell ou de outras páginas;
- importação de novo design;
- implementação de código durante a proposta.

## Requisitos e cenários mínimos

Os artefatos devem conter cenários verificáveis para:

1. Usuário autenticado abre o menu da conta e navega por **Meu Perfil** até `/perfil`.
2. Navegação funciona por mouse e teclado e fecha o dropdown.
3. `OWNER`, `ADMIN` e `USER` veem o mesmo acesso ao próprio perfil.
4. `/perfil` continua exibindo e atualizando somente dados autoritativos.
5. `/perfil` não exibe valores estáticos de data, acesso, estatísticas, 2FA, sessões ou atividade.
6. `/perfil` não importa nem usa `perfil.sample.ts` no fluxo renderizado.
7. `/configuracoes` não exibe usuários ou perfis fictícios.
8. `/configuracoes` não oferece ações de criação/edição sem persistência real.
9. `/configuracoes` apresenta um estado acessível e não enganoso enquanto suas capabilities estão pendentes.
10. A navegação não usa papel do cliente como enforcement de segurança.
11. Teste E2E futuro, após a dependência de host: `http://farizeu.localhost:3000/` → login/sessão → menu **Meu Perfil** → `http://farizeu.localhost:3000/perfil`.

## Tasks esperadas na spec

Organize `tasks.md` na ordem do `frontend-module-workflow`:

1. inventário verificável de contratos, rotas, componentes, mocks e consumidores;
2. decisão de ownership e delta specs;
3. navegação do shell/dropdown;
4. reconciliação do módulo `perfil`;
5. reconciliação do módulo `configuracoes`;
6. testes de componente, navegação, acessibilidade e ausência de mocks;
7. E2E condicionado à restauração do host local;
8. documentação, auditoria de componentes, typecheck, lint, testes e build.

Não criar tarefas genéricas de “implementar configurações”. Cada tarefa deve dizer exatamente qual comportamento deixa de ser simulado e qual evidência comprova isso.

## Skills obrigatórias e condicionais

### Durante a proposta

- `openspec-propose` — obrigatória para criar a change e seus artefatos.
- `frontend-module-workflow` — obrigatória como critério arquitetural para inventário, boundaries, navegação, slice e testes; não usar para implementar nesta execução.

### Durante a aplicação futura

- `openspec-apply-change` — orquestração da implementação;
- `frontend-module-workflow` — implementação/revisão Web;
- nenhuma skill de formulário é necessária se o formulário real de perfil não mudar;
- nenhuma skill de domínio, controller ou Prisma é necessária, pois esta change não altera Backend.

### Não usar nesta change

- `config-new-module` — os módulos `perfil` e `configuracoes` já existem;
- `config-shared-frontend` — a estrutura compartilhada já existe;
- `import-cloud-design-next` — não há `.dc.html` nem novo design a importar;
- `module-*`, `backend-controller`, `backend-prisma-data` — nenhuma alteração de domínio/Backend pertence ao escopo;
- `plan-spec-roadmap` — o planejamento não deve ser refeito silenciosamente. Use-o apenas em execução separada se a auditoria exigir mudar os planos 08/09.

## Critérios de qualidade da proposta

- Uma única change pequena, sem absorver INC-02, INC-03 ou Access Control.
- Nenhuma afirmação de funcionalidade baseada apenas na aparência atual da UI.
- Nenhuma autorização inventada no Web.
- Nenhum mock promovido a regra de negócio.
- Nenhuma remoção de contrato Backend já implementado.
- Dependência de `restore-localhost-tenant-routing` registrada claramente.
- Tasks implementáveis e testáveis, com caminhos reais confirmados.
- `openspec validate --strict` aprovado.

## Saída solicitada

Crie os artefatos OpenSpec completos para `align-profile-settings-experience`, mantendo a change limitada à navegação e à reconciliação honesta das superfícies Web. Ao final, apresente:

- artefatos criados;
- capabilities adicionadas/modificadas e justificativa de ownership;
- elementos de `/perfil` classificados como mantidos, removidos ou adiados;
- evidência do estado atual de `/configuracoes`;
- dependências e follow-ups separados para:
  - `restore-localhost-tenant-routing`;
  - plano 08, INC-02/INC-03;
  - plano 09, INC-04 após resolução de D44;
- resultado do `openspec validate align-profile-settings-experience --strict`;
- próximo comando recomendado, sem executar a implementação.
