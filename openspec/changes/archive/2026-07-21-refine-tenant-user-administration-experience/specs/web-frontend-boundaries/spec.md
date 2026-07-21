## ADDED Requirements

### Requirement: Web primitives do not leak into packages shared
Componentes visuais Web SHALL permanecer no app Web. `packages/shared` SHALL continuar reservado para contratos, VOs, paginação, erros e tipos compartilháveis entre camadas, nunca para Select, Button, Drawer, Tabs ou outros componentes React.

#### Scenario: Pagination extension stays generic
- **WHEN** a administração de usuários precisa limitar `pageSize`
- **THEN** o limite específico de HTTP/tela fica no DTO/backend apropriado, e `packages/shared/src/query` só muda se houver necessidade genérica comprovada
