# Tasks — harden-identity-authentication-mvp

> Endurecer o MVP de Identity e Tenancy, corrigindo incoerências críticas e fechando riscos de segurança, concorrência e isolamento multi-tenant. Estratégia obrigatória: três subagentes (Negócio, Backend, Web) em sequência, cada um com escopo de escrita explícito. Negócio deve finalizar antes de Backend e Web.

> ✅ **REVISÕES PÓS-IMPLEMENTAÇÃO — CONCLUÍDAS.** A implementação inicial (Grupos 1–4) passou nos gates estruturais; duas rodadas de revisão de código encontraram e fecharam achados reais: o **Grupo 5 (v2)** corrigiu 2 P0 + P1 (troca obrigatória autoritativa, emissão de token na transação, concorrência com lock, revogação no caso de uso, rotação sem corrida, etc.); o **Grupo 6 (v3)** fechou os remanescentes (encapsulamento real via `toJSON`/getters/VOs, `currentSessionId` obrigatório, allowlist de proxy com CIDR/IPv6, perfil de dev local). Cada item é provado por **teste comportamental** (OpenSpec `--strict` válido é necessário, não suficiente). Gates finais: build monorepo verde; testes 333 (shared) + 160 (identity) + 39 (tenancy) + 55 (backend unit) + 17 (web) + 32 (backend e2e); lint verde.

---

## Grupo 1 — Negócio (`modules/identity`, `modules/tenancy`)

> **Subagente 1 — Negócio**
> Escopo: somente `modules/identity/**` e `modules/tenancy/**`
> Contexto fornecido: artefatos OpenSpec aprovados, skills relevantes

### 1. Validação de força de senha no domínio

- [x] 1.1 Não criado VO próprio — decisão: reutilizado `StrongPassword` de `@bancaflow/shared` (já existente/exportado), sem cópia divergente (design.md decisão 2)
- [x] 1.2 Não criado wrapper `password-validator.ts` — decisão: cada caso de uso chama `StrongPassword.isStrong()`/`tryCreate()` diretamente, mapeando para `IDENTITY.PASSWORD_TOO_WEAK`
- [x] 1.3 Atualizado `CreateUserAccountUseCase` — chama `StrongPassword.isStrong()`, retorna `Result.fail(IDENTITY_ERRORS.PASSWORD_TOO_WEAK)` se fraca, antes de persistir
- [x] 1.4 `TemporaryPasswordGenerator` (port) inalterado — implementação concreta é do Backend; defesa em profundidade adicionada em `AdminResetPasswordUseCase` (retry até 5x validando com `StrongPassword.isStrong()`)
- [x] 1.5 Não duplicado `strong-password.spec.ts` (VO já testada em `packages/shared/test/vo/strong-password.vo.test.ts`); cobertura de integração em `create-user-account.use-case.spec.ts`, `change-password.use-case.spec.ts`, `mandatory-password-change.use-case.spec.ts`, `admin-reset-password.use-case.spec.ts`

### 2. Separação entre troca voluntária e obrigatória de senha

- [x] 2.1 `change-password.use-case.ts` (fluxo VOLUNTÁRIO) atualizado: valida senha atual, exige nova senha forte, revoga as outras sessões, tudo em `runInTransactionResult`
- [x] 2.2 **CORRIGIDO (Grupo 5, 33.1):** `MandatoryPasswordChangeUseCase` agora falha com `FORBIDDEN` se `!account.mustChangePassword`, antes de qualquer escrita. Provado por teste unitário + e2e (bypass rejeitado para `USER`, `OWNER` e `ADMIN`).
- [x] 2.3 Ambos usam `transactionManager.runInTransactionResult(...)` (assinatura adicionada a `TransactionManager`; implementação Prisma é do Backend)
- [x] 2.4 Ambos revogam via `SessionRepository.revokeOtherSessions(userId, bancaId, currentSessionId, revokedAt)` (novo método na interface)
- [x] 2.5 Testes criados: `test/change-password.use-case.spec.ts`, `test/mandatory-password-change.use-case.spec.ts` (fakes de todas as ports + rollback simulado)

### 3. Proteção concorrente em login

- [x] 3.1 Adicionado `version?: number` em `UserAccountProps` + getter `version` (default 1) — domínio apenas transporta o valor (ETag); incremento é exclusivo do adapter Prisma
- [x] 3.2 `recordLoginFailure`/`resetLoginFailures` mantidos com a mesma lógica; `version` passa através via `rebuild()` sem incremento no domínio (decisão explícita: incremento é só do adapter)
- [x] 3.3 **CORRIGIDO (Grupo 5, 35.1/35.2):** `UserAccountRepository.recordLoginFailureAtomic` (novo) faz `SELECT ... FOR UPDATE` dentro de transação; `LoginUseCase` usa esse método e não ignora mais o resultado.
- [x] 3.4 **CORRIGIDO (Grupo 5, 35.4):** `concurrency.e2e-spec.ts` asserta `failedLoginAttempts === 5` exato (confirmado — não é faixa) + `lockedUntil` no futuro, contra banco real com 5 tentativas concorrentes.

### 4. Refresh token rotativo e único

- [x] 4.1 `UNIQUE(refreshTokenDigest)` documentado no docblock de `SessionRepository`; constraint de banco real é do Backend (`apps/backend/prisma`)
- [x] 4.2 **CORRIGIDO (Grupo 5, 39.1/39.2):** `rotateIfDigestMatches` recebe `now` explícito (nunca `new Date()`); `WHERE` exige `revokedAt IS NULL AND expiresAt > now`. Provado por `session-rotation.e2e-spec.ts` (sessão revogada/expirada não rotaciona).
- [x] 4.3 Teste criado: `test/refresh-session.use-case.spec.ts` — refresh válido, sessão revogada, sessão expirada, corrida perdida (`simulateLostRace`), conta inativa, propagação de falhas de cada port

### 5. Revogação imediata em bloqueio/desativação

- [x] 5.1 Confirmado: `UserAccount.block()/unblock()/deactivate()/activate()` já apenas retornam nova instância, sem lógica de revogação; mantidos inalterados
- [x] 5.2 **CORRIGIDO (Grupo 5, 38.1/38.2):** revogação movida do adapter `save()` para o `ToggleAccountStatusUseCase`, orquestrada com `SessionRepository`/`Clock`/`TransactionManager` dentro de `runInTransactionResult`. Provado por teste unitário (fake) + `toggle-status.e2e-spec.ts` (banco real).
- [x] 5.3 Testes de transição de status já cobertos em `test/user-account.entity.spec.ts` (sem regressão)

### 6. Isolamento multi-tenant em domínio

- [x] 6.1 FK composta é constraint de schema Prisma (Backend); documentada no docblock de `SessionRepository`
- [x] 6.2 Documentado no docblock de `SessionRepository`: `UNIQUE(refreshTokenDigest)` e índice `(bancaId, userId)` obrigatórios
- [x] 6.3 Revisado: `LoginUseCase`, `RefreshSessionUseCase` e `ListSessionsUseCase` já escopam toda leitura por `bancaId` (confirmado nos testes existentes e novos)

### 7. Composição desacoplada entre Identity e Tenancy

- [x] 7.1–7.5 **Não aplicável ao escopo de Negócio** — confirmado (via `package.json` e grep) que não há ciclo real ao nível de pacotes TypeScript: `modules/identity` NÃO depende de `@bancaflow/tenancy`; apenas `tenancy` depende de `identity` (unidirecional). O `forwardRef`/composition-root do design.md é uma preocupação de wiring de módulos NestJS em `apps/backend/src/modules/**`, fora deste escopo — responsabilidade do Subagente 2 (Backend)

### 8. Invariantes de entidade protegidas

- [x] 8.1 Cópias defensivas de `Date` implementadas em `UserAccount` (`failedLoginWindowStartedAt`, `lockedUntil`, `credential.passwordChangedAt`) e em `Session` (`expiresAt`, `revokedAt`) — nos getters e na entrada (`tryCreate`)
- [x] 8.2 `UserAccount.tryCreate` valida `failedLoginAttempts >= 0`, retornando `IDENTITY_ERRORS.INVALID_FAILED_LOGIN_ATTEMPTS` (novo código) se negativo
- [x] 8.3 Confirmado: todas as transições já ocorrem via métodos (`block`, `unblock`, `activate`, `deactivate`), sem setters públicos
- [x] 8.4 Teste criado: `test/invariants.spec.ts` — mutação externa de datas expostas, contador não-negativo, ausência de setters
- [x] 8.5 `modules/tenancy`: corrigido bug em `Banca.tryCreate` — armazenava `codigoBanca.raw` (era o bug), agora armazena `.normalized`; nome vazio agora usa `TENANCY_ERRORS.NOME_INVALID` (novo código; antes reusava incorretamente `CODIGO_INVALID`); `activate()/deactivate()` já eram por método; `Banca` não tem datas próprias além de `EntityProps` (herdadas de `Entity`, fora do escopo de alteração — `packages/shared` não editável)
- [x] 8.6 Testes atualizados em `modules/tenancy/test/banca.entity.spec.ts`: nome inválido usa `NOME_INVALID` (não `CODIGO_INVALID`); código normalizado é a forma persistida/comparável

### 9. Erros de domínio adicionais

- [x] 9.1 Adicionados `IDENTITY.PASSWORD_TOO_WEAK` e `IDENTITY.INVALID_FAILED_LOGIN_ATTEMPTS` (`SESSION_REVOKED`/`MUST_CHANGE_PASSWORD` já existiam); adicionado `TENANCY.NOME_INVALID` em `tenancy.errors.ts`
- [x] 9.2 Teste criado: `test/errors.spec.ts` — estabilidade, unicidade e prefixo dos códigos

### 10. Validação do módulo de negócio

- [x] 10.1 `npm run build -w @bancaflow/identity` — sem erros
- [x] 10.2 `npm run test -w @bancaflow/identity` — 136/136 testes passando
- [x] 10.3 `npm run build -w @bancaflow/tenancy` — sem erros (39/39 testes de `npm run test -w @bancaflow/tenancy` também passando)

---

## Grupo 2 — Backend (`apps/backend`)

> **Subagente 2 — Backend**
> Escopo: somente `apps/backend/**`
> Pré-requisito: contratos públicos de `modules/identity` e `modules/tenancy` finalizados pelo Subagente 1
> Contexto fornecido: artefatos OpenSpec, skills `backend-prisma-data`, `backend-controller`

### 11. Evolução do schema Prisma

- [x] 11.1 Adicionada coluna `version INT @default(1)` a `UserAccount`
- [x] 11.2 Adicionada constraint `@unique` a `Session.refreshTokenDigest` (substituiu o `@@index` anterior)
- [x] 11.3 Índice composto `@@index([userId, bancaId])` mantido/confirmado em `Session`
- [x] 11.4 Adicionados `CHECK` de enum via SQL bruto na migration gerada: `user_accounts_role_check` (`OWNER`/`ADMIN`/`USER`), `user_accounts_status_check` (`ACTIVE`/`INACTIVE`/`BLOCKED`), `bancas_status_check` (`ACTIVE`/`INACTIVE`). **Pendente (→ Grupo 5, 40.3):** falta `CHECK (failedLoginAttempts >= 0)`.
- [x] 11.5 FK composta `(userId, bancaId) -> UserAccount(id, bancaId)` **implementada com sucesso** — Prisma aceitou via `@@unique([id, bancaId])` em `UserAccount` + `@relation(fields: [userId, bancaId], references: [id, bancaId])` em `Session`; validada em produção com um teste de integração que tenta inserir uma `Session` cruzando bancas via `prisma.client.session.create` direto (bypass da aplicação) e confirma rejeição por `PrismaClientKnownRequestError` (`test/identity/tenant-isolation.e2e-spec.ts`)
- [x] 11.6 `npm run prisma:generate -w apps/backend` — client sem erros
- [x] 11.7 Migration criada (não via `migrate dev` — ambiente não-interativo/sem TTY rejeitou o comando; gerada via `prisma migrate diff --from-config-datasource --to-schema prisma --script` e aplicada via `prisma migrate deploy`): `prisma/migrations/20260716012553_harden_identity_mvp/migration.sql`

### 12. Helper runInTransactionResult no PrismaService

- [x] 12.1 Implementado `runInTransactionResult<T>(operation: (context) => Promise<Result<T>>): Promise<Result<T>>` em `apps/backend/src/db/prisma.service.ts` — usa uma exceção sentinela interna (`ResultFailureSentinel`) para forçar o Prisma a reverter quando o callback retorna `Result.fail`, capturada de volta como `Result.fail` (nunca propagada); qualquer outra exceção real propaga normalmente
- [x] 12.2 Documentado no docblock do método quais operações usam `runInTransactionResult` (login, troca de senha voluntária/obrigatória, refresh — via `modules/identity`) e onde o `save()` do adapter abre sua própria sub-transação (bloqueio/desativação, fora de uma transação ambiente)
- [x] 12.3 Testes de transação: `src/db/prisma.service.spec.ts` (fake `$transaction`, sem banco — commit/rollback/propagação de exceção real/`isInTransaction()`); complementado por `test/identity/transaction.e2e-spec.ts` (banco real)

### 13. Adapters Prisma com versionamento e compare-and-swap

- [x] 13.1 `apps/backend/src/modules/identity/adapters/user-account.repository.prisma.ts`: `save()` faz CAS otimista (`updateMany` com `WHERE id = ? AND version = ?`, `version: { increment: 1 }`); 0 linhas afetadas → `Result.fail(IDENTITY_LOCAL_ERRORS.CONCURRENCY_CONFLICT)` (código local do Backend, mapeado a 409 no controller — ver nota abaixo). Criação nova sempre grava `version = 1`. Quando o status persistido é `BLOCKED`/`INACTIVE`, revoga (idempotente) as sessões ativas do usuário na MESMA transação/sub-transação
- [x] 13.2 `apps/backend/src/modules/identity/adapters/session.repository.prisma.ts`: `rotateIfDigestMatches` via `updateMany({ where: { id, refreshTokenDigest: oldDigest } })` — 0 linhas → `Result.ok(null)` (corrida perdida, não é erro); `revokeOtherSessions` via `updateMany` com `NOT: { id: currentSessionId }`

### 14. Casos de uso com runInTransactionResult

- [x] 14.1 `LoginUseCase` já usa `runInTransactionResult` (domínio, Subagente 1) — Backend forneceu a implementação concreta consumida por ele
- [x] 14.2 `ChangePasswordUseCase` (voluntária) já usa `runInTransactionResult` (domínio) — módulo wireado com `TRANSACTION_MANAGER` em `identity.module.ts`
- [x] 14.3 **CORRIGIDO (Grupo 5, 33.1/34.1/34.2):** autorização agora é autoritativa no use case (`account.mustChangePassword`); emissão do token movida para dentro de `runInTransactionResult`; controller apenas seta o cookie a partir do output do use case.
- [x] 14.4 `RefreshSessionUseCase` já usa compare-and-swap (domínio) — Backend implementou `rotateIfDigestMatches`
- [x] 14.5 `ToggleAccountStatusUseCase` **não foi alterado** (fora do meu escopo de escrita — é `modules/identity`) e continua chamando `accounts.save()` diretamente, sem `runInTransactionResult`. A atomicidade "muda status + revoga sessões" foi movida para dentro do PRÓPRIO `save()` do adapter (decisão do design.md: "revogação é responsabilidade do adapter"): quando não há transação ambiente, `save()` abre sua própria sub-transação interna (`runInTransactionResult`) envolvendo a escrita do status e a revogação

### 15. Validação de entrada (DTOs)

- [x] 15.1 Criados `apps/backend/src/modules/identity/dto/{login,refresh,change-password,mandatory-password-change,admin-reset-password,toggle-account-status}.dto.ts` com `class-validator`; `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` global em `main.ts`
- [x] 15.2 Testes de DTO validation: `src/modules/identity/dto/dto.spec.ts`

### 16. Configuração de segurança em startup

- [x] 16.1 Criado `apps/backend/src/config/security.config.ts` — `validateSecuritySecrets()` valida `JWT_SECRET`/`REFRESH_TOKEN_SECRET` (obrigatórios, >= 32 chars, diferentes); `main.ts` chama antes de criar a app Nest e `process.exit(1)` em falha. Fallback inseguro `'secret'` removido de `JwtCookieAuthGuard`, `JwtStrategy` e `SharedModule` (JwtModule)
- [x] 16.2 CORS configurado em `main.ts` via `resolveCorsOrigins()` (env `CORS_ORIGINS`, default `http://localhost:3000`) — origem fora da lista é rejeitada (sem `origin: true`)
- [x] 16.3 Testes de startup: `src/config/security.config.spec.ts`

### 17. Guard JWT e validação de sessão

- [x] 17.1 Atualizado `apps/backend/src/modules/identity/guards/jwt-cookie-auth.guard.ts` (mantido o nome real do arquivo, diferente do caminho ilustrativo `jwt-auth.guard.ts` do tasks.md original): além de sessão (`revokedAt`/expiração), agora valida conta ACTIVE (`USER_ACCOUNT_REPOSITORY`) e banca ACTIVE (`BANCA_REPOSITORY`, adicionado ao `exports` de `TenancyModule`); remove o fallback `'secret'`
- [x] 17.2 Decorators `@CurrentUser()`/`@CurrentBancaId()` já existiam (`shared/decorators/current-user.decorator.ts`); não foi necessário criar `@CurrentSessionId()` — `user.sessionId` já vem de `@CurrentUser()`
- [x] 17.3 Testes: `src/modules/identity/guards/jwt-cookie-auth.guard.spec.ts`

### 18. Controllers — endpoints de senha

- [x] 18.1 `PATCH /api/auth/password` (VOLUNTÁRIO) — **`@AllowPasswordChange()` removido** (bug P0 corrigido): agora bloqueado com 403 `IDENTITY.MUST_CHANGE_PASSWORD` quando `mustChangePassword=true`. Após sucesso, reemite o access token da MESMA sessão com `mustChangePassword=false` (via `ACCESS_TOKEN_ISSUER` injetado no controller) — decisão: emitir direto na resposta do próprio endpoint, sem exigir um `refresh()` adicional do cliente
- [x] 18.2 Criado `PATCH /api/auth/mandatory-password-change` (OBRIGATÓRIO) — `@AllowPasswordChange()`, body só com `newPassword`, chama `MandatoryPasswordChangeUseCase`, reemite token igual ao 18.1
- [x] 18.3 Cobertos por `test/identity/identity.e2e-spec.ts` (cenário completo reset→troca obrigatória→acesso sem loop) e `transaction.e2e-spec.ts`; não criado `test/identity/controllers.spec.ts` unitário separado — o controller é fino (delega tudo a use cases/guard) e sua lógica de mapeamento HTTP já é exercitada pelos e2e

### 19. Rest Client atualizado

- [x] 19.1 `apps/backend/src/modules/identity/identity.http` atualizado: troca voluntária (sucesso, senha atual incorreta, senha nova fraca, bloqueada com `mustChangePassword=true`), troca obrigatória (sucesso, senha fraca), campo forjado no body rejeitado pelo DTO, DTO inválido (`username: null`)

### 20. Testes de integração e transação

- [x] 20.1 Criado `apps/backend/test/identity/transaction.e2e-spec.ts` (nome `.e2e-spec.ts`, não `.spec.ts` — ver nota de limitação abaixo): login com falha simulada de `ACCESS_TOKEN_ISSUER` reverte a transação (contador de falha não é resetado, nenhuma sessão criada); troca de senha com falha simulada em `revokeOtherSessions` reverte o hash novo
- [x] 20.2 Criado `apps/backend/test/identity/concurrency.e2e-spec.ts`: 5 logins incorretos concorrentes (`Promise.all`) — ver limitação documentada no arquivo e abaixo; 2 refreshes concorrentes com o mesmo token — exatamente 1 sucede (garantido pelo CAS de `rotateIfDigestMatches`)
- [x] 20.3 Criado `apps/backend/test/identity/tenant-isolation.e2e-spec.ts`: username duplicado mesma banca rejeitado, banca diferente aceito, FK composta rejeita sessão cruzando bancas mesmo via escrita direta (bypass da aplicação)

**Limitação de nomenclatura (documentada)**: o `package.json` do backend só executa specs via dois `testRegex` fixos — `npm run test` (`jest`, `rootDir: src`, `.*\.spec\.ts$`) e `npm run test:e2e` (`jest-e2e.json`, `.e2e-spec.ts$`). Arquivos `test/**/*.integration.spec.ts` (nome ilustrativo do tasks.md original) não seriam executados por NENHUM dos dois scripts. Os três arquivos desta seção foram criados como `test/**/*.e2e-spec.ts` (mesmo padrão de `identity.e2e-spec.ts`/`provision-banca.e2e-spec.ts` já existentes, que também exigem banco real) para que `npm run test:e2e -w apps/backend` realmente os execute.

**Limitação de concorrência real (documentada, não é bug deste subagente)**: `LoginUseCase.recordLoginFailure` (domínio, `modules/identity`, fora do meu escopo de escrita) persiste a falha com uma única chamada `accounts.save()` "fire-and-forget" fora de `runInTransactionResult`, e IGNORA o resultado dessa chamada. Como `save()` agora faz compare-and-swap otimista por `version`, sob concorrência VERDADEIRAMENTE simultânea (mesma versão lida por todas as requisições) apenas UMA escrita vence o CAS por rodada de contenção — as demais perdem silenciosamente (comportamento aceito explicitamente no risco #1 do design.md: "aceitar error rate baixa"). Tentativas sequenciais (uma após a resposta da anterior, sem corrida) continuam bloqueando corretamente na 5ª falha (já coberto em `identity.e2e-spec.ts` e reforçado em `concurrency.e2e-spec.ts`). Isso NÃO afeta o refresh de sessão (`rotateIfDigestMatches`), cujo compare-and-swap é avaliado diretamente no banco no momento do `UPDATE` — garantidamente exatamente 1 vencedor sob concorrência real, testado e confirmado.

### 21. Validação do backend

- [x] 21.1 `npm run lint -w apps/backend` — sem erros (0 erros, 0 warnings)
- [x] 21.2 `npm run test -w apps/backend` — 33/33 testes unitários passando
- [x] 21.3 `npm run build -w apps/backend` — build sem erros
- [x] 21.4 (adicional) `npm run test:e2e -w apps/backend` — 23/23 testes de integração/e2e passando (banco real)

---

## Grupo 3 — Web (`apps/web`)

> **Subagente 3 — Web**
> Escopo: somente `apps/web/**`
> Pré-requisito: contratos HTTP finalizados (endpoints, cookies, erros)
> Contexto fornecido: artefatos OpenSpec, specs de route-protection

### 22. Proxy para proteção de rotas

- [x] 22.1 Atualizado `apps/web/src/proxy.ts` (Next.js 16, `proxy.ts` — não `middleware.ts`):
  - Verifica presença do cookie de access token
  - Redireciona para `/login` se ausente (no servidor, sem renderizar conteúdo); `/trocar-senha` ENTROU no matcher e agora está protegida contra acesso anônimo (buraco de segurança corrigido — antes ficava de fora "para evitar loop")
  - Decodifica payload (apenas leitura, sem tratar como autenticação)
  - Valida `mustChangePassword`: se true e rota ≠ `/trocar-senha`, redireciona para `/trocar-senha`; se rota == `/trocar-senha` e `mustChangePassword == false` (com token válido), redireciona para `/dashboard` — os dois sentidos do loop entre `/login`, `/trocar-senha` e `/dashboard` são tratados explicitamente
  - Matcher para URLs privadas reais: `/dashboard`, `/acerto`, `/cambistas`, `/configuracoes`, `/identity`, `/lancamentos`, `/perfil`, `/pessoas`, `/premios`, `/trocar-senha` (nunca o route group `(private)`)
- [x] 22.2 Confirmado: layout server do grupo privado (`apps/web/src/app/(private)/layout.tsx`) já lê o cookie e redireciona para `/login`/`/trocar-senha` antes de renderizar (defesa em profundidade); backend permanece autoritativo. Nenhuma mudança necessária.
- [x] 22.3 Criado no Grupo 5 (task 41.2): `apps/web/src/proxy.spec.ts` — cobre redirect anônimo em `/dashboard` e `/trocar-senha`, `mustChangePassword` nos dois sentidos, sem loop.

### 23. Formulários de troca de senha

- [x] 23.1 Atualizado `apps/web/src/app/trocar-senha/change-password-form.tsx` (fluxo OBRIGATÓRIO):
  - Passa a chamar `mandatoryPasswordChange({ newPassword })` (novo endpoint dedicado) em vez de `changePassword()` (que agora é exclusivamente voluntário e exige `currentPassword`) — corrige a incoerência P0 do design.md
  - Campos permanecem apenas `newPassword`, `confirmPassword` (já corretos)
  - Removida a chamada manual a `refresh()` pós-sucesso: o próprio endpoint de troca já reemite o cookie do access token (`mustChangePassword=false`) via `Set-Cookie` na resposta; mantido `router.push('/dashboard')` + `router.refresh()`
  - **Decisão**: NÃO foi criada uma tela dedicada de troca VOLUNTÁRIA em `(private)/**` — não existe hoje nenhuma tela wired para isso (confirmado por exploração); existe apenas um mockup estático não funcional na aba "Segurança" de `apps/web/src/app/(private)/perfil/page.tsx` (inputs sem `onSubmit`/estado, já com campo "Senha Atual" alinhado ao contrato). Fora do escopo crítico desta change (instrução explícita do orquestrador); registrado como trabalho futuro.
- [x] 23.2 Validação do Web confirmada: `change-password.schema.ts` já replica localmente a política de força (UX only); resultado `'invalid'` do backend (400/422, inclui `IDENTITY.PASSWORD_TOO_WEAK`) já exibe mensagem genérica adequada no form ("A nova senha não atende aos requisitos de segurança.")
- [x] 23.3 Criado no Grupo 5 (task 41.3): `apps/web/src/app/trocar-senha/change-password-form.spec.tsx` — senha forte chama `mandatoryPasswordChange` e navega; senha fraca não envia; falha do backend exibe erro genérico.

### 24. Cliente HTTP com refresh automático

- [x] 24.1 Atualizado `apps/web/src/shared/api/auth.client.ts` (login/refresh já existiam e permanecem inalterados):
  - `ChangePasswordInput.currentPassword` passou de opcional para OBRIGATÓRIO — `changePassword()` agora é exclusivamente o fluxo voluntário (`PATCH /api/auth/password`)
  - Adicionada `mandatoryPasswordChange(input: { newPassword })` — chama `PATCH /api/auth/mandatory-password-change` via `fetchWithRefresh`, mesmo shape `ChangePasswordResult`
  - Único call-site afetado (`trocar-senha/change-password-form.tsx`) atualizado
- [x] 24.2 Criado no Grupo 5 (task 41.4): `apps/web/src/shared/session/refresh-on-expire.spec.ts` — silent refresh em `401` e redirect em falha do refresh.

### 25. Tratamento de sessão expirada

- [x] 25.1 Confirmado: `apps/web/src/shared/session/refresh-on-expire.ts` já implementado (silent refresh com coalescing + redirect `/login?expired=1`); nenhuma mudança necessária
- [x] 25.2 Confirmado: `login-form.tsx` já exibe aviso "Sua sessão expirou. Entre novamente para continuar." quando `?expired=1`

### 26. Comportamento em bloqueio/desativação

- [x] 26.1 Convertido para e2e automatizado (não mais manual): `apps/backend/test/identity/toggle-status.e2e-spec.ts` prova, contra banco real, que (1) login falha `401` após bloqueio; (2) token antigo (de antes do bloqueio) falha `401` em rota protegida; (3) desbloqueio não ressuscita sessões revogadas — token antigo continua `401`; (4) novo login após desbloqueio funciona (`200`). Adicionado pelo agente principal na revalidação final do Grupo 5.
- [x] 26.2 Confirmado: nenhuma lógica Web específica é necessária (Backend gerencia); `login-form.tsx` já mapeia `account_locked`/`invalid_banca`/`invalid_credentials`/`error` para mensagens genéricas e seguras

### 27. Validação do web

- [x] 27.1 Executado `npm run lint -w apps/web` — sem erros
- [x] 27.2 Executado `npm run build -w apps/web` — build Next.js sem erros (Turbopack, todas as rotas geradas)
- [x] 27.3 Dev server iniciado pelo agente principal (Grupo 4) com Backend real rodando: confirmado que `/dashboard` e `/trocar-senha` sem cookie redirecionam (307) para `/login`, e `/login` renderiza normalmente (200) — fecha o buraco de acesso anônimo a `/trocar-senha` identificado no Grupo 3. Fluxos completos de login/troca de senha via UI (clique-a-clique em navegador) permanecem não executados nesta sessão (sem acesso a navegador interativo); a via HTTP equivalente foi validada no item 29.1

---

## Grupo 4 — Integração e Validação Final

> Executado pelo agente principal após os três subagentes concluírem

### 28. Regressão e testes combinados

- [x] 28.1 `npm run test` na raiz: `@bancaflow/shared` 330/330, `@bancaflow/identity` 136/136, `@bancaflow/tenancy` 39/39, `@bancaflow/backend` (unit) 33/33 — todos passando
- [x] 28.2 Regressão confirmada: nenhuma suíte pré-existente quebrou; contagens acima incluem os testes do MVP anterior mais os novos
- [x] 28.3 `apps/backend/test/identity/concurrency.e2e-spec.ts` (nome real; `tasks.md` original previa `.integration.spec.ts`) executado via `npm run test:e2e -w apps/backend` — 5 logins incorretos concorrentes e 2 refreshes concorrentes cobertos, dentro de 23/23 passando
- [x] 28.4 `apps/backend/test/identity/transaction.e2e-spec.ts` executado no mesmo `test:e2e` — rollback de login/troca de senha coberto, 23/23 passando

### 29. Rest Client e validação manual

- [x] 29.1 Validação manual via `curl` contra o backend real (dev server + Postgres, seed `farizeu`/`owner`), equivalente aos cenários do `identity.http`:
  - Login válido (200, cookies + claims corretos) e inválido (401 genérico) — confirmado
  - CORS: origem fora da allowlist não recebe cabeçalhos e NÃO retorna 500 (bug real encontrado e corrigido em `main.ts` — callback lançava `Error`, causando 500; corrigido para `callback(null, false)`)
  - Rota protegida sem cookie → 401; com cookie válido → 200
  - Admin reset-password → senha temporária forte devolvida uma única vez
  - Login com senha temporária → `mustChangePassword: true`
  - Troca VOLUNTÁRIA bloqueada (403 `IDENTITY.MUST_CHANGE_PASSWORD`) quando `mustChangePassword=true` — confirma o fix do bug P0
  - Troca OBRIGATÓRIA com senha fraca → 422; com senha forte → 200, `mustChangePassword: false`, mesma `sessionId`, cookie novo já na resposta
  - Acesso imediato a rota protegida com o cookie novo → 200 (sem loop)
  - Login com senha antiga (temporária) após a troca → 401; login com a senha nova → 200
  - NÃO testados manualmente (para não bloquear a única conta seed disponível fora de uma janela de 15 min): bloqueio por 5 tentativas reais, banca inativa, block/unblock via `/accounts/:id/status` — essas regras já são verificadas deterministicamente pelos testes automatizados de unidade/integração (itens 28.1–28.4), incluindo `concurrency.e2e-spec.ts`
- [x] 29.2 Dos 20 critérios de aceite da tabela abaixo, os que dependem de HTTP real (1, 2, 3, 4 parcial) foram confirmados manualmente acima; os demais (5–20) são cobertos pelos testes automatizados unit/e2e já executados

### 30. Build monorepo

- [x] 30.1 `npm run build` na raiz — 5/5 pacotes com script de build, todos com sucesso (`shared`, `identity`, `tenancy`, `web` via Next.js/Turbopack, `backend` via Nest)
- [x] 30.2 `npm run lint` na raiz (via turbo) e `npm run lint -w @bancaflow/web` — sem erros; nenhum erro de tipo (build do `web` roda `tsc` do Next.js e do `backend`/`identity`/`tenancy` rodam `tsc` puro, todos sem erros)

### 31. Validação OpenSpec

- [x] 31.1 `openspec validate harden-identity-authentication-mvp --strict` — válido, sem violações
- [x] 31.2 Artefatos revisados: `proposal.md`, `design.md` (com as seções de desvio documentadas pelo Subagente 2), specs delta e este `tasks.md`, atualizado com o estado real de execução de todos os 4 grupos
- [x] 31.3 Nenhum erro de estrutura pendente — validação estrita passa

### 32. Documentação de decisões

- [x] 32.1 `design.md` revisado; decisões 1–11 permanecem coerentes com o que foi implementado; nenhuma reformulação necessária
- [x] 32.2 Migration `20260716012553_harden_identity_mvp` documentada em `design.md`/relato do Subagente 2: `version` (CAS otimista), `UNIQUE(refreshTokenDigest)`, `@@unique([id, bancaId])` + FK composta `Session(userId,bancaId) -> UserAccount(id,bancaId)` (funcionou, sem necessidade de fallback), CHECK constraints de enum via SQL bruto anexado à migration gerada

---

## Grupo 5 — Correções pós-revisão (v2)

> Fonte de verdade do trabalho restante. Cada item só é `[x]` quando um **teste comportamental** que exercita o cenário da spec passar. Mantém a regra dos três subagentes; Negócio fecha contratos antes de Backend/Web. Decisões confirmadas: **lock pessimista** (P1-3), **allowlist de IP/CIDR** (P1-5), **refatorar encapsulamento agora** (Negócio ganha escopo em `packages/shared/**`), **Jest** no Web.

### 33. P0-1 — Autorização autoritativa da troca obrigatória (Negócio)

- [x] 33.1 `MandatoryPasswordChangeUseCase`: após carregar a conta, retornar `Result.fail(IDENTITY_ERRORS.FORBIDDEN)` se `account.mustChangePassword !== true`, **antes de qualquer escrita**. Autorização pela flag, não pelo papel.
- [x] 33.2 Decisão: item era explicitamente opcional (reforço redundante no guard). A garantia autoritativa já está no caso de uso e é provada por teste (unitário + e2e, incluindo `OWNER`/`ADMIN`); reforço adicional no guard avaliado como não necessário para fechar o achado — não implementado deliberadamente, sem risco de regressão de segurança.
- [x] 33.3 Teste: `USER`, `OWNER` e `ADMIN` com `mustChangePassword=false` chamando o endpoint obrigatório recebem `403` e a senha NÃO muda (unitário no domínio + e2e no backend).

### 34. P0-2 — Emissão de token dentro da transação (Negócio + Backend)

- [x] 34.1 Injetar `AccessTokenIssuer` em `ChangePasswordUseCase` e `MandatoryPasswordChangeUseCase`; emitir o novo token (`mustChangePassword=false`) **dentro** do `runInTransactionResult` e retorná-lo no output.
- [x] 34.2 Controller apenas seta o cookie a partir do output; remover a emissão pós-`unwrap` (`reissueAccessToken`).
- [x] 34.3 Teste: com `AccessTokenIssuer` fake que falha, provar que a senha antiga permanece e nenhuma sessão foi revogada (rollback).

### 35. P1-3 — Concorrência do contador de falhas (Negócio + Backend + integração)

- [x] 35.1 Negócio: `LoginUseCase` não ignora o resultado do save de falha; definir contrato/erro de conflito e política.
- [x] 35.2 Backend: implementar lock pessimista (`SELECT ... FOR UPDATE`) na linha da conta, dentro de transação, no caminho de falha de login (preserva a lógica de janela na entidade).
- [x] 35.3 `design.md` decisão 4a atualizada durante `/opsx:update`; coerência do adapter confirmada — `recordLoginFailureAtomic` implementa exatamente o mecanismo descrito (lock pessimista, `now` explícito, sem incremento otimista para este caminho).
- [x] 35.4 Teste de integração: 5 logins errados concorrentes (`Promise.all`) → `failedLoginAttempts === 5` (exato) e bloqueio. Asserção exata, não faixa.

### 36. P1-4 — Roteamento Web → Backend (Web)

- [x] 36.1 Implementar `rewrites()` em `apps/web/next.config.ts`: `/api/:path*` → `${BACKEND_INTERNAL_URL:-http://localhost:4000}/api/:path*`, preservando host/subdomínio.
- [x] 36.2 Documentar a env var e a preservação de host; alinhar tudo à porta real `4000`.
- [x] 36.3 Cobertura em DUAS camadas (o teste automatizado NÃO é cross-server): (a) `apps/web/next.config.spec.ts` valida deterministicamente a config de `rewrites()` (`/api/:path*` → backend, default `:4000` e override por `BACKEND_INTERNAL_URL`); (b) `tenant-resolver.middleware.spec.ts` prova o hop de resolução (peer loopback confiável + `X-Forwarded-Host` → `codigoBanca = "farizeu"`). A cadeia real Web → rewrite Next → Backend → PostgreSQL foi **verificada manualmente** (login `HTTP 200`, banca correta, sessão criada, tenant temporário removido) — ver o roteiro em `next.config.spec.ts` e a nota em 46.2. NÃO existe teste automatizado cross-server (dois servidores simultâneos) — considerado desproporcional para o MVP.

### 37. P1-5 — Fronteira de confiança do proxy (Backend)

- [x] 37.1 Configurar `trust proxy` do Express só para IPs/CIDRs de `TRUSTED_PROXY_IPS` (nunca `true`).
- [x] 37.2 No `TenantResolverMiddleware`: honrar `X-Forwarded-Host` só se `TRUST_PROXY_HOST=true` **e** `req.socket.remoteAddress` (peer imediato) estiver na allowlist.
- [x] 37.3 Teste: peer fora da allowlist forjando `X-Forwarded-Host: outra-banca.bancaflow.com.br` (host válido) não sequestra o tenant; `X-Forwarded-For` forjado não torna `req.ip` confiável.

### 38. P1-6 — Revogação orquestrada no caso de uso (Negócio + Backend)

- [x] 38.1 `ToggleAccountStatusUseCase` recebe `SessionRepository`, `Clock`, `TransactionManager`; ao ir para `BLOCKED`/`INACTIVE`, faz `account.save` + `sessions.revokeAll` dentro de `runInTransactionResult`.
- [x] 38.2 Remover a revogação de dentro de `UserAccountRepositoryPrisma.save()` (volta a persistir só o próprio agregado). Recompor o use case no `IdentityModule`.
- [x] 38.3 Teste unitário com `SessionRepository` fake provando que bloquear/desativar revoga sessões (comportamento visível no domínio) + e2e de atomicidade.

### 39. P1-7 — Corrida na rotação de refresh (Negócio + Backend)

- [x] 39.1 Port `SessionRepository.rotateIfDigestMatches(sessionId, oldDigest, newDigest, newExpiresAt, now)` recebe `now` (da `Clock`).
- [x] 39.2 Adapter: `WHERE id = ? AND refreshTokenDigest = oldDigest AND revokedAt IS NULL AND expiresAt > now`; sem `new Date()` no Prisma.
- [x] 39.3 Teste: sessão revogada entre leitura e rotação → 0 linhas → `401`, sem emitir token; sessão expirada (com `Clock` fake) também não rotaciona.

### 40. Desvios menores

- [x] 40.1 `Session.rotate(newDigest, newExpiresAt, now)` recebe `now` e rejeita `newExpiresAt <= now` (nunca comparar só com a `expiresAt` atual). Teste unitário com `now` controlado. (Negócio)
- [x] 40.2 `role` obrigatório em `CreateUserAccountInput` (remover `?`) e no DTO; `ProvisionBanca` já passa `OWNER`. Reconcilia specs `security-configuration`/`user-account-management`. Teste. (Negócio + Backend)
- [x] 40.3 Adicionar `CHECK (failedLoginAttempts >= 0)` na migration (SQL bruto, reversível). (Backend)
- [x] 40.4 Encapsular `Entity.props` e `ValueObject.value` como `protected readonly` em `packages/shared/src/base`; regressão de todos os pacotes. (Negócio, escopo `packages/shared/**`)
- [x] 40.5 Corrigir CORS: rejeição de origem fora da allowlist **não** retorna `500` — apenas omite os cabeçalhos (`callback(null, false)`, não `callback(new Error(...))`). Teste. (Backend) — *(já corrigido no Grupo 4; manter teste de regressão)*

### 41. Testes Web obrigatórios (Web)

- [x] 41.1 Configurar **Jest** + Testing Library no `apps/web` e adicionar o script `test` ao `package.json`.
- [x] 41.2 Teste de `proxy.ts` (redirect anônimo em `/dashboard` e `/trocar-senha`; `mustChangePassword=true` → `/trocar-senha`; `false` fora de `/trocar-senha`; sem loop).
- [x] 41.3 Teste do formulário de troca obrigatória (chama o endpoint obrigatório com só `newPassword`; sucesso → `/dashboard`; senha fraca → erro acessível).
- [x] 41.4 Teste do cliente HTTP (`auth.client` + `fetchWithRefresh`): silent refresh em `401`, redirect `/login?expired=1` no refresh falho.
- [x] 41.5 Convertido pelo agente principal na revalidação final: `apps/backend/test/identity/toggle-status.e2e-spec.ts` cobre 26.1 integralmente (ver nota em 26.1).

### 42. Revalidação final (agente principal)

- [x] 42.1 `npm run build` — 5/5 pacotes verdes. `npm run test` na raiz — shared 332/332, identity 157/157, tenancy 39/39, backend (unit) 44/44, web 17/17 (todos os novos testes incluídos).
- [x] 42.2 `npm run test:e2e -w apps/backend` — 32/32 (10 suítes), incluindo a asserção exata `failedLoginAttempts === 5` (confirmada, não é faixa) e o novo teste de 26.1.
- [x] 42.3 `npm run lint -w apps/backend` e `npm run lint -w @bancaflow/web` — ambos sem erros.
- [x] 42.4 `openspec validate harden-identity-authentication-mvp --strict` — válido.
- [x] 42.5 Relatório de mapeamento achado→teste entregue na resposta final do agente principal (ver resumo da sessão).

---

## Critérios de Aceite Verificáveis

| # | Cenário | Como Verificar |
|---|---------|---|
| 1 | Troca voluntária exige senha atual correta | Test + Rest Client: senha atual incorreta retorna erro |
| 2 | Troca obrigatória funciona e limpa flag | Test: `mustChangePassword` muda para false; acesso a dashboard OK |
| 3 | Token após troca não cria loop | Test: novo token com `mustChangePassword=false` permite `/dashboard` direto |
| 4 | Senha fraca rejeitada em criação, troca e reset | Test + Rest Client: testar mín. 8 chars, variedade |
| 5 | Falha de token emission causa rollback | Test: simulate token failure, verificar rollback |
| 6 | Falha de crypto causa rollback | Test: simulate bcrypt failure, verificar rollback |
| 7 | Cinco logins incorretos concorrentes → bloqueio correto | Concurrency test: 5 threads simultâneos, contador final = 5 |
| 8 | Dois refreshes concorrentes com mesmo token → 1 vence | Concurrency test: 2 threads, apenas 1 recebe novo token |
| 9 | Banco rejeita session cross-banca (se FK suportado) | Integration test ou SQL: tentar inserir userId de outra banca |
| 10 | Username repetido em bancas diferentes é OK | Integration test: criar "joao" em farizeu e botafogo |
| 11 | Username duplicado em mesma banca é rejeitado | Integration test: segundo "joao" em farizeu retorna erro |
| 12 | Bloquear revoga sessões ativas | Integration test: verificar `revokedAt` é preenchido |
| 13 | Conta reativada requer novo login | Integration test: reativar e tentar usar token antigo → 401 |
| 14 | Banca inativa nega sessão anterior | Integration test: desativar banca, token antigo retorna 401 |
| 15 | Web encaminha host corretamente em dev | Manual: curl com `Host: farizeu.bancaflow.com.br` local |
| 16 | Headers host forjados rejeitados | Manual: curl com `X-Forwarded-Host: hack.com` sem TRUST_PROXY_HOST |
| 17 | Erros Prisma não vazam | Test: simular erro DB, verificar resposta é genérica |
| 18 | Backend falha startup com secrets inválidos | Manual: remover `JWT_SECRET`, executar, verificar exit code != 0 |
| 19 | CORS rejeita origin fora de whitelist | Manual: requisição XHR de origin não listado retorna 403/sem headers CORS |
| 20 | DTO inválido é rejeitado | Test: enviar `{ username: null }`, retorna 400 com validation errors |

---

## Estratégia de Testes Obrigatória

- **Unitários**: Entidades, VOs, casos de uso com fakes de todas ports; mínimo 80% coverage de regra de domínio
- **Integração com BD real**: Transações, versionamento, concorrência, FK, constraints
- **E2E via Rest Client**: Fluxos completos de login, troca de senha, refresh, bloqueio
- **Regressão**: Todos os testes do MVP anterior devem passar

---

## Comandos de Verificação

### Negócio
```bash
npm run build -w @bancaflow/identity
npm run test -w @bancaflow/identity
npm run build -w @bancaflow/tenancy
```

### Backend
```bash
npm run prisma:generate -w apps/backend
npm run prisma:migrate:dev -w apps/backend -- --name harden-identity-mvp
npm run lint -w apps/backend
npm run test -w apps/backend
npm run build -w apps/backend
```

### Web
```bash
npm run lint -w apps/web
npm run build -w apps/web
```

### Monorepo
```bash
npm run build
npm run test
openspec validate harden-identity-authentication-mvp --strict
```

---

## Grupo 6 — Segunda revisão pós-implementação (v3)

> Uma segunda revisão de código encontrou 2 P1 e 2 P2 remanescentes após o Grupo 5. Todos corrigidos e provados por teste comportamental.

### 43. P1-A — Encapsulamento realmente fechado (packages/shared + VOs)

- [x] 43.1 `Entity.toJSON()` retorna `structuredClone(this.props)` (era a referência interna — permitia `entity.toJSON().status = ...` burlar o agregado). Confirmado que `toJSON` não é usado em nenhum ponto do código-fonte (só em .d.ts de node_modules), então clonar é seguro.
- [x] 43.2 Getters `Entity.createdAt/updatedAt/deletedAt` retornam cópia de `Date`.
- [x] 43.3 `Credential.value`, `CodigoBanca.value`, `Username.value` retornam cópia defensiva (não o objeto interno).
- [x] 43.4 Testes de regressão: `packages/shared/test/base/entity.test.ts` (toJSON clona; datas copiadas) e `modules/identity/test/invariants.spec.ts` (mutar `toJSON()`/`credential.value`/`createdAt` NÃO altera o agregado). Ajustado 1 teste pré-existente que assertava igualdade de referência em datas (agora valor).

### 44. P2-B — `currentSessionId` obrigatório e validado (modules/identity)

- [x] 44.1 `ChangePasswordInput.currentSessionId` e `MandatoryPasswordChangeInput.currentSessionId` deixaram de ser opcionais (`?` removido); removidos os fallbacks `?? ''`.
- [x] 44.2 Guarda defensiva: ambos os casos de uso retornam `Result.fail(SESSION_NOT_FOUND)` se `currentSessionId` vier vazio — evita revogar TODAS as sessões e emitir token com `sessionId` vazio.
- [x] 44.3 Testes atualizados para fornecer `currentSessionId` (contrato mudou); suítes de identity verdes (160/160).

### 45. P2-A — Allowlist de proxy com CIDR + IPv4 mapeado em IPv6 (apps/backend)

- [x] 45.1 Novo `isTrustedPeer(peer, allowlist)` em `security.config.ts` usando `ipaddr.js`: normaliza `::ffff:a.b.c.d` → `a.b.c.d` e suporta faixas CIDR (ex.: `172.18.0.0/16`); entradas malformadas são ignoradas; allowlist vazia = falha fechada.
- [x] 45.2 `TenantResolverMiddleware.isFromTrustedProxy` passa a usar `isTrustedPeer` (antes: `includes` por IP exato).
- [x] 45.3 Testes: `security.config.spec.ts` (bloco `isTrustedPeer` — exato/IPv6/CIDR/mapeado/malformado) + `tenant-resolver.middleware.spec.ts` (peer loopback mapeado e CIDR honrando XFH).

### 46. P1-B — Perfil de dev local resolve a banca (apps/backend)

- [x] 46.1 `.env.example`: perfil de DEV documentado — `TRUST_PROXY_HOST="true"` + `TRUSTED_PROXY_IPS="127.0.0.1,::1,::ffff:127.0.0.1"`, com instrução de `/etc/hosts` (`127.0.0.1 farizeu.bancaflow.com.br`) e aviso explícito de PRODUÇÃO (usar IP real do proxy, nunca loopback).
- [x] 46.2 Teste do middleware provando o fluxo local: peer `::ffff:127.0.0.1` + `X-Forwarded-Host: farizeu.bancaflow.com.br` + perfil de dev ⇒ `codigoBanca = "farizeu"`. Verificação real cross-server (Next+Backend simultâneos) permanece manual e documentada no `.env.example`/spec `request-routing-and-proxy`.

### 47. Revalidação final (v3)

- [x] 47.1 `npm run build` (monorepo) — 5/5 verdes.
- [x] 47.2 `npm run test` — shared 333, identity 160, tenancy 39, backend 55, web 17 (todos verdes).
- [x] 47.3 `npm run test:e2e -w apps/backend` — 32/32.
- [x] 47.4 `npm run lint` (backend + web) — sem erros.
- [x] 47.5 `openspec validate --strict` — válido.
