## ADDED Requirements

### Requirement: Account menu navigates to the own profile page
O sistema SHALL apresentar o item **Meu Perfil** do menu da conta (dropdown do shell privado) como navegação real para `/perfil`, com semântica de link (`href` navegável, não somente um manipulador de clique), para qualquer ator autenticado (`OWNER`, `ADMIN` ou `USER`), sem depender do papel do ator.

#### Scenario: Authenticated user navigates via mouse click
- **WHEN** um usuário autenticado abre o menu da conta e clica em **Meu Perfil**
- **THEN** o sistema navega para `/perfil` e o menu da conta se fecha

#### Scenario: Authenticated user navigates via keyboard
- **WHEN** um usuário autenticado abre o menu da conta por teclado, foca **Meu Perfil** e ativa com `Enter`
- **THEN** o sistema navega para `/perfil` da mesma forma que no clique de mouse, e o menu da conta se fecha

#### Scenario: Any role reaches the same profile navigation
- **WHEN** um ator com papel `OWNER`, `ADMIN` ou `USER` abre o menu da conta
- **THEN** o item **Meu Perfil** está presente e navega para `/perfil` da mesma forma, sem checagem adicional de papel

#### Scenario: Dropdown closes without a full page reload
- **WHEN** a navegação por **Meu Perfil** ocorre
- **THEN** ela usa navegação client-side do App Router (sem recarregar a página inteira) e o estado de aberto do menu da conta é explicitamente fechado como parte da mesma interação

### Requirement: Own profile page renders only authoritative data
`/perfil` SHALL renderizar somente dados e ações sustentados por um contrato real de Backend hoje implementado (`GET`/`PATCH /api/auth/me`). A página SHALL NOT apresentar valores estáticos de auditoria/atividade, contadores ou estados de segurança que não tenham fonte autoritativa correspondente.

#### Scenario: Static membership and last-access values are absent
- **WHEN** `/perfil` é renderizada
- **THEN** a página não exibe nenhum valor fixo de "Membro desde" ou "Último acesso" que não venha de `GET /api/auth/me`

#### Scenario: Fabricated quick statistics are absent
- **WHEN** `/perfil` é renderizada
- **THEN** a página não exibe contadores fixos de ações, sessões ativas ou dias online que não venham de um contrato real

#### Scenario: Demonstrative two-factor toggle is absent
- **WHEN** `/perfil` é renderizada
- **THEN** a página não exibe um controle de autenticação de dois fatores que apenas alterna estado local sem qualquer persistência ou endpoint real

#### Scenario: Sample-driven sessions and activity are absent
- **WHEN** `/perfil` é renderizada
- **THEN** a página não exibe lista de sessões ativas nem registro de atividade construídos a partir de dados de amostra locais (ex.: um módulo de dados de exemplo do tipo `*.sample.ts`); qualquer seção que dependeria exclusivamente desses dados é removida da navegação por abas da página, em vez de exibida vazia

#### Scenario: Real profile fields remain intact
- **WHEN** `/perfil` é renderizada para um ator autenticado
- **THEN** nome e e-mail continuam editáveis via `PATCH /api/auth/me` com concorrência otimista, e username, papel e Banca continuam exibidos como somente leitura a partir de `GET /api/auth/me`

#### Scenario: Existing loading, error, and conflict states remain intact
- **WHEN** `/perfil` está carregando, falha ao carregar, está em edição, salva com sucesso ou encontra conflito de versão
- **THEN** o comportamento e a mensagem correspondentes, já implementados, permanecem inalterados por esta reconciliação
