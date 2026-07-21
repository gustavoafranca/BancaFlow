## ADDED Requirements

### Requirement: Banca aggregate with normalized code
O sistema SHALL modelar `Banca` como agregado com `id`, `codigoBanca`, `nome` e `status` (`ACTIVE` ou `INACTIVE`). O `codigoBanca` SHALL ser normalizado (`trim().toLowerCase()`), único e estável.

#### Scenario: Banca created with normalized code
- **WHEN** uma `Banca` é criada com `codigoBanca = "Farizeu"`
- **THEN** o valor persistido e comparável é `"farizeu"` e o status inicial é `ACTIVE`

#### Scenario: Invalid code format is rejected
- **WHEN** uma `Banca` é criada com `codigoBanca` fora do formato permitido (ex.: `"-farizeu"`, `"fa"`, `"banca_x"`)
- **THEN** a criação falha com erro de domínio estável

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
O sistema SHALL permitir ativar e desativar uma banca respeitando invariantes de status.

#### Scenario: Deactivated banca is reported inactive
- **WHEN** uma banca `ACTIVE` é desativada
- **THEN** seu status passa a `INACTIVE`

#### Scenario: Activate an inactive banca
- **WHEN** uma banca `INACTIVE` é ativada
- **THEN** seu status passa a `ACTIVE`
