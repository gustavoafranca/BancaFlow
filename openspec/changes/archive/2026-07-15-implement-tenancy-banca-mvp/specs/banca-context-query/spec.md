## ADDED Requirements

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
