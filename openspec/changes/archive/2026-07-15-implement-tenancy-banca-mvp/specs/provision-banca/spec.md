## ADDED Requirements

### Requirement: Provision banca creates banca and first OWNER account
O sistema SHALL fornecer `ProvisionBancaUseCase` que cria uma `Banca` e, na sequência, cria a primeira conta com papel `OWNER` chamando a `CreateUserAccountPort` do Identity.

#### Scenario: Successful provisioning
- **WHEN** o provisionamento recebe dados válidos de banca (`codigoBanca`, `nome`) e da conta OWNER (`username`, `name`, `password`)
- **THEN** uma `Banca` `ACTIVE` é criada, uma conta `OWNER` é criada com o `bancaId` dessa banca, e o resultado contém `{ bancaId, userId }`

#### Scenario: Duplicate code aborts provisioning
- **WHEN** o `codigoBanca` já existe
- **THEN** o provisionamento falha e nenhuma conta é criada

### Requirement: Provisioning is transactional across both repositories
O sistema SHALL executar a criação da banca e da conta OWNER dentro da **mesma** transação Prisma. O contexto de transação SHALL alcançar tanto o repositório de `Banca` (Tenancy) quanto o repositório de `UserAccount` (Identity), sem alterar as assinaturas das ports de domínio — via contexto ambiente (`AsyncLocalStorage`) no `PrismaService`. Falha em qualquer etapa SHALL desfazer as anteriores.

#### Scenario: Account creation failure rolls back banca (unit)
- **WHEN** a criação da conta OWNER falha após a banca ter sido criada, sob um `TransactionManager` fake que propaga o erro
- **THEN** o caso de uso retorna falha e não confirma a persistência da banca

#### Scenario: Account creation failure rolls back banca (integração com banco real)
- **WHEN** o provisionamento roda contra um banco real e a criação da conta OWNER falha após a banca ter sido inserida na transação
- **THEN** ao final nenhuma linha de `Banca` nem de `UserAccount` permanece persistida (a transação foi revertida)

#### Scenario: Both rows persist on success (integração com banco real)
- **WHEN** o provisionamento roda contra um banco real com dados válidos
- **THEN** exatamente uma `Banca` e uma conta `OWNER` associada a ela ficam persistidas após o commit

### Requirement: Provisioning depends only on Identity public port
O sistema SHALL depender exclusivamente da port de entrada pública `CreateUserAccountPort` do Identity, sem acessar tipos internos do Identity.

#### Scenario: Only public port is used with explicit OWNER role
- **WHEN** o `ProvisionBancaUseCase` cria a conta OWNER
- **THEN** ele o faz através de `CreateUserAccountPort`, passando `role: 'OWNER'` explicitamente
