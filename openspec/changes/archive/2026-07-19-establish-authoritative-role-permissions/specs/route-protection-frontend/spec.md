## ADDED Requirements

### Requirement: Access Profiles screen mirrors the real role-permission matrix, restricted to OWNER and ADMIN
O sistema SHALL substituir a matriz fabricada de 4 perfis fictícios (`Administrador/Operador/Cambista/Somente Leitura`) em `/configuracoes → Perfis de Acesso` por uma leitura real de `GET /api/access-control/role-permissions`, exibindo exclusivamente os três papéis reais do domínio (`OWNER|ADMIN|USER`). A tela SHALL permanecer acessível apenas a `OWNER`/`ADMIN` e somente leitura nesta fase, sem nenhum toggle editável de permissão.

#### Scenario: Access Profiles screen shows the three real roles to OWNER/ADMIN
- **WHEN** um usuário autenticado com papel `OWNER` ou `ADMIN` abre `/configuracoes → Perfis de Acesso`
- **THEN** a tela exibe a matriz papel × permissão para `OWNER`, `ADMIN` e `USER`, sem exibir os 4 perfis fictícios do protótipo

#### Scenario: USER does not see the administrative Access Profiles screen
- **WHEN** um usuário autenticado com papel `USER` tenta acessar `/configuracoes → Perfis de Acesso`
- **THEN** o Web oculta o item de navegação por experiência, e o Backend recusa a chamada correspondente (`GET /api/access-control/role-permissions`) mesmo que a rota fosse acessada diretamente

#### Scenario: Screen has no editable permission toggle
- **WHEN** um usuário `OWNER`/`ADMIN` visualiza `/configuracoes → Perfis de Acesso`
- **THEN** nenhum controle de edição de permissão está presente, evitando sugerir uma capacidade de administração de permissões que não existe nesta fase

#### Scenario: Hiding a Web action is experience, not authorization
- **WHEN** o papel do usuário autenticado não teria permissão para uma ação em outra tela
- **THEN** o Web pode ocultar o controle correspondente por experiência, mas o Backend segue validando a permissão de forma independente, mesmo que o controle estivesse visível

### Requirement: Web client validates the response shape before treating it as success
O cliente HTTP do módulo `configuracoes` (`access-control.client.ts`) NÃO SHALL tratar uma resposta `200` como sucesso sem validar minimamente sua estrutura (`capabilities` é array; cada capacidade tem `capability`/`label`/`order`/`permissions`; cada permissão tem `key`/`label`/`description`/`order`/`roles`, com `roles` restrito a `OWNER|ADMIN|USER`). Um payload `200` malformado SHALL ser tratado como estado de erro, nunca repassado ao componente de apresentação.

#### Scenario: Malformed 200 payload is treated as an error, not success
- **WHEN** o Backend responde `200` com um corpo que não corresponde à forma esperada (ex.: `capabilities` ausente, não é array, ou uma permissão sem `roles` válidas)
- **THEN** o cliente HTTP retorna o estado `error`, nunca `success`, evitando que o componente quebre ao acessar `capabilities`/`permissions`

#### Scenario: Well-formed 200 payload is treated as success
- **WHEN** o Backend responde `200` com um corpo que corresponde à forma esperada (incluindo o caso de `capabilities` vazio)
- **THEN** o cliente HTTP retorna o estado `success` com os dados validados
