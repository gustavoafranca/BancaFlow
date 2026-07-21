## Why

O módulo Identity (change `implement-identity-authentication-mvp`) depende de um agregado `Banca` e do fluxo `ProvisionBanca` que ainda não existem. Sem eles, a resolução de tenant por subdomínio, a migration do Identity e o seed não podem ser aplicados. Esta change entrega o mínimo de Tenancy necessário para destravar o Backend do Identity, sem antecipar funcionalidades que não fazem parte do MVP.

## What Changes

- Novo módulo de domínio `modules/tenancy` com o agregado `Banca` (id, `codigoBanca` normalizado/único/estável, nome, status `ACTIVE`/`INACTIVE`)
- Value Object `CodigoBanca` com normalização (trim + lowercase), validação de formato e rejeição de subdomínios reservados (`www`, `api`, `admin`, `app`, `status`)
- Contrato `BancaRepository` e caso de uso de consulta pública de contexto: `codigoBanca → { bancaId, isActive }`
- Orquestrador `ProvisionBancaUseCase` (caso de uso **interno**, sem endpoint HTTP no MVP) que cria a `Banca` e, na mesma transação, cria a primeira conta `OWNER` chamando a `CreateUserAccountPort` do Identity com `role: 'OWNER'` explícito
- Modelo Prisma `Banca` em `apps/backend/prisma/models/tenancy.model.prisma`, com `codigoBanca` único, e migration
- Adapter Prisma `BancaRepository`, adapter que implementa o `BancaContextResolver` do Identity consultando Tenancy, e módulo NestJS `TenancyModule`
- Evolução do `PrismaService` para propagar a transação por contexto ambiente (`AsyncLocalStorage`), permitindo que `Banca` e conta `OWNER` sejam persistidas na mesma transação sem alterar as ports do domínio
- Seed final **único e atômico** via `ProvisionBancaUseCase`, criando a banca `farizeu` (`nome = Farizeu`, `status = ACTIVE`) e sua conta `OWNER` na mesma transação — sem seeds separados por módulo; executado na fase de integração por depender da persistência do Identity

## Capabilities

### New Capabilities

- `banca-aggregate`: Agregado `Banca` como tenant raiz — identidade, código de banca normalizado/único/estável, nome e status; invariantes e transições de status
- `banca-context-query`: Consulta pública de contexto de tenant usada pelo Identity — recebe `codigoBanca` e retorna somente `{ bancaId, isActive }`, sem expor a entidade `Banca`
- `provision-banca`: Orquestração de provisionamento — cria a `Banca` e a primeira conta `OWNER` via `CreateUserAccountPort` do Identity, de forma transacional

### Modified Capabilities

## Impact

- **`modules/tenancy`**: Novo módulo de domínio (hoje inexistente) — entidade, VO, repositório, casos de uso, testes
- **`apps/backend/prisma`**: Novo modelo `Banca` + migration; o modelo `UserAccount` do Identity passará a referenciar `Banca`
- **`apps/backend/src/modules/tenancy`**: Adapters Prisma, adapter do `BancaContextResolver`, módulo NestJS
- **`apps/backend/prisma/seed`**: Seed da banca `farizeu`, executado antes do seed de Identity
- **`apps/backend/src/db/prisma.service.ts`**: Evolução para transação ambiente via `AsyncLocalStorage`; os adapters Prisma (Tenancy e Identity) resolvem o cliente ativo por um helper compartilhado
- **Dependência e ordem entre changes**: A parte de contexto do Tenancy (Banca + `BancaContextResolver` + seed) é aplicada antes do Grupo 2 (Backend) de `implement-identity-authentication-mvp`. A integração real do `ProvisionBanca` (com transação ambiente e teste de rollback em banco real) ocorre depois que a persistência de `UserAccount` do Identity existir. O `ProvisionBancaUseCase` consome a `CreateUserAccountPort` exportada por `@bancaflow/identity`
- **`packages/shared`**: Reuso de `Result`, `UseCase`, `Entity`, `ValueObject`, `TransactionManager`, `Id`; nenhuma tecnologia de infraestrutura adicionada ao pacote
