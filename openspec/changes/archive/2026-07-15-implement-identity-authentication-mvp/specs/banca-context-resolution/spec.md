## ADDED Requirements

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
O sistema SHALL ler `X-Forwarded-Host` somente quando a variável de ambiente `TRUST_PROXY_HOST=true` estiver definida.

#### Scenario: Proxy host trusted when configured
- **WHEN** `TRUST_PROXY_HOST=true` e a requisição contém `X-Forwarded-Host: farizeu.bancaflow.com.br`
- **THEN** o sistema usa o valor de `X-Forwarded-Host` como host autoritativo

#### Scenario: Proxy host ignored when not configured
- **WHEN** `TRUST_PROXY_HOST` não está definida e a requisição contém `X-Forwarded-Host: farizeu.bancaflow.com.br`
- **THEN** o sistema ignora `X-Forwarded-Host` e usa o header `Host` diretamente
