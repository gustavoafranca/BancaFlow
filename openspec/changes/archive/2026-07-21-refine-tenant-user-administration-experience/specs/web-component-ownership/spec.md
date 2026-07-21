## ADDED Requirements

### Requirement: Shared primitives stay domain-independent
Primitives como Select, Button, Dialog/Drawer, Tabs e Collapsible SHALL viver em `shared/components/ui` somente com contratos independentes de domínio. Composições, textos e regras específicas de Usuários ou Configurações SHALL permanecer em `apps/web/src/modules/configuracoes`.

#### Scenario: User-specific drawer composition remains in Configuracoes
- **WHEN** o drawer contém campos, labels ou regras de conta de usuário
- **THEN** a composição reside no módulo Configurações e só o shell/primitive genérico fica em `shared`
