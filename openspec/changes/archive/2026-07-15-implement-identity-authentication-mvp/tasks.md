# Tasks — implement-identity-authentication-mvp

> Subagentes de implementação: usar **exatamente três**, com contexto limpo, na ordem definida abaixo.
> Subagente 1 (Negócio) deve finalizar antes que Backend e Web comecem.

---

## Grupo 0 — Pré-requisito Tenancy/Banca

- [x] 0.1 Confirmar que uma change separada e aprovada de Tenancy fornece o agregado/modelo `Banca`, `codigoBanca` normalizado e único, status, consulta pública de contexto e o fluxo `ProvisionBanca`; não criar `Banca` dentro do Identity
- [x] 0.2 Confirmar que `ProvisionBanca` chamará a port de entrada `CreateUserAccountPort` do Identity para criar a primeira conta com papel `OWNER`
- [x] 0.3 Interromper as tarefas de persistência, resolução de tenant e seed desta change enquanto 0.1 não estiver implementada

## Grupo 1 — Negócio (`modules/identity`)

> **Subagente 1 — Negócio**
> Escopo: somente `modules/identity/**`
> Contexto fornecido: artefatos OpenSpec aprovados, skills `module-aggregate`, `module-entity`, `module-value-object`, `module-use-case`, `module-repository`, `module-dto`, `module-domain-service`

### 1. Contratos e portas do domínio

- [x] 1.1 Criar `modules/identity/src/shared/ports/banca-context-resolver.port.ts` — `BancaContextResolver` retornando `Promise<Result<{ bancaId: string; isActive: boolean }>>`
- [x] 1.2 Criar `modules/identity/src/shared/ports/password-crypto.port.ts` — `PasswordCryptoProvider` com `hash` e `compare` retornando `Promise<Result<...>>`
- [x] 1.3 Criar ports separadas `AccessTokenIssuer`, `RefreshTokenGenerator`, `RefreshTokenDigester` (HMAC-SHA-256) e `TemporaryPasswordGenerator`; não incluir decodificação JWT no domínio
- [x] 1.4 Criar `modules/identity/src/shared/ports/clock.port.ts` — interface `Clock` com `now(): Date`
- [x] 1.5 Reutilizar `TransactionManager` e `Id.createUUID()` de `@bancaflow/shared`; não duplicar esses contratos no Identity
- [x] 1.6 Criar `modules/identity/src/shared/ports/index.ts` re-exportando somente as ports específicas do Identity
- [x] 1.7 Documentar `CreateUserAccountPort` como port de entrada pública implementada pelo `CreateUserAccountUseCase` e consumida por Tenancy

### 2. Erros de domínio

- [x] 2.1 Criar `modules/identity/src/shared/errors/identity.errors.ts` com constantes de erro estáveis: `IDENTITY.USERNAME_ALREADY_EXISTS`, `IDENTITY.ACCOUNT_NOT_FOUND`, `IDENTITY.ACCOUNT_LOCKED`, `IDENTITY.ACCOUNT_INACTIVE`, `IDENTITY.INVALID_CREDENTIALS`, `IDENTITY.SESSION_NOT_FOUND`, `IDENTITY.SESSION_REVOKED`, `IDENTITY.MUST_CHANGE_PASSWORD`, `IDENTITY.BANCA_NOT_FOUND`, `IDENTITY.BANCA_INACTIVE`, `IDENTITY.FORBIDDEN`

### 3. Value Objects

- [x] 3.1 Criar `modules/identity/src/user-account/vo/credential.vo.ts` — Value Object `Credential` com `passwordHash`, `passwordChangedAt`, `mustChangePassword`; método `withNewHash(hash, mustChange)` retornando nova instância imutável
- [x] 3.2 Criar `modules/identity/src/user-account/vo/username.vo.ts` — Value Object `Username` validando formato e expondo `raw` (original) e `normalized` (trim+lowercase)
- [x] 3.3 Criar `modules/identity/src/user-account/vo/account-status.vo.ts` — enum/VO `AccountStatus`: `ACTIVE`, `INACTIVE`, `BLOCKED`
- [x] 3.4 Criar `modules/identity/src/user-account/vo/account-role.vo.ts` — papel mínimo `OWNER`, `ADMIN`, `USER`, sem permissões granulares

### 4. Agregado UserAccount

- [x] 4.1 Criar `modules/identity/src/user-account/user-account.entity.ts` — agregado com `id`, `bancaId`, `username`, `name`, `email?`, `role`, `status`, `credential`, `failedLoginAttempts`, `failedLoginWindowStartedAt?`, `lockedUntil?`
- [x] 4.2 Implementar método `isLocked(now: Date): boolean` — retorna true se `lockedUntil` existe e é futuro
- [x] 4.3 Implementar `recordLoginFailure` reiniciando a janela após 15 minutos e bloqueando somente na quinta falha dentro da janela
- [x] 4.4 Implementar `resetLoginFailures` limpando contador, início da janela e bloqueio temporário
- [x] 4.5 Implementar `activate`, `deactivate`, `block`, `unblock` com invariantes de status e proteção de OWNER
- [x] 4.6 Implementar comportamentos mutáveis como operações que retornam `Result<UserAccount>` com nova instância; incluir troca de senha
- [x] 4.7 Criar `modules/identity/src/user-account/user-account.repository.ts` — interface `UserAccountRepository` com `findByBancaAndUsername(bancaId, normalizedUsername)`, `findById(id)`, `save(account)`, `nextId()`

### 5. Agregado Session

- [x] 5.1 Criar `modules/identity/src/session/session.entity.ts` — agregado `Session` com `id`, `userId`, `bancaId`, `refreshTokenDigest`, `expiresAt`, `revokedAt?`, `deviceInfo?`
- [x] 5.2 Implementar método `isExpired(now: Date): boolean`
- [x] 5.3 Implementar método `isRevoked(): boolean`
- [x] 5.4 Implementar `revoke` retornando `Result<Session>` com nova instância
- [x] 5.5 Implementar `rotate(newDigest, newExpiresAt)` retornando `Result<Session>` com nova instância
- [x] 5.6 Criar `SessionRepository` com busca por digest, filtros obrigatórios de tenant e retornos em `Result`

### 6. Casos de uso — UserAccount

- [x] 6.1 Criar `CreateUserAccountPort` e `CreateUserAccountUseCase`; primeira conta solicitada por `ProvisionBanca` recebe papel `OWNER`; validar unicidade por banca
- [x] 6.2 Criar `modules/identity/src/user-account/use-case/change-password.use-case.ts` — validação da senha atual, hash da nova senha, revogação das demais sessões
- [x] 6.3 Criar `AdminResetPasswordUseCase` — exigir `OWNER`/`ADMIN`, impedir `ADMIN -> OWNER`, gerar senha temporária forte, devolvê-la uma vez, marcar troca obrigatória e revogar sessões
- [x] 6.4 Criar `ToggleAccountStatusUseCase` — exigir `OWNER`/`ADMIN`, validar tenant e impedir `ADMIN -> OWNER`

### 7. Casos de uso — Session (multi-agregado)

- [x] 7.1 Criar `LoginUseCase` — usar resolver, repositórios, password crypto, relógio, geradores, digester, emissor JWT e transação compartilhada
- [x] 7.2 Criar `RefreshSessionUseCase` — calcular digest HMAC, buscar sessão, validar, rotacionar com TTL de 7 dias e emitir novo access token
- [x] 7.3 Criar `modules/identity/src/app/use-case/logout.use-case.ts` — revoga sessão por `sessionId`
- [x] 7.4 Criar `modules/identity/src/app/use-case/logout-all.use-case.ts` — revoga todas as sessões do `userId` no `bancaId`
- [x] 7.5 Criar `modules/identity/src/app/use-case/list-sessions.use-case.ts` — lista sessões ativas por `userId` e `bancaId`
- [x] 7.6 Criar `modules/identity/src/app/use-case/revoke-session.use-case.ts` — revoga sessão específica validando ownership por `bancaId`

### 8. DTOs públicos do módulo

- [x] 8.1 Criar DTO de autenticação com tokens, expirações, `role` e `mustChangePassword`; criar claims `{ sub, bancaId, sessionId, role, mustChangePassword }`
- [x] 8.2 Criar `modules/identity/src/shared/dto/session-info.dto.ts` — `SessionInfoDto { sessionId, createdAt, deviceInfo }`
- [x] 8.3 Criar `modules/identity/src/index.ts` — re-exportar entities, ports, use-cases, DTOs e erros públicos

### 9. Testes unitários do domínio

- [x] 9.1 Testar janela de 15 minutos, reinício fora da janela, quinta falha, expiração, reset completo, imutabilidade, troca de senha e invariantes de status/role
- [x] 9.2 Criar `modules/identity/test/session.entity.spec.ts` — testar `isExpired`, `isRevoked`, `revoke`, `rotate`
- [x] 9.3 Testar login com fakes de todas as ports específicas e `TransactionManager` compartilhado
- [x] 9.4 Testar reset cross-banca, USER sem autorização, ADMIN contra OWNER e retorno único de senha temporária

### 10. Validação do módulo de negócio

- [x] 10.1 Executar `npm run build -w @bancaflow/identity` — build TypeScript sem erros
- [x] 10.2 Executar `npm run test -w @bancaflow/identity` — todos os testes passando

---

## Grupo 2 — Backend (`apps/backend`)

> **Subagente 2 — Backend**
> Escopo: somente `apps/backend/**`
> Pré-requisito: contratos públicos de `modules/identity` finalizados pelo Subagente 1
> Contexto fornecido: artefatos OpenSpec, skills `backend-prisma-data`, `backend-controller`, `module-repository`

### 11. Dependências do backend

- [x] 11.1 Verificar se `bcrypt` e `@types/bcrypt` já estão em `apps/backend/package.json`; adicionar se ausentes (`npm install bcrypt @types/bcrypt -w apps/backend`)
- [x] 11.2 Confirmar que `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt` já estão instalados (verificado no diagnóstico: sim)

### 12. Modelos Prisma

- [x] 12.1 Evoluir `identity.model.prisma` com `UserAccount`, incluindo `role`, `failedLoginWindowStartedAt`, `lockedUntil` e `@@unique([bancaId, normalizedUsername])`; relacionar ao modelo `Banca` fornecido por Tenancy
- [x] 12.2 Adicionar `Session` com `refreshTokenDigest`, expiração/revogação, dispositivo e índices; não usar coluna de token bruto
- [x] 12.3 Confirmar que o modelo `Banca` veio da change de Tenancy; não criá-lo nem adaptá-lo no arquivo de Identity
- [x] 12.4 Executar `npm run prisma:generate -w apps/backend` — gerar client sem erros
- [x] 12.5 Executar `npm run prisma:migrate:dev -w apps/backend -- --name identity-auth-mvp` — criar e aplicar migration

### 13. Adapters e providers

- [x] 13.1 Criar `apps/backend/src/modules/identity/adapters/user-account.repository.prisma.ts` — implementar contrato, mapeamentos explícitos e `Result`, sem vazar Prisma
- [x] 13.2 Criar `apps/backend/src/modules/identity/adapters/session.repository.prisma.ts` — implementar contrato, mapeamentos explícitos e `Result`
- [x] 13.3 Criar adapter de `BancaContextResolver` consumindo a consulta pública de Tenancy; não consultar/possuir `Banca` como regra do Identity
- [x] 13.4 Criar `apps/backend/src/modules/identity/adapters/bcrypt-password-crypto.provider.ts` — implementa `PasswordCryptoProvider` usando bcrypt; custo configurável via `BCRYPT_ROUNDS` (padrão: 12)
- [x] 13.5 Implementar `AccessTokenIssuer` com JWT, `RefreshTokenGenerator` com CSPRNG, `RefreshTokenDigester` com HMAC-SHA-256 e segredo diferente do JWT, e `TemporaryPasswordGenerator` com CSPRNG
- [x] 13.6 Criar `system-clock.provider.ts` e configurar access TTL 60 minutos, refresh TTL 7 dias e cookies por ambiente

### 14. Resolução de tenant (middleware)

- [x] 14.1 Criar `apps/backend/src/modules/identity/middleware/tenant-resolver.middleware.ts` — extrai `codigoBanca` do `Host` (ou `X-Forwarded-Host` quando `TRUST_PROXY_HOST=true`); valida sufixo `.bancaflow.com.br`; rejeita subdomínios reservados; chama `BancaContextResolver`; anexa `{ bancaId }` ao `request`
- [x] 14.2 Registrar o middleware no `IdentityModule` para todas as rotas

### 15. Guard JWT

- [x] 15.1 Substituir/adaptar a estratégia JWT/Bearer existente para validar access token do cookie, claims `{ sub, bancaId, sessionId, role, mustChangePassword }` e sessão ativa; não manter dois fluxos concorrentes
- [x] 15.2 Criar decorator `@CurrentUser()` e `@CurrentBancaId()` para uso nos controllers
- [x] 15.3 Registrar `JwtModule` no `IdentityModule` com configuração de segredo e expiração

### 16. Controller de identidade

- [x] 16.1 Reescrever `apps/backend/src/modules/identity/identity.controller.ts` com endpoints:
  - `POST /api/auth/login` — chama `LoginUseCase`; emite cookies
  - `POST /api/auth/refresh` — chama `RefreshSessionUseCase`; rotaciona cookies
  - `POST /api/auth/logout` — chama `LogoutUseCase`; limpa cookies
  - `POST /api/auth/logout-all` — chama `LogoutAllUseCase`; limpa cookies
  - `GET /api/auth/sessions` — chama `ListSessionsUseCase`
  - `DELETE /api/auth/sessions/:sessionId` — chama `RevokeSessionUseCase`
  - `PATCH /api/auth/password` — chama `ChangePasswordUseCase`
  - `PATCH /api/auth/admin/reset-password` — exige `OWNER`/`ADMIN` e respeita proteção de OWNER
  - `PATCH /api/accounts/:accountId/status` — exige `OWNER`/`ADMIN` e respeita proteção de OWNER
- [x] 16.2 Controller não contém lógica de negócio; não executa Prisma diretamente; mapeia `Result` para HTTP status

### 17. Módulo NestJS — composição de dependências

- [x] 17.1 Reescrever `IdentityModule` — registrar adapters e factories, injetar casos de uso prontos no controller e exportar `CreateUserAccountPort` para Tenancy; reutilizar o `TransactionManager` implementado pelo `PrismaService`

### 18. Seed de desenvolvimento

> NÃO há seed separado de OWNER no Identity. A conta OWNER da `farizeu` é criada atomicamente junto da banca via `ProvisionBancaUseCase`, na fase final de integração da change `implement-tenancy-banca-mvp` (seção 14 daquele plano). O Identity apenas garante que `CreateUserAccountUseCase` esteja exportado e componível como `CreateUserAccountPort`.

- [x] 18.1 Confirmar que `CreateUserAccountUseCase` está exportado por `@bancaflow/identity` e que seu adapter concreto é componível no backend como `CreateUserAccountPort` (consumido pelo `ProvisionBanca`)
- [x] 18.2 Não criar `identity.json`/`seedIdentity` standalone; qualquer verificação de login OWNER usa o seed atômico do Tenancy (Tenancy seção 14)

### 19. Arquivo Rest Client

- [x] 19.1 Criar `apps/backend/src/modules/identity/identity.http` com cenários:
  - Login válido (tenant `farizeu`, credenciais do seed)
  - Login com senha inválida
  - Login com host/banca inválida
  - Login com banca inativa
  - Quatro falhas consecutivas + quinta (bloqueio)
  - Refresh de sessão
  - Refresh com token já rotacionado (rejeição)
  - Logout da sessão atual
  - Acesso após revogação
  - Redefinição administrativa de senha
  - Login após troca obrigatória de senha

### 20. Testes de integração do backend

- [x] 20.1 Criar `apps/backend/test/identity/login.integration.spec.ts` — testa login, bloqueio e desbloqueio com banco real
- [x] 20.2 Criar `apps/backend/test/identity/session.integration.spec.ts` — testa criação, rotação, revogação e isolamento por banca
- [x] 20.3 Criar `apps/backend/test/identity/tenant-isolation.integration.spec.ts` — testa que mesmo username em duas bancas funciona e que cross-banca é rejeitado
- [x] 20.4 Testar HMAC determinístico, rotação, TTL de 7 dias, autorização `OWNER/ADMIN/USER` e proteção de OWNER

### 21. Validação do backend

- [x] 21.1 Executar `npm run lint -w apps/backend` — sem erros de lint
- [x] 21.2 Executar `npm run test -w apps/backend` — todos os testes passando
- [x] 21.3 Executar `npm run build -w apps/backend` — build sem erros

---

## Grupo 3 — Web (`apps/web`)

> **Subagente 3 — Web**
> Escopo: somente `apps/web/**`
> Pré-requisito: contrato HTTP definido (endpoints, cookies, erros) — disponível no design.md e spec de route-protection
> Contexto fornecido: artefatos OpenSpec, skill `frontend-form-schema`, `apps/web/AGENTS.md`

### 22. Cliente HTTP e tipos de sessão

- [x] 22.1 Criar `apps/web/src/shared/api/auth.client.ts` — funções tipadas para `login`, `refresh`, `logout`, `logoutAll`; usa `fetch` com `credentials: 'include'` para enviar cookies
- [x] 22.2 Criar tipos de sessão com `userId`, `bancaId`, `sessionId`, `role` e `mustChangePassword`, sem reutilizar cegamente o DTO compartilhado antigo
- [x] 22.3 Criar `apps/web/src/shared/session/parse-token.ts` — função que decodifica o payload JWT do cookie de access token no lado servidor (sem verificar assinatura — apenas parse)

### 23. Formulário de login

- [x] 23.1 Atualizar `apps/web/src/app/login/_components/login-form.tsx` — substituir campo de e-mail por `username`; remover link "Esqueci minha senha"; manter estilos existentes
- [x] 23.2 Criar schema com `v` de `@bancaflow/shared`, `v.infer`, React Hook Form e mensagens acessíveis; não adicionar Zod a este fluxo
- [x] 23.3 Implementar submit com Server Action ou fetch para `POST /api/auth/login`
- [x] 23.4 Tratar respostas: sucesso -> `/dashboard`; troca obrigatória -> `/trocar-senha`; demais falhas com mensagens seguras e acessíveis

### 24. Troca obrigatória de senha

- [x] 24.1 Criar `apps/web/src/app/trocar-senha/page.tsx` — formulário de troca de senha com campos `newPassword` e `confirmPassword`
- [x] 24.2 Implementar submit para `PATCH /api/auth/password`
- [x] 24.3 Após sucesso, renovar o access token e redirecionar para `/dashboard`

### 25. Proxy de proteção de rotas

- [x] 25.1 Criar `apps/web/src/proxy.ts` conforme Next.js 16; verificar cookie e redirecionar para `/login` se ausente
- [x] 25.2 Verificar claim `mustChangePassword` no payload; redirecionar para `/trocar-senha` se true e rota não for `/trocar-senha`
- [x] 25.3 Configurar matcher para as URLs reais `/dashboard`, `/acerto`, `/cambistas`, `/configuracoes`, `/identity`, `/lancamentos`, `/perfil`, `/pessoas`, `/premios`; nunca usar `(private)` no matcher

### 26. Layout server do grupo privado

- [x] 26.1 Atualizar o layout privado para confirmar a sessão no servidor antes de renderizar; o Proxy cuida do redirect inicial e o backend continua autoritativo

### 27. Tratamento de sessão expirada

- [x] 27.1 Criar `apps/web/src/shared/session/refresh-on-expire.ts` — lógica de silent refresh via `POST /api/auth/refresh` quando access token expira
- [x] 27.2 Integrar o silent refresh no cliente HTTP para interceptar `401` e tentar refresh automaticamente
- [x] 27.3 Se refresh falhar (token expirado ou revogado), redirecionar para `/login` com query param `?expired=1`

### 28. Validação do web

- [x] 28.1 Executar `npm run lint -w apps/web` — sem erros
- [x] 28.2 Executar `npm run build -w apps/web` — build Next.js sem erros de build ou type errors (Next.js verifica tipos no build)

---

## Grupo 4 — Validação final do monorepo

> Executado pelo agente principal após os três subagentes concluírem

- [x] 29.1 Executar `npm run test` na raiz — todos os workspaces passando
- [x] 29.2 Executar `npm run build` na raiz — build limpo do monorepo
- [x] 29.3 Executar `openspec validate implement-identity-authentication-mvp --strict` — sem violações
- [x] 29.4 Verificar manualmente com Rest Client os 18 critérios de aceite do OpenSpec
- [x] 29.5 Confirmar com o seed atômico do Tenancy (via `ProvisionBanca`): iniciar backend, executar o seed, fazer login com `owner` no tenant `farizeu` e receber access token válido

---

## Critérios de aceite verificáveis

| # | Cenário | Como verificar |
|---|---|---|
| 1 | `farizeu.bancaflow.com.br` resolve banca correta | Rest Client: login com Host `farizeu.bancaflow.com.br` retorna `bancaId` correto no token |
| 2 | Mesmo username em bancas diferentes coexiste | Teste de integração `tenant-isolation.integration.spec.ts` |
| 3 | Username duplicado na mesma banca é rejeitado | Teste unitário `create-user-account.use-case.spec.ts` |
| 4 | Login nunca consulta fora do `bancaId` resolvido | Revisão do `LoginUseCase` — query sempre com `bancaId` |
| 5 | Conta ativa autentica com senha válida | Rest Client cenário de login válido |
| 6 | Falha não revela existência de conta | Rest Client: senha errada e username inexistente retornam mesma mensagem |
| 7 | Quinta falha bloqueia conta | Rest Client: 5 tentativas consecutivas |
| 8 | Bloqueio expira em 15 min | Teste unitário com Clock mockado |
| 9 | Login bem-sucedido zera tentativas | Teste unitário `user-account.entity.spec.ts` |
| 10 | Access token expira em 60 min | Configuração JWT + teste unitário |
| 11 | Refresh token rotaciona e o anterior não funciona | Rest Client: refresh → usar token antigo → `401` |
| 12 | Logout invalida sessão | Rest Client: logout → refresh → `401` |
| 13 | Logout global invalida todas as sessões | Teste de integração `session.integration.spec.ts` |
| 14 | Admin não redefine conta de outra banca | Teste unitário `admin-reset-password.use-case.spec.ts` |
| 15 | Senha temporária exige troca | Rest Client: login após reset → verificar `mustChangePassword: true` no token |
| 16 | `bancaId` do body não sobrescreve tenant | Teste de integração: enviar `bancaId` falso no body |
| 17 | Rotas privadas do frontend não renderizam sem sessão | Testar manualmente: acessar `/dashboard` sem cookie -> redirect `/login` |
| 18 | Seed atômico (ProvisionBanca) permite login completo no tenant `farizeu` | Executar seed via ProvisionBanca + Rest Client login |
