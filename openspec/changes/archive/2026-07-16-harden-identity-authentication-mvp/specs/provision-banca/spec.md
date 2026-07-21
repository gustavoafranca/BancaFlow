## MODIFIED Requirements

### Requirement: Provision banca creates banca and first OWNER account
O sistema SHALL fornecer `ProvisionBancaUseCase` que cria uma `Banca` e, na sequência, cria a primeira conta com papel `OWNER` chamando a `CreateUserAccountPort` do Identity, passando `role: 'OWNER'` **explicitamente** (nunca dependendo de default).

#### Scenario: Successful provisioning with explicit OWNER role
- **WHEN** o provisionamento recebe dados válidos de banca (`codigoBanca`, `nome`) e da conta OWNER (`username`, `name`, `password` forte)
- **THEN** uma `Banca` `ACTIVE` é criada, uma conta `OWNER` é criada com `role: 'OWNER'` explícito e o `bancaId` dessa banca, e o resultado contém `{ bancaId, userId }`

#### Scenario: Duplicate code aborts provisioning
- **WHEN** o `codigoBanca` já existe
- **THEN** o provisionamento falha e nenhuma conta é criada

### Requirement: Provisioning depends only on Identity public port
O sistema SHALL depender exclusivamente da port de entrada pública `CreateUserAccountPort` do Identity, sem acessar tipos internos do Identity.

#### Scenario: Only public port is used with explicit OWNER role
- **WHEN** o `ProvisionBancaUseCase` cria a conta OWNER
- **THEN** ele o faz através de `CreateUserAccountPort`, passando `role: 'OWNER'` explicitamente

## ADDED Requirements

### Requirement: Cross-context orchestration lives in an external composition root
O sistema SHALL posicionar a orquestração que cruza Tenancy e Identity (`ProvisionBanca`) **fora** de ambos os bounded contexts, em uma composição externa (ex.: `PlatformProvisioningModule` / composition root), que conecta o `ProvisionBancaUseCase` às ports públicas dos dois módulos. Nenhum módulo importa o outro de forma cíclica e nenhum `forwardRef` é necessário.

#### Scenario: Composition root wires both public ports
- **WHEN** a composição externa monta `ProvisionBancaUseCase`
- **THEN** injeta `BancaRepository`/regras de Tenancy e `CreateUserAccountPort` de Identity, sem que Tenancy dependa de Identity nem vice-versa

#### Scenario: No forwardRef in the module graph
- **WHEN** os módulos NestJS são inicializados
- **THEN** o grafo de dependências é acíclico e não há `forwardRef` entre `IdentityModule` e `TenancyModule`

#### Scenario: Bounded contexts expose only small stable contracts
- **WHEN** outro código consome Identity ou Tenancy
- **THEN** enxerga apenas ports/casos de uso públicos; internos permanecem privados a cada módulo

### Requirement: Provisioning is atomic under Result-based transactions
O sistema SHALL executar a criação da banca e da conta OWNER na mesma transação com semântica de `Result` ([[transaction-consistency]]): uma falha de negócio após uma escrita SHALL reverter tudo, sem depender de o callback lançar exceção.

#### Scenario: Account creation failure rolls back the banca
- **WHEN** a criação da conta OWNER retorna `Result.fail` após a banca já ter sido inserida na transação
- **THEN** ao final nenhuma linha de `Banca` nem de `UserAccount` permanece persistida
