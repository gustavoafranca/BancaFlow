## ADDED Requirements

### Requirement: Logout confirmations preserve backend session contracts
Confirmações de logout no Web SHALL chamar os contratos existentes de logout local e logout global sem alterar semântica backend. A UI SHALL redirecionar somente após sucesso e manter o modal aberto em falha.

#### Scenario: Local logout keeps global sessions contract unchanged
- **WHEN** o usuário confirma `Sair deste dispositivo`
- **THEN** o Web chama somente a API de logout da sessão atual e não tenta revogar todas as sessões pelo cliente

#### Scenario: Global logout keeps all-sessions contract unchanged
- **WHEN** o usuário confirma `Sair de todos os dispositivos`
- **THEN** o Web chama somente a API de logout global e aguarda sucesso antes de navegar para `/login`
