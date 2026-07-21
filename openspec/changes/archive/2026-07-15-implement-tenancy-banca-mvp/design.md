## Context

O Identity autentica contas sempre dentro de um `bancaId` resolvido pelo subdomínio do host. A change `implement-identity-authentication-mvp` definiu, na D3, que Tenancy é dona de `Banca` e `ProvisionBanca`, e que o Identity apenas consome uma port de saída `BancaContextResolver` (`resolve(codigoBanca) → Result<{ bancaId, isActive }>`) e expõe uma port de entrada `CreateUserAccountPort`.

O contrato público do Identity já está implementado e testado (30 testes). `CreateUserAccountPort` tem a assinatura:

```ts
interface CreateUserAccountPort extends UseCase<CreateUserAccountInput, CreateUserAccountOutput> {}
// IN  { bancaId; username; name; password; email?; role?: 'OWNER'|'ADMIN'|'USER'; mustChangePassword? }
// OUT { userId; username; role }
```

Não existe módulo Tenancy nem modelo `Banca`. Esta change entrega o mínimo para destravar o Grupo 2 do Identity.

**Constraints:**
- `modules/tenancy` não importa NestJS, Prisma, HTTP nem cookies.
- Casos de uso implementam `UseCase<IN,OUT>` e retornam `Result<OUT>`.
- Tenancy pode depender de `@bancaflow/identity` apenas pela port de entrada pública (`CreateUserAccountPort`), nunca de tipos internos do Identity.

## Goals / Non-Goals

**Goals:**
- Agregado `Banca` com `codigoBanca` normalizado, único e estável e status `ACTIVE`/`INACTIVE`.
- Consulta pública `codigoBanca → { bancaId, isActive }` para o adapter `BancaContextResolver` do Identity.
- `ProvisionBancaUseCase` transacional: cria `Banca` + primeira conta `OWNER` via `CreateUserAccountPort`.
- Modelo Prisma `Banca`, migration e seed da banca `farizeu`.

**Non-Goals:**
- Ciclo de vida avançado (renomear, suspender com regras de billing), planos/assinaturas, cobrança.
- Gestão administrativa de subdomínios via UI.
- Multi-banca por conta / `Membership`.
- Qualquer alteração no domínio já entregue do Identity.

## Decisions

### D1 — `CodigoBanca` é Value Object com normalização e reserva

`CodigoBanca` normaliza `trim().toLowerCase()`, valida formato (`^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$`, sem hífen no início/fim) e rejeita reservados `www`, `api`, `admin`, `app`, `status`. A unicidade é garantida também no banco (`@unique`).

**Alternativa rejeitada:** validar só no controller — deixaria o domínio permitir estados inválidos.

### D2 — Consulta de contexto retorna DTO mínimo, não a entidade

`GetBancaContextUseCase` retorna `{ bancaId, isActive }`. A entidade `Banca` nunca cruza a fronteira para o Identity. O adapter `BancaContextResolver` (no backend) chama este caso de uso e adapta ao contrato do Identity.

### D3 — `ProvisionBanca` orquestra em transação compartilhada

`ProvisionBancaUseCase` recebe `BancaRepository`, o `CreateUserAccountPort` do Identity e o `TransactionManager` compartilhado. Cria a `Banca`, obtém o `bancaId` e chama `CreateUserAccountPort` com `role: 'OWNER'` **explícito** (não confia no default). Tudo dentro de `runInTransaction` para que falha na criação da conta desfaça a banca.

**Fronteira:** o orquestrador vive em Tenancy (não no Identity), porque coordena os dois módulos e o Identity não deve conhecer Tenancy. Tenancy conhece apenas a port de entrada pública do Identity.

**Provisionamento é interno:** no MVP não há endpoint HTTP para `ProvisionBanca`. É um caso de uso interno, invocado pelo seed (e, futuramente, por um fluxo de administração de plataforma). Não há cadastro público.

### D6 — Propagação transacional via contexto ambiente (AsyncLocalStorage)

O `PrismaService.runInTransaction` atual entrega um `PrismaTransactionContext { client }` ao callback, mas os contratos de repositório do domínio Identity (`UserAccountRepository.save`, `SessionRepository.save`) **não recebem contexto** — e não devem, para não vazar infraestrutura para o domínio. O domínio do Identity já está implementado e testado; não será alterado.

Para que `Banca` e a conta `OWNER` sejam persistidas na **mesma** transação Prisma, o `PrismaService` será evoluído para manter o cliente de transação ativo em um `AsyncLocalStorage`. `runInTransaction` executa o callback dentro do escopo ALS carregando o `tx` client; todo adapter Prisma (tanto de Tenancy quanto de Identity) resolve seu cliente por um helper `activeClient()` que retorna o `tx` ambiente quando existir, ou o cliente padrão caso contrário.

Assim, `ProvisionBancaUseCase` apenas envolve as duas operações em `runInTransaction`, e ambos os repositórios se alistam automaticamente na mesma transação — sem alterar nenhuma assinatura de port do domínio.

**Alternativa rejeitada:** passar o contexto de transação como parâmetro nas ports (`save(account, ctx)`) — vazaria infraestrutura para o domínio e exigiria reabrir o domínio do Identity já concluído.

**Dependência de ordem:** o rollback ponta a ponta só é verificável depois que a persistência de `UserAccount` do Identity existir. Por isso a integração real de `ProvisionBanca` e o teste de rollback com banco real ficam na fase de integração (ver Migration Plan), após o Backend do Identity.

### D4 — Relação Prisma Banca ↔ UserAccount

O modelo `Banca` fica em `apps/backend/prisma/models/tenancy.model.prisma`. Quando o Grupo 2 do Identity criar `UserAccount`, este referenciará `Banca` via `bancaId` com `onDelete: Restrict` (não apagar banca com contas). A ordem de seed é Tenancy → Identity.

### D5 — Reuso de `@bancaflow/shared`

Reusa `Result`, `UseCase`, `Entity`, `ValueObject`, `TransactionManager`, `Id`. Não recria contratos base. Atenção ao bug conhecido de `Entity.cloneWith` com `Date` (ver Risks) — usar rebuild com spread raso se precisar sobrescrever datas.

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| `Entity.cloneWith`/`deepMerge` do shared corrompe `Date` | Usar `rebuild` com spread raso + `tryCreate` ao sobrescrever datas, como feito no Identity |
| Acoplamento Tenancy → Identity | Depender somente da port de entrada pública `CreateUserAccountPort`, nunca de tipos internos |
| Provisionamento parcial (banca criada, conta não) | `runInTransaction` cobrindo banca + conta |
| Colisão de `codigoBanca` | `@unique` no Prisma + verificação no caso de uso antes de inserir |

## Migration Plan

A ordem respeita a dependência entre módulos: Tenancy entrega `Banca` + consulta de contexto; depois o Backend do Identity cria a persistência de `UserAccount`; por último integra-se o `ProvisionBanca` real.

1. Implementar e testar o domínio `modules/tenancy` (inclui `ProvisionBancaUseCase` com testes unitários e rollback via fake `TransactionManager`).
2. Backend Tenancy — parte de contexto: modelo Prisma `Banca` + migration, `BancaRepository` (Prisma), adapter `BancaContextResolver`, `TenancyModule`. Isso já destrava a resolução de tenant do Identity. **Não há seed standalone de banca nesta fase.**
3. Aplicar o Grupo 2 do Identity: persistência de `UserAccount`/`Session` (agora `Banca` existe para a relação). **Sem seed separado de OWNER.**
4. Integração real do `ProvisionBanca`: evoluir `PrismaService` para transação ambiente via `AsyncLocalStorage`; garantir que os adapters Prisma de Tenancy e Identity resolvam o cliente ativo; ligar `ProvisionBancaUseCase` ao `CreateUserAccountUseCase` real; teste de integração com banco real provando o rollback.
5. Seed final único: chamar `ProvisionBancaUseCase` para criar **atomicamente** a banca `farizeu` e sua conta `OWNER` na mesma transação. Não há seed de banca no Tenancy nem seed de OWNER no Identity separadamente. Este seed só executa nesta fase de integração, pois depende da persistência do Identity.

**Rollback:** reverter a migration específica de Tenancy em desenvolvimento.

## Open Questions

Nenhuma. Decisões fechadas para o MVP:

- Seed da banca: `codigoBanca = farizeu`, `nome = Farizeu`, `status = ACTIVE`, sem outros campos — criado **atomicamente com a conta OWNER via `ProvisionBancaUseCase`** (sem seeds separados por módulo), na fase final de integração.
- `ProvisionBanca` não tem endpoint HTTP no MVP; é caso de uso interno chamado pelo seed.
- `CreateUserAccountPort` é chamado com `role: 'OWNER'` explícito.
- Transação compartilhada por `AsyncLocalStorage` no `PrismaService`, sem alterar ports do domínio.
