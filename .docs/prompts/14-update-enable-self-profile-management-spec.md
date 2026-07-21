# Prompt — Atualizar a spec `enable-self-profile-management` antes da implementação

Use este prompt para revisar e corrigir a change OpenSpec existente:

`enable-self-profile-management`

A change está estruturalmente válida no OpenSpec, mas uma auditoria arquitetural encontrou uma decisão de concorrência que não cabe na API atual da entidade, roteamento incompleto de skills e uma sequência Web incompatível com o workflow obrigatório de `frontend-module-workflow`.

Este update deve tornar os artefatos implementáveis e coerentes antes de qualquer `/opsx:apply`. Não crie uma nova change, não altere o objetivo do INC-01 e não implemente código nesta etapa.

## Como usar

Execute:

```text
/opsx:update enable-self-profile-management .docs/prompts/14-update-enable-self-profile-management-spec.md
```

Fluxo obrigatório:

1. Use a skill `openspec-update-change`.
2. Execute `openspec status --change "enable-self-profile-management" --json` e use somente os caminhos concretos de `artifactPaths.<id>.existingOutputPaths`.
3. Leia integralmente todos os artefatos existentes da change e as fontes indicadas neste prompt.
4. Apresente as revisões propostas, um artefato por vez, com a justificativa de cada mudança.
5. Aguarde confirmação antes de escrever cada artefato, conforme `openspec-update-change`.
6. Atualize somente artefatos OpenSpec existentes. Não altere arquivos de `modules/`, `apps/`, `packages/`, Prisma, testes ou documentação de implementação.
7. Ao final, execute `openspec validate enable-self-profile-management --strict`.
8. Informe os artefatos revisados, decisões finais e o próximo comando recomendado. Não execute `/opsx:apply` automaticamente.

## Skills obrigatórias para a revisão

Leia integralmente:

- `.claude/skills/openspec-update-change/SKILL.md`;
- `.claude/skills/module-entity/SKILL.md` e as referências exigidas para alteração de entidade;
- `.claude/skills/module-use-case/SKILL.md` e as referências exigidas para casos de uso;
- `.claude/skills/module-dto/SKILL.md`;
- `.claude/skills/module-query-cqrs/SKILL.md`;
- `.claude/skills/backend-prisma-data/SKILL.md`;
- `.claude/skills/backend-controller/SKILL.md`;
- `.claude/skills/frontend-module-workflow/SKILL.md` e as referências aplicáveis de arquitetura, slice e testes;
- `.claude/skills/frontend-form-schema/SKILL.md`.

As skills de implementação são critérios arquiteturais para revisar `design.md` e `tasks.md`. Não as use para alterar código durante `/opsx:update`.

## Fontes obrigatórias

Leia e confronte:

- `.docs/prompts/13-enable-self-profile-management.md`;
- `.docs/plans/foundation/08-identity-profile-and-tenant-user-administration.md`;
- todos os artefatos existentes de `openspec/changes/enable-self-profile-management/` retornados pelo status;
- `openspec/specs/authenticated-user-context/spec.md`;
- `openspec/specs/user-account-management/spec.md`;
- `modules/identity/src/user-account/user-account.entity.ts`;
- `modules/identity/src/user-account/user-account.repository.ts`;
- `modules/identity/src/shared/dto/authenticated-user-context.dto.ts`;
- `modules/identity/src/shared/ports/authenticated-user-account.query.ts`;
- `modules/identity/src/app/use-case/get-authenticated-user-context.use-case.ts`;
- `apps/backend/src/modules/identity/adapters/user-account.repository.prisma.ts`;
- `apps/backend/src/modules/identity/adapters/authenticated-user-account.query.prisma.ts`;
- `apps/backend/src/modules/identity/identity.controller.ts`;
- DTOs e testes existentes de `apps/backend/src/modules/identity/`;
- `apps/web/AGENTS.md` e `apps/web/CLAUDE.md`;
- `apps/web/src/modules/perfil/`;
- `apps/web/src/shared/api/auth.client.ts`;
- `apps/web/src/shared/session/use-current-user.ts` e seus testes;
- shell/layout privado que consome o usuário autenticado.

Não presuma APIs, métodos ou mecanismos de cache. Confira a implementação real.

## Escopo preservado

O update continua limitado ao INC-01:

- autogestão do próprio nome e e-mail por qualquer usuário autenticado;
- `GET /api/auth/me` fornecendo o contexto real e a versão necessária;
- `PATCH /api/auth/me` atualizando somente a própria conta;
- concorrência otimista sem sobrescrita silenciosa;
- atualização imediata da exibição no perfil e no shell, sem novo login;
- nenhuma nova tabela ou migration;
- nenhuma revogação de sessão causada por nome/e-mail.

Continuam fora de escopo:

- criação, listagem ou administração de usuários de terceiros;
- alteração de papel, username, status ou senha nesta rota;
- INC-02 e INC-03;
- papéis personalizados;
- novo módulo/bounded context;
- bootstrap ou reconstrução de `shared/`;
- importação de design;
- implementação durante este update.

## Correção obrigatória 1 — Concorrência em duas janelas distintas

### Problema atual

O `design.md` manda o `UpdateOwnProfileUseCase` ler a conta e depois “forçar `version: expectedVersion`” na entidade antes de `save`.

Essa orientação não cabe na API atual:

- `UserAccount.rebuild(...)` é privado;
- não existe método público para substituir somente `version`;
- reconstruir manualmente a entidade no caso de uso acoplaria o fluxo aos props internos;
- `version` é transportado pelo domínio, mas comparação e incremento persistente pertencem à estratégia de concorrência.

O design também rejeita como “redundante” comparar `expectedVersion` com `account.version`. Essa conclusão deve ser corrigida: existem duas janelas de concorrência diferentes.

### Decisão obrigatória

Adotar as duas proteções complementares:

1. O `UpdateOwnProfileUseCase` recebe `expectedVersion` e, após `findById`, compara-o com `account.version`.
2. Se forem diferentes, retorna imediatamente `IDENTITY_LOCAL_ERRORS.CONCURRENCY_CONFLICT`, sem aplicar mutação e sem chamar `save`.
3. Se forem iguais, aplica `rename`/`updateEmail` e chama `UserAccountRepository.save` com a versão normalmente preservada pela entidade.
4. O CAS existente de `UserAccountRepositoryPrisma.save` continua comparando `account.version` no `UPDATE ... WHERE version = ?` e incrementando a versão persistida.

As proteções cobrem janelas distintas:

- comparação no use case: mudança ocorrida entre o `GET /api/auth/me` do cliente e a leitura feita pelo PATCH;
- CAS no adapter: mudança ocorrida entre a leitura do PATCH e sua escrita.

Não criar setter de versão, `forceVersion`, reconstrução artificial da entidade nem regra Prisma dentro do caso de uso.

Atualize `design.md`, requisitos/cenários afetados e `tasks.md` para refletir essa decisão. Mantenha `409 IDENTITY.CONCURRENCY_CONFLICT` e exija testes separados para:

- `expectedVersion` já desatualizado no momento da leitura do use case;
- conflito CAS retornado pelo repository após uma leitura inicialmente compatível;
- ausência de escrita nos dois conflitos;
- atualização com versão compatível.

## Correção obrigatória 2 — Assinaturas coerentes da entidade

Há divergência entre os artefatos:

- partes da proposta/prompt original citam `Result<void>`;
- `design.md`, `tasks.md` e o padrão imutável atual de `UserAccount` trabalham com nova instância e `Result<UserAccount>`.

Padronize todos os artefatos existentes para:

```ts
rename(newName: PersonName): Result<UserAccount>
updateEmail(newEmail: Email | null): Result<UserAccount>
```

Os métodos devem usar `this.rebuild(...)`, preservar os demais props e retornar uma nova instância válida. Não introduzir mutação interna nem setter.

## Correção obrigatória 3 — Roteamento completo das skills

Revise `tasks.md` para associar as skills às tarefas realmente cobertas por elas.

### Domínio e contratos

- métodos e testes da entidade: `module-entity`;
- criação, orquestração e testes do `UpdateOwnProfileUseCase`: `module-use-case`;
- input/output do novo caso de uso e alterações em `AuthenticatedUserContextDto`/`AuthenticatedUserAccountDto`: `module-dto`;
- alteração da projeção `AuthenticatedUserAccountQuery`, do use case de leitura e do adapter correspondente: `module-query-cqrs`;
- exports/barrels devem permanecer associados à camada dos artefatos exportados, sem criar uma tarefa estrutural genérica.

### Backend

- alteração do adapter/query Prisma e regressão do CAS: `backend-prisma-data`;
- DTO HTTP, binding, guard, endpoint, resposta e mapeamento HTTP: `backend-controller`, usando `module-dto` apenas como critério complementar de contrato mínimo;
- não usar `config-prisma`, pois não existe mudança de schema, migration ou geração estrutural.

### Web

- toda a seção Web deve ser conduzida por `frontend-module-workflow`;
- schema e integração do formulário usam adicionalmente `frontend-form-schema`;
- não usar `config-new-module`, pois `modules/perfil` e `/perfil` já existem;
- não usar `config-shared-frontend`, pois `shared/` já está populado;
- não usar `import-cloud-design-next`, pois a tela já existe e não há `.dc.html` a importar.

### Orquestração futura

Registre que a implementação futura deve começar com `openspec-apply-change` para a change `enable-self-profile-management`. Essa skill orquestra a aplicação; as demais são selecionadas por grupo/tarefa.

## Correção obrigatória 4 — Reordenar o grupo Web pelo workflow real

O grupo Web atual resume incorretamente a ordem como `contrato/tipos → shared → módulo/feature → rotas → testes`. Substitua por tarefas implementáveis na ordem obrigatória de `frontend-module-workflow`:

1. Inspecionar contrato HTTP, implementação atual de `modules/perfil`, sessão/shell, primitives compartilhadas e testes.
2. Atualizar os tipos de `GET /api/auth/me` e `PATCH /api/auth/me`, incluindo `version` e resultados HTTP discriminados.
3. Definir schema e tipo inferido do formulário com `frontend-form-schema`.
4. Criar/ajustar mapper ou view model somente se a inspeção comprovar necessidade; não criar abstração cerimonial.
5. Implementar cliente HTTP e hook/mutação, cobrindo sucesso, erro de validação, não autenticado e conflito `409`.
6. Reutilizar primitives reais de `shared` após conferir seus exports/props; não promover componentes específicos de perfil para `shared`.
7. Atualizar componentes do módulo e manter a page de rota fina.
8. Implementar estados de loading, erro, edição, envio, sucesso e conflito, com acessibilidade.
9. Sincronizar perfil e shell após o PATCH por um mecanismo real e único de atualização/invalidação do contexto autenticado.
10. Executar testes e gates do Web antes de marcar tarefas concluídas.

Não exigir criação de nova rota nem item de navegação, porque `/perfil` já existe. Apenas revisar proxy/autenticação se a implementação atual demonstrar necessidade.

## Correção obrigatória 5 — Fonte única para atualizar perfil e shell

A tarefa atual exige que o novo nome apareça imediatamente no shell, mas não define como instâncias distintas de `useCurrentUser` serão sincronizadas.

O `design.md` deve registrar uma estratégia compatível com a arquitetura Web existente. Antes de decidir, inspecione a implementação real.

Preferência arquitetural:

- após sucesso do PATCH, atualizar ou invalidar uma fonte compartilhada do contexto autenticado;
- garantir que `/perfil` e shell consumam essa mesma fonte;
- quando necessário, refazer `GET /api/auth/me` para obter o estado autoritativo e a nova `version` persistida;
- não fabricar localmente uma versão incrementada nem depender de novo login;
- não colocar regra de negócio em React ou em `shared`.

Se o projeto ainda não possuir cache/provider compartilhado apropriado, o design pode planejar a menor solução incremental dentro da fronteira de sessão existente. Não introduza biblioteca nova sem necessidade comprovada.

Defina no contrato se o PATCH retorna apenas confirmação/projeção mínima e se o Web sempre refaz o GET, ou se retorna uma projeção atualizada suficiente. Proposal, design, spec e tasks devem adotar a mesma decisão. Não deixe o comportamento implícito.

## Correção obrigatória 6 — Evidências e testes por camada

Detalhe em `tasks.md`, sem marcar nada como concluído:

### Domínio

- `rename` e `updateEmail` válidos;
- nome/e-mail inválidos;
- `email: null`;
- preservação de id, banca, credencial, datas e versão pelo `rebuild`;
- comportamento imutável, retornando nova entidade.

### Caso de uso

- atualização somente de nome;
- atualização somente de e-mail;
- limpeza de e-mail;
- conta inexistente;
- `expectedVersion` desatualizado antes da mutação;
- conflito CAS devolvido pelo repository;
- falha de validação sem persistência;
- nenhuma revogação de sessão.

### Query/Prisma/Backend

- projeção de `GET /api/auth/me` inclui `version` e continua sem campos internos;
- adapter mapeia `version` corretamente;
- regressão do CAS existente;
- `PATCH /api/auth/me` autenticado com identidade exclusivamente do `AuthContext`;
- payload não consegue escolher `userId` ou `bancaId`;
- validação, sucesso e `409`;
- resposta não serializa entidade nem row Prisma.

### Web

- tipos e cliente HTTP;
- schema e mensagens de validação;
- renderização dos dados reais;
- campos somente leitura;
- loading, erro, submit, sucesso e conflito;
- recarga/retry após `409`;
- atualização sincronizada do perfil e shell;
- acessibilidade por roles, labels e foco/mensagem após erro;
- ausência de mock na subseção “Informações”.

### Gates

- testes unitários e de componente aplicáveis;
- testes do cliente HTTP para cada branch de status;
- testes Backend unitários/integração/e2e aplicáveis;
- check-types, lint e builds dos projetos afetados;
- `openspec validate enable-self-profile-management --strict` após o update e novamente após a aplicação.

Não declarar revisão visual ou E2E como executados durante `/opsx:update`; apenas planejar as evidências futuras.

## Revisões esperadas por artefato

### `proposal.md`

- preservar motivação, escopo e separação dos INC-02/INC-03;
- corrigir assinaturas para `Result<UserAccount>`;
- resumir a concorrência em duas proteções complementares;
- manter nenhuma migration e nenhuma revogação de sessão;
- definir de forma coerente o resultado observável do PATCH e a atualização do shell.

### `design.md`

- substituir integralmente a decisão atual de “forçar version”;
- explicar as duas janelas de concorrência;
- preservar CAS no adapter e comparação do `expectedVersion` no use case;
- definir o contrato de resposta/refetch após PATCH;
- definir a fonte única de contexto autenticado no Web;
- atualizar riscos, trade-offs e testes afetados;
- remover afirmações de que a comparação no use case seria redundante.

### Specs delta

- manter autogestão disponível igualmente para `OWNER`, `ADMIN` e `USER`;
- manter `email: null`, escopo do ator autenticado e ausência de revogação;
- ajustar cenários de concorrência para cobrir versão desatualizada antes do save e CAS perdido durante a escrita;
- manter `version` na projeção pública de `GET /api/auth/me` sem liberar outros campos internos;
- definir o comportamento de sucesso necessário para nova edição e atualização do shell sem contradizer o contrato HTTP.

### `tasks.md`

- corrigir a decisão de concorrência;
- aplicar o roteamento de skills desta revisão;
- reordenar o Web pelo slice obrigatório;
- tornar testes e gates explícitos;
- manter todas as tarefas abertas;
- não adicionar tarefas de INC-02/INC-03 nem tarefas de scaffold/migration.

## Critérios de aceite do update

O update estará pronto quando:

1. todos os artefatos usarem `Result<UserAccount>` nos métodos da entidade;
2. nenhum artefato mandar substituir artificialmente `version` na entidade;
3. comparação de `expectedVersion` no use case e CAS no repository estiverem descritos como complementares;
4. os dois tipos de conflito tiverem tarefas/testes explícitos;
5. `module-dto` e `module-query-cqrs` estiverem ligados às tarefas corretas;
6. `backend-prisma-data`, `backend-controller`, `module-entity` e `module-use-case` cobrirem seus respectivos grupos;
7. toda a entrega Web estiver sob `frontend-module-workflow`, com `frontend-form-schema` como complementar;
8. a ordem Web seguir contrato → schema/mapper → cliente/hook → primitives existentes → componentes → estados → testes;
9. perfil e shell tiverem uma estratégia única e implementável de sincronização;
10. o contrato de sucesso/refetch estiver explícito e coerente entre proposal, design, specs e tasks;
11. nenhuma skill estrutural indevida (`config-new-module`, `config-shared-frontend`, `config-prisma`, `import-cloud-design-next`) for acionada;
12. nenhum código tiver sido alterado durante o update;
13. todas as tarefas permanecerem abertas;
14. `openspec validate enable-self-profile-management --strict` passar.

## Resultado esperado

Ao finalizar, informe:

- artefatos revisados e justificativa;
- decisão final de concorrência;
- assinatura final dos métodos da entidade;
- contrato final de sucesso/refetch do PATCH;
- estratégia Web para sincronizar perfil e shell;
- matriz final de skills por grupo;
- resultado da validação OpenSpec estrita;
- próximo passo recomendado: revisão humana e, somente depois, `/opsx:apply enable-self-profile-management`.

Não implemente, não arquive e não execute a aplicação automaticamente.
