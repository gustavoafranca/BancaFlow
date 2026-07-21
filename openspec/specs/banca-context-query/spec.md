## Purpose

Define the public banca context query interface and its adapter that bridges the Tenancy domain to the Identity module. This ensures proper tenant resolution without leaking internal domain entities.

---

## Requirements

### Requirement: Public banca context query
O sistema SHALL fornecer uma consulta pública que recebe `codigoBanca` e retorna somente `{ bancaId, isActive }`. A entidade `Banca` NUNCA cruza a fronteira para o módulo consumidor (Identity).

#### Scenario: Existing banca returns context
- **WHEN** a consulta recebe `codigoBanca = "farizeu"` de uma banca existente e ativa
- **THEN** retorna `{ bancaId: <id>, isActive: true }`

#### Scenario: Inactive banca returns inactive context
- **WHEN** a consulta recebe o código de uma banca existente porém `INACTIVE`
- **THEN** retorna `{ bancaId: <id>, isActive: false }`

#### Scenario: Unknown code returns failure
- **WHEN** a consulta recebe um `codigoBanca` que não corresponde a nenhuma banca
- **THEN** retorna um `Result` de falha genérico, sem revelar detalhes

#### Scenario: Code is normalized before lookup
- **WHEN** a consulta recebe `codigoBanca = "FARIZEU"`
- **THEN** a busca é feita pelo valor normalizado `"farizeu"`

### Requirement: Adapter satisfies Identity BancaContextResolver
O sistema SHALL fornecer um adapter que implementa o contrato `BancaContextResolver` do Identity (`resolve(codigoBanca): Promise<Result<{ bancaId, isActive }>>`) delegando para a consulta pública.

#### Scenario: Identity resolves tenant through Tenancy
- **WHEN** o Identity chama `BancaContextResolver.resolve("farizeu")`
- **THEN** o adapter retorna o mesmo contexto da consulta pública de Tenancy

### Requirement: Authenticated banca display context query by identifier
O sistema SHALL fornecer uma query de Tenancy que recebe um `bancaId` confiável e retorna somente a projeção `{ bancaId, codigoBanca, nome }` de uma banca ativa. `codigoBanca` SHALL estar em sua forma normalizada e `nome` SHALL vir de `Banca.nome`.

A query SHALL retornar DTO/projeção, nunca a entidade `Banca` ou tipo de persistência. Identificador desconhecido ou banca inativa SHALL produzir ausência/falha de estado esperada e segura, distinguível internamente de falha técnica de execução.

#### Scenario: Active banca returns display context by id
- **WHEN** a query recebe o `bancaId` de uma banca ativa
- **THEN** retorna `{ bancaId, codigoBanca: <código normalizado>, nome: <Banca.nome> }`

#### Scenario: Unknown banca id returns expected safe absence
- **WHEN** a query recebe um `bancaId` inexistente
- **THEN** retorna ausência ou falha de estado esperada, sem revelar detalhes de persistência e sem classificá-la como falha técnica

#### Scenario: Inactive banca id returns expected safe state failure
- **WHEN** a query recebe o `bancaId` de uma banca inativa
- **THEN** retorna ausência ou falha de estado esperada e não devolve a projeção

#### Scenario: Banca entity never crosses the query boundary
- **WHEN** a banca é encontrada
- **THEN** a query retorna somente o DTO declarado, sem serializar `Banca`, status ou campos Prisma

### Requirement: Authenticated banca query preserves technical failures
O sistema SHALL manter falhas de conexão, timeout, Prisma ou exceções inesperadas tecnicamente distinguíveis de banca ausente ou inativa. O adapter e a integração com Identity SHALL propagar essa distinção sem colapsar a falha técnica em ausência, falha genérica de estado ou `INVALID_CREDENTIALS`.

Detalhes técnicos SHALL permanecer internos. Quando a query for usada por `GET /api/auth/me`, a borda HTTP SHALL aplicar o contrato `500` genérico definido pela capability `authenticated-user-context`.

#### Scenario: Prisma or connection failure remains technical
- **WHEN** a leitura por `bancaId` falha por erro do Prisma, conexão, timeout ou exceção inesperada
- **THEN** a query retorna ou propaga uma falha técnica distinguível internamente, sem convertê-la em banca ausente ou inativa

#### Scenario: Identity integration preserves Tenancy technical failure
- **WHEN** a port de Identity recebe uma falha técnica da query de Tenancy
- **THEN** preserva a classificação técnica para que a borda HTTP retorne `500` genérico, sem convertê-la em `401 INVALID_CREDENTIALS`

### Requirement: Authenticated display query preserves public tenant resolution
A adição da consulta autenticada por `bancaId` SHALL NOT alterar a consulta pública existente que resolve tenant por `codigoBanca`. A consulta pública SHALL continuar normalizando o código e retornando somente `{ bancaId, isActive }`, conforme sua spec-base.

#### Scenario: Existing public query contract remains stable
- **WHEN** um consumidor resolve uma banca pela consulta pública usando `codigoBanca`
- **THEN** o comportamento e o retorno permanecem `{ bancaId, isActive }`, sem exposição pública de `nome` ou ampliação para atender `GET /api/auth/me`

#### Scenario: Authenticated and public queries use distinct identifiers
- **WHEN** `GET /api/auth/me` precisa do contexto de exibição da banca
- **THEN** usa a consulta autenticada por `bancaId` e não depende do host ou da consulta pública por `codigoBanca`
