# Tasks — document-identity-tenancy-architecture

> Change **estritamente documental** da vertical Identity + Tenancy. Fonte de verdade: implementação atual e testes (não os prompts antigos). Estratégia obrigatória: três subagentes de contexto limpo com escopo de escrita disjunto (Domínio, Backend, Web), seguidos de integração editorial pelo agente principal. **Nenhum subagente altera código de produção** — apenas Markdown (READMEs) e os artefatos OpenSpec. Cada tarefa só é `[x]` quando o conteúdo existe, está correto em relação ao código e cumpre os critérios de aceite.

---

## 1. Grupo 1 — Domínio (`modules/identity/**`, `modules/tenancy/**`)

> **Subagente 1 — Domínio.** Escopo de escrita: `modules/identity/README.md` e `modules/tenancy/README.md`. Critérios de revisão: skills `module-aggregate`, `module-entity`, `module-value-object`, `module-repository`, `module-use-case`, `module-domain-service` (apenas para explicar quando seria apropriado), `module-dto` (quando houver DTO na fronteira). Capability: `domain-module-documentation`.

### 1.1 modules/identity/README.md

- [x] 1.1.1 Abrir com responsabilidade e limite do bounded context de Identity; explicar por que `UserAccount`/`Session` pertencem a Identity e `Banca` não
- [x] 1.1.2 Documentar o agregado `UserAccount` (identidade, ciclo de vida, invariantes de `tryCreate`, normalização de `username`, métodos/transições `activate`/`deactivate`/`block`/`unblock`/`recordLoginFailure`/`resetLoginFailures`/`changePassword`, proteção de OWNER, lockout 5/15min, cópias defensivas de `Date`, uso de `rebuild` evitando `deepMerge`)
- [x] 1.1.3 Documentar o agregado `Session` (invariantes, `revoke`/`rotate` com `now` autoritativo, `isExpired`/`isRevoked`/`isActive`, digest nunca em texto puro)
- [x] 1.1.4 Documentar os Value Objects `Username`, `AccountRole`, `AccountStatus`, `Credential` (normalização, regex, invariantes, cópias defensivas; diferença entidade rica vs. anêmica)
- [x] 1.1.5 Documentar cada caso de uso (finalidade, entrada/saída, pré-condições, entidades/VOs, ports, efeitos persistidos, erros, fronteira transacional e rollback): `LoginUseCase`, `RefreshSessionUseCase`, `LogoutUseCase`, `LogoutAllUseCase`, `ListSessionsUseCase`, `RevokeSessionUseCase`, `CreateUserAccountUseCase`, `ChangePasswordUseCase`, `MandatoryPasswordChangeUseCase`, `AdminResetPasswordUseCase`, `ToggleAccountStatusUseCase`
- [x] 1.1.6 Documentar as ports (saída: `Clock`, `PasswordCryptoProvider`, `RefreshTokenGenerator`, `RefreshTokenDigester`, `AccessTokenIssuer`, `TemporaryPasswordGenerator`, `BancaContextResolver`, `UserAccountRepository`, `SessionRepository`; entrada: `CreateUserAccountPort`), qual lado define o contrato e por que não há Prisma/NestJS/JWT/bcrypt no domínio
- [x] 1.1.7 Documentar regras de negócio (username por banca, papéis, status, bloqueio, senha, sessões) e isolamento por `bancaId`
- [x] 1.1.8 Documentar o catálogo de erros `IDENTITY_ERRORS`; registrar a divergência da string literal `IDENTITY.INVALID_REFRESH_DIGEST` (não é constante do catálogo)
- [x] 1.1.9 Incluir estrutura de pastas comentada, seção "Erros comuns ao evoluir este módulo" e checklist "Como adicionar um novo caso de uso/regra"
- [x] 1.1.10 Documentar a estratégia de testes com fakes (repositórios in-memory, `RollbackOnFailureTransactionManager`, `FixedClock`, etc.) citando os specs correspondentes
- [x] 1.1.11 Incluir o diagrama Mermaid de relacionamentos `Banca`/`UserAccount`/`Session` (ER com FK composta) OU referenciá-lo se colocado no README de backend (decidir na integração; evitar duplicação)

### 1.2 modules/tenancy/README.md

- [x] 1.2.1 Abrir com responsabilidade e limite do bounded context de Tenancy; explicar por que `Banca` pertence a Tenancy
- [x] 1.2.2 Documentar o agregado `Banca` (invariantes de `tryCreate`, armazenamento normalizado de `codigoBanca`, `activate`/`deactivate`, `isActive`) e os VOs `CodigoBanca` (regex, subdomínios reservados) e `BancaStatus`
- [x] 1.2.3 Documentar os casos de uso `GetBancaContextUseCase` (leitura pública de contexto, `Banca` nunca cruza a fronteira) e `ProvisionBancaUseCase` (orquestra `Banca` + primeiro OWNER, `runInTransaction` + `Result.tryAsync`, rollback por exceção)
- [x] 1.2.4 Documentar a port `BancaRepository` e o catálogo `TENANCY_ERRORS`
- [x] 1.2.5 Explicar a relação Identity↔Tenancy no `ProvisionBanca` sem ciclo (Tenancy usa apenas o tipo `CreateUserAccountPort`; direção de dependência `shared ← identity ← tenancy`)
- [x] 1.2.6 Incluir estrutura de pastas comentada, seção "Erros comuns ao evoluir este módulo", checklist de extensão e o diagrama Mermaid do fluxo atômico de `ProvisionBanca`
- [x] 1.2.7 Documentar a estratégia de testes de Tenancy com fakes (`InMemoryBancaRepository`, `FakeCreateUserAccountPort`, `RollbackTransactionManager`) citando os specs

---

## 2. Grupo 2 — Backend (`apps/backend/**`)

> **Subagente 2 — Backend.** Escopo de escrita: `apps/backend/src/modules/identity/README.md`, `apps/backend/src/modules/tenancy/README.md`, `apps/backend/src/modules/platform/README.md` e atualização de `apps/backend/README.md`. Critérios de revisão: skills `backend-controller`, `backend-prisma-data`, `config-prisma` (apenas descrever a infraestrutura existente). Capability: `backend-module-documentation`. Pré-requisito: contratos de domínio já descritos pelo Grupo 1.

### 2.1 apps/backend/src/modules/identity/README.md

- [x] 2.1.1 Posicionar o backend como camada de infraestrutura/adapters + composition root, sem regra de negócio
- [x] 2.1.2 Documentar a composição do `IdentityModule` (imports, controllers, providers, exports, `configure()` aplicando `TenantResolverMiddleware` só no login) e a direção das dependências (sem `forwardRef`)
- [x] 2.1.3 Documentar a tabela de tokens de injeção → adapters/factories (`USER_ACCOUNT_REPOSITORY`, `SESSION_REPOSITORY`, `PASSWORD_CRYPTO_PROVIDER`, `ACCESS_TOKEN_ISSUER`, `REFRESH_TOKEN_GENERATOR`, `REFRESH_TOKEN_DIGESTER`, `TEMPORARY_PASSWORD_GENERATOR`, `CLOCK`, `TRANSACTION_MANAGER`, `BANCA_CONTEXT_RESOLVER` e os `*_USE_CASE`)
- [x] 2.1.4 Documentar a tabela de endpoints (verbo, rota, guard, DTO, caso de uso, resposta, códigos de erro via `STATUS_BY_CODE`) cobrindo `/api/auth/login`, `/refresh`, `/logout`, `/logout-all`, `GET /sessions`, `DELETE /sessions/:id`, `PATCH /password`, `PATCH /mandatory-password-change`, `PATCH /admin/reset-password`, `PATCH /accounts/:accountId/status`
- [x] 2.1.5 Documentar `JwtCookieAuthGuard` (verificação JWT + estado de sessão + conta/banca ativas, revalidado a cada request), os decorators `@CurrentUser`/`@CurrentBancaId`/`@AllowPasswordChange` e o `TenantResolverMiddleware`
- [x] 2.1.6 Documentar o fluxo `Host`/`X-Forwarded-Host` → `codigoBanca` (proxy confiável, `isTrustedPeer` com IP/CIDR e IPv4-mapeado, fail-closed, `BANCA_HOST_SUFFIX`, subdomínios reservados) e o perfil local vs. produção (sem colar secrets)
- [x] 2.1.7 Documentar os mecanismos de credencial/sessão (bcrypt via `BcryptPasswordCryptoProvider`; HMAC-SHA-256 via `HmacRefreshTokenDigester`, só o digest persistido; JWT via `JwtAccessTokenIssuer`; geração CSPRNG de refresh/temp password; flags de cookie HttpOnly/secure/sameSite/path)
- [x] 2.1.8 Documentar concorrência (lock pessimista `SELECT ... FOR UPDATE` em `recordLoginFailureAtomic`; CAS otimista por `version` no `persist`; compare-and-swap em `rotateIfDigestMatches`) e a revogação orquestrada no `ToggleAccountStatusUseCase` (não no adapter)
- [x] 2.1.9 Registrar divergências: endpoints usam `JwtCookieAuthGuard` (não a pilha Passport `JwtGuard`/`JwtStrategy`, presente mas não usada); `@Public()` só afeta `JwtGuard`; dois tokens de transação resolvem para a mesma `PrismaService`
- [x] 2.1.10 Incluir seção "Erros comuns ao evoluir este módulo", checklist "Como adicionar um novo endpoint" e os diagramas de sequência de login, refresh e troca obrigatória de senha

### 2.2 apps/backend/src/modules/tenancy/README.md

- [x] 2.2.1 Documentar a composição do `TenancyModule` (providers `BANCA_REPOSITORY`, `TENANCY_TRANSACTION_MANAGER`, `GetBancaContextUseCase`, `BancaContextResolver`; exports) e que ele não depende do `IdentityModule`
- [x] 2.2.2 Documentar o adapter `BancaRepositoryPrisma` (mapeamento `toDomain`/`fromDomain`, `codigoBanca.normalized`, nunca vaza tipos Prisma) e o `BancaContextResolver` como implementação da port de Identity
- [x] 2.2.3 Incluir seção "Erros comuns ao evoluir este módulo" e checklist de extensão; linkar o README de domínio de Tenancy como fonte das regras

### 2.3 apps/backend/src/modules/platform/README.md

- [x] 2.3.1 Documentar o `PlatformProvisioningModule` como composition root externo que compõe `BancaRepository` (Tenancy) + `CreateUserAccountPort` (Identity) + `TransactionManager` para o `ProvisionBancaUseCase`, quebrando o antigo ciclo Identity↔Tenancy sem `forwardRef`
- [x] 2.3.2 Registrar que `ProvisionBanca` não tem endpoint HTTP no MVP (executado via seed `provision-farizeu.seed.ts` e teste e2e) e linkar o diagrama do fluxo atômico

### 2.4 Prisma, transações, execução e índice do backend

- [x] 2.4.1 Documentar os modelos Prisma (`Banca`, `UserAccount`, `Session`) e relacionamentos, constraints/índices (`UNIQUE(bancaId, normalizedUsername)`, `UNIQUE(refreshTokenDigest)`, `@@unique([id, bancaId])`, FK composta `Session(userId,bancaId)→UserAccount(id,bancaId)`, CHECK de enum e `failedLoginAttempts >= 0`), migrations existentes e seed `farizeu` (sem colar a senha do seed)
- [x] 2.4.2 Documentar transações (`TransactionManager`, `PrismaService.runInTransactionResult`/`runInTransaction`, `AsyncLocalStorage`, `activeClient()`) e o mapeamento banco↔domínio; escolher o README canônico para Prisma e linkar dos demais (evitar duplicação)
- [x] 2.4.3 Documentar configuração (`validateSecuritySecrets`, CORS whitelist, nomes de env de `.env.example`) com exemplos seguros e como rodar `prisma:generate`/`migrate:dev`/`seed`/`test`/`test:e2e`; listar os specs unit e e2e existentes
- [x] 2.4.4 Atualizar `apps/backend/README.md` como índice/porta de entrada apontando para os três READMEs de módulo, preservando conteúdo útil existente

---

## 3. Grupo 3 — Web (`apps/web/**`)

> **Subagente 3 — Web.** Escopo de escrita: `apps/web/src/modules/identity/README.md` e atualização de `apps/web/README.md`. Critérios de revisão: skills `frontend-form-schema` (forms/schemas) e `config-shared-frontend` (apenas compreender a infra compartilhada). Capability: `web-module-documentation`. Pré-requisito: contrato HTTP do backend descrito pelo Grupo 2.

### 3.1 apps/web/src/modules/identity/README.md

- [x] 3.1.1 Abrir com a responsabilidade da experiência de Identity no Web; documentar a estrutura de `components`/`data`/`pages` e registrar que `modules/identity` é placeholder — a lógica real vive em `app/login`, `app/trocar-senha`, `shared/api`, `shared/session`
- [x] 3.1.2 Documentar a tela e o formulário de login (campos `username`/`password`, validações de `login.schema.ts`, tratamento de erros com mensagens genéricas, aviso `?expired=1`) e por que a banca vem do subdomínio (corpo só `{ username, password }`)
- [x] 3.1.3 Documentar o cliente HTTP `auth.client.ts` (métodos, `credentials: 'include'`, cookies HttpOnly) e o silent refresh com coalescing (`fetchWithRefresh`/`refresh-on-expire.ts`, retry único, redirect `/login?expired=1`)
- [x] 3.1.4 Documentar `proxy.ts` (Next 16, não `middleware.ts`): regras para anônimo, autenticado e `mustChangePassword`, prevenção de loop, matcher; explicar por que `/trocar-senha` fica fora do grupo `(private)`
- [x] 3.1.5 Documentar os fluxos de senha: troca obrigatória (`mandatoryPasswordChange({ newPassword })`, token reemitido via `Set-Cookie`, sem `refresh()` manual) e registrar que o fluxo voluntário (`changePassword`, exige `currentPassword`) tem suporte no cliente mas não tem UI no MVP
- [x] 3.1.6 Documentar o rewrite `/api/:path*` → `BACKEND_INTERNAL_URL` (default `http://localhost:4000`) em `next.config.ts`, preservação de host e same-origin em produção
- [x] 3.1.7 Incluir a tabela de rotas públicas/condicionais/privadas relacionadas a Identity e o `(private)/layout.tsx` como defesa em profundidade (backend autoritativo)
- [x] 3.1.8 Documentar estados de carregamento/erro/sucesso; registrar símbolos exportados sem UI (`changePassword`, `logout`, `logoutAll`, `refresh`, `isTokenExpired`, `REFRESH_TOKEN_COOKIE`) como suporte presente/UI não conectada
- [x] 3.1.9 Documentar como testar o Web (Jest + Testing Library; specs de `proxy`, formulário de troca, `fetchWithRefresh`, `next.config`) e o checklist "Como adicionar uma nova tela autenticada sem duplicar regra do backend"; incluir seção "Erros comuns ao evoluir este módulo"

### 3.2 apps/web/README.md

- [x] 3.2.1 Atualizar `apps/web/README.md` como índice/porta de entrada apontando para o README de Identity do Web, preservando conteúdo útil existente; registrar a convenção `proxy.ts` (ver `apps/web/AGENTS.md`)

---

## 4. Grupo 4 — Integração editorial e validação final (agente principal)

> Executado pelo agente principal após os três subagentes. Capabilities: `architecture-diagrams`, `documentation-quality`.

- [x] 4.1 Atualizar o `README.md` da raiz apenas com um índice curto apontando para a documentação detalhada da vertical (sem duplicar conteúdo)
- [x] 4.2 Conferir os seis diagramas Mermaid obrigatórios: dependências da Arquitetura Limpa, login multi-tenant, refresh com rotação, troca obrigatória de senha, fluxo atômico de `ProvisionBanca`, relacionamentos `Banca`/`UserAccount`/`Session`; garantir que cada um está no README certo, é único (sem duplicação) e responde a uma pergunta arquitetural
- [ ] 4.3 Validar que todos os diagramas Mermaid renderizam sem erro de sintaxe
- [x] 4.4 Integração editorial: conferir links cruzados (todo link relativo aponta para arquivo existente), remover duplicações (fonte única + links) e reconciliar terminologia entre os READMEs
- [x] 4.5 Conferir qualidade: pt-BR com termos técnicos em inglês; distinção regra de negócio/aplicação/infraestrutura; decisões de MVP e itens fora de escopo explícitos; divergências registradas; seções "Erros comuns" e checklists presentes em cada README
- [x] 4.6 Executar busca automatizada por secrets nos READMEs criados/alterados e confirmar que nenhum secret real, hash, token ou senha de produção foi copiado (valores de seed/dev marcados como não-produtivos)
- [x] 4.7 Confirmar rastreabilidade ponta a ponta (Web → banco) dos fluxos: login, refresh, logout, troca voluntária/obrigatória de senha, reset administrativo, bloqueio/desativação e provisionamento
- [x] 4.8 Rodar `npm run build` e `npm run test` na raiz e confirmar que permanecem verdes (prova de que a change documental não alterou comportamento)
- [x] 4.9 Rodar `openspec validate document-identity-tenancy-architecture --strict` e confirmar que passa
- [x] 4.10 Registrar na resposta final: READMEs criados/atualizados, divisão por Domínio/Backend/Web, pontos que exigem confirmação humana (ver Open Questions do design) e o comando de aplicação já executado

---

## Critérios de Aceite Verificáveis

| # | Critério | Como verificar |
|---|----------|----------------|
| 1 | Todos os READMEs definidos existem e têm links entre si | Inspeção + verificação de links relativos |
| 2 | Cada agregado, entidade, VO, port, adapter e caso de uso atual está documentado no lugar certo | Revisão cruzada com o inventário do código |
| 3 | Cada endpoint atual do Identity aparece na tabela do Backend | Comparar tabela vs. `identity.controller.ts` |
| 4 | Fluxos de login, refresh, logout, troca de senha, reset, bloqueio e provisionamento rastreáveis Web→banco | Seguir os READMEs + diagramas |
| 5 | Os seis diagramas Mermaid renderizam sem erro | Render em visualizador Mermaid |
| 6 | Todos os links relativos locais apontam para arquivos existentes | Verificação automatizada de links |
| 7 | Nenhum secret real foi copiado | Busca automatizada por secrets |
| 8 | Documentação coerente com testes e implementação atuais | Revisão vs. specs/tests |
| 9 | Build e testes permanecem verdes | `npm run build` + `npm run test` |
| 10 | `openspec validate ... --strict` passa | Executar o comando |

---

## Comandos de Verificação

```bash
# Validação OpenSpec
openspec validate document-identity-tenancy-architecture --strict

# Prova de que a documentação não alterou comportamento
npm run build
npm run test

# Busca por secrets nos READMEs (ajustar conforme necessário)
grep -rInE "(JWT_SECRET|REFRESH_TOKEN_SECRET|Dev@Farizeu123|dev-refresh-secret)=[^ ]" \
  README.md apps/*/README.md apps/backend/src/modules/*/README.md \
  modules/*/README.md apps/web/src/modules/identity/README.md || echo "nenhum secret encontrado"
```
