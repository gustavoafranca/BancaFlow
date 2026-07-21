## Purpose

Define frontend protection mechanisms including proxy-based route guards, login form implementation, session state handling, and forced password change flows. Ensures users cannot access private routes without valid authentication.

---
## Requirements
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

### Requirement: Root route resolves deterministically by session and tenant
O sistema SHALL substituir o template inicial do Next em `apps/web/src/app/page.tsx` por um comportamento determinístico da rota raiz `/`, resolvido no servidor antes de qualquer renderização, com base no estado de sessão do usuário e sem introduzir loop entre `/`, `/login`, `/trocar-senha` e `/dashboard`. O backend permanece autoritativo sobre sessão, conta e tenant; o `/` nunca renderiza conteúdo privado antes de decidir o redirecionamento.

#### Scenario: Anonymous user at root goes to login
- **WHEN** um usuário sem cookie de access token (ou com cookie ilegível) acessa `/` em um host de tenant conhecido (ex.: `http://farizeu.localhost:3000/`)
- **THEN** o sistema redireciona para `/login` no servidor, sem renderizar conteúdo privado

#### Scenario: Authenticated user at root goes to dashboard
- **WHEN** um usuário com sessão válida e `mustChangePassword == false` acessa `/`
- **THEN** o sistema redireciona para `/dashboard`

#### Scenario: Authenticated user with mandatory change at root goes to change screen
- **WHEN** um usuário com sessão válida e `mustChangePassword == true` acessa `/`
- **THEN** o sistema redireciona para `/trocar-senha`

#### Scenario: Root redirect does not create a loop
- **WHEN** o `/` redireciona conforme o estado de sessão
- **THEN** o destino (`/login`, `/trocar-senha` ou `/dashboard`) não redireciona de volta para `/`, mantendo a coerência com o `proxy.ts` e o layout `(private)`

### Requirement: Authenticated user visiting login is redirected away
O sistema SHALL evitar que um usuário já autenticado permaneça em `/login`, redirecionando conforme o estado de troca obrigatória, sem loop.

#### Scenario: Authenticated user visiting /login goes to dashboard
- **WHEN** um usuário com sessão válida e `mustChangePassword == false` acessa `/login`
- **THEN** o sistema redireciona para `/dashboard`

#### Scenario: Authenticated user pending change visiting /login goes to change screen
- **WHEN** um usuário com sessão válida e `mustChangePassword == true` acessa `/login`
- **THEN** o sistema redireciona para `/trocar-senha`

### Requirement: Host without a valid tenant has explicit safe behavior
O sistema SHALL tratar de forma explícita, segura e não enumerável o acesso a partir de um host sem tenant válido — host sinteticamente inválido, subdomínio reservado, tenant inexistente e tenant inativo. A resolução do tenant SHALL permanecer autoritativa no backend a partir do `Host`/`X-Forwarded-Host`; o Next NÃO SHALL consultar banco diretamente nem confiar em `tenantId`/`codigoBanca` enviado pelo browser. Para host sem tenant válido, o sistema SHALL exibir uma página genérica de endereço indisponível, sem nome ou branding do tenant, evitando revelar se o subdomínio é reservado, inexistente ou inativo.

#### Scenario: Unknown tenant host shows a generic unavailable page
- **WHEN** o host é sintaticamente válido porém não corresponde a nenhum tenant ativo (inexistente ou inativo)
- **THEN** o sistema exibe uma página genérica de endereço indisponível, sem branding do tenant, e não revela a causa específica

#### Scenario: Reserved or malformed host is not enumerable
- **WHEN** o host usa um subdomínio reservado (`www`, `api`, `admin`, `app`, `status`) ou um formato inválido
- **THEN** a resposta ao usuário é indistinguível da de um tenant inexistente, sem enumeração

#### Scenario: Tenant existence is never decided in the browser
- **WHEN** o Web precisa decidir o comportamento por host
- **THEN** a decisão usa resolução autoritativa do backend a partir do `Host`, sem acesso direto ao banco pelo Next e sem confiar em identificador de tenant vindo do cliente

#### Scenario: Local, production, and trusted-proxy hosts are covered
- **WHEN** o comportamento por host é exercitado em ambiente local `.localhost`, em produção com sufixo `.bancaflow.com.br` e atrás de proxy confiável
- **THEN** o `Host`/`X-Forwarded-Host` é preservado de forma controlada e a resolução do tenant permanece consistente com [[request-routing-and-proxy]] e [[banca-context-resolution]]

### Requirement: Web client validates the response shape before treating it as success
O cliente HTTP do módulo `configuracoes` (`access-control.client.ts`) NÃO SHALL tratar uma resposta `200` como sucesso sem validar minimamente sua estrutura (`capabilities` é array; cada capacidade tem `capability`/`label`/`order`/`permissions`; cada permissão tem `key`/`label`/`description`/`order`/`roles`, com `roles` restrito a `OWNER|ADMIN|USER`). Um payload `200` malformado SHALL ser tratado como estado de erro, nunca repassado ao componente de apresentação.

#### Scenario: Malformed 200 payload is treated as an error, not success
- **WHEN** o Backend responde `200` com um corpo que não corresponde à forma esperada (ex.: `capabilities` ausente, não é array, ou uma permissão sem `roles` válidas)
- **THEN** o cliente HTTP retorna o estado `error`, nunca `success`, evitando que o componente quebre ao acessar `capabilities`/`permissions`

#### Scenario: Well-formed 200 payload is treated as success
- **WHEN** o Backend responde `200` com um corpo que corresponde à forma esperada (incluindo o caso de `capabilities` vazio)
- **THEN** o cliente HTTP retorna o estado `success` com os dados validados

### Requirement: Access Profiles screen mirrors the real role-permission matrix, restricted to OWNER
O sistema SHALL apresentar `/configuracoes → Perfis de Acesso` a partir de uma leitura real de `GET /api/access-control/role-permissions`, exibindo exclusivamente os três papéis reais do domínio (`OWNER|ADMIN|USER`). Nesta versão, a tela SHALL permanecer acessível apenas a `OWNER` — `ADMIN` deixou de ter acesso a esta tela, pois a leitura da matriz completa é restrita a `OWNER` no Backend ([[authoritative-permission-catalog]]) — e somente leitura, sem nenhum toggle editável de permissão.

#### Scenario: Access Profiles screen shows the three real roles to OWNER/ADMIN
- **WHEN** um comportamento anterior a esta fase permitia `ADMIN` abrir `/configuracoes → Perfis de Acesso`
- **THEN** esse acesso foi revogado nesta versão — ver "Access Profiles screen shows the three real roles to OWNER" e "ADMIN no longer sees the administrative Access Profiles screen" para o comportamento atual

#### Scenario: Access Profiles screen shows the three real roles to OWNER
- **WHEN** um usuário autenticado com papel `OWNER` abre `/configuracoes → Perfis de Acesso`
- **THEN** a tela exibe a matriz papel × permissão para `OWNER`, `ADMIN` e `USER`, sem exibir os 4 perfis fictícios do protótipo

#### Scenario: ADMIN no longer sees the administrative Access Profiles screen
- **WHEN** um usuário autenticado com papel `ADMIN` tenta acessar `/configuracoes → Perfis de Acesso`
- **THEN** o Web oculta o item de navegação por experiência, e o Backend recusa a chamada correspondente (`GET /api/access-control/role-permissions`) mesmo que a rota fosse acessada diretamente, retornando `403`

#### Scenario: USER does not see the administrative Access Profiles screen
- **WHEN** um usuário autenticado com papel `USER` tenta acessar `/configuracoes → Perfis de Acesso`
- **THEN** o Web oculta o item de navegação por experiência, e o Backend recusa a chamada correspondente mesmo que a rota fosse acessada diretamente

#### Scenario: Screen has no editable permission toggle
- **WHEN** um usuário `OWNER` visualiza `/configuracoes → Perfis de Acesso`
- **THEN** nenhum controle de edição de permissão está presente, evitando sugerir uma capacidade de administração de permissões que não existe nesta fase

#### Scenario: Hiding a Web action is experience, not authorization
- **WHEN** o papel do usuário autenticado não teria permissão para uma ação em outra tela
- **THEN** o Web pode ocultar o controle correspondente por experiência, mas o Backend segue validando a permissão de forma independente, mesmo que o controle estivesse visível

### Requirement: Frontend gates protected admin UI by PermissionKey
O Web SHALL decidir visibilidade de menu, rota e ações administrativas por `PermissionKey` efetiva, não por comparação de papel bruto no componente. Essa decisão é apenas experiência; o backend permanece a autoridade final.

#### Scenario: Settings navigation is based on effective permissions
- **WHEN** o shell decide exibir Configurações
- **THEN** ele consulta as permissões efetivas e não usa `currentUser.role === 'OWNER'` como regra de autorização no cliente

#### Scenario: Direct route without permission is safe
- **WHEN** um ator sem a permissão acessa `/configuracoes` diretamente
- **THEN** a UI mostra estado sem permissão e nenhuma chamada bem-sucedida vaza dados administrativos

