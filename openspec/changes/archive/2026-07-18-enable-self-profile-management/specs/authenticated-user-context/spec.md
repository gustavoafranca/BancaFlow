## MODIFIED Requirements

### Requirement: Context response is an explicit read projection
O sistema SHALL montar a resposta com DTOs/projeções de leitura e SHALL NOT serializar `UserAccount`, `Banca`, rows Prisma ou objetos carregados pelo guard. A resposta SHALL NOT conter credential, password hash, refresh digest, contadores de falha, bloqueios, timestamps internos ou status operacional. A resposta SHALL conter `version` (o versionamento otimista corrente do `UserAccount`, o mesmo valor exposto pelo getter de domínio), destinado exclusivamente a permitir que o próprio ator submeta atualizações de perfil com concorrência otimista ([[self-profile-management]]); nenhum outro campo além dos já declarados no contrato SHALL ser adicionado.

#### Scenario: Domain entities never cross the HTTP boundary
- **WHEN** o endpoint monta uma resposta de sucesso
- **THEN** o payload contém exatamente a projeção pública declarada, sem entidades de domínio ou campos internos de persistência

#### Scenario: Active status is not redundantly exposed
- **WHEN** conta e banca válidas produzem uma resposta `200`
- **THEN** o payload não contém `isActive` nem outro status operacional já validado pelo guard

#### Scenario: Response exposes the optimistic concurrency version
- **WHEN** conta e banca válidas produzem uma resposta `200`
- **THEN** o payload contém `version` com o valor corrente de `UserAccount.version`, e nenhum outro campo internamente vedado (credential, hash, contadores de falha, bloqueios, timestamps internos, status operacional) é exposto
