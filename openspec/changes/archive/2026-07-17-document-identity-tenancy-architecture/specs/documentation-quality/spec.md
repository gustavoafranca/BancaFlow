## ADDED Requirements

### Requirement: Idioma e convenções de escrita

A documentação SHALL ser escrita em português do Brasil, mantendo nomes de classes, métodos, arquivos e conceitos técnicos do código em inglês, e SHALL explicar o "porquê" de cada peça, não apenas listar arquivos.

#### Scenario: Prosa em pt-BR com termos técnicos em inglês

- **WHEN** um leitor abre qualquer README da vertical
- **THEN** a prosa está em pt-BR e os identificadores de código permanecem em inglês
- **AND** cada seção explica o motivo da existência da peça, não só o que ela é

### Requirement: Distinção entre camadas e decisões de MVP

A documentação SHALL distinguir claramente regra de negócio, regra de aplicação e detalhe de infraestrutura, indicar explicitamente decisões de MVP e itens fora de escopo, e registrar divergências reais em relação a prompts antigos.

#### Scenario: Camadas claramente separadas

- **WHEN** um leitor lê a descrição de um comportamento
- **THEN** consegue identificar se é regra de negócio (domínio), de aplicação (caso de uso) ou de infraestrutura (adapter/framework)

#### Scenario: Divergências registradas

- **WHEN** a documentação descreve algo que diverge de um prompt antigo
- **THEN** registra a divergência (ex.: `proxy.ts` em vez de `middleware.ts`; `ProvisionBanca` sem endpoint HTTP)

### Requirement: Links relativos válidos e fonte única

A documentação SHALL usar links relativos clicáveis para arquivos e READMEs relacionados, todos apontando para arquivos existentes, e SHALL evitar duplicar o mesmo conteúdo entre READMEs (um documento como fonte, links nos demais).

#### Scenario: Nenhum link relativo quebrado

- **WHEN** uma verificação percorre os links relativos locais dos READMEs
- **THEN** todos apontam para arquivos existentes no repositório

#### Scenario: Conteúdo não duplicado

- **WHEN** um revisor compara os READMEs
- **THEN** cada conceito é explicado em um único README canônico e referenciado por link nos demais

### Requirement: Ausência de secrets e de fragilidade

A documentação NÃO SHALL expor secrets, hashes, tokens, senhas reais ou valores de `.env` local, e SHALL evitar referências frágeis a números exatos de linha.

#### Scenario: Busca por secrets não encontra valores reais

- **WHEN** uma busca automatizada por secrets é executada sobre os READMEs criados/alterados
- **THEN** nenhum secret real, hash, token ou senha de produção é encontrado
- **AND** valores de seed/dev, se citados, estão marcados como não-produtivos

#### Scenario: Sem dependência de números de linha

- **WHEN** a documentação referencia código
- **THEN** usa nomes estáveis (classes, métodos, tokens, rotas) em vez de números exatos de linha

### Requirement: Seções obrigatórias por README

Cada README de módulo SHALL começar explicando responsabilidade e limite do módulo e SHALL incluir as seções "Erros comuns ao evoluir este módulo" e "Checklist para adicionar um novo caso de uso/endpoint/tela".

#### Scenario: Seções presentes

- **WHEN** um leitor abre um README de módulo
- **THEN** encontra, além do conteúdo específico, as seções "Erros comuns ao evoluir este módulo" e o checklist de extensão apropriado ao módulo

### Requirement: A change é documental e não altera comportamento

A entrega SHALL alterar apenas Markdown (READMEs e artefatos OpenSpec), sem tocar código de produção, schema, migrations ou seed, e build e testes SHALL permanecer verdes. `openspec validate document-identity-tenancy-architecture --strict` SHALL passar.

#### Scenario: Build e testes permanecem verdes

- **WHEN** a documentação é concluída e build/testes são executados
- **THEN** permanecem verdes, provando que nenhum comportamento foi alterado

#### Scenario: Rastreabilidade dos fluxos ponta a ponta

- **WHEN** um leitor tenta acompanhar login, refresh, logout, troca de senha, reset administrativo, bloqueio e provisionamento
- **THEN** consegue seguir cada fluxo do Web até o banco por meio dos READMEs e diagramas

#### Scenario: Validação OpenSpec estrita passa

- **WHEN** `openspec validate document-identity-tenancy-architecture --strict` é executado
- **THEN** conclui sem violações
