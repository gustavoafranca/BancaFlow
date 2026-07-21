# Tasks — implement-tenancy-banca-mvp

> Escopo mínimo para destravar o Grupo 2 (Backend) de `implement-identity-authentication-mvp`.
> Ordem de aplicação: esta change ANTES do Grupo 2 do Identity.
> Estratégia de subagentes: Negócio (`modules/tenancy`) primeiro; Backend (`apps/backend`) depois, com o contrato de domínio finalizado.

---

## Grupo 1 — Negócio (`modules/tenancy`)

> Escopo de escrita: somente `modules/tenancy/**`

### 1. Setup do módulo

- [x] 1.1 Criar o pacote `modules/tenancy` no padrão de `modules/identity` (package.json `@bancaflow/tenancy`, tsconfig, jest.config.ts); pode-se usar a skill `config-new-module` ou espelhar o identity manualmente
- [x] 1.2 Adicionar dependências `@bancaflow/shared` e `@bancaflow/identity` (para a port de entrada pública)

### 2. Value Object

- [x] 2.1 Criar `modules/tenancy/src/banca/vo/codigo-banca.vo.ts` — VO `CodigoBanca` com normalização (`trim().toLowerCase()`), validação de formato (`^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$`) e rejeição de reservados (`www`, `api`, `admin`, `app`, `status`); expõe `raw` e `normalized`
- [x] 2.2 Criar `modules/tenancy/src/banca/vo/banca-status.vo.ts` — `BancaStatus`: `ACTIVE`, `INACTIVE`

### 3. Erros de domínio

- [x] 3.1 Criar `modules/tenancy/src/shared/errors/tenancy.errors.ts` — `TENANCY.CODIGO_INVALID`, `TENANCY.CODIGO_RESERVED`, `TENANCY.CODIGO_ALREADY_EXISTS`, `TENANCY.BANCA_NOT_FOUND`

### 4. Agregado Banca

- [x] 4.1 Criar `modules/tenancy/src/banca/banca.entity.ts` — agregado `Banca` com `id`, `codigoBanca: CodigoBanca`, `nome`, `status: BancaStatus`; métodos `activate()`/`deactivate()` retornando `Result<Banca>`. Atenção ao bug `cloneWith`/`Date` do shared (usar rebuild com spread raso se sobrescrever datas)
- [x] 4.2 Criar `modules/tenancy/src/banca/banca.repository.ts` — `BancaRepository` com `nextId()`, `findByCodigo(normalized): Promise<Result<Banca|null>>`, `findById(id): Promise<Result<Banca|null>>`, `existsByCodigo(normalized): Promise<Result<boolean>>`, `save(banca): Promise<Result<void>>`

### 5. Casos de uso

- [x] 5.1 Criar `modules/tenancy/src/banca/use-case/get-banca-context.use-case.ts` — `GetBancaContextUseCase` (IN `{ codigoBanca }` → OUT `{ bancaId, isActive }`); normaliza antes de buscar; falha genérica se inexistente
- [x] 5.2 Criar `modules/tenancy/src/app/use-case/provision-banca.use-case.ts` — `ProvisionBancaUseCase` (IN `{ codigoBanca, nome, owner: { username, name, password, email? } }` → OUT `{ bancaId, userId }`); usa `BancaRepository`, `CreateUserAccountPort` do Identity e `TransactionManager`; valida unicidade de código; cria banca + conta OWNER passando `role: 'OWNER'` explícito; envolve as duas escritas em `runInTransaction`
- [x] 5.3 Criar `modules/tenancy/src/index.ts` — re-exportar entidade, VOs, repositório, casos de uso, erros e DTOs públicos

### 6. Testes unitários

- [x] 6.1 Criar `modules/tenancy/test/codigo-banca.vo.spec.ts` — normalização, formato inválido, reservados
- [x] 6.2 Criar `modules/tenancy/test/banca.entity.spec.ts` — criação, transições de status
- [x] 6.3 Criar `modules/tenancy/test/get-banca-context.use-case.spec.ts` — ativo/inativo/inexistente/normalização, com fake repo
- [x] 6.4 Criar `modules/tenancy/test/provision-banca.use-case.spec.ts` — sucesso (verificando `role: 'OWNER'` explícito passado à port), código duplicado, e rollback quando a criação da conta falha (fake `CreateUserAccountPort` e fake `TransactionManager` que propaga o erro)

### 7. Validação do módulo de negócio

- [x] 7.1 Executar `npm run build -w @bancaflow/tenancy` — sem erros
- [x] 7.2 Executar `npm run test -w @bancaflow/tenancy` — todos os testes passando

---

## Grupo 2 — Backend Tenancy: Banca + consulta de contexto (`apps/backend`)

> Escopo de escrita: somente `apps/backend/**`
> Pré-requisito: contrato de `modules/tenancy` finalizado
> Objetivo: destravar a resolução de tenant do Identity. NÃO liga o `ProvisionBanca` real ainda (a persistência de `UserAccount` do Identity ainda não existe). NÃO há seed standalone de banca — o seed é atômico via `ProvisionBanca` na fase de integração (seção 14).

### 8. Modelo Prisma e migration

- [x] 8.1 Criar `apps/backend/prisma/models/tenancy.model.prisma` — modelo `Banca` com `id`, `codigoBanca @unique`, `nome`, `status`, `createdAt`, `updatedAt`; mapeamento de tabela explícito (`@@map`)
- [x] 8.2 Executar `npm run prisma:generate -w apps/backend` — client sem erros
- [x] 8.3 Executar `npm run prisma:migrate:dev -w apps/backend -- --name tenancy-banca-mvp` — criar e aplicar migration

### 9. Adapters e módulo NestJS

- [x] 9.1 Criar `apps/backend/src/modules/tenancy/adapters/banca.repository.prisma.ts` — implementa `BancaRepository` com `toDomain`/`fromDomain` explícitos e retorno em `Result`; sem vazar tipos Prisma. Resolve o cliente Prisma por um helper `activeClient()` (preparando a transação ambiente da fase de integração)
- [x] 9.2 Criar `apps/backend/src/modules/tenancy/adapters/banca-context.resolver.ts` — implementa o `BancaContextResolver` do Identity delegando ao `GetBancaContextUseCase`
- [x] 9.3 Criar `apps/backend/src/modules/tenancy/tenancy.module.ts` — registrar adapters e factories dos casos de uso; exportar `BancaContextResolver` (para o IdentityModule) e o `GetBancaContextUseCase`; reutilizar o `PrismaService`

### 10. Validação do backend (contexto)

> Sem seed nesta fase. A banca `farizeu` é criada atomicamente via `ProvisionBanca` na seção 14. Testes de integração da consulta de contexto criam seus próprios dados.

- [x] 10.1 Executar `npm run lint -w apps/backend` — sem erros
- [x] 10.2 Executar `npm run build -w apps/backend` — sem erros
- [x] 10.3 Executar `npm run test -w apps/backend` — testes passando

---

## Grupo 3 — Integração real do ProvisionBanca (`apps/backend`)

> Pré-requisito: Grupo 2 do Identity (`implement-identity-authentication-mvp`) concluído — persistência de `UserAccount` existindo e `Banca` referenciada.
> Objetivo: ligar `ProvisionBancaUseCase` ao Identity real com transação compartilhada e provar o rollback.

### 12. Transação ambiente compartilhada

- [x] 12.1 Evoluir `apps/backend/src/db/prisma.service.ts` — manter o cliente de transação ativo em `AsyncLocalStorage`; `runInTransaction` executa o callback dentro do escopo ALS; expor helper `activeClient()` que retorna o `tx` ambiente ou o cliente padrão
- [x] 12.2 Garantir que os adapters Prisma de Tenancy e de Identity (`banca.repository.prisma.ts`, `user-account.repository.prisma.ts`, `session.repository.prisma.ts`) resolvam o cliente via `activeClient()`
- [x] 12.3 Compor no `TenancyModule` o `ProvisionBancaUseCase` real, injetando o `CreateUserAccountUseCase` (adapter concreto do Identity) como `CreateUserAccountPort` e o `PrismaService` como `TransactionManager`

### 13. Teste de integração com banco real

- [x] 13.1 Criar `apps/backend/test/tenancy/provision-banca.e2e-spec.ts` (harness e2e do backend) — sucesso: banca + conta OWNER persistidas na mesma transação
- [x] 13.2 Adicionar cenário de rollback: forçar falha na criação da conta OWNER (username inválido, rejeitado após a banca já persistida no `tx`) e comprovar que NENHUMA linha de `Banca` nem de `UserAccount` permanece
- [x] 13.3 Executar `npm run test:e2e -w apps/backend` — testes de integração passando (10/10)

### 14. Seed final único via ProvisionBanca (atômico)

> Este é o ÚNICO seed do fluxo Identity+Tenancy. Não há seed de banca no Tenancy nem seed de OWNER no Identity separadamente.

- [x] 14.1 Criar `apps/backend/prisma/seed/data/farizeu.json` — dados do provisionamento: banca `{ codigoBanca: "farizeu", nome: "Farizeu", status: "ACTIVE" }` + owner `{ username, name, password (valor exclusivamente de desenvolvimento, documentado) }`
- [x] 14.2 Criar `apps/backend/prisma/seed/tasks/provision-farizeu.seed.ts` — instancia o `ProvisionBancaUseCase` real (com adapters Prisma e `PrismaService` como `TransactionManager`) e o executa de forma idempotente (não recriar se `farizeu` já existir)
- [x] 14.3 Registrar o seed em `apps/backend/prisma/seed/main.ts` (substitui qualquer seed separado de banca/OWNER)
- [x] 14.4 Executar `npm run prisma:seed -w apps/backend` — confirmar que banca `farizeu` e conta `OWNER` foram criadas na mesma transação e que o login OWNER funciona no tenant `farizeu`

---

## Grupo 4 — Validação final

- [x] 15.1 Executar `openspec validate implement-tenancy-banca-mvp --strict` — sem violações
- [x] 15.2 Confirmar que `BancaContextResolver` está exportado e consumido pelo `IdentityModule`
- [x] 15.3 Confirmar que `implement-identity-authentication-mvp` Grupo 2 pôde ser retomado com `Banca` disponível

---

## Critérios de aceite verificáveis

| # | Cenário | Como verificar |
|---|---|---|
| 1 | `codigoBanca` normalizado e único | Teste unitário `codigo-banca.vo.spec.ts` + `@unique` no Prisma |
| 2 | Reservados rejeitados | Teste unitário do VO |
| 3 | Consulta retorna só `{ bancaId, isActive }` | Teste `get-banca-context.use-case.spec.ts` |
| 4 | Banca inexistente → falha genérica | Teste do caso de uso |
| 5 | ProvisionBanca cria banca + OWNER com `role: 'OWNER'` explícito | Teste `provision-banca.use-case.spec.ts` |
| 6 | Rollback transacional (unit) em falha da conta | Teste com fake TransactionManager |
| 7 | Rollback transacional (banco real): nada persiste | Teste `provision-banca.integration.spec.ts` |
| 8 | Banca e conta OWNER persistem na mesma transação | Teste de integração de sucesso |
| 9 | Adapter satisfaz `BancaContextResolver` do Identity | Type-check do backend + build |
| 10 | Seed cria banca `farizeu` ativa (Farizeu/ACTIVE) | Executar seed e consultar |
