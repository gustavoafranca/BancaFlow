## Purpose

Define the Banca (Bank/Organization) aggregate as the root entity for tenant isolation in the Tenancy domain. The aggregate encapsulates the business rules around banca creation, normalization, validation, and status management.

---

## Requirements

### Requirement: Banca aggregate with normalized code
O sistema SHALL modelar `Banca` como agregado com `id`, `codigoBanca`, `nome` e `status` (`ACTIVE` ou `INACTIVE`). O `codigoBanca` SHALL ser **armazenado já na forma normalizada e autoritativa** (`trim().toLowerCase()`), servindo como valor único e estável para busca e comparação. O `nome` da banca SHALL ser validado por seu próprio Value Object/erro, distinto do erro de código inválido. Transições de status ocorrem por métodos do agregado (`activate`, `deactivate`), nunca por setters públicos; datas expostas são cópias defensivas.

#### Scenario: Banca stores the normalized code authoritatively
- **WHEN** uma `Banca` é criada com `codigoBanca = "Farizeu"`
- **THEN** o valor persistido e comparável é `"farizeu"`, e todas as buscas usam essa forma normalizada; o status inicial é `ACTIVE`

#### Scenario: Invalid code format is rejected with the code error
- **WHEN** uma `Banca` é criada com `codigoBanca` fora do formato permitido (ex.: `"-farizeu"`, `"fa"`, `"banca_x"`)
- **THEN** a criação falha com o erro de domínio estável específico de código inválido

#### Scenario: Invalid banca name uses its own error, not the code error
- **WHEN** uma `Banca` é criada com `nome` inválido (ex.: vazio)
- **THEN** a criação falha com um erro de nome próprio, distinto do erro de `codigoBanca` inválido

#### Scenario: Status transitions occur only through methods
- **WHEN** o status da banca muda
- **THEN** ocorre via `activate()`/`deactivate()` retornando `Result`, sem setter público

### Requirement: Reserved subdomains are rejected
O sistema SHALL rejeitar os códigos reservados `www`, `api`, `admin`, `app` e `status`.

#### Scenario: Reserved code is rejected
- **WHEN** uma `Banca` é criada com `codigoBanca = "api"`
- **THEN** a criação falha com erro de domínio estável de código reservado

### Requirement: Unique banca code
O sistema SHALL garantir unicidade de `codigoBanca` entre todas as bancas.

#### Scenario: Duplicate code is rejected
- **WHEN** já existe uma banca com `codigoBanca = "farizeu"` e uma nova criação usa o mesmo código
- **THEN** o sistema retorna erro de código já em uso

### Requirement: Banca status transitions
O sistema SHALL permitir ativar e desativar uma banca respeitando invariantes de status, e o banco SHALL restringir `BancaStatus` a `ACTIVE`/`INACTIVE` via enum/check constraint.

#### Scenario: Deactivated banca is reported inactive
- **WHEN** uma banca `ACTIVE` é desativada
- **THEN** seu status passa a `INACTIVE`

#### Scenario: Activate an inactive banca
- **WHEN** uma banca `INACTIVE` é ativada
- **THEN** seu status passa a `ACTIVE`

#### Scenario: Invalid status value is rejected at the database
- **WHEN** uma gravação tenta persistir um `status` fora de `ACTIVE`/`INACTIVE`
- **THEN** a constraint de enum/check rejeita a gravação
