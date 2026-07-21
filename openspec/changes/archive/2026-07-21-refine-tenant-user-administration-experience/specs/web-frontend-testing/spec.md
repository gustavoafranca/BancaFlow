## ADDED Requirements

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
