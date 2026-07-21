## ADDED Requirements

### Requirement: Frontend gates protected admin UI by PermissionKey
O Web SHALL decidir visibilidade de menu, rota e ações administrativas por `PermissionKey` efetiva, não por comparação de papel bruto no componente. Essa decisão é apenas experiência; o backend permanece a autoridade final.

#### Scenario: Settings navigation is based on effective permissions
- **WHEN** o shell decide exibir Configurações
- **THEN** ele consulta as permissões efetivas e não usa `currentUser.role === 'OWNER'` como regra de autorização no cliente

#### Scenario: Direct route without permission is safe
- **WHEN** um ator sem a permissão acessa `/configuracoes` diretamente
- **THEN** a UI mostra estado sem permissão e nenhuma chamada bem-sucedida vaza dados administrativos
