## ADDED Requirements

### Requirement: READMEs de domínio existem e delimitam responsabilidade

O sistema de documentação SHALL prover `modules/identity/README.md` e `modules/tenancy/README.md`, cada um começando pela responsabilidade e pelo limite (bounded context) do módulo e explicando por que `Banca` pertence a Tenancy e `UserAccount`/`Session` pertencem a Identity.

#### Scenario: README de domínio abre pela responsabilidade

- **WHEN** um leitor abre `modules/identity/README.md` ou `modules/tenancy/README.md`
- **THEN** a primeira seção descreve a responsabilidade e o limite do bounded context do módulo
- **AND** explica por que cada agregado pertence àquele módulo e não ao outro

#### Scenario: Documentação reflete a direção de dependência real

- **WHEN** o README descreve a relação entre os módulos
- **THEN** registra que `tenancy` depende de `identity` (uni-direcional) e que `identity` nunca importa `tenancy`
- **AND** explica que Identity lê dados de tenant apenas via o port `BancaContextResolver`

### Requirement: Agregados, entidades e Value Objects documentados

A documentação de domínio SHALL descrever cada agregado (`UserAccount`, `Session`, `Banca`), entidade e Value Object (`Username`, `AccountRole`, `AccountStatus`, `Credential`, `CodigoBanca`, `BancaStatus`), cobrindo identidade e ciclo de vida, invariantes protegidas, normalização, métodos de domínio e transições permitidas, cópias defensivas/imutabilidade prática e a diferença entre entidade rica e anêmica.

#### Scenario: Cada agregado e VO tem entrada na documentação

- **WHEN** um leitor procura por `UserAccount`, `Session`, `Banca` ou qualquer VO listado
- **THEN** encontra sua finalidade, invariantes de `tryCreate`, normalização e métodos de transição
- **AND** o caminho de arquivo correspondente é citado

#### Scenario: Invariantes e imutabilidade explicadas com base no código

- **WHEN** a documentação descreve invariantes (ex.: `failedLoginAttempts >= 0`, lockout após 5 falhas em 15 min)
- **THEN** o comportamento documentado coincide com o implementado nas entidades e provado nos testes
- **AND** as cópias defensivas de `Date` e o uso de `rebuild` (evitando `deepMerge` que corromperia `Date`) são explicados

### Requirement: Casos de uso documentados de ponta a ponta

A documentação de domínio SHALL descrever cada caso de uso público e interno de Identity e Tenancy, incluindo finalidade, entrada/saída, pré-condições, entidades/VOs envolvidos, ports utilizadas, efeitos persistidos, erros esperados e fronteira transacional com comportamento em rollback.

#### Scenario: Caso de uso descreve fronteira transacional e rollback

- **WHEN** um leitor consulta `LoginUseCase`, `ChangePasswordUseCase`, `MandatoryPasswordChangeUseCase`, `AdminResetPasswordUseCase`, `ToggleAccountStatusUseCase`, `RefreshSessionUseCase` ou `ProvisionBancaUseCase`
- **THEN** a documentação indica se usa `runInTransactionResult`/`runInTransaction` e o que é revertido em caso de falha
- **AND** distingue efeitos que persistem fora da transação (ex.: incremento atômico de falha de login) dos que revertem

#### Scenario: Erros esperados listados por caso de uso

- **WHEN** a documentação apresenta um caso de uso
- **THEN** lista os códigos de erro de domínio que ele pode retornar (ex.: `INVALID_CREDENTIALS`, `PASSWORD_TOO_WEAK`, `FORBIDDEN`, `SESSION_REVOKED`)

### Requirement: Ports e contratos de repositório explicados

A documentação de domínio SHALL explicar cada port (repositórios e demais), distinguindo port de entrada de port de saída, indicando qual lado define o contrato e por que Prisma, NestJS, JWT e bcrypt não aparecem no núcleo de domínio.

#### Scenario: Direção da inversão de dependência é explícita

- **WHEN** um leitor consulta a seção de ports
- **THEN** entende que os contratos são definidos no domínio e implementados no backend
- **AND** vê que `CreateUserAccountPort` é o port de entrada consumido por `ProvisionBanca`

#### Scenario: Ausência de infraestrutura no domínio é justificada

- **WHEN** a documentação explica por que não há Prisma/NestJS/JWT/bcrypt no domínio
- **THEN** conecta essa ausência à inversão de dependências via ports

### Requirement: Regras de negócio e isolamento multi-tenant documentados

A documentação de domínio SHALL descrever regras de username por banca, papéis, status, bloqueio, senha, sessões e isolamento por `bancaId`, além da relação entre Identity e Tenancy no `ProvisionBanca` sem dependência circular.

#### Scenario: Isolamento por bancaId descrito

- **WHEN** um leitor consulta as regras de isolamento
- **THEN** entende que toda leitura de `UserAccount`/`Session` é escopada por `bancaId` e que buscas cruzadas não revelam existência
- **AND** a unicidade de username é por banca (`normalizedUsername`)

#### Scenario: ProvisionBanca sem ciclo

- **WHEN** a documentação descreve o provisionamento
- **THEN** explica que Tenancy usa apenas o tipo `CreateUserAccountPort` de Identity e que o ciclo é evitado pela inversão via port

### Requirement: Estrutura de pastas e estratégia de testes documentadas

A documentação de domínio SHALL incluir uma estrutura de pastas comentada, um guia para adicionar uma nova regra corretamente e a estratégia de testes unitários com fakes.

#### Scenario: Guia de extensão e testes presente

- **WHEN** um leitor quer adicionar uma nova regra de domínio ou um novo caso de uso
- **THEN** encontra um passo a passo e um checklist na documentação
- **AND** a estratégia de testes com fakes (ex.: `RollbackOnFailureTransactionManager`, repositórios in-memory) é explicada com os arquivos de teste correspondentes
