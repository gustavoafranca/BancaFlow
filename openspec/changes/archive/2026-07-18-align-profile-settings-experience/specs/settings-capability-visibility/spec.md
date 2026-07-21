## ADDED Requirements

### Requirement: Account menu does not present settings as functional navigation
O sistema SHALL NOT apresentar o item **Configurações** do menu da conta (nem entrada equivalente no menu lateral) com aparência de navegação funcional, enquanto `/configuracoes` não tiver ao menos uma capability real de administração/configuração implementada e autorizada no Backend.

#### Scenario: Settings item is not interactive in the account menu
- **WHEN** um usuário autenticado abre o menu da conta
- **THEN** o item **Configurações** não tem semântica de item de menu acionável (sem foco de teclado ativável, sem cursor de ponteiro clicável) e não navega para `/configuracoes` a partir dessa interação

#### Scenario: No equivalent misleading entry exists in the side menu
- **WHEN** o menu lateral do shell privado é inspecionado
- **THEN** nenhuma entrada equivalente apresenta `/configuracoes` como navegação para uma funcionalidade pronta

#### Scenario: Direct route remains reachable and safe
- **WHEN** um usuário autenticado acessa `/configuracoes` diretamente pela URL
- **THEN** a rota renderiza de forma segura e acessível, sem erro, mesmo sem estar disponível a partir do menu da conta

### Requirement: The settings route communicates unavailable capability honestly
`/configuracoes` SHALL apresentar um estado explícito de capability ainda não disponível, sem exibir dado de exemplo como se fosse real e sem oferecer ação que simule persistência inexistente.

#### Scenario: No fabricated user or profile data is shown
- **WHEN** `/configuracoes` é renderizada
- **THEN** a página não exibe lista de usuários fictícios nem os perfis de acesso fictícios ("Administrador", "Operador", "Cambista", "Somente Leitura") como se fossem modelo real de autorização

#### Scenario: No editable permission matrix is shown
- **WHEN** `/configuracoes` é renderizada
- **THEN** a página não exibe toggles de permissão editáveis, contagens de usuários por perfil, nem vínculos entre perfil e permissão fabricados localmente

#### Scenario: No action claims to create, edit, or persist without a real contract
- **WHEN** `/configuracoes` é renderizada
- **THEN** a página não oferece botões ou fluxos (ex.: "Novo Usuário", "Novo Perfil", "Novo Turno", "Nova API Key", drawers de criação/edição) que simulem criação, edição ou exclusão sem que exista um contrato real de Backend para essa operação

#### Scenario: No success message is shown without real persistence
- **WHEN** um usuário interage com qualquer controle remanescente em `/configuracoes`
- **THEN** o sistema não afirma que uma alteração foi salva a menos que exista persistência real correspondente

#### Scenario: The unavailable-capability state is accessible
- **WHEN** `/configuracoes` exibe o estado de capability indisponível
- **THEN** o conteúdo é perceptível e operável por leitores de tela e navegação por teclado, seguindo os mesmos padrões de acessibilidade já exigidos para o restante do Web

### Requirement: Client-side role is never treated as authorization
O Web SHALL NOT usar `currentUser.role` como mecanismo de autorização para decidir o que `/configuracoes` (ou qualquer navegação relacionada) pode ou não fazer. Ocultar ou desabilitar navegação por papel, quando existir, é apenas experiência; a autorização de qualquer operação real permanece exclusivamente no Backend quando essa operação existir.

#### Scenario: Hiding navigation is not treated as a security boundary
- **WHEN** uma decisão de exibir ou ocultar uma entrada de navegação relacionada a `/configuracoes` é tomada no Web
- **THEN** essa decisão não é documentada nem implementada como controle de segurança, e nenhuma rota ou dado sensível depende dela para estar protegido
