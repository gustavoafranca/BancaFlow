## ADDED Requirements

### Requirement: Frontend dependency direction follows app → modules → shared
O sistema SHALL respeitar a direção de dependências `app/routes → modules → shared` e `app/routes → shared`, e SHALL proibir `shared → modules`. Módulos NÃO SHALL importar detalhes internos de outros módulos; composição cross-module pertence ao App Router ou a uma API pública explícita do módulo. Nomes, arquivos e exports SHALL permanecer simples, em inglês, seguindo as convenções atuais do projeto.

#### Scenario: shared never imports a module
- **WHEN** a árvore de imports de `apps/web/src/shared/**` é analisada
- **THEN** nenhum arquivo importa de `src/modules/**` nem de `app/**`

#### Scenario: cross-module composition happens at the route or public API
- **WHEN** uma rota precisa compor UI de mais de um módulo
- **THEN** a composição ocorre em `app/**` ou via API pública explícita, e nenhum módulo importa arquivos internos de outro módulo

#### Scenario: Deep imports prefer a stable barrel
- **WHEN** um consumidor importa de um módulo com barrel público (ex.: `modules/identity`)
- **THEN** usa o barrel/alias `@/` estável em vez de caminho relativo profundo que fura a API pública

### Requirement: Page components are thin compositions
`app/**/page.tsx` SHALL ser fino e compor pages/components de módulo ou fluxo, sem concentrar regras de negócio, marcação extensa ou lógica de dados diretamente na rota.

#### Scenario: Route file delegates to compositions
- **WHEN** uma rota privada é renderizada
- **THEN** seu `page.tsx` delega a componentes/páginas de módulo ou de fluxo, permanecendo enxuto

### Requirement: Server Components are the default boundary
Server Components SHALL ser o default; Client Components (`use client`) SHALL ser usados apenas quando houver estado, eventos ou APIs do browser. O boundary de cada componente SHALL ser justificável.

#### Scenario: Unnecessary use client is removed
- **WHEN** um componente marcado `use client` não usa estado, eventos nem APIs do browser
- **THEN** a diretiva `use client` é removida e o componente volta a ser Server Component

### Requirement: Business rules and secrets stay out of the UI
Componentes NÃO SHALL acessar Prisma, banco, segredos ou entidades de persistência. Regras de negócio autoritativas SHALL permanecer no domínio/backend; a validação no Web melhora UX mas não substitui a validação do domínio. DTOs HTTP SHALL ser adaptados para view models quando a tela não precisa do contrato cru. Efeitos HTTP SHALL residir em clientes/hooks apropriados, não espalhados em primitives visuais. O frontend NÃO SHALL simular DDD criando entidades ricas duplicadas.

#### Scenario: Authorization policy is not authored only in the UI
- **WHEN** uma política de autorização (ex.: matriz de permissões por perfil) é necessária
- **THEN** ela deriva de fonte autoritativa do backend/domínio, e o Web não é a única fonte da regra

#### Scenario: Domain money/settlement rules are not owned by a page
- **WHEN** uma regra de cálculo financeiro/acerto é exibida na tela
- **THEN** o resultado autoritativo vem do backend/domínio, e a página não é a dona da regra

#### Scenario: HTTP effects live in clients or hooks
- **WHEN** uma tela precisa de dados ou efeitos HTTP
- **THEN** o efeito reside em cliente/hook apropriado (ex.: `shared/api`, hook de módulo), não em um primitive visual

#### Scenario: Session drives identity, not hardcoded values
- **WHEN** a UI exibe usuário, perfil ou banca do usuário logado
- **THEN** os dados vêm da sessão resolvida (claims/`Session`), não de valores fixos embutidos no componente
