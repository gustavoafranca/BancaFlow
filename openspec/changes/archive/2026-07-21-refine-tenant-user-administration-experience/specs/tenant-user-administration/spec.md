## ADDED Requirements

### Requirement: Usuarios list opens account detail in drawer
A seção **Usuários** SHALL apresentar uma lista limpa de contas `ADMIN`/`USER` em que a linha inteira abre o detalhe lateral por clique, Enter ou Espaço. A tabela SHALL remover a coluna extensa de ações pequenas, mantendo no máximo um affordance discreto de detalhe/mais ações quando necessário.

#### Scenario: Owner opens account detail from row
- **WHEN** um `OWNER` aciona a linha de uma conta na lista
- **THEN** um drawer lateral abre com os dados autoritativos da conta consultados por `GET /api/accounts/:accountId`

#### Scenario: Row action does not trigger detail
- **WHEN** uma ação interna da linha é acionada
- **THEN** a ação correspondente executa sem abrir ou trocar o drawer de detalhe por acidente

### Requirement: Create and edit account use drawer shell
A criação e a edição de conta SHALL usar o mesmo shell visual de drawer baseado no primitive compartilhado. O modo criação SHALL mostrar campos de criação e a senha temporária retornada uma única vez; o modo detalhe/edição SHALL organizar dados, papel, status, senha e sessões com hierarquia clara.

#### Scenario: Creation drawer shows temporary password once
- **WHEN** a criação de conta é concluída com sucesso
- **THEN** o drawer apresenta a senha temporária em bloco legível com ação de copiar e aviso de exibição única

#### Scenario: Edit remains in drawer after save error
- **WHEN** uma edição falha por validação, concorrência ou erro técnico
- **THEN** o drawer permanece aberto e exibe a mensagem compreensível sem perder os dados editáveis

### Requirement: Sensitive account actions remain confirmed by modal
Troca de papel, mudança de status, redefinição de senha e revogação de sessão SHALL exigir confirmação explícita em modal, mesmo quando iniciadas a partir do drawer.

#### Scenario: Reset password requires confirmation before generating password
- **WHEN** o `OWNER` solicita redefinir a senha de uma conta
- **THEN** o sistema abre modal de confirmação antes de chamar o endpoint e só exibe a senha temporária após sucesso

### Requirement: Usuarios pagination preserves valid context
A listagem de usuários SHALL preservar busca, filtros e página ao abrir/fechar drawer e após mutações, recarregando a fonte autoritativa. Se a página atual deixar de existir após filtro ou mutação, o Web SHALL navegar para a página válida mais próxima.

#### Scenario: Drawer navigation keeps filters
- **WHEN** o `OWNER` filtra a lista, abre um drawer e depois o fecha
- **THEN** busca, filtros e página válida permanecem aplicados

#### Scenario: Mutation adjusts invalid page
- **WHEN** uma mutação faz a página atual ficar vazia embora existam itens em página anterior
- **THEN** a lista recarrega e mostra a página válida mais próxima, sem estado vazio falso

### Requirement: Temporary password is readable and copyable in admin flows
A senha temporária de criação e reset SHALL ser exibida em bloco legível, com ação de copiar, aviso explícito de que aparece uma única vez e nenhuma persistência recuperável no navegador.

#### Scenario: Owner copies generated temporary password
- **WHEN** a senha temporária é exibida após criação ou reset
- **THEN** o `OWNER` pode copiá-la por um controle acessível e a UI informa que não será possível recuperá-la depois
