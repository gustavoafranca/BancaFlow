# BancaFlow Backend

Backend NestJS da vertical Identity + Tenancy. Esta aplicação é a camada de **infraestrutura/adapters e composition root**: recebe HTTP, configura segurança, implementa ports com Prisma/crypto e compõe casos de uso. As regras de negócio vivem nos pacotes de domínio; controllers e adapters não as redefinem.

## Índice da vertical

- [Identity no backend](src/modules/identity/README.md): endpoints, tokens/factories, guard, tenant resolver, credenciais, cookies, concorrência e diagramas de login/refresh/troca obrigatória;
- [Tenancy no backend](src/modules/tenancy/README.md): `TenancyModule`, `BancaRepositoryPrisma` e `BancaContextResolver`;
- [Platform Provisioning](src/modules/platform/README.md): composition root de `ProvisionBancaUseCase`, seed e ausência de endpoint no MVP;
- [Identity no domínio](../../modules/identity/README.md): agregados, regras, ports e casos de uso;
- [Tenancy no domínio](../../modules/tenancy/README.md): `Banca`, provisionamento e seu diagrama atômico.

`AppModule` importa `IdentityModule`, `TenancyModule`, `PlatformProvisioningModule`, `DbModule` e `SharedModule`. Não há `forwardRef`: a composição cross-context vive no platform. `SharedModule` registra configuração e a pilha Passport; as rotas Identity usam o guard próprio descrito no README do módulo.

## Prisma: modelos, integridade e migrações

Esta é a fonte canônica da persistência da vertical. O schema é modular em [`prisma/models`](prisma/models):

| Modelo        | Papel                     | Integridade relevante                                                                                                                                      |
| ------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Banca`       | tenant raiz               | `codigoBanca` único e normalizado; status limitado a `ACTIVE`/`INACTIVE`; deleção de banca é restrita enquanto houver contas                               |
| `UserAccount` | conta dentro de uma banca | `UNIQUE(bancaId, normalizedUsername)`, `UNIQUE(id, bancaId)`, índice por `bancaId`, `version` para CAS; checks de role/status e `failedLoginAttempts >= 0` |
| `Session`     | sessão de autenticação    | `UNIQUE(refreshTokenDigest)`, índice por `(userId, bancaId)` e FK composta `(userId, bancaId) → UserAccount(id, bancaId)` com cascade                      |

A FK composta impede no próprio banco que uma sessão de uma banca aponte para conta de outra. Somente o digest HMAC do refresh token é persistido. Os campos textuais de role/status usam `CHECK` SQL porque o modelo Prisma atual os representa como `String`.

Migrações existentes, em ordem:

1. [`20260715042906_tenancy_banca_mvp`](prisma/migrations/20260715042906_tenancy_banca_mvp/migration.sql): bootstrap e tabela/índice de `Banca`;
2. [`20260715044114_identity_auth_mvp`](prisma/migrations/20260715044114_identity_auth_mvp/migration.sql): contas, sessões, índices e FKs iniciais;
3. [`20260716012553_harden_identity_mvp`](prisma/migrations/20260716012553_harden_identity_mvp/migration.sql): `version`, digest único, FK composta e checks de enums;
4. [`20260716155208_add_failed_login_attempts_check`](prisma/migrations/20260716155208_add_failed_login_attempts_check/migration.sql): check de contador não negativo.

`PrismaBootstrap` ainda aparece no schema/migração inicial como artefato técnico do bootstrap; não participa da vertical.

O seed [`provision-farizeu.seed.ts`](prisma/seed/tasks/provision-farizeu.seed.ts) usa o `ProvisionBancaUseCase` real para criar uma banca de desenvolvimento e seu OWNER na mesma transação. É idempotente e seu valor de password não deve ser reutilizado nem copiado para logs/documentação/produção.

## Prisma, transações e mapeamento

`PrismaService` implementa `TransactionManager<PrismaTransactionContext>` e mantém o cliente transacional em `AsyncLocalStorage`:

- `runInTransaction(operation)` abre uma transação Prisma e propaga o `tx` pelo contexto ambiente;
- `runInTransactionResult(operation)` converte `Result.fail` em uma exceção sentinela interna para obrigar rollback, depois devolve o mesmo `Result.fail`; exceções reais continuam propagando;
- `activeClient()` retorna o `tx` ambiente ou o client padrão;
- `isInTransaction()` permite ao adapter evitar subtransação quando já está dentro de uma fronteira maior.

Os adapters chamam `activeClient()` e fazem mapeamento explícito `toDomain`/`fromDomain`. Rows e tipos Prisma nunca cruzam as ports. `toDomain` chama factories do domínio (`tryCreate`), enquanto `fromDomain` extrai valores normalizados e campos persistíveis. Erros Prisma conhecidos são traduzidos para códigos estáveis, sem devolver mensagens cruas do banco.

Os tokens `TRANSACTION_MANAGER` (Identity) e `TENANCY_TRANSACTION_MANAGER` (Tenancy) usam `useExisting: PrismaService`; portanto resolvem para a mesma instância. Isso permite que o provisionamento e os casos de uso compostos compartilhem o mesmo `tx` ambiente.

## Configuração e segurança

Use [`.env.example`](.env.example) como lista de nomes, nunca como fonte de secrets reais:

| Variável                   | Finalidade                                                               |
| -------------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`             | conexão PostgreSQL                                                       |
| `PORT`                     | porta HTTP, default 4000                                                 |
| `NODE_ENV`                 | ativa cookies `Secure` em produção                                       |
| `JWT_SECRET`               | assinatura/verificação do access token                                   |
| `REFRESH_TOKEN_SECRET`     | chave distinta do HMAC do refresh token                                  |
| `ACCESS_TOKEN_TTL_MINUTES` | TTL do access token                                                      |
| `REFRESH_TOKEN_TTL_DAYS`   | nome reservado no template; o domínio atual usa TTL de refresh de 7 dias |
| `BCRYPT_ROUNDS`            | custo bcrypt                                                             |
| `BANCA_HOST_SUFFIX`        | sufixo aceito para extrair `codigoBanca`                                 |
| `TRUST_PROXY_HOST`         | habilita consideração de `X-Forwarded-Host` junto com peer confiável     |
| `TRUSTED_PROXY_IPS`        | allowlist de IPs/CIDRs dos proxies                                       |
| `CORS_ORIGINS`             | allowlist de origens, separada por vírgula                               |

`validateSecuritySecrets` roda antes do bootstrap: os dois secrets são obrigatórios, devem ter no mínimo 32 caracteres e ser diferentes. Gere valores aleatórios localmente; não use placeholders em runtime. CORS permite credenciais, mas só reflete origens da allowlist; origem desconhecida recebe resposta sem headers CORS, não erro 500. Sem allowlist de proxy, a confiança falha fechada.

Perfil local seguro: banco local, origens explícitas, host de desenvolvimento mapeado para loopback e confiança somente em loopback quando o Next encaminha o host. Perfil de produção: HTTPS, secrets gerenciados externamente, `CORS_ORIGINS` exata e apenas IPs/CIDRs reais do proxy de borda; nunca confie globalmente em qualquer proxy.

## Instalação, banco e execução

Na raiz do repositório:

```bash
npm install
npm --workspace @bancaflow/backend run db:start
npm --workspace @bancaflow/backend run prisma:generate
npm --workspace @bancaflow/backend run prisma:migrate:dev
npm --workspace @bancaflow/backend run prisma:seed
npm --workspace @bancaflow/backend run start:dev
```

Para produção, use `prisma:migrate:deploy` em vez de `prisma:migrate:dev`. O seed inicializa um `ApplicationContext` NestJS real; por isso sua configuração usa `ts-node` e as mesmas factories/adapters da aplicação.

## Testes

```bash
npm --workspace @bancaflow/backend run test
npm --workspace @bancaflow/backend run test:e2e
npm --workspace @bancaflow/backend run test:cov
```

Specs unitários:

- [`app.controller.spec.ts`](src/app.controller.spec.ts): endpoint básico;
- [`security.config.spec.ts`](src/config/security.config.spec.ts): secrets, CORS, allowlist, CIDR e IPv4 mapeado;
- [`prisma.service.spec.ts`](src/db/prisma.service.spec.ts): commit/rollback de `Result`, propagação e cliente ambiente;
- [`dto.spec.ts`](src/modules/identity/dto/dto.spec.ts): contrato de DTOs;
- [`jwt-cookie-auth.guard.spec.ts`](src/modules/identity/guards/jwt-cookie-auth.guard.spec.ts): sessão, conta, banca e troca obrigatória;
- [`tenant-resolver.middleware.spec.ts`](src/modules/identity/middleware/tenant-resolver.middleware.spec.ts): host direto, proxy confiável e fail-closed.

Specs e2e/integração:

- [`app.e2e-spec.ts`](test/app.e2e-spec.ts) e [`cors.e2e-spec.ts`](test/cors.e2e-spec.ts): bootstrap HTTP e CORS;
- [`identity.e2e-spec.ts`](test/identity/identity.e2e-spec.ts): login, refresh, logout, sessões, reset e trocas de senha;
- [`concurrency.e2e-spec.ts`](test/identity/concurrency.e2e-spec.ts): cinco falhas simultâneas e dois refreshes concorrentes;
- [`session-rotation.e2e-spec.ts`](test/identity/session-rotation.e2e-spec.ts): CAS contra revogação/expiração;
- [`tenant-isolation.e2e-spec.ts`](test/identity/tenant-isolation.e2e-spec.ts): unicidade por banca e FK composta;
- [`toggle-status.e2e-spec.ts`](test/identity/toggle-status.e2e-spec.ts): revogação pelo caso de uso;
- [`transaction.e2e-spec.ts`](test/identity/transaction.e2e-spec.ts): rollback de login e troca de senha;
- [`proxy-trust.e2e-spec.ts`](test/identity/proxy-trust.e2e-spec.ts): rejeição de host encaminhado por peer não confiável;
- [`provision-banca.e2e-spec.ts`](test/tenancy/provision-banca.e2e-spec.ts): commit e rollback de banca + OWNER.

Os testes e2e com banco real exigem PostgreSQL e `DATABASE_URL` de teste apropriada.

## Decisões do MVP e fora de escopo

`ProvisionBanca` não tem endpoint HTTP; a pilha Passport existe, mas não protege as rotas Identity; MFA, recuperação por e-mail, permissões granulares e gestão HTTP de bancas não existem. Esta documentação descreve o código atual, não antecipa essas funcionalidades.

## Erros comuns ao evoluir este módulo

- Implementar regra de negócio em controller, guard, módulo NestJS ou adapter Prisma.
- Alterar schema sem migration/client gerado/mapeamentos/testes correspondentes.
- Usar `PrismaClient` diretamente em adapters e ignorar `activeClient()`, quebrando atomicidade.
- Devolver tipos ou mensagens Prisma além da fronteira.
- Tratar `Result.fail` como retorno normal dentro de `$transaction` e cometer efeitos parciais.
- Usar secrets curtos/iguais, logar credenciais ou copiar a password do seed.
- Liberar CORS genérico ou confiar em qualquer proxy.
- Aplicar `prisma:migrate:dev` em produção.
- Duplicar aqui regras já canônicas nos READMEs de domínio.

## Checklist para adicionar um novo módulo ou adapter

- [ ] Definir a regra e a port no domínio proprietário.
- [ ] Implementar adapter com `toDomain`/`fromDomain` e erros estáveis.
- [ ] Usar `PrismaService.activeClient()` e definir a fronteira transacional no caso de uso.
- [ ] Registrar tokens/factories/exports mínimos, sem `forwardRef`.
- [ ] Criar migration para constraints e índices; regenerar o client.
- [ ] Atualizar `.env.example` apenas com nomes/placeholders seguros, se necessário.
- [ ] Cobrir unitário e e2e, incluindo rollback, concorrência e isolamento.
- [ ] Atualizar o README do módulo e este índice sem duplicar regras de domínio.
