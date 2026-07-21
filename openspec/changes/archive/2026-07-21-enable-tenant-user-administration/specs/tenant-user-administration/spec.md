## ADDED Requirements

### Requirement: OWNER lists accounts of the own banca with search, pagination, and filters
O sistema SHALL expor `GET /api/accounts`, autorizado por `identity.accounts.list`, retornando uma listagem paginada (`PaginatedResultDTO`) das contas `ADMIN` e `USER` da própria banca, com busca textual por `username`/`name` e filtros por `role` e `status`. `bancaId` SHALL vir exclusivamente do contexto autenticado. O filtro `role IN ('ADMIN', 'USER')` (excluindo `OWNER`) SHALL ser aplicado nos critérios da própria query — antes de `count`, `skip` e `take` — nunca como um filtro pós-paginação; a contagem total e o número de páginas retornados nunca incluem o `OWNER`.

#### Scenario: Owner lists accounts with default pagination
- **WHEN** um `OWNER` autenticado consulta `GET /api/accounts` sem filtros
- **THEN** o sistema retorna as contas `ADMIN`/`USER` da própria banca, paginadas, sem incluir a conta `OWNER`

#### Scenario: Owner is excluded before pagination is computed, not after
- **WHEN** uma banca tem exatamente `pageSize` contas `ADMIN`/`USER` mais a conta `OWNER`, e a primeira página é consultada
- **THEN** a página retornada contém todas as `pageSize` contas `ADMIN`/`USER`, `total` corresponde exatamente à quantidade de contas `ADMIN`/`USER` (nunca conta o `OWNER`), e nenhuma página fica artificialmente incompleta por o `OWNER` ter sido descartado depois de `take`

#### Scenario: Search filters by username or name
- **WHEN** um `OWNER` consulta `GET /api/accounts?search=joao`
- **THEN** o sistema retorna somente contas cujo `username` ou `name` corresponde ao termo de busca, dentro da própria banca

#### Scenario: Filter by role and status
- **WHEN** um `OWNER` consulta `GET /api/accounts?role=ADMIN&status=BLOCKED`
- **THEN** o sistema retorna somente contas `ADMIN` com status `BLOCKED` da própria banca

#### Scenario: Cross-banca listing is impossible
- **WHEN** qualquer parâmetro de banca é enviado na query string
- **THEN** o sistema ignora o valor recebido e usa exclusivamente o `bancaId` do contexto autenticado

### Requirement: OWNER views account detail
O sistema SHALL expor `GET /api/accounts/:accountId`, autorizado por `identity.accounts.read`, retornando os dados administráveis de uma conta `ADMIN`/`USER` da própria banca (username, name, email, role, status, mustChangePassword, version, timestamps), sem expor `passwordHash` ou qualquer segredo.

#### Scenario: Owner views detail of an account in the same banca
- **WHEN** um `OWNER` consulta `GET /api/accounts/:accountId` para uma conta existente da própria banca
- **THEN** o sistema retorna os dados administráveis da conta, sem `passwordHash`

#### Scenario: Account not found or from another banca returns 404, never 403
- **WHEN** um `OWNER` consulta uma conta inexistente ou pertencente a outra banca
- **THEN** o sistema retorna `404` em ambos os casos, sem distinguir os dois na mensagem, evitando enumeração — `403` é reservado exclusivamente para quando o ator não possui `identity.accounts.read` ([[user-account-management]])

### Requirement: OWNER updates username, name, or email of a third-party account
O sistema SHALL expor `PATCH /api/accounts/:accountId`, autorizado por `identity.accounts.update`, permitindo atualizar `username`, `name` e/ou `email` de uma conta `ADMIN`/`USER` da própria banca, exigindo `expectedVersion` para concorrência otimista (CAS), no mesmo padrão de `UpdateOwnProfileUseCase`. `username` novo SHALL ser único dentro da banca. Esta atualização não revoga sessões da conta (nenhum dos campos é claim do token).

#### Scenario: Owner updates name and email of a third-party account
- **WHEN** um `OWNER` envia `PATCH /api/accounts/:accountId { name, email, expectedVersion }` com a versão atual correta
- **THEN** os dados são atualizados e a `version` é incrementada; nenhuma sessão da conta é revogada

#### Scenario: Owner renames the username of a third-party account
- **WHEN** um `OWNER` envia um `username` novo, ainda não usado na mesma banca
- **THEN** o `username` é atualizado e permanece único dentro da banca

#### Scenario: Duplicate username within the same banca is rejected
- **WHEN** o `username` informado já pertence a outra conta da mesma banca
- **THEN** o sistema retorna `IDENTITY.USERNAME_ALREADY_EXISTS`; nada é alterado

#### Scenario: Stale version is rejected
- **WHEN** o `expectedVersion` enviado não corresponde à `version` atual da conta
- **THEN** o sistema retorna `IDENTITY.CONCURRENCY_CONFLICT`; nada é alterado

### Requirement: OWNER changes an account's role between ADMIN and USER
O sistema SHALL expor `PATCH /api/accounts/:accountId/role`, autorizado por `identity.accounts.change-role`, permitindo transicionar exclusivamente entre `ADMIN` e `USER`. `OWNER` não SHALL ser um valor de entrada nem um estado atual transicionável por este endpoint. A troca de papel revoga todas as sessões ativas da conta na mesma transação ([[session-management]]).

#### Scenario: Owner promotes a USER to ADMIN
- **WHEN** um `OWNER` envia `PATCH /api/accounts/:accountId/role { role: 'ADMIN' }` para uma conta `USER` da própria banca
- **THEN** o papel da conta muda para `ADMIN` e todas as sessões ativas dessa conta são revogadas na mesma transação

#### Scenario: Owner demotes an ADMIN to USER
- **WHEN** um `OWNER` envia `PATCH /api/accounts/:accountId/role { role: 'USER' }` para uma conta `ADMIN` da própria banca
- **THEN** o papel da conta muda para `USER` e todas as sessões ativas dessa conta são revogadas na mesma transação

#### Scenario: OWNER is never a valid target or value for this endpoint
- **WHEN** o `accountId` corresponde a uma conta `OWNER`, ou `role: 'OWNER'` é enviado como valor de destino
- **THEN** o sistema rejeita a operação (`403`) antes de qualquer persistência

#### Scenario: Role change reflects immediately in the fixed authorization matrix
- **WHEN** uma conta transita de `USER` para `ADMIN` (ou vice-versa) e autentica novamente
- **THEN** as permissões efetivas do novo token correspondem exatamente à entrada de `ROLE_PERMISSION_MAP` do novo papel

### Requirement: Account lifecycle is managed by status, without physical deletion
O sistema NÃO SHALL oferecer exclusão física de conta nesta versão. "Gestão completa do ciclo de vida" SHALL significar a transição entre `ACTIVE`, `INACTIVE` e `BLOCKED` pelos mecanismos já existentes ([[user-account-management]]), mais criação, atualização de dados e troca de papel — nunca remoção do registro.

#### Scenario: No delete endpoint exists for accounts
- **WHEN** um cliente tenta executar `DELETE /api/accounts/:accountId`
- **THEN** não existe endpoint de exclusão física disponível para esta operação

### Requirement: Usuarios screen presents accounts using the real listing, with search, filters, and honest states
A seção **Usuários** de `/configuracoes` SHALL listar as contas reais da banca usando o componente `Table` compartilhado, com busca, paginação e filtros por papel e status ligados a `GET /api/accounts`, exibindo nome, username, papel, status e ações. A tela SHALL apresentar estados explícitos de carregamento, vazio, erro e sem permissão, sem dado fabricado.

#### Scenario: Owner sees the real account list
- **WHEN** um `OWNER` abre a seção Usuários de `/configuracoes`
- **THEN** a tela exibe as contas reais da banca retornadas por `GET /api/accounts`, usando o componente `Table` compartilhado

#### Scenario: Empty state is honest
- **WHEN** a banca não possui nenhuma conta `ADMIN`/`USER` além do `OWNER`
- **THEN** a tela exibe um estado vazio real, sem dado fictício

#### Scenario: Error and forbidden states are distinguishable
- **WHEN** a chamada a `GET /api/accounts` falha por erro técnico ou por `403`
- **THEN** a tela distingue visualmente o estado de erro do estado de acesso negado, sem apresentar dado parcial como se fosse completo

### Requirement: Usuarios screen forms create, edit, and manage lifecycle with duplicate-submission prevention
A seção Usuários SHALL oferecer formulários de criação e edição reutilizando o mecanismo de formulário e os componentes (`Dialog`, `Button`, `Input`, `Badge`) já existentes no projeto, permitir a troca entre `ADMIN` e `USER`, ativação/bloqueio/desbloqueio com confirmação, e redefinição de senha temporária com apresentação segura do resultado. Nenhuma ação SHALL permitir envio duplicado enquanto uma requisição equivalente está em andamento.

#### Scenario: Creation form submits to the real endpoint
- **WHEN** um `OWNER` preenche o formulário de criação (`username`, `name`, `email` opcional, `role`) e confirma
- **THEN** o formulário chama `POST /api/accounts` e, em sucesso, exibe a senha temporária retornada uma única vez

#### Scenario: Status action requires confirmation
- **WHEN** um `OWNER` aciona ativar, bloquear ou desbloquear uma conta
- **THEN** a ação exige confirmação explícita antes de chamar `PATCH /api/accounts/:accountId/status`

#### Scenario: Duplicate submission is prevented
- **WHEN** um `OWNER` aciona duas vezes seguidas o mesmo botão de ação (criar, editar, trocar papel, redefinir senha, alterar status) antes da resposta da primeira chamada
- **THEN** o sistema ignora ou desabilita a segunda ativação até que a primeira requisição seja concluída

#### Scenario: API validation errors are surfaced to the user
- **WHEN** o Backend rejeita uma operação (ex.: `USERNAME_ALREADY_EXISTS`, `PASSWORD_TOO_WEAK`, `CONCURRENCY_CONFLICT`)
- **THEN** a tela exibe uma mensagem de erro compreensível associada ao campo ou à ação correspondente

### Requirement: Temporary password is presented securely and once
Quando uma senha temporária é gerada (criação de conta ou redefinição administrativa), o Web SHALL apresentá-la ao `OWNER` uma única vez, de forma que possa ser copiada ou anotada com segurança, e NÃO SHALL persisti-la em nenhum estado recuperável após a navegação sair da tela (ex.: histórico de navegador acessível, log de console).

#### Scenario: Temporary password is shown once after creation or reset
- **WHEN** a criação de conta ou a redefinição de senha é concluída com sucesso
- **THEN** a senha temporária é exibida uma única vez na própria resposta da ação, com opção de copiar

#### Scenario: Temporary password is not retrievable after leaving the screen
- **WHEN** o `OWNER` navega para outra tela ou recarrega a página após visualizar a senha temporária
- **THEN** a senha temporária não pode mais ser recuperada pela interface
