## ADDED Requirements

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
A suíte SHALL cobrir primitives compartilhadas e suas variantes, componentes de módulo, acessibilidade via Testing Library e schemas/forms conforme `frontend-form-schema`.

#### Scenario: Shared primitive variants are covered
- **WHEN** uma primitive compartilhada (ex.: `Button`, `Input`) é testada
- **THEN** suas variantes e estados relevantes têm asserções

#### Scenario: Form schema validation is covered
- **WHEN** um schema/form (`v` + React Hook Form) é testado
- **THEN** entradas inválidas exibem mensagem acessível e não submetem, e entradas válidas submetem o payload esperado

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
