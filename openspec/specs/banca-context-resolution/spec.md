## Purpose

Define how the Identity module resolves tenant context from HTTP requests without owning or importing the Banca aggregate. All operations are scoped to the resolved bancaId extracted from the hostname.

---

## Requirements

### Requirement: Consume banca context owned by Tenancy
Identity SHALL resolver bancas por uma port pública sem possuir, duplicar ou importar o agregado `Banca`. A implementação desta capacidade depende de Tenancy fornecer `Banca`, `codigoBanca`, status e uma consulta pública.

#### Scenario: Identity consumes only minimal context
- **WHEN** Identity resolve um `codigoBanca`
- **THEN** recebe somente `bancaId` e `isActive`, sem carregar a entidade `Banca` para dentro do módulo Identity

### Requirement: Resolve tenant from subdomain
O sistema SHALL extrair o `codigoBanca` do header `Host` da requisição HTTP, validando que o sufixo configurado seja `.bancaflow.com.br` e que o subdomínio não seja reservado.

Subdomínios reservados: `www`, `api`, `admin`, `app`, `status`.

O `codigoBanca` SHALL ser normalizado para lowercase antes de qualquer consulta.

#### Scenario: Valid subdomain resolves correctly
- **WHEN** a requisição chega com `Host: farizeu.bancaflow.com.br`
- **THEN** o sistema extrai `codigoBanca = "farizeu"` e consulta a banca correspondente

#### Scenario: Reserved subdomain is rejected
- **WHEN** a requisição chega com `Host: api.bancaflow.com.br`
- **THEN** o sistema retorna `401` com mensagem genérica, sem revelar se o subdomínio é reservado ou inexistente

#### Scenario: Unknown subdomain is rejected
- **WHEN** a requisição chega com `Host: naoexiste.bancaflow.com.br` e nenhuma banca com esse código existe no banco
- **THEN** o sistema retorna `401` com mensagem genérica

#### Scenario: Suffix mismatch is rejected
- **WHEN** a requisição chega com `Host: farizeu.outrodominio.com`
- **THEN** o sistema retorna `401` com mensagem genérica

### Requirement: Validate banca is active
Após resolver `codigoBanca → bancaId`, o sistema SHALL verificar que a banca possui status ativo antes de prosseguir com qualquer operação de identidade.

#### Scenario: Inactive banca is rejected
- **WHEN** a banca existe mas está com status inativo/suspenso
- **THEN** o sistema retorna `401` com mensagem genérica, sem revelar que a banca existe

#### Scenario: Active banca allows proceeding
- **WHEN** a banca existe e está ativa
- **THEN** o sistema prossegue com a operação solicitada usando o `bancaId` resolvido

### Requirement: Trust proxy host header conditionally
O sistema SHALL ler `X-Forwarded-Host` somente quando `TRUST_PROXY_HOST=true` **e** o **peer imediato** da conexão (o IP que abriu o socket, obtido de `req.socket.remoteAddress`) pertencer a uma **allowlist de IP/CIDR de proxies confiáveis** (ex.: `TRUSTED_PROXY_IPS`). O `trust proxy` do Express SHALL ser configurado apenas para esses IPs — nunca `true` —, e `req.ip` NÃO deve ser usado ingenuamente, pois pode refletir `X-Forwarded-For` forjado pelo cliente. Fora dessa fronteira, apenas o header `Host` direto é autoritativo. Host forjado SHALL resultar em falha genérica e segura.

#### Scenario: Proxy host trusted when configured and peer is an allowlisted proxy
- **WHEN** `TRUST_PROXY_HOST=true`, o peer imediato (`req.socket.remoteAddress`) está na allowlist e a requisição contém `X-Forwarded-Host: farizeu.bancaflow.com.br`
- **THEN** o sistema usa `X-Forwarded-Host` como host autoritativo

#### Scenario: Proxy host ignored when not configured
- **WHEN** `TRUST_PROXY_HOST` não está definida (ou é `false`)
- **THEN** o sistema ignora `X-Forwarded-Host` e usa apenas o header `Host`

#### Scenario: Forged valid tenant host from a non-allowlisted peer is rejected
- **WHEN** `TRUST_PROXY_HOST=true` mas o peer imediato está **fora** da allowlist, e o cliente forja `X-Forwarded-Host: outra-banca.bancaflow.com.br` (outro subdomínio **válido** do BancaFlow — não `hacker.com`, que já cai no sufixo)
- **THEN** o sistema ignora o valor forjado (usa o `Host` real ou falha genérica) e NÃO sequestra o tenant `outra-banca`

#### Scenario: Forged X-Forwarded-For does not make req.ip trusted
- **WHEN** um cliente fora da allowlist envia `X-Forwarded-For` apontando para um IP confiável
- **THEN** a decisão de confiança usa o peer imediato (`req.socket.remoteAddress`), não `req.ip`, e o header forjado não é honrado

#### Scenario: Development and production hosts both resolve correctly
- **WHEN** os testes exercitam `farizeu.bancaflow.com.br` (produção same-origin) e o ambiente local com rewrite
- **THEN** o `codigoBanca` resolvido é o mesmo `farizeu` em ambos, sem depender de header forjável
