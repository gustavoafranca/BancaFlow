## Purpose

Define how `/configuracoes` (and any navigation pointing to it) must present itself honestly while its real capabilities — user administration (plan 08) and the permission catalog (plan 09, blocked by open decision D44) — do not yet exist: no sample data shown as real, no action that simulates persistence, and no menu entry that looks like functional navigation to a capability that isn't implemented.

---
## Requirements
### Requirement: The settings route communicates unavailable capability honestly
Qualquer parte de `/configuracoes` que ainda não tenha uma capability real e autorizada no Backend (ex.: permissões individuais por usuário, perfis de acesso persistidos) SHALL continuar apresentando um estado explícito de capability ainda não disponível, sem exibir dado de exemplo como se fosse real e sem oferecer ação que simule persistência inexistente. Isso não se aplica às partes desta versão que passam a ter contrato real (administração de usuários, matriz de permissões somente leitura).

#### Scenario: No fabricated user or profile data is shown
- **WHEN** `/configuracoes` renderiza uma seção sem contrato real de Backend
- **THEN** a página não exibe lista fictícia nem os perfis de acesso fictícios ("Administrador", "Operador", "Cambista", "Somente Leitura") como se fossem modelo real de autorização

#### Scenario: No editable permission matrix is shown
- **WHEN** `/configuracoes` é renderizada
- **THEN** a página não exibe toggles de permissão editáveis, contagens de usuários por perfil, nem vínculos entre perfil e permissão fabricados localmente — a matriz de papéis permanece somente leitura

#### Scenario: No action claims to create, edit, or persist without a real contract
- **WHEN** `/configuracoes` é renderizada
- **THEN** a página não oferece botões ou fluxos que simulem criação, edição ou exclusão sem que exista um contrato real de Backend para essa operação específica

#### Scenario: No success message is shown without real persistence
- **WHEN** um usuário interage com qualquer controle de `/configuracoes`
- **THEN** o sistema não afirma que uma alteração foi salva a menos que exista persistência real correspondente

#### Scenario: The unavailable-capability state is accessible
- **WHEN** `/configuracoes` exibe o estado de capability indisponível para uma seção não implementada
- **THEN** o conteúdo é perceptível e operável por leitores de tela e navegação por teclado, seguindo os mesmos padrões de acessibilidade já exigidos para o restante do Web

### Requirement: Client-side role is never treated as authorization
O Web SHALL NOT usar `currentUser.role` como mecanismo de autorização para decidir o que `/configuracoes` (ou qualquer navegação relacionada) pode ou não fazer. Ocultar ou desabilitar navegação por papel, quando existir, é apenas experiência; a autorização de qualquer operação real permanece exclusivamente no Backend quando essa operação existir.

#### Scenario: Hiding navigation is not treated as a security boundary
- **WHEN** uma decisão de exibir ou ocultar uma entrada de navegação relacionada a `/configuracoes` é tomada no Web
- **THEN** essa decisão não é documentada nem implementada como controle de segurança, e nenhuma rota ou dado sensível depende dela para estar protegido

### Requirement: Account menu shows the settings item only for accounts with account-administration permission
O sistema SHALL apresentar o item **Configurações** no menu da conta (dropdown da navbar) somente para uma conta autorizada a `identity.accounts.list` (nesta versão, exclusivamente `OWNER`). Para qualquer outra conta autenticada, o item NÃO SHALL ser renderizado no menu — não basta desabilitá-lo mantendo-o visível; ele deve estar ausente do DOM/menu, exatamente como qualquer outro item de menu condicionado a uma capacidade que o ator não possui. A proteção real da rota e das chamadas permanece no Backend, independentemente do que o menu exibe.

#### Scenario: Settings item is not interactive in the account menu
- **WHEN** um comportamento anterior a esta fase mantinha o item **Configurações** sempre presente, porém não-acionável, enquanto nenhuma capability real existisse
- **THEN** esse comportamento foi substituído nesta versão — o item agora fica ausente do menu (não apenas desabilitado) para quem não possui `identity.accounts.list`, e acionável para quem possui — ver "Settings item is rendered and interactive..." e "Settings item is absent from the menu..."

#### Scenario: Settings item is rendered and interactive for an account with account-administration permission
- **WHEN** um `OWNER` autenticado abre o menu da conta
- **THEN** o item **Configurações** é renderizado como um item de menu acionável (navegável por teclado e mouse) e navega para `/configuracoes`

#### Scenario: Settings item is absent from the menu for accounts without the permission
- **WHEN** uma conta `ADMIN` ou `USER` autenticada abre o menu da conta
- **THEN** o item **Configurações** não é renderizado no menu (ausente, não apenas desabilitado); nenhum elemento correspondente existe para essa interação

#### Scenario: No equivalent misleading entry exists in the side menu
- **WHEN** o menu lateral do shell privado é inspecionado
- **THEN** nenhuma entrada equivalente apresenta `/configuracoes` como navegação para uma funcionalidade indisponível para o papel atual

#### Scenario: Direct route remains reachable and safe
- **WHEN** um comportamento anterior a esta fase garantia apenas que `/configuracoes` renderizava com segurança para qualquer papel, sem distinguir o resultado por permissão
- **THEN** esse comportamento genérico foi refinado nesta versão em dois cenários específicos por papel — ver "Direct route access by an authorized owner renders the real capability" e "Direct route access by an unauthorized account is safe and non-revealing"

#### Scenario: Direct route access by an authorized owner renders the real capability
- **WHEN** um `OWNER` autenticado acessa `/configuracoes` diretamente pela URL
- **THEN** a rota renderiza a administração de usuários e a matriz de permissões, com todas as ações reais especificadas em `[[tenant-user-administration]]`

#### Scenario: Direct route access by an unauthorized account is safe and non-revealing
- **WHEN** uma conta `ADMIN` ou `USER` autenticada acessa `/configuracoes` diretamente pela URL
- **THEN** a rota renderiza de forma segura e acessível um estado de "sem permissão", sem erro não tratado e sem vazar dados de outras contas; qualquer chamada ao Backend feita por essa tela recebe `403`

### Requirement: Access profiles screen presents fixed roles legibly
A tela **Perfis de acesso** SHALL deixar explícito que `OWNER`, `ADMIN` e `USER` são papéis fixos do sistema, não cadastros editáveis nesta versão. A matriz SHALL ser projeção do catálogo autoritativo, agrupada por capability/tópico, com legenda claro para permitido/não permitido, estado inicial recolhido ou compacto, busca/leitura rápida, responsividade e acessibilidade.

#### Scenario: Permissions are grouped and collapsible
- **WHEN** o `OWNER` abre Perfis de acesso
- **THEN** as permissões aparecem agrupadas por capability em grupos recolhíveis, usando labels e descrições em português quando disponíveis

#### Scenario: Empty catalog state is honest
- **WHEN** o backend retorna catálogo vazio
- **THEN** a tela exibe estado vazio acessível, sem inventar chaves ou perfis locais

