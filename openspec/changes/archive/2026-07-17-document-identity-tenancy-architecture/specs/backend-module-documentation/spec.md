## ADDED Requirements

### Requirement: READMEs de backend existem e posicionam a camada de infraestrutura

O sistema de documentação SHALL prover `apps/backend/src/modules/identity/README.md`, `apps/backend/src/modules/tenancy/README.md` e `apps/backend/src/modules/platform/README.md`, e atualizar `apps/backend/README.md` como índice/porta de entrada, deixando claro que o backend é a camada de infraestrutura/adapters + composition root, sem regra de negócio.

#### Scenario: README de backend posiciona a camada corretamente

- **WHEN** um leitor abre qualquer README de backend
- **THEN** entende que a regra de negócio vive nos pacotes de domínio e que o backend fornece adapters, guards, controllers e wiring
- **AND** o índice `apps/backend/README.md` aponta para os READMEs dos módulos

#### Scenario: Composição NestJS e direção das dependências descritas

- **WHEN** a documentação descreve os módulos NestJS
- **THEN** apresenta `IdentityModule`, `TenancyModule`, `PlatformProvisioningModule`, `DbModule` e `SharedModule` e como se importam
- **AND** registra que `forwardRef` não é usado e que o ciclo Identity↔Tenancy foi quebrado pelo `platform`

### Requirement: Providers, tokens de injeção e factories documentados

A documentação de backend SHALL listar os tokens de injeção (ex.: `USER_ACCOUNT_REPOSITORY`, `SESSION_REPOSITORY`, `TRANSACTION_MANAGER`, `ACCESS_TOKEN_ISSUER`, `BANCA_REPOSITORY`, `TENANCY_TRANSACTION_MANAGER`) e quais adapters/factories os ligam aos ports do domínio.

#### Scenario: Tabela de tokens → adapters

- **WHEN** um leitor procura como um port é satisfeito em runtime
- **THEN** encontra o token de injeção e o adapter/factory correspondente
- **AND** a documentação registra que `TRANSACTION_MANAGER` e `TENANCY_TRANSACTION_MANAGER` resolvem para a mesma instância de `PrismaService` via `useExisting`

### Requirement: Tabela de endpoints do Identity documentada

A documentação de backend SHALL conter uma tabela de endpoints cobrindo verbo e rota, autenticação/guard, DTO de entrada, caso de uso chamado, resposta esperada e principais códigos de erro, sem expor detalhes internos.

#### Scenario: Cada endpoint atual aparece na tabela

- **WHEN** um leitor consulta a tabela de endpoints
- **THEN** encontra todas as rotas atuais sob `/api/auth/*` e `/api/accounts/:accountId/status`
- **AND** cada linha indica guard, DTO, caso de uso, resposta e códigos de erro (mapeados por `STATUS_BY_CODE`)

#### Scenario: Divergências de roteamento registradas

- **WHEN** a documentação descreve autenticação e provisionamento
- **THEN** registra que os endpoints Identity usam `JwtCookieAuthGuard` (e não a pilha Passport `JwtGuard`/`JwtStrategy`, presente mas não usada nessas rotas)
- **AND** registra que `ProvisionBanca` não possui endpoint HTTP no MVP (executado via seed e teste e2e)

### Requirement: Guards, decorators, middleware e resolução de tenant documentados

A documentação de backend SHALL descrever `JwtCookieAuthGuard`, os decorators `@CurrentUser`/`@CurrentBancaId`/`@AllowPasswordChange`, o `TenantResolverMiddleware` e o fluxo de `Host`/`X-Forwarded-Host` → `codigoBanca`, incluindo proxy confiável, IP/CIDR (`isTrustedPeer`) e configuração local vs. produção.

#### Scenario: Fluxo de resolução de tenant explicado

- **WHEN** um leitor quer entender como a banca é resolvida no login
- **THEN** a documentação descreve que `X-Forwarded-Host` só é honrado quando `TRUST_PROXY_HOST=true` e o peer TCP está na allowlist (`TRUSTED_PROXY_IPS`)
- **AND** explica o comportamento fail-closed e o parsing de subdomínio (sufixo `BANCA_HOST_SUFFIX`, subdomínios reservados)

#### Scenario: Guard revalida estado a cada requisição

- **WHEN** a documentação descreve `JwtCookieAuthGuard`
- **THEN** registra a verificação de assinatura JWT, estado da sessão (existe, não revogada, não expirada) e conta/banca ativas
- **AND** explica o efeito de `@AllowPasswordChange()` sobre `mustChangePassword`

### Requirement: Mecanismos de credencial e sessão documentados

A documentação de backend SHALL explicar emissão/validação de JWT, cookies HttpOnly, refresh token, digest HMAC e bcrypt, deixando clara a responsabilidade de cada mecanismo, sem expor secrets.

#### Scenario: Responsabilidade de cada mecanismo é distinta

- **WHEN** um leitor consulta a seção de credenciais/sessão
- **THEN** entende que bcrypt protege a senha, HMAC-SHA-256 gera o digest do refresh token (apenas o digest é persistido) e o JWT carrega claims de acesso
- **AND** os flags de cookie (`httpOnly`, `secure`, `sameSite`, `path`) são descritos sem colar valores de secret

### Requirement: Prisma, transações e concorrência documentados

A documentação de backend SHALL descrever os modelos Prisma e relacionamentos, constraints/índices relevantes (UNIQUE, FK composta, CHECK), o mapeamento banco↔domínio, as migrations existentes e o seed `farizeu`, além de transações (`TransactionManager`, `PrismaService.runInTransactionResult`, `AsyncLocalStorage`) e os mecanismos de concorrência.

#### Scenario: Isolamento e integridade no banco explicados

- **WHEN** um leitor consulta a seção Prisma
- **THEN** encontra a FK composta `Session(userId,bancaId) → UserAccount(id,bancaId)`, o `UNIQUE(refreshTokenDigest)`, o `UNIQUE(bancaId, normalizedUsername)` e as CHECK constraints de enum/contador
- **AND** o mapeamento `toDomain`/`fromDomain` que nunca vaza tipos Prisma é descrito

#### Scenario: Concorrência documentada com o mecanismo correto

- **WHEN** a documentação descreve concorrência
- **THEN** explica o lock pessimista (`SELECT ... FOR UPDATE`) no caminho de falha de login, o versionamento otimista (CAS por `version`) no `save` e o compare-and-swap na rotação de sessão (`rotateIfDigestMatches`)

#### Scenario: Revogação orquestrada no caso de uso

- **WHEN** a documentação descreve revogação de sessões em bloqueio/desativação
- **THEN** registra que a orquestração está no `ToggleAccountStatusUseCase` (não escondida no adapter Prisma) e por quê

### Requirement: Configuração, execução e papel do platform documentados

A documentação de backend SHALL descrever as configurações obrigatórias (nomes de env, validação de secrets, CORS) com exemplos seguros, como executar migrations/seed/testes (unit, integração, e2e) e o papel do módulo `platform` na composição do `ProvisionBanca`.

#### Scenario: Como rodar migrations, seed e testes

- **WHEN** um leitor quer executar o backend localmente
- **THEN** encontra os comandos de `prisma:generate`, `prisma:migrate:dev`, `prisma:seed`, `test` e `test:e2e`
- **AND** os exemplos não contêm secrets reais

#### Scenario: Papel do platform na composição

- **WHEN** a documentação descreve `PlatformProvisioningModule`
- **THEN** explica que ele compõe `BancaRepository` (Tenancy) + `CreateUserAccountPort` (Identity) + `TransactionManager` fora dos dois módulos, para o `ProvisionBancaUseCase`
