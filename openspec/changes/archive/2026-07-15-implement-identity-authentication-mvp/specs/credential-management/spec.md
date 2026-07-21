## ADDED Requirements

### Requirement: Store password as bcrypt hash
O sistema SHALL armazenar senhas exclusivamente como hash bcrypt com custo configurável (padrão: 12). Nunca armazenar ou logar a senha em texto puro.

#### Scenario: Password is stored as hash
- **WHEN** uma conta é criada com senha `"dev@123"`
- **THEN** o banco contém somente o hash bcrypt correspondente; a senha original não é acessível

### Requirement: Voluntary password change
Um usuário autenticado SHALL poder alterar voluntariamente a própria senha informando a senha atual e a nova senha.

#### Scenario: Successful voluntary change
- **WHEN** o usuário fornece a senha atual correta e uma nova senha válida
- **THEN** a senha é atualizada, `passwordChangedAt` é renovado, todas as sessões exceto a atual são revogadas

#### Scenario: Wrong current password rejects change
- **WHEN** o usuário fornece a senha atual incorreta
- **THEN** o sistema retorna `400` sem revelar informação adicional

### Requirement: Administrative password reset with temporary password
Uma conta com papel `OWNER` ou `ADMIN` SHALL poder redefinir a senha de conta autorizada da própria banca, gerando uma senha temporária forte que é devolvida uma única vez e obriga troca no próximo acesso. Uma conta `ADMIN` não pode redefinir a senha de `OWNER`.

#### Scenario: Admin resets password
- **WHEN** um administrador da banca `farizeu` redefine a senha de uma conta da banca `farizeu`
- **THEN** a conta recebe uma nova senha (temporária), `mustChangePassword = true` é definido e todas as sessões ativas da conta são revogadas

#### Scenario: Admin cannot reset password of another banca
- **WHEN** um administrador da banca `farizeu` tenta redefinir a senha de uma conta da banca `botafogo`
- **THEN** o sistema retorna `403`

#### Scenario: Admin cannot reset owner
- **WHEN** uma conta `ADMIN` tenta redefinir a senha de uma conta `OWNER` da mesma banca
- **THEN** o sistema retorna `403`; a recuperação de OWNER permanece reservada à administração da plataforma fora deste MVP

#### Scenario: Temporary password is returned once
- **WHEN** uma redefinição administrativa autorizada é concluída
- **THEN** a senha temporária é retornada somente nessa resposta, nunca é persistida ou registrada em texto puro

### Requirement: Force password change on next login
Quando `mustChangePassword = true`, o sistema SHALL bloquear acesso à área privada até que o usuário troque a senha.

#### Scenario: Login with mustChangePassword redirects to change screen
- **WHEN** o usuário faz login com sucesso em uma conta com `mustChangePassword = true`
- **THEN** o access token é emitido com claim `mustChangePassword: true` e o frontend redireciona para a tela de troca obrigatória de senha

#### Scenario: Protected route rejects token with mustChangePassword
- **WHEN** um access token com `mustChangePassword: true` é usado em qualquer endpoint protegido exceto o de troca de senha
- **THEN** o sistema retorna `403` com código `IDENTITY.MUST_CHANGE_PASSWORD`

#### Scenario: After successful change mustChangePassword is cleared
- **WHEN** o usuário troca a senha com sucesso
- **THEN** `mustChangePassword = false` é definido e o usuário acessa a área privada normalmente
