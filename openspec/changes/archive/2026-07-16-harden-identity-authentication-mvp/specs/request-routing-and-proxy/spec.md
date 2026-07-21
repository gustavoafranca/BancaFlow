## ADDED Requirements

### Requirement: Production uses same-origin API
O sistema SHALL usar same-origin em produção, com API e Web no mesmo host via subdomínio (ex.: `https://farizeu.bancaflow.com.br/api`), apoiado por DNS wildcard `*.bancaflow.com.br` e TLS válido. Nesse modo nenhum rewrite é necessário e o `codigoBanca` é resolvido a partir do `Host` real ([[banca-context-resolution]]).

#### Scenario: API served on the same origin as the web app
- **WHEN** o cliente acessa `https://farizeu.bancaflow.com.br/api/auth/login`
- **THEN** a requisição chega ao backend no mesmo host, sem proxy externo, e o subdomínio `farizeu` resolve a banca correta

### Requirement: Development uses a secure rewrite to the backend
O sistema SHALL definir, em desenvolvimento, um rewrite Next.js de `/api/:path*` (Web em `http://localhost:3000`) para o backend na **porta real `4000`** (`http://localhost:4000/api/:path*`), preservando de forma controlada o host/subdomínio necessário para resolver `codigoBanca`. O destino SHALL vir de variável de ambiente consistente e documentada (ex.: `BACKEND_INTERNAL_URL`, default `http://localhost:4000`). O `rewrites()` em `apps/web/next.config.ts` SHALL de fato existir (antes desta correção não existia).

#### Scenario: Relative /api path reaches the backend in development
- **WHEN** o Web em `http://localhost:3000` chama `GET /api/auth/sessions`
- **THEN** o rewrite encaminha para `http://localhost:4000/api/auth/sessions`

#### Scenario: Subdomain host is preserved for tenant resolution
- **WHEN** a chamada de desenvolvimento precisa resolver o tenant `farizeu`
- **THEN** o host/subdomínio é preservado (ou informado via `X-Forwarded-Host` sob `TRUST_PROXY_HOST=true`) de modo que o backend resolva `codigoBanca = "farizeu"`

#### Scenario: Tests cover both production host and local environment
- **WHEN** a suíte de testes exercita o roteamento
- **THEN** cobre `farizeu.bancaflow.com.br` (produção) e o ambiente local, provando que as chamadas relativas `/api` chegam ao backend corretamente
