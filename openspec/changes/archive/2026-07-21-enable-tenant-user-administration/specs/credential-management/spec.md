## MODIFIED Requirements

### Requirement: Administrative password reset with temporary password
Uma conta com papel `OWNER` SHALL poder redefinir a senha de conta `ADMIN` ou `USER` autorizada da própria banca via `PATCH /api/auth/admin/reset-password` (`{ targetUserId }` no corpo, exatamente como hoje), gerando uma senha temporária **forte** (satisfazendo política) que é devolvida uma única vez e obriga troca no próximo acesso. Este endpoint mantém seu contrato e caminho atuais nesta change — apenas a permissão que o autoriza (`identity.accounts.reset-password`) passa a ser exclusiva de `OWNER`, e passa a aplicar a política de alvo (`assertAdministrableTarget`). Nesta versão, `ADMIN` não redefine senha de outra conta. Nenhum `OWNER` redefine a própria senha por este endpoint — autosserviço de senha continua exclusivo de `PATCH /api/auth/password`.

#### Scenario: Admin resets password
- **WHEN** um comportamento anterior a esta fase permitia `ADMIN` redefinir a senha de outra conta
- **THEN** esse acesso foi revogado nesta versão — ver "Owner resets password of an account in the same banca" e "ADMIN cannot reset any account password in this version" para o comportamento atual

#### Scenario: Admin cannot reset password of another banca
- **WHEN** um comportamento anterior a esta fase distinguia bloqueio cross-banca de `ADMIN` com `403`
- **THEN** essa distinção foi substituída nesta versão por uma resposta uniforme `404` para alvo inexistente ou de outra banca — ver "Target account not found or from another banca returns 404, never 403"

#### Scenario: Admin cannot reset owner
- **WHEN** um comportamento anterior a esta fase previa `ADMIN` tentando redefinir a senha de `OWNER`
- **THEN** esse cenário deixou de existir nesta versão — `ADMIN` não redefine senha de conta alguma (ver "ADMIN cannot reset any account password in this version")

#### Scenario: Owner resets password of an account in the same banca
- **WHEN** um `OWNER` da banca `farizeu` redefine a senha de uma conta `ADMIN` ou `USER` da banca `farizeu`
- **THEN** a conta recebe uma nova senha (temporária, forte), `mustChangePassword = true` é definido e todas as sessões ativas da conta são revogadas **na mesma transação**

#### Scenario: Target account not found or from another banca returns 404, never 403
- **WHEN** um `OWNER` da banca `farizeu` informa um `targetUserId` inexistente ou pertencente à banca `botafogo`
- **THEN** o sistema retorna `404` em ambos os casos, sem distinguir os dois na mensagem

#### Scenario: ADMIN cannot reset any account password in this version
- **WHEN** uma conta `ADMIN` tenta redefinir a senha de outra conta
- **THEN** o sistema retorna `403`, pois `identity.accounts.reset-password` não autoriza `ADMIN` nesta versão

#### Scenario: Owner cannot reset their own password through this endpoint
- **WHEN** um `OWNER` autenticado informa o próprio `userId` como `targetUserId` em `PATCH /api/auth/admin/reset-password`
- **THEN** o sistema retorna `403` (alvo resolvido, mas é o próprio ator); a troca da própria senha continua exclusiva de `PATCH /api/auth/password`

#### Scenario: Temporary password is strong and returned once
- **WHEN** uma redefinição administrativa autorizada é concluída
- **THEN** a senha temporária (mín. 12 caracteres, variedade) é retornada somente nessa resposta, nunca é persistida em texto puro

#### Scenario: Reset is transactional
- **WHEN** reset administrativo ocorre
- **THEN** em transação: (1) persistir hash novo com `mustChangePassword=true`, (2) revogar todas as sessões, (3) retornar senha temporária. Se falha, nada é alterado.
