## ADDED Requirements

### Requirement: shared/components holds only context-independent code
`apps/web/src/shared/components` SHALL conter apenas componentes independentes de bounded context: primitives do design system (`Button`, `Input`, `Dialog`, `Table`), composição genérica de formulários, feedback genérico (`EmptyState`, loading, error boundary, toast), shell/branding/layout realmente globais, e componentes reutilizados por dois ou mais módulos com o mesmo significado. Componentes deliberadamente públicos do design system PODEM residir em `shared` antes do segundo consumidor apenas quando essa intenção estiver justificada. `shared` NÃO SHALL importar `src/modules/**` nem conter regras, DTOs ou textos específicos de um domínio.

#### Scenario: Domain-specific component is rejected from shared
- **WHEN** um componente expressa linguagem, regras, DTOs ou textos de um bounded context específico
- **THEN** ele NÃO reside em `shared/components` e é classificado como componente de módulo ou de fluxo/página

#### Scenario: Shared component does not import a module
- **WHEN** um componente em `shared/**` é analisado
- **THEN** ele não importa de `src/modules/**` e não depende de estado específico de domínio

### Requirement: Module code stays in its bounded context
`apps/web/src/modules/<domain>` SHALL manter componentes que expressam a linguagem do bounded context, páginas internas e composições do módulo, schemas/mappers/tipos de apresentação/clientes específicos, componentes usados por várias páginas do mesmo módulo e estados/regras de interação específicos do módulo.

#### Scenario: Component used across pages of one module lives in the module
- **WHEN** um componente é reutilizado por várias páginas do mesmo domínio, mas não por outros domínios
- **THEN** ele reside em `src/modules/<domain>` e não é promovido a `shared`

### Requirement: Route-local components stay colocated
Componentes exclusivos de uma página/fluxo, composições dependentes do layout daquela rota e código sem API pública estável para o módulo SHALL permanecer em `app/**/_components`. A promoção para módulo ou shared SHALL ocorrer apenas quando o reuso real ou a responsabilidade justificar, sem criar abstração prematura.

#### Scenario: Single-flow component is not promoted prematurely
- **WHEN** um componente é usado por uma única rota/fluxo e não tem segundo consumidor
- **THEN** ele permanece em `app/**/_components` até que reuso real justifique a promoção

#### Scenario: Real reuse justifies promotion
- **WHEN** um componente colocado passa a ser consumido por dois ou mais módulos com o mesmo significado
- **THEN** ele é promovido para `shared` (se independente de contexto) ou exposto por API pública explícita do módulo dono
