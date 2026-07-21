## MODIFIED Requirements

### Requirement: Next.js Proxy redirects unauthenticated users
O sistema SHALL proteger URLs privadas em `apps/web/src/proxy.ts` (Next.js 16), **não** em um `middleware.ts`. A verificação de presença do cookie de access token ocorre no servidor, antes de qualquer renderização, sem flash de conteúdo privado. O proxy realiza apenas verificação de presença/decodificação para navegação — a autenticação autoritativa (assinatura, sessão, revogação, expiração) permanece no backend a cada chamada `/api`. O route group `(private)` não faz parte da URL nem do matcher.

#### Scenario: Unauthenticated request is redirected before rendering
- **WHEN** um usuário sem cookie de access token acessa `/dashboard`, `/acerto`, `/cambistas`, `/configuracoes`, `/identity`, `/lancamentos`, `/perfil`, `/pessoas` ou `/premios`
- **THEN** o `proxy.ts` redireciona para `/login` no servidor, sem renderizar conteúdo privado

#### Scenario: Private content never flashes before redirect
- **WHEN** o proxy detecta ausência de token
- **THEN** o redirect ocorre no lado do servidor e nenhuma casca privada é enviada ao cliente

#### Scenario: Proxy presence-check is not treated as authentication
- **WHEN** o cookie de access token está presente porém a sessão foi revogada/expirada no servidor
- **THEN** a primeira chamada `/api` retorna `401` autoritativo e o cliente é levado a `/login`, pois o proxy nunca é a fonte da verdade

#### Scenario: /trocar-senha is protected from anonymous access
- **WHEN** um usuário sem cookie de access token acessa `/trocar-senha`
- **THEN** o `proxy.ts` redireciona para `/login`

### Requirement: mustChangePassword forces redirect to change screen
O sistema SHALL detectar o claim `mustChangePassword == true` e redirecionar para `/trocar-senha`, sem criar loop entre `/login`, `/trocar-senha` e `/dashboard`.

#### Scenario: mustChangePassword redirects to change screen
- **WHEN** o access token contém `mustChangePassword == true` e o usuário acessa qualquer rota privada exceto `/trocar-senha`
- **THEN** o sistema redireciona para `/trocar-senha`

#### Scenario: Fresh token after change breaks the loop
- **WHEN** o usuário conclui a troca obrigatória e recebe um novo token com `mustChangePassword == false`
- **THEN** o acesso a `/dashboard` é liberado e não há redirecionamento de volta para `/trocar-senha`

#### Scenario: Stale token cannot keep access after change
- **WHEN** um token antigo com claim desatualizada é apresentado após a troca
- **THEN** a validação autoritativa do backend (sessão/claims) impede acesso indevido e não gera loop de redirecionamento

### Requirement: Handle session states gracefully
O sistema SHALL tratar de forma determinística e segura os estados de sessão expirada, sessão revogada, conta bloqueada e banca inativa, com estratégia de refresh segura.

#### Scenario: Expired access token triggers a secure refresh
- **WHEN** o access token expira mas há refresh token válido
- **THEN** o cliente tenta silent refresh via `POST /api/auth/refresh`; em sucesso, repete a requisição original

#### Scenario: Failed refresh redirects to login
- **WHEN** o refresh falha (token expirado, revogado ou rotacionado)
- **THEN** o cliente redireciona para `/login?expired=1` com mensagem acessível de sessão expirada

#### Scenario: Blocked account or inactive banca surfaces a safe message
- **WHEN** o backend retorna `401`/`403` por conta bloqueada, sessão revogada ou banca inativa
- **THEN** o frontend exibe mensagem genérica e segura, sem revelar detalhes, e encaminha para `/login`
