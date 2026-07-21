## Purpose

Garantir que roteamento, autenticação, comportamento por tenant, reuso de componentes e acessibilidade do Web sejam comprovados por testes, e que a estrutura e o build permaneçam verdes durante e após a reorganização.

---
## Requirements
### Requirement: Tests prove routing, auth, and tenant behavior
A suíte de testes do Web SHALL provar o comportamento de rotas e autenticação: redirects de `/`, `/login`, `/trocar-senha` e rotas privadas; o `proxy.ts`; o `next.config.ts`/rewrite com preservação de `Host`/`X-Forwarded-Host`; o cliente HTTP e o silent refresh; e os casos de tenant conhecido, inexistente, inativo e host inválido. O fluxo login → troca obrigatória → dashboard SHALL ser coberto por teste E2E/browser.

#### Scenario: Root redirect scenarios are tested
- **WHEN** os testes exercitam `/` para usuário anônimo, autenticado normal e com troca obrigatória
- **THEN** cada caso redireciona para `/login`, `/dashboard` ou `/trocar-senha` respectivamente, sem loop

#### Scenario: Login to mandatory change to dashboard is exercised end to end
- **WHEN** o teste E2E executa login com `mustChangePassword=true`, conclui a troca e segue
- **THEN** o usuário termina em `/dashboard` sem refresh manual de token

#### Scenario: Unknown, inactive, and invalid hosts are tested
- **WHEN** os testes exercitam host de tenant conhecido, inexistente, inativo e formato inválido
- **THEN** o host sem tenant válido resulta na página genérica sem branding e sem enumeração, e o conhecido resolve normalmente

### Requirement: Tests prove component reuse and accessibility
A suíte SHALL cobrir primitives compartilhadas e suas variantes, componentes de módulo, acessibilidade via Testing Library e schemas/forms conforme `frontend-form-schema`. O comportamento do Drawer compartilhado (foco, Escape, redimensionamento, maximizar/restaurar, rodapé por modo, tema, loading) SHALL ser testado uma única vez, no componente compartilhado, e páginas consumidoras SHALL NOT replicar essa cobertura — apenas a integração específica de domínio (dados, campos, submit) daquela tela.

#### Scenario: Shared primitive variants are covered
- **WHEN** uma primitive compartilhada (ex.: `Button`, `Input`) é testada
- **THEN** suas variantes e estados relevantes têm asserções

#### Scenario: Form schema validation is covered
- **WHEN** um schema/form (`v` + React Hook Form) é testado
- **THEN** entradas inválidas exibem mensagem acessível e não submetem, e entradas válidas submetem o payload esperado

#### Scenario: Drawer primitive is tested once, in isolation
- **WHEN** os testes do Web rodam
- **THEN** o Drawer compartilhado tem cobertura própria de abertura/fechamento, foco e retorno de foco, Escape, redimensionamento por mouse e teclado, maximizar/restaurar, rodapé por modo, loading e herança de tema

#### Scenario: Consuming pages do not duplicate drawer behavior coverage
- **WHEN** uma página ou componente de módulo consome o Drawer compartilhado
- **THEN** seus testes cobrem apenas a integração de domínio (dados exibidos, campos, submissão, erros específicos), sem reimplementar os cenários já cobertos pelo teste do Drawer

### Requirement: Quality gates enforce structure and green build
A suíte SHALL incluir busca por imports proibidos e ciclos, detecção de componentes/exports/assets órfãos, e os comandos `npm run lint`, `npm run check-types`, `npm run test` e `npm run build` SHALL passar. Snapshots e testes NÃO SHALL ser afrouxados apenas para viabilizar a refatoração.

#### Scenario: Forbidden imports and cycles fail the build
- **WHEN** um import viola a direção de dependências (ex.: `shared → modules`) ou cria ciclo
- **THEN** a verificação de qualidade falha e sinaliza o import proibido

#### Scenario: Orphans are detected
- **WHEN** existe componente, export ou asset sem consumidor
- **THEN** a verificação de órfãos o reporta para remoção deliberada

#### Scenario: All quality commands pass
- **WHEN** `lint`, `check-types`, `test` e `build` são executados no Web
- **THEN** todos passam sem afrouxar asserções existentes

### Requirement: Web test suite runtime does not regress
O tempo total de execução da suíte de testes do Web (`npm run test`) SHALL permanecer igual ou menor que o baseline medido antes desta change (236 testes, 42 suites, ~13s de execução Jest). Consolidar drawers duplicados em um único componente SHALL remover testes redundantes de comportamento de drawer espalhados por página, contribuindo para essa meta.

#### Scenario: Full suite runtime does not exceed baseline
- **WHEN** a suíte completa do Web (`npm run test`) é executada após a consolidação dos drawers
- **THEN** o tempo total de execução é igual ou menor que o baseline registrado antes da mudança

#### Scenario: Duplicate drawer test scenarios are removed
- **WHEN** os testes de páginas que antes tinham drawer próprio (Configurações/Usuários, Pessoas, Acerto) são revisados após a migração
- **THEN** não restam testes duplicados de foco/Escape/resize/maximizar de drawer nessas páginas, pois essa cobertura passou a existir apenas no teste do Drawer compartilhado

### Requirement: Frontend tests cover interactive primitives and visual states
O Web SHALL testar primitives e fluxos tocados por esta change em teclado, foco, leitor de tela, disabled, invalid, loading, erro, tema claro/escuro, overlay portaled e responsividade. Validação visual manual SHALL cobrir desktop/mobile com overlays abertos.

#### Scenario: Select primitive is tested for keyboard and theme
- **WHEN** os testes do Web rodam
- **THEN** o `Select` compartilhado tem cobertura de abertura, navegação por teclado, seleção, erro, disabled e herança de tema

#### Scenario: User drawer interaction is tested
- **WHEN** os testes de Configurações rodam
- **THEN** cobrem clique e teclado na linha, abertura/fechamento do drawer, retorno de foco e prevenção de propagação de ações internas

#### Scenario: Visual validation records dark overlay check
- **WHEN** a change é validada manualmente em navegador
- **THEN** a evidência registra modo claro/escuro, desktop/mobile, Dialog/Drawer/Select abertos, foco visível, contraste e ausência de popup branco no dark mode

