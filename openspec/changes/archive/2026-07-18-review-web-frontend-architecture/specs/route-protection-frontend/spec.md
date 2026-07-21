## ADDED Requirements

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
