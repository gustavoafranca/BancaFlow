## 1. Shared — tipo neutro de papel

- [x] 1.1 Mover `AccountRoleType` (união literal `'OWNER'|'ADMIN'|'USER'`) de `modules/identity/src/user-account/vo/account-role.vo.ts` para `packages/shared`, sem mudar seu valor/formato.
- [x] 1.2 Atualizar `AccountRole` (VO, Identity) e todos os casos de uso que hoje importam `AccountRoleType` localmente (`ToggleAccountStatusUseCase`, `AdminResetPasswordUseCase`, `CreateUserAccountUseCase`, `user-account.entity.ts`, DTOs de auth) para importar de `@bancaflow/shared`, sem alterar comportamento.
- [x] 1.3 Confirmar (`grep`/build) que nenhum arquivo em `modules/access-control` (a criar) precisa importar de `modules/identity`.

## 2. Domínio — Access Control

- [x] 2.1 Criar módulo `modules/access-control` com estrutura padrão (model/provider/use-case), dependendo apenas de `@bancaflow/shared`.
- [x] 2.2 Definir `PermissionKey` como união literal TypeScript fechada, com exatamente as 9 chaves da tabela normativa de [design.md](design.md#catálogo-normativo-de-permissões-resolve-d44-neste-recorte) (inclui `access-control.role-permissions.read`). Não é um VO — é um tipo de dados simples; não usar `module-value-object` para isto.
- [x] 2.3 Definir `PermissionCatalog` (constante de configuração, não agregado) com o conjunto fechado de `PermissionKey`s, incluindo `label`/`description`/`order` por chave e por capacidade (para os DTOs da task 3.3/3.4).
- [x] 2.4 Definir `RolePermissionMap` (política de domínio imutável, não agregado) com o mapeamento exato papel → permissões da tabela normativa (`OWNER` com todas as 9; `ADMIN` com todas as 9; `USER` com as 3 de autoatendimento).
- [x] 2.5 Implementar `parsePermissionKey(value: unknown): Result<PermissionKey>` — função de fronteira que valida um valor não tipado contra o conjunto fechado, falhando com `ACCESS_CONTROL.UNKNOWN_PERMISSION_KEY`. Usar apenas em fronteiras não tipadas (log, teste); nenhum caso de uso interno a chama.
- [x] 2.6 Implementar a porta `hasPermission(actorRole: AccountRoleType, permissionKey: PermissionKey): boolean` — função total, pura, nunca lança (o tipo já garante chave válida para qualquer chamador interno).
- [x] 2.7 Implementar `GetRolePermissionMatrixUseCase` (matriz completa, com metadados de apresentação) e `GetOwnEffectivePermissionsUseCase` (permissões do `actorRole` do próprio ator), retornando DTOs, nunca estruturas internas.

## 3. Backend — Endpoints de leitura

- [x] 3.1 Criar `AccessControlController` com `GET /api/access-control/role-permissions`, protegido por `JwtCookieAuthGuard`; autorizar via `hasPermission(actorRole, 'access-control.role-permissions.read')` (não checagem de papel bruto no controller); usar `backend-controller`.
- [x] 3.2 Criar `GET /api/access-control/me/permissions` no mesmo controller, protegido por `JwtCookieAuthGuard`, disponível a qualquer papel autenticado (sem `PermissionKey` própria — é a leitura do que o próprio ator já possui).
- [x] 3.3 Especificar e implementar o DTO de `GET /api/access-control/role-permissions` conforme [design.md, D10](design.md): `{ capabilities: [{ capability, label, order, permissions: [{ key, label, description, order, roles }] }] }`.
- [x] 3.4 Especificar e implementar o DTO de `GET /api/access-control/me/permissions` conforme design.md D10: `{ role, permissions: [{ key, label }] }`.
- [x] 3.5 Registrar o novo módulo em `AppModule`.

## 4. Backend — Enforcement real em Identity (sem exceção de fonte única)

- [x] 4.1 Modificar `ToggleAccountStatusUseCase` (Identity) para substituir `if (data.actorRole !== 'OWNER' && data.actorRole !== 'ADMIN') FORBIDDEN` pela consulta `hasPermission(data.actorRole, 'identity.accounts.toggle-status')`.
- [x] 4.2 Manter, imediatamente após a checagem de permissão, a validação contextual existente `data.actorRole === 'ADMIN' && target.role.isOwner → FORBIDDEN` sem alteração de semântica.
- [x] 4.3 Modificar `AdminResetPasswordUseCase` (Identity) da mesma forma: substituir a checagem de papel bruto por `hasPermission(data.actorRole, 'identity.accounts.reset-password')`, mantendo a validação contextual `ADMIN` não reseta senha de `OWNER` logo em seguida.
- [x] 4.4 Adicionar testes cobrindo, para os dois casos de uso: (a) `USER` negado pela permissão antes mesmo de chegar à checagem contextual; (b) `ADMIN` com permissão concedida, mas ainda assim negado ao mirar um alvo `OWNER` pela invariante contextual; (c) `ADMIN`/`OWNER` autorizados em caminho feliz.

## 5. Cross-change — Participants consome o catálogo

> `implement-participant-registration-mvp` (change separada, ainda não implementada) foi atualizada nesta revisão para que `CreateBettingAgent`/`ListBettingAgents`/`GetBettingAgent` autorizem via `hasPermission`. As tasks abaixo garantem a integração; a implementação de cada caso de uso em si é tarefa daquela change, não desta.

- [x] 5.1 Ao implementar esta change, garantir que `modules/access-control` (com `hasPermission` e as 3 chaves `participants.betting-agents.*`) esteja disponível antes de iniciar as tasks 2.4.2–2.4.4 e 3.2.4 de `implement-participant-registration-mvp` — não implementar aquelas tasks com checagem de papel bruto como substituto temporário.
- [x] 5.2 Se as duas changes forem implementadas em ordem inversa, bloquear explicitamente as tasks de autorização de Participants (não improvisar) até que `access-control` exista.

## 6. Web — Perfis de Acesso

- [x] 6.1 Definir contrato/tipos da resposta de `GET /api/access-control/role-permissions` (conforme DTO da task 3.3) no client HTTP do módulo `configuracoes`.
- [x] 6.2 Remover `apps/web/src/modules/configuracoes/lib/permissions.ts` (matriz fabricada de 4 perfis fictícios) e qualquer referência a ela.
- [x] 6.3 Implementar a busca real da matriz papel × permissão na tela `/configuracoes → Perfis de Acesso`, exibindo `label`/`description` por permissão e por capacidade (não chaves técnicas cruas), somente `OWNER/ADMIN/USER`, somente leitura; ocultar o item de navegação para `USER` por experiência (o Backend já nega a chamada independentemente); seguir a ordem recomendada por `frontend-module-workflow` (contrato/tipos → shared → módulo/feature → rotas/navegação → testes).
- [x] 6.4 Cobrir estados de loading, vazio, erro e acesso negado na tela de Perfis de Acesso.

## 7. Testes e validação

- [x] 7.1 Teste unitário: `hasPermission` autoriza `OWNER`/`ADMIN` para as 9 chaves da tabela normativa e nega `USER` para as 6 administrativas.
- [x] 7.2 Teste unitário: `parsePermissionKey` falha com `ACCESS_CONTROL.UNKNOWN_PERMISSION_KEY` para uma string fora do catálogo; `hasPermission` nunca lança para uma `PermissionKey` já tipada.
- [x] 7.3 Teste de integração: `GET /api/access-control/role-permissions` retorna os 3 papéis reais com metadados de apresentação para `OWNER`/`ADMIN` e nega `USER` com `FORBIDDEN`. (e2e real, `test/access-control/role-permissions.e2e-spec.ts`, 4/4 verde após corrigir `BANCA_HOST_SUFFIX` — ver seção 9)
- [x] 7.4 Teste de integração: `GET /api/access-control/me/permissions` retorna apenas as permissões do próprio papel, para os três papéis (OWNER/ADMIN/USER).
- [x] 7.5 Teste de integração: `ToggleAccountStatusUseCase` e `AdminResetPasswordUseCase` recusam `USER` pela permissão e recusam `ADMIN` mirando `OWNER` pela invariante contextual, em cenários distintos.
- [x] 7.6 Teste Web: tela de Perfis de Acesso não renderiza nenhum toggle editável de permissão, não exibe chaves técnicas cruas e não é alcançável por `USER`.
- [x] 7.7 Rodar `openspec validate establish-authoritative-role-permissions --strict` e `openspec validate implement-participant-registration-mvp --strict`, corrigindo eventuais falhas em ambas.

## 8. Documentação e rastreabilidade

- [x] 8.1 Atualizar o plano [`.docs/plans/foundation/09-authoritative-access-control.md`](../../../.docs/plans/foundation/09-authoritative-access-control.md) integralmente (estado, seções de domínio/casos de uso/backend, D44, skills), reconciliando-o com esta versão da change.
- [x] 8.2 Atualizar diagrama Excalidraw correspondente para refletir: bounded context `access-control` sem dependência de `identity`; dois endpoints de leitura (`role-permissions` autorizado via `hasPermission`; `me/permissions` protegido apenas por autenticação, sem checagem de permissão prévia); `AccountRoleType` em `packages/shared`; consumo cruzado por Participants; porta `PermissionChecker` injetada em Identity.

## 9. Correções da quarta revisão (P1/P2)

- [x] 9.1 Enforcement real das 3 chaves de autoatendimento: `GetAuthenticatedUserContextUseCase` (`identity.profile.read-own`), `UpdateOwnProfileUseCase` (`identity.profile.update-own`) e `ChangePasswordUseCase` (`identity.password.change-own`, papel derivado da própria conta) passam a consultar `hasPermission`. Nenhuma das 9 `PermissionKey`s fica sem consumidor real (ver design.md D12).
- [x] 9.2 Catálogo com fonte primária única: `PERMISSION_CATALOG` (`as const`) em `permission-catalog.ts`; `PermissionKey`/`PERMISSION_KEYS` derivados por indexação de tipo em `permission-key.ts`, não mais declarados em paralelo. Teste de integridade `test/catalog-integrity.spec.ts` (catálogo × chaves × mapa, sem duplicatas, sem chave órfã) — ver design.md D11.
- [x] 9.3 `hasPermission` deixa de ser importado diretamente pelos casos de uso de Identity; nova porta `PermissionChecker` (`modules/identity/src/shared/ports/permission-checker.port.ts`) injetada via construtor nos 5 casos de uso; adapter `AccessControlPermissionChecker` no composition root (`apps/backend`) implementa a porta delegando para `@bancaflow/access-control` — ver design.md D7 (revisado).
- [x] 9.4 Cliente Web (`access-control.client.ts`) valida estruturalmente o payload `200` (`capabilities`/`permissions`/`roles`) antes de retornar `success`; payload malformado vira `error`. Testes cobrindo payload bem formado e malformado.
- [x] 9.5 Corrigido o setup dos testes E2E de Access Control: a causa raiz do login falhar com `401` era `BANCA_HOST_SUFFIX=".localhost"` no `.env` local, enquanto os specs usavam `Host: *.bancaflow.com.br` sem sobrescrever a env var (só 2 arquivos pré-existentes faziam esse override corretamente). Aplicado o mesmo override (`process.env.BANCA_HOST_SUFFIX = '.bancaflow.com.br'` em `beforeAll`/restaurado em `afterAll`) em `role-permissions.e2e-spec.ts` e em todos os e2e de Identity que exercitam os 5 casos de uso desta change (`toggle-status`, `authenticated-user-context`, `authenticated-user-context-failures`, `update-own-profile`, `identity`, `concurrency`, `proxy-trust`) — suíte e2e completa do backend: 79/79 verde.
- [x] 9.6 Corrigido `authenticated-user-context.composition.spec.ts` (teste de composição NestJS real, não mockado) para passar `actorRole` no `execute()`, após o campo se tornar obrigatório.
- [x] 9.7 Adicionado caso ADMIN no teste e2e de `/me/permissions` (antes cobria só OWNER/USER).

## 10. Correções da quinta revisão (P2)

- [x] 10.1 Corrigida a redação de `proposal.md`/`design.md` (D6)/`tasks.md` (8.2) que descrevia os dois endpoints como "ambos autorizados via `hasPermission`": `/me/permissions` exige apenas autenticação (`JwtCookieAuthGuard`), sem checagem de permissão prévia — exigir uma permissão para consultar as próprias permissões seria circular. Apenas `role-permissions` (a matriz administrativa) usa `hasPermission`.
- [x] 10.2 Adicionado `DenyAllPermissionChecker` (fakes.ts) e testes negativos para as 3 permissões de autoatendimento, cada um provando: (a) a `PermissionKey` correta é solicitada; (b) `FORBIDDEN` é retornado; (c) nenhum efeito colateral ocorre — `GetAuthenticatedUserContextUseCase` não consulta conta/banca; `UpdateOwnProfileUseCase` não salva; `ChangePasswordUseCase` não compara/gera hash de senha nem revoga sessão. Antes, o `RealPermissionChecker` nunca exercitava o caminho de negação para essas 3 chaves (concedidas a todos os papéis).

## 11. Correções da sexta revisão (P3)

- [x] 11.1 Corrigido "8" → "9" nas duas ocorrências de [design.md, D5](design.md) ("Todas as 8 `PermissionKey`s..." → "Todas as 9").
- [x] 11.2 Corrigida a restauração de `BANCA_HOST_SUFFIX` em todos os 10 arquivos e2e afetados (incluindo os 2 pré-existentes que já tinham esse padrão, `tenant-context.e2e-spec.ts` e `refresh-clears-cookies-on-failure.e2e-spec.ts`): `process.env.BANCA_HOST_SUFFIX = previousSuffix` atribuía a string `"undefined"` quando `previousSuffix` era `undefined` (comportamento do `process.env`, que só aceita strings), em vez de remover a variável. Substituído pelo padrão condicional já usado em `proxy-trust.e2e-spec.ts` para `TRUST_PROXY_HOST`/`TRUSTED_PROXY_IPS` (`delete` quando `undefined`, senão reatribuir). Suíte e2e completa reconfirmada: 79/79.
