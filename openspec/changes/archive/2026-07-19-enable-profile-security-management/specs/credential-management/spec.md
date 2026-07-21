## MODIFIED Requirements

### Requirement: Voluntary password change
Um usuário autenticado SHALL poder alterar voluntariamente a própria senha informando a senha atual (validada contra hash) e a nova senha (rejeitada se fraca pela política autoritativa do domínio). Senha atual incorreta SHALL retornar um código de erro determinístico e distinto (`IDENTITY.CURRENT_PASSWORD_INCORRECT`) mapeado para `400`, nunca o mesmo código/status usado para token ausente, inválido, ou sessão revogada/expirada (`IDENTITY.INVALID_CREDENTIALS`/`401`) — a ambiguidade entre os dois faria um cliente que trata `401` como sessão expirada redirecionar incorretamente o usuário para login após uma simples senha digitada errada.

#### Scenario: Successful voluntary change
- **WHEN** o usuário fornece a senha atual correta e uma nova senha **forte**
- **THEN** a senha é atualizada, `passwordChangedAt` é renovado, **todas as OUTRAS sessões são revogadas** (não a atual), novo token é emitido com `mustChangePassword = false`

#### Scenario: Wrong current password rejects change with a distinct error code
- **WHEN** o usuário fornece a senha atual incorreta
- **THEN** o sistema retorna `400 IDENTITY.CURRENT_PASSWORD_INCORRECT` sem revelar informação adicional; nada é alterado

#### Scenario: Wrong current password is not confused with an authentication failure
- **WHEN** o usuário fornece a senha atual incorreta em uma sessão válida e não expirada
- **THEN** o código de erro retornado é distinto de `IDENTITY.INVALID_CREDENTIALS` e de qualquer código mapeado para `401`, e a sessão do usuário permanece válida (nenhuma revogação ocorre)

#### Scenario: Weak new password rejects change
- **WHEN** o usuário fornece nova senha fraca
- **THEN** o sistema retorna `400 IDENTITY.PASSWORD_TOO_WEAK`; nada é alterado

#### Scenario: Session revocation is transactional
- **WHEN** troca voluntária bem-sucedida ocorre
- **THEN** em transação: (1) persistir hash novo, (2) revogar outras sessões, (3) emitir novo token. Se qualquer etapa falha, tudo é revertido.
