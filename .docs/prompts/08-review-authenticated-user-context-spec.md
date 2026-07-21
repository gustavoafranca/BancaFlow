# Prompt — Revisar a OpenSpec de contexto do usuário autenticado

Use este prompt para revisar e corrigir a change OpenSpec existente:

`add-authenticated-user-context-endpoint`

O objetivo é deixar a especificação coerente com as fronteiras atuais de **Identity** e **Tenancy**, com Arquitetura Limpa, DDD e o padrão local de Query/CQRS, antes de qualquer implementação.

## Como usar

1. Execute `/opsx:update add-authenticated-user-context-endpoint`.
2. Forneça o conteúdo integral deste arquivo como instrução.
3. O agente deve ler a implementação, a documentação e todos os artefatos existentes da change.
4. O agente deve apresentar, artefato por artefato, as correções propostas e a justificativa.
5. Confirme cada revisão somente depois de conferir que ela respeita as decisões deste prompt.
6. Ao final, exija `openspec validate add-authenticated-user-context-endpoint --strict`.
7. Não execute `/opsx:apply` até a revisão humana de todos os artefatos.

Este prompt autoriza somente a revisão dos artefatos de planejamento da change. Não autoriza alteração em código, Prisma, migrations, seed, Backend ou Web.

## Skill obrigatória

Use a skill `openspec-update-change` para revisar a change existente. Não crie outra change com nome diferente e não use `openspec-propose` enquanto a intenção continuar sendo a mesma.

Antes de revisar, leia integralmente:

- `.claude/skills/openspec-update-change/SKILL.md`;
- `.claude/skills/module-query-cqrs/SKILL.md`;
- `.claude/skills/module-query-cqrs/references/query-cqrs-pattern.md`;
- as referências adicionais exigidas por essas skills que realmente existirem no repositório.

Use `module-query-cqrs` como critério arquitetural da futura implementação. Não execute scripts nem implemente código nesta etapa.

## Change obrigatória

Revise exclusivamente:

`add-authenticated-user-context-endpoint`

Obtenha os caminhos reais dos artefatos por:

```bash
openspec status --change "add-authenticated-user-context-endpoint" --json
```

Não presuma nomes ou caminhos além dos retornados pelo OpenSpec. Leia todos os artefatos existentes e mantenha proposta, design, delta specs e tarefas coerentes entre si.

Se uma correção exigir um artefato que ainda não exista e a skill proibir sua criação durante o update, registre a pendência e indique o uso de `/opsx:continue`. Não altere código para compensar uma lacuna da especificação.

## Contexto do problema

O shell privado do Web precisa exibir dados reais do usuário autenticado e da banca. Atualmente há identidade hardcoded no frontend, enquanto o access token carrega apenas claims de segurança:

```ts
{
  sub,
  bancaId,
  sessionId,
  role,
  mustChangePassword
}
```

Nome, username, e-mail e nome da banca não devem ser fabricados no Web nem adicionados ao JWT. O Backend deve expor uma leitura autenticada mínima do próprio usuário.

Esta change é pré-requisito de backend para uma futura spec de frontend. O frontend não entra no escopo desta change e somente deve ser especificado depois que o contrato HTTP estiver implementado, testado e estável.

## Fonte de verdade e leitura obrigatória

Confronte os documentos com a implementação e os testes atuais. A implementação prevalece sobre prompts ou propostas antigas.

Leia integralmente, no mínimo:

- `README.md`;
- `.docs/prompts/01-identity-module-spec.md`;
- `.docs/prompts/04-document-identity-tenancy-modules.md`;
- `modules/identity/README.md`;
- `modules/tenancy/README.md`;
- `apps/backend/README.md`;
- `apps/backend/src/modules/identity/README.md`;
- `apps/backend/src/modules/tenancy/README.md`;
- `apps/backend/src/modules/platform/README.md`;
- `modules/identity/src/user-account/user-account.entity.ts`;
- `modules/identity/src/user-account/user-account.repository.ts`;
- `modules/identity/src/shared/ports/banca-context-resolver.port.ts`;
- casos de uso e DTOs públicos de `modules/identity`;
- `modules/tenancy/src/banca/banca.entity.ts`;
- `modules/tenancy/src/banca/banca.repository.ts`;
- `modules/tenancy/src/banca/use-case/get-banca-context.use-case.ts`;
- exports públicos de `modules/identity` e `modules/tenancy`;
- `apps/backend/src/modules/identity/identity.controller.ts`;
- `apps/backend/src/modules/identity/identity.module.ts`;
- `apps/backend/src/modules/identity/identity.tokens.ts`;
- `apps/backend/src/modules/identity/guards/jwt-cookie-auth.guard.ts`;
- adapters Prisma de Identity e Tenancy;
- `apps/backend/src/modules/tenancy/tenancy.module.ts`;
- `apps/backend/src/modules/tenancy/adapters/banca-context.resolver.ts`;
- `apps/backend/src/modules/platform/platform-provisioning.module.ts`;
- testes unitários e e2e relacionados a autenticação, sessão e isolamento por tenant;
- specs-base em `openspec/specs`, principalmente `authentication`, `session-management`, `banca-context-resolution`, `banca-context-query` e proteção de rotas;
- todos os artefatos existentes de `openspec/changes/add-authenticated-user-context-endpoint`;
- changes arquivadas de Identity, Tenancy, hardening e documentação arquitetural.

Não confiar apenas em buscas textuais. Leia integralmente os arquivos que definem os contratos e as decisões afetadas.

## Decisões arquiteturais já aprovadas

As decisões abaixo são requisitos da revisão, não perguntas abertas.

### 1. Não criar outro módulo de autenticação

Não criar bounded context ou módulo chamado `Authenticate`, `Auth`, `Profile`, `UserContext` ou equivalente.

A capability pertence ao **Identity existente**, pois Identity já é responsável por:

- `UserAccount`;
- autenticação;
- sessão;
- username, nome, e-mail e papel da conta;
- endpoints `/api/auth/*`.

Um novo módulo só seria justificável no futuro se surgisse outro conceito de negócio com linguagem, invariantes e ciclo de vida próprios. Uma projeção para o shell do Web não satisfaz esse critério.

### 2. Tenancy continua proprietário dos dados da banca

Tenancy é o único proprietário de:

- `Banca`;
- `codigoBanca`;
- `nome` da banca;
- status operacional da banca.

Identity não deve importar `Banca`, `BancaRepository`, `GetBancaContextUseCase` ou `@bancaflow/tenancy`. Nenhuma entidade de Tenancy pode cruzar a fronteira. A integração deve ocorrer por uma port estreita e por DTO/projeção.

### 3. O endpoint pertence ao Identity

O contrato HTTP deve permanecer:

```text
GET /api/auth/me
```

A rota deve ficar no adapter HTTP do Identity, protegida pelo `JwtCookieAuthGuard`, e receber o contexto exclusivamente de `AuthContext`/claims validadas.

O endpoint não aceita `userId`, `bancaId` ou `codigoBanca` enviados pelo cliente em body, query string ou parâmetro de rota.

### 4. As claims são a autoridade de identificação

O caso de uso recebe, no mínimo:

```ts
{
  userId,
  bancaId
}
```

Esses valores vêm do contexto autenticado criado pelo guard. O JWT permanece mínimo e não recebe nome, e-mail, username, código ou nome da banca.

### 5. Consulta de banca por `bancaId`, não por `codigoBanca`

Corrija a lacuna da change atual: o token fornece `bancaId`, mas o `BancaContextResolver` e o `GetBancaContextUseCase` atuais recebem `codigoBanca`.

Somente adicionar campos ao retorno da consulta por código não resolve `/api/auth/me`.

A especificação deve exigir uma leitura de Tenancy por `bancaId`, com projeção mínima equivalente a:

```ts
{
  bancaId: string;
  codigoBanca: string;
  nome: string;
}
```

Essa leitura deve ser distinta semanticamente da resolução pública de tenant por subdomínio. Preserve o comportamento e o contrato atuais da consulta por `codigoBanca`, salvo se uma mudança comprovadamente necessária e retrocompatível for documentada.

No DTO HTTP, `nome` pode ser mapeado para `name`. Não renomear o atributo do agregado `Banca` por conveniência da API.

### 6. O nome da banca já existe

Remova a pergunta aberta sobre derivar o nome da banca de `codigoBanca`. O agregado `Banca` já possui `nome`, validado como parte de seu estado.

A projeção deve ler `Banca.nome`. Não fabricar nome a partir do subdomínio e não duplicar esse dado em Identity.

### 7. Aplicar Query/CQRS para a projeção

`GET /api/auth/me` é uma leitura orientada ao consumo da API/Web. A futura implementação deve seguir o padrão local `module-query-cqrs`:

- usar interfaces `*Query` e DTOs/projeções para leitura;
- não reidratar entidades somente para serializá-las;
- não retornar entidades no contrato da query;
- não colocar regras de escrita na query;
- implementar adapters de infraestrutura sem vazar Prisma;
- manter o caso de uso de leitura fino, responsável por coordenar as projeções e mapear falhas seguras.

A solução esperada deve preservar esta divisão conceitual:

```text
Identity
  GetAuthenticatedUserContextUseCase
  query/projeção da conta autenticada
  port mínima para o contexto de exibição da banca

Tenancy
  query/projeção da banca por bancaId

Backend
  adapters concretos
  composição no IdentityModule
  IdentityController fino
```

Nomes exatos podem ser ajustados às convenções reais encontradas, mas o `design.md` deve registrar os contratos, a direção das dependências e por que não há vazamento de entidade.

### 8. Não criar composição `platform` sem necessidade

Não mover essa leitura automaticamente para `PlatformProvisioningModule` e não criar outro bounded context de plataforma.

O padrão preferido é a dependência unidirecional já existente: Identity define a necessidade por port, Tenancy fornece a projeção e o Backend conecta as duas pontas. Um composition root cross-context separado só deve ser proposto se a inspeção demonstrar um ciclo real que não possa ser evitado por ports.

### 9. Não reutilizar entidades carregadas pelo guard como DTO HTTP

O guard continua responsável por autenticação e autorização: token, sessão, conta ativa, banca ativa e `mustChangePassword`.

Não anexar `UserAccount` ou `Banca` ao request para o controller serializar. O endpoint deve executar sua query/caso de uso e retornar uma projeção explícita. Se houver leituras repetidas, registrar o trade-off; não quebrar fronteiras para evitar uma consulta.

## Contrato HTTP a especificar

O contrato recomendado para `200` é:

```ts
{
  userId: string;
  username: string;
  name: string;
  email: string | null;
  role: "OWNER" | "ADMIN" | "USER";
  banca: {
    bancaId: string;
    codigoBanca: string;
    name: string;
  };
}
```

Regras do contrato:

- `userId`, `username`, `name`, `email` e `role` vêm do estado persistido/projeção de Identity;
- `bancaId`, `codigoBanca` e `name` da banca vêm da projeção de Tenancy;
- `email` é `null` quando ausente;
- não retornar credential, password hash, refresh digest, contador de falhas, bloqueio, versão, timestamps internos ou campos Prisma;
- não confiar na claim `role` como fonte de exibição se a conta persistida possuir valor mais atual;
- não incluir dados de exibição no access token.

### Decisão sobre `isActive`

Remova `isActive` do DTO de sucesso de `/api/auth/me`, salvo se a revisão encontrar um consumidor real e documentado.

O `JwtCookieAuthGuard` já rejeita conta ou banca inativa antes do controller. Em uma resposta `200`, `isActive` seria sempre `true` e criaria um campo redundante. A query interna de Tenancy pode conhecer o status para validar a leitura, mas isso não obriga expô-lo ao Web.

## Segurança e comportamento de erro

Os delta specs devem cobrir, no mínimo:

1. usuário autenticado recebe somente o próprio contexto;
2. `userId` e `bancaId` são derivados do `AuthContext` validado;
3. tentativa de enviar identificadores alternativos não altera o resultado;
4. requisição sem access token válido retorna `401` genérico;
5. sessão revogada ou expirada continua sendo rejeitada pelo guard;
6. conta ausente, inativa ou bloqueada é rejeitada sem enumeração;
7. banca ausente ou inativa é rejeitada sem enumeração;
8. `mustChangePassword=true` continua bloqueado, sem `@AllowPasswordChange`, salvo decisão contrária explicitamente justificada;
9. usuário de uma banca nunca recebe contexto de outra banca;
10. corrida entre validação do guard e execução da query resulta em falha segura;
11. entidades e campos internos nunca aparecem na resposta;
12. as claims do JWT permanecem mínimas após login e refresh.

Não expor diferenças desnecessárias entre conta inexistente, banca inexistente e registros inativos. Preserve os códigos seguros já usados pelo projeto ou documente claramente qualquer mapeamento novo.

## Correções esperadas em cada artefato

### `proposal.md`

- manter o problema da identidade hardcoded e do JWT mínimo;
- afirmar que a capability pertence ao Identity existente;
- substituir a ampliação genérica da consulta pública por uma leitura de Tenancy por `bancaId`;
- deixar o frontend explicitamente fora de escopo;
- registrar que uma spec frontend posterior consumirá o contrato já implementado;
- não sugerir módulo novo nem mudança no agregado `Banca`.

### `design.md`

- registrar as fronteiras Identity/Tenancy e a direção das dependências;
- definir queries, ports, DTOs e adapters necessários;
- resolver a incompatibilidade `codigoBanca` versus `bancaId`;
- registrar `Banca.nome` como fonte autoritativa;
- justificar a composição no `IdentityModule` e por que `platform` não é necessário;
- registrar o contrato HTTP mínimo sem `isActive`;
- registrar o papel do guard e impedir serialização de entidades carregadas por ele;
- comparar Query/CQRS com o uso de repository/entidade para projeção e adotar Query/CQRS;
- incluir riscos de leitura duplicada, corrida após o guard, enumeração e acoplamento entre contextos;
- eliminar perguntas abertas já respondidas pelo código.

### Delta specs

- manter `authenticated-user-context` como capability nova;
- preservar a consulta pública atual por `codigoBanca`;
- adicionar à capability adequada de Tenancy o requisito de projeção autenticada por `bancaId`;
- usar `ADDED`/`MODIFIED` corretamente em relação às specs-base;
- garantir cenários verificáveis para contrato, tenant isolation, erros seguros e JWT mínimo;
- não exigir que a entidade `Banca` atravesse a fronteira;
- não criar comportamento de frontend nesta change.

Se o nome físico do delta spec existente não representar perfeitamente o novo requisito, aplique as regras da skill `openspec-update-change`: não invente arquivos fora de `existingOutputPaths`; explique a limitação e indique `/opsx:continue` quando necessário.

### `tasks.md`

Reestruture as tarefas em fases pequenas e verificáveis:

1. baseline e testes de caracterização;
2. contratos de Query/CQRS e DTOs de leitura;
3. projeção de Tenancy por `bancaId`;
4. caso de uso de contexto autenticado no Identity;
5. adapters e composição NestJS;
6. endpoint HTTP e mapeamento seguro;
7. testes unitários, integração e e2e;
8. documentação arquitetural afetada;
9. lint, typecheck, testes, build e validação OpenSpec estrita.

Cada tarefa deve indicar ownership e dependências. Backend só começa depois dos contratos de domínio/aplicação estarem definidos. Não marcar uma tarefa apenas porque um arquivo foi criado.

Remova qualquer tarefa que obrigue esta change de backend a criar a futura spec ou implementação Web. Isso é um próximo passo posterior, não critério para concluir o backend.

## Testes exigidos para a futura aplicação

Planeje testes proporcionais ao risco:

### Identity/Tenancy

- query da conta retorna a projeção mínima correta;
- query de banca por `bancaId` retorna `codigoBanca` normalizado e `nome` real;
- banca desconhecida retorna falha segura;
- falha do adapter é propagada/mapeada conforme o contrato;
- caso de uso combina as projeções sem expor entidades;
- mismatch entre `userId` e `bancaId` não retorna conta de outro tenant.

### Backend

- `GET /api/auth/me` autenticado retorna `200` com o contrato exato;
- não autenticado retorna `401`;
- sessão revogada/expirada retorna falha segura;
- conta ou banca inativa retorna falha segura;
- identificadores enviados pelo cliente são ignorados;
- usuário de outra banca nunca pode ser consultado;
- `email` ausente retorna `null`;
- resposta não contém campos sensíveis ou internos;
- token emitido por login/refresh continua sem dados de exibição;
- comportamento de `mustChangePassword` permanece coerente com o guard.

Os comandos de validação devem ser descobertos nos `package.json` reais. Não inventar scripts inexistentes. Incluir testes e build dos módulos afetados e do Backend, além de validação OpenSpec estrita.

## Fora de escopo

- implementação de código durante esta revisão;
- alterações no Web;
- cliente HTTP, hook, cache ou componentes para `/api/auth/me`;
- edição de perfil;
- avatar e preferências pessoais;
- criação de conta ou cadastro público;
- MFA e recuperação de senha;
- papéis customizados ou permissões granulares;
- alteração de claims para carregar dados de exibição;
- endpoint para consultar outro usuário;
- endpoint público que exponha nome da banca;
- refatoração geral do guard ou das pilhas de autenticação;
- novo bounded context ou módulo de domínio;
- migration ou alteração de schema sem necessidade demonstrada;
- arquivamento automático da change.

## Critérios de aceite da revisão

A revisão só está pronta quando:

1. todos os artefatos existentes estiverem coerentes entre si;
2. a capability estiver atribuída ao Identity existente;
3. Tenancy continuar proprietário de `Banca`, `codigoBanca`, `nome` e status;
4. não houver import de entidade ou módulo Tenancy no domínio Identity;
5. a consulta usada por `/api/auth/me` partir de `bancaId`;
6. a consulta pública por `codigoBanca` permanecer semanticamente preservada;
7. `Banca.nome` for a origem explícita do nome de exibição;
8. o desenho adotar Query/CQRS e DTOs explícitos;
9. o contrato HTTP não expuser `isActive` ou campos internos sem necessidade comprovada;
10. JWT, guard e isolamento multi-tenant permanecerem autoritativos e testados;
11. frontend permanecer fora de escopo;
12. `tasks.md` estiver incremental, verificável e ordenado com backend antes do frontend;
13. não houver perguntas abertas respondíveis pelo código atual;
14. `openspec validate add-authenticated-user-context-endpoint --strict` passar;
15. houver revisão humana antes de `/opsx:apply`.

## Resultado esperado

Ao finalizar, informe:

- artefatos revisados;
- correções propostas, aceitas e eventualmente rejeitadas;
- fronteiras finais entre Identity, Tenancy e Backend;
- contrato final de `GET /api/auth/me`;
- como a incompatibilidade `codigoBanca` versus `bancaId` foi resolvida;
- queries, ports e DTOs planejados;
- testes e gates previstos;
- resultado da validação OpenSpec estrita;
- pendências que exigem `/opsx:continue`, se houver;
- próximo comando recomendado, sem executá-lo.
