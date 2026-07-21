## ADDED Requirements

### Requirement: Next.js Proxy redirects unauthenticated users
O sistema SHALL verificar a presença do access token cookie em `apps/web/src/proxy.ts` antes de renderizar URLs privadas reais. O route group `(private)` não faz parte da URL nem do matcher.

#### Scenario: Unauthenticated request is redirected to login
- **WHEN** um usuário não autenticado acessa `/dashboard`, `/acerto`, `/cambistas`, `/configuracoes`, `/identity`, `/lancamentos`, `/perfil`, `/pessoas` ou `/premios`
- **THEN** o middleware redireciona para `/login` antes de qualquer renderização

#### Scenario: Authenticated request proceeds
- **WHEN** o cookie de access token está presente
- **THEN** o middleware permite a renderização; a validação real da assinatura ocorre no backend

#### Scenario: Private content never flashes before redirect
- **WHEN** o Proxy detecta ausência de token
- **THEN** o redirect ocorre no lado do servidor, sem renderizar conteúdo privado no cliente

### Requirement: mustChangePassword forces redirect to change screen
O sistema SHALL detectar o claim `mustChangePassword = true` no token e redirecionar para a tela de troca obrigatória.

#### Scenario: mustChangePassword redirects to change screen
- **WHEN** o access token contém `mustChangePassword: true` e o usuário acessa qualquer rota privada exceto `/trocar-senha`
- **THEN** o sistema redireciona para `/trocar-senha`

#### Scenario: After password change user accesses private area normally
- **WHEN** o usuário conclui a troca obrigatória de senha e recebe novo token com `mustChangePassword: false`
- **THEN** o acesso à área privada é liberado

### Requirement: Login form uses username not email
O sistema SHALL apresentar campos de `username` e `password` no formulário de login; o campo de e-mail SHALL ser removido.

#### Scenario: Login form submits username and password
- **WHEN** o usuário preenche `username` e `password` e submete o formulário
- **THEN** a requisição é enviada ao backend com `{ username, password }` sem `bancaId` no body

#### Scenario: Forgot password link is removed
- **WHEN** o usuário acessa a tela de login
- **THEN** não há link ou fluxo público de recuperação de senha visível

### Requirement: Tokens stored in HttpOnly cookies
O sistema SHALL armazenar access e refresh tokens exclusivamente em cookies host-only `HttpOnly`, `SameSite=Strict` e, obrigatoriamente em produção, `Secure`. Nunca em `localStorage` ou `sessionStorage`.

#### Scenario: Access token cookie is set by backend
- **WHEN** o login é bem-sucedido
- **THEN** o backend emite `Set-Cookie` com access token `HttpOnly`, `Secure`, `SameSite=Strict`, duração 60 min

#### Scenario: Refresh token cookie is restricted to refresh path
- **WHEN** o login é bem-sucedido
- **THEN** o backend emite `Set-Cookie` com refresh token `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth/refresh`

### Requirement: Login form uses shared typed validation
O formulário SHALL usar React Hook Form com o validator `v` de `@bancaflow/shared`, tipo inferido e mensagens acessíveis, sem introduzir Zod neste fluxo.

#### Scenario: Invalid login form is rejected locally
- **WHEN** `username` ou `password` não atende ao schema tipado
- **THEN** o formulário exibe mensagem acessível e não envia a requisição

### Requirement: Handle session states gracefully
O sistema SHALL tratar estados de sessão expirada, bloqueio temporário e erro de credencial com mensagens acessíveis.

#### Scenario: Expired session redirects to login with message
- **WHEN** o access token expirou e o refresh também (ou não existe)
- **THEN** o sistema redireciona para `/login` com indicação de sessão expirada

#### Scenario: Temporary lockout shows appropriate message
- **WHEN** o backend retorna erro de conta bloqueada
- **THEN** o frontend exibe mensagem informando que a conta está temporariamente bloqueada sem revelar detalhes de segurança
