# Prompt — Revisar política de erros e evidências da OpenSpec de contexto autenticado

Use este prompt para revisar e corrigir a change OpenSpec existente:

`add-authenticated-user-context-endpoint`

A implementação de `GET /api/auth/me` está funcional e majoritariamente alinhada à Arquitetura Limpa, DDD e Query/CQRS, mas a auditoria final encontrou inconsistências entre spec, política de erros, implementação e evidências registradas em `tasks.md`.

## Como usar

1. Execute:

   ```text
   /opsx:update add-authenticated-user-context-endpoint .docs/prompts/09-review-authenticated-context-error-policy-spec.md
   ```

2. Use a skill `openspec-update-change`.
3. Leia todos os artefatos e o código indicados neste prompt.
4. Apresente as revisões propostas por artefato e solicite confirmação antes de escrever, conforme a skill.
5. Atualize somente os artefatos OpenSpec existentes nesta etapa.
6. Não implemente código, não altere testes e não marque tarefas como concluídas durante o update.
7. Ao final, execute `openspec validate add-authenticated-user-context-endpoint --strict`.
8. Somente após revisão humana, a implementação corretiva deverá ser executada separadamente com `/opsx:apply add-authenticated-user-context-endpoint`.

Este prompt não cria uma nova change. Ele corrige a change existente para que uma aplicação posterior ajuste implementação, testes e documentação.

## Skills e referências obrigatórias

Leia integralmente:

- `.claude/skills/openspec-update-change/SKILL.md`;
- `.claude/skills/module-query-cqrs/SKILL.md`;
- `.claude/skills/module-query-cqrs/references/query-cqrs-pattern.md`;
- referências adicionais exigidas pelas skills que realmente existirem no repositório.

Use `module-query-cqrs` como critério de revisão, mas não transforme desvios apenas nominais em refatorações amplas sem benefício demonstrado.

## Artefatos que devem ser reconciliados

Obtenha os caminhos reais com:

```bash
openspec status --change "add-authenticated-user-context-endpoint" --json
```

Revise todos os arquivos existentes retornados em `artifactPaths.<id>.existingOutputPaths`, especialmente:

- `proposal.md`;
- `design.md`;
- `specs/authenticated-user-context/spec.md`;
- `specs/banca-context-query/spec.md`;
- `tasks.md`.

Não crie artefatos fora dos caminhos permitidos pela skill. Se um novo arquivo for realmente necessário, registre a pendência para `/opsx:continue`.

## Fonte de verdade

Confronte a change com a implementação e os testes atuais. Leia integralmente, no mínimo:

- `modules/identity/src/app/use-case/get-authenticated-user-context.use-case.ts`;
- `modules/identity/src/shared/dto/authenticated-user-context.dto.ts`;
- `modules/identity/src/shared/ports/authenticated-user-account.query.ts`;
- `modules/identity/src/shared/ports/banca-display-context-resolver.port.ts`;
- `modules/identity/src/shared/dto/auth.dto.ts`;
- `modules/identity/test/get-authenticated-user-context.use-case.spec.ts`;
- `modules/tenancy/src/banca/query/banca-display-context.query.ts`;
- `modules/tenancy/src/banca/use-case/get-banca-display-context.use-case.ts`;
- `modules/tenancy/test/get-banca-display-context.use-case.spec.ts`;
- `apps/backend/src/modules/identity/adapters/authenticated-user-account.query.prisma.ts`;
- `apps/backend/src/modules/tenancy/adapters/banca-display-context.query.prisma.ts`;
- `apps/backend/src/modules/tenancy/adapters/banca-display-context.resolver.ts`;
- `apps/backend/src/modules/identity/guards/jwt-cookie-auth.guard.ts`;
- `apps/backend/src/modules/identity/guards/jwt-cookie-auth.guard.spec.ts`;
- `apps/backend/src/modules/identity/identity.controller.ts`;
- `apps/backend/src/modules/identity/identity.errors.local.ts`;
- `apps/backend/src/modules/identity/identity.module.ts`;
- `apps/backend/src/modules/identity/adapters/jwt-access-token.issuer.ts`;
- `apps/backend/src/shared/types/jwt-payload.type.ts`;
- `apps/backend/src/shared/errors/api-exception.filter.ts`;
- `apps/backend/test/identity/authenticated-user-context.e2e-spec.ts`;
- testes e2e de sessão, status de conta e isolamento;
- READMEs de Identity e Tenancy no domínio e no Backend;
- specs-base relacionadas em `openspec/specs`.

Não presumir que uma tarefa marcada como concluída possui toda a evidência exigida. Conferir o teste real e seus cenários.

## Resultado da auditoria que deve orientar a revisão

### Problema 1 — falha técnica da query de conta vira `400`

Atualmente:

- `AuthenticatedUserAccountQueryPrisma` converte falha Prisma em código técnico, como `IDENTITY.USER_ACCOUNT_QUERY_ERROR`;
- `GetAuthenticatedUserContextUseCase` propaga essa falha;
- `IdentityController.unwrap` trata códigos desconhecidos como HTTP `400` e inclui o código na resposta;
- falhas técnicas de Tenancy são, por outro lado, convertidas em `INVALID_CREDENTIALS`/`401`.

Isso é assimétrico e contradiz a intenção do design de não expor detalhes de infraestrutura.

### Problema 2 — a spec exige erro único, mas o guard atual possui códigos seguros distintos

O `JwtCookieAuthGuard` já diferencia estados autenticados com códigos estáveis:

- sessão revogada/expirada → `SESSION_REVOKED` com `401`;
- conta ausente/inativa/bloqueada → `ACCOUNT_INACTIVE` com `401`;
- banca ausente/inativa → `BANCA_INACTIVE` com `401`;
- troca obrigatória → `MUST_CHANGE_PASSWORD` com `403`.

A spec revisada anteriormente afirma que esses estados não devem revelar qual condição ocorreu e sugere resposta única. Isso conflita com o comportamento estabelecido do projeto e ampliaria a change para uma refatoração geral do guard.

### Problema 3 — claims JWT descritas como exclusivas

A spec lista apenas `sub`, `bancaId`, `sessionId`, `role` e `mustChangePassword`, mas JWT inclui claims padrão como `iat` e `exp`.

O requisito correto é impedir **dados de exibição nas claims de aplicação**, sem proibir claims técnicas padronizadas do JWT.

### Problema 4 — evidências de testes superestimadas

Há tarefas marcadas como concluídas que exigem cobertura mais forte do que a implementação atual comprova:

- testes diretos dos adapters Prisma para sucesso, vazio e falha técnica;
- integração da composição para falha técnica;
- E2E de `/api/auth/me` com sessão revogada e expirada;
- E2E com conta `BLOCKED` e banca inativa;
- papel persistido alterado depois do login, provando que a resposta não usa a claim antiga;
- inspeção/decodificação de JWT de login e refresh para provar que dados de exibição não foram adicionados;
- política HTTP de falhas técnicas;
- corrida ou inconsistência entre validação do guard e execução das queries.

As tarefas `1.2` e `8.6` continuam abertas e devem permanecer abertas até evidência real.

## Política de erros obrigatória

Revise proposal, design, specs e tasks para adotar explicitamente três categorias.

### Categoria A — falhas rejeitadas pelo guard

Preservar o comportamento atual e os códigos estáveis do guard:

| Condição | HTTP | Código público |
|---|---:|---|
| Token ausente/inválido | `401` | `INVALID_CREDENTIALS` |
| Sessão revogada/expirada | `401` | `SESSION_REVOKED` |
| Conta ausente/inativa/bloqueada | `401` | `ACCOUNT_INACTIVE` |
| Banca ausente/inativa | `401` | `BANCA_INACTIVE` |
| Troca obrigatória pendente | `403` | `MUST_CHANGE_PASSWORD` |

Esses códigos não enumeram IDs nem permitem consultar terceiros: são estados da própria sessão autenticada. Não exigir resposta única para condições já tratadas pelo guard nesta change.

### Categoria B — inconsistências esperadas depois do guard

Quando a leitura de contexto não encontra a conta pelo par `userId + bancaId`, a projeção da banca não existe mais, fica inativa entre guard/query, ou existe mismatch entre as projeções:

- retornar `401`;
- usar `INVALID_CREDENTIALS` como falha genérica;
- não retornar contexto parcial;
- não expor identificador, estado interno ou código de Tenancy.

### Categoria C — falhas técnicas de infraestrutura

Falha de Prisma, provider, conexão ou adapter não é erro de credencial:

- retornar HTTP `500` genérico externamente;
- não expor `IDENTITY.USER_ACCOUNT_QUERY_ERROR`, `TENANCY_BANCA_DISPLAY_QUERY_ERROR`, stack trace ou detalhes de banco ao cliente;
- preservar o código técnico internamente para diagnóstico e log seguro;
- aplicar a mesma política às queries de Identity e Tenancy;
- não converter indisponibilidade de infraestrutura em `400` ou `401`.

O `design.md` deve definir onde ocorre a tradução técnica → HTTP sem colocar regra de infraestrutura no domínio. Preferir o mapper/filtro de erros do Backend ou outro mecanismo já coerente com o projeto. Não obrigar o domínio Identity a interpretar códigos técnicos de Tenancy.

## Revisões obrigatórias por artefato

### `proposal.md`

- manter objetivo, ownership e contrato atuais;
- acrescentar que a change normaliza a política de erros do endpoint;
- declarar que falhas técnicas resultam em `500` genérico e permanecem diagnosticáveis apenas internamente;
- deixar claro que os códigos existentes do guard serão preservados;
- não ampliar o escopo para refatorar toda a autenticação.

### `design.md`

- substituir a ideia de que todos os estados retornam o mesmo `401` pela taxonomia A/B/C;
- documentar a fronteira entre domínio, adapter, mapper HTTP e filtro global;
- eliminar a assimetria entre query de conta e query de banca;
- definir logging seguro para falhas técnicas, sem secrets, tokens, hashes, dados pessoais ou stack em resposta;
- registrar que códigos do guard são estados seguros da própria sessão;
- manter Query/CQRS, DTOs, ports, composição e contrato HTTP já aprovados;
- tratar `iat`/`exp` como claims JWT padrão permitidas;
- atualizar riscos, plano de aplicação e rollback;
- manter frontend fora de escopo.

### `authenticated-user-context/spec.md`

- preservar contrato de sucesso e isolamento multi-tenant;
- atualizar cenários de guard para esperar os códigos seguros existentes;
- manter mismatch/ausência pós-guard como `401 INVALID_CREDENTIALS`;
- adicionar requisito/cenários para falha técnica → `500` genérico, sem código interno;
- adicionar cenário de erro técnico em cada lado, Identity e Tenancy;
- substituir “somente cinco claims” por “claims de aplicação”, permitindo `iat`, `exp` e outras claims JWT padrão necessárias;
- exigir teste que decodifique tokens de login e refresh e confirme ausência de nome, e-mail, username e dados da banca;
- não adicionar `isActive` ao payload de sucesso.

### `banca-context-query/spec.md`

- manter a consulta pública por `codigoBanca` inalterada;
- manter a projeção autenticada por `bancaId`;
- distinguir banca ausente/inativa (`Result` esperado, depois convertido em falha de contexto) de erro técnico da query;
- exigir que erro técnico seja preservado internamente e traduzido em `500` genérico na borda HTTP;
- não expor entidade `Banca`, row Prisma ou código técnico.

### `tasks.md`

- manter `1.2` aberta até confirmar claims, guard e consulta pública com testes reais;
- manter `8.6` aberta até nova revisão humana final;
- reabrir qualquer tarefa marcada como concluída cuja evidência não cubra integralmente o texto;
- não apagar o histórico da evidência anterior; registrar claramente o complemento necessário;
- adicionar tarefas explícitas para implementar e testar a taxonomia A/B/C;
- adicionar testes de erro técnico dos dois adapters e do mapeamento HTTP para `500`;
- adicionar E2E de sessão revogada/expirada, conta bloqueada e banca inativa em `/api/auth/me`;
- adicionar E2E em que o papel persistido muda após emissão do token e `/api/auth/me` retorna o papel atual;
- adicionar teste que decodifica JWT de login e refresh e verifica somente as claims de aplicação autorizadas, tolerando `iat`/`exp`;
- decidir como provar corrida pós-guard: teste determinístico de integração/fake ou reformulação honesta da tarefa, sem alegar um E2E inexistente;
- adicionar teste/readiness para ausência de contexto parcial e de códigos técnicos na resposta;
- executar novamente lint sem depender apenas de auto-fix, builds, testes unitários, integração, E2E e validação OpenSpec estrita.

## Ajuste de convenção Query/CQRS

A skill local recomenda interfaces `*Query` em `provider/` com método `execute(input)`, enquanto a implementação usa:

- `shared/ports` + `findByUserAndBanca` no Identity;
- `banca/query` + `findActiveById` no Tenancy.

Durante a revisão:

1. registre a diferença no `design.md`;
2. compare com as convenções reais já adotadas pelos módulos atuais;
3. decida explicitamente se a skill é normativa para paths e método ou apenas para separação CQRS;
4. não imponha movimentação/renomeação nesta change se isso produzir churn sem ganho arquitetural;
5. se mantiver a implementação, justifique que a semântica CQRS, DTO, direção de dependência e separação query/repository estão preservadas.

## Cenários mínimos após a revisão

Os delta specs e `tasks.md` devem permitir provar:

1. sucesso com contrato exato;
2. `email: null`;
3. papel persistido atual prevalece sobre claim antiga;
4. identificadores do cliente não possuem autoridade;
5. tenant isolation;
6. token inválido → `401 INVALID_CREDENTIALS`;
7. sessão revogada/expirada → `401 SESSION_REVOKED`;
8. conta inativa/bloqueada → `401 ACCOUNT_INACTIVE`;
9. banca ausente/inativa no guard → `401 BANCA_INACTIVE`;
10. `mustChangePassword` → `403 MUST_CHANGE_PASSWORD`;
11. ausência/mismatch após o guard → `401 INVALID_CREDENTIALS`;
12. falha Prisma/query Identity → `500` genérico;
13. falha Prisma/query Tenancy → `500` genérico;
14. nenhuma resposta contém entidade, campo interno ou código técnico;
15. login/refresh não adicionam dados de exibição às claims de aplicação;
16. `iat`/`exp` continuam permitidos;
17. consulta pública por `codigoBanca` permanece `{ bancaId, isActive }`;
18. nenhum novo bounded context, schema ou migration é criado.

## Fora de escopo

- implementação durante `/opsx:update`;
- frontend ou consumo de `/api/auth/me`;
- alteração do contrato de sucesso;
- inclusão de `isActive`;
- refatoração geral de todos os endpoints Identity;
- substituição do guard;
- novo módulo/bounded context;
- alteração de Prisma schema ou migration;
- exposição de erros técnicos ao cliente;
- arquivamento automático.

## Critérios de aceite da revisão

A revisão OpenSpec somente estará pronta quando:

1. proposal, design, specs e tasks usarem a mesma taxonomia A/B/C;
2. códigos atuais do guard estiverem preservados e documentados;
3. inconsistências pós-guard estiverem definidas como `401 INVALID_CREDENTIALS`;
4. falhas técnicas estiverem definidas como `500` genérico externo e diagnóstico interno seguro;
5. Identity não interpretar códigos técnicos de Tenancy;
6. JWT for descrito em termos de claims de aplicação, permitindo claims padrão;
7. tarefas sem evidência suficiente estiverem abertas novamente;
8. novos testes necessários estiverem explicitamente planejados;
9. Query/CQRS e fronteiras DDD permanecerem preservados;
10. frontend, schema e novos módulos permanecerem fora de escopo;
11. `openspec validate add-authenticated-user-context-endpoint --strict` passar;
12. houver revisão humana antes de `/opsx:apply`.

## Resultado esperado

Ao finalizar o update, informe:

- artefatos revisados;
- taxonomia de erros final;
- tarefas reabertas e novas tarefas adicionadas;
- decisão sobre convenção Query/CQRS;
- testes corretivos planejados;
- resultado da validação OpenSpec estrita;
- qualquer item que exija `/opsx:continue`;
- próximo comando recomendado, sem executá-lo.
