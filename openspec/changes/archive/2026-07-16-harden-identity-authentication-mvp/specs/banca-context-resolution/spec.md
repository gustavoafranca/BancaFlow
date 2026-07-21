## MODIFIED Requirements

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
