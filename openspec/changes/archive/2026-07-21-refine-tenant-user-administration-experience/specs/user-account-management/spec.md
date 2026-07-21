## ADDED Requirements

### Requirement: Administrative account listing limits page size
O endpoint HTTP de listagem administrativa de contas SHALL aceitar `page >= 1` e `pageSize >= 1`, limitar `pageSize` por teto seguro documentado, e continuar retornando `PaginatedResultDTO` com `PaginationMetaDTO`. O teto inicial SHALL ser `100`, salvo nova decisão de produto/performance.

#### Scenario: Page size above limit is rejected
- **WHEN** um cliente chama `GET /api/accounts?pageSize=101`
- **THEN** o backend rejeita a requisição com erro de validação e não executa paginação ilimitada

#### Scenario: Shared pagination DTO remains the output contract
- **WHEN** `GET /api/accounts` retorna sucesso
- **THEN** a resposta continua usando `data` e `meta` compatíveis com `PaginatedResultDTO`/`PaginationMetaDTO`

### Requirement: Administrative listing preserves tenant-scoped count and filters
A listagem administrativa SHALL executar `count` e `findMany` com o mesmo filtro tenant-scoped, incluindo exclusão de `OWNER`, busca e filtros antes da paginação. O Web SHALL exibir total e contexto de página de forma legível e desabilitar corretamente Anterior/Próxima.

#### Scenario: Count and page use the same where clause
- **WHEN** a listagem é consultada com busca, papel e status
- **THEN** `total`, `totalPages` e itens retornados refletem o mesmo filtro aplicado no banco

#### Scenario: Single page hides or disables pagination controls
- **WHEN** o resultado possui zero ou uma página
- **THEN** os controles Anterior/Próxima não permitem navegação inválida
