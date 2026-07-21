## ADDED Requirements

### Requirement: Conjunto obrigatório de diagramas Mermaid

A documentação SHALL incluir, distribuídos pelos READMEs próximos ao texto que explicam, no mínimo seis diagramas Mermaid: (1) dependências da Arquitetura Limpa, (2) sequência de login multi-tenant, (3) sequência de refresh com rotação, (4) sequência de troca obrigatória de senha, (5) fluxo atômico de `ProvisionBanca` e (6) relacionamentos `Banca`/`UserAccount`/`Session`.

#### Scenario: Todos os seis diagramas existem

- **WHEN** um revisor percorre os READMEs da vertical
- **THEN** encontra os seis diagramas obrigatórios, cada um no README onde o assunto é explicado

#### Scenario: Cada diagrama responde uma pergunta arquitetural

- **WHEN** um revisor avalia um diagrama
- **THEN** ele responde a uma pergunta arquitetural concreta (ex.: "para onde apontam as dependências?", "como a banca é resolvida no login?")
- **AND** não é decorativo nem gigante

### Requirement: Diagrama de dependências mostra a inversão via ports

O diagrama de Arquitetura Limpa SHALL mostrar o sentido `Web/Controller → Use Case → Port ← Adapter Prisma/Provider`, deixando explícito que os adapters dependem das ports do domínio, e não o contrário.

#### Scenario: Sentido das setas reflete a inversão

- **WHEN** um leitor observa o diagrama de dependências
- **THEN** vê o caso de uso dependendo da port e o adapter implementando a port (dependência apontando para dentro)

### Requirement: Diagramas de sequência refletem os fluxos reais

Os diagramas de sequência de login, refresh e troca obrigatória de senha SHALL refletir os participantes e passos reais do código (resolução de tenant, compare-and-swap na rotação, autorização pela flag persistida e reemissão de token na transação).

#### Scenario: Sequência de login inclui resolução de tenant

- **WHEN** um leitor observa o diagrama de login
- **THEN** vê host → `codigoBanca` (via `TenantResolverMiddleware`) → `BancaContextResolver` → verificação de conta/sessão → emissão de tokens

#### Scenario: Sequência de refresh mostra o compare-and-swap

- **WHEN** um leitor observa o diagrama de refresh
- **THEN** vê a rotação condicionada a `rotateIfDigestMatches` (sessão ativa, digest correspondente) e o descarte da corrida perdida

### Requirement: Diagramas renderizam sem erro

Todos os diagramas Mermaid SHALL usar sintaxe válida e renderizar sem erro.

#### Scenario: Validação de render

- **WHEN** os READMEs são renderizados por um visualizador Mermaid
- **THEN** nenhum diagrama produz erro de sintaxe
