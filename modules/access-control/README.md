# Access Control — catálogo autoritativo de permissões

## Responsabilidade

Access Control responde por **o que cada papel (`OWNER`/`ADMIN`/`USER`) pode fazer**. O catálogo de permissões ([`PERMISSION_CATALOG`](./src/permission-catalog.ts)), a união fechada de chaves derivada dele ([`PermissionKey`](./src/permission-key.ts)) e a matriz papel × permissão ([`ROLE_PERMISSION_MAP`](./src/role-permission-map.ts)) são **constantes de configuração em código-fonte**, não um agregado DDD nem uma tabela de banco. Não há CRUD de permissão, papel customizado ou permissão individual por usuário — só existem os três papéis fixos, e a decisão de o que cada um pode fazer é sempre um redeploy de código, nunca um dado mutável em runtime.

`hasPermission(actorRole, permissionKey)` ([`has-permission.ts`](./src/has-permission.ts)) é a única porta de decisão consumida pelos demais módulos (Identity, Participants, etc.) — nenhum caso de uso deve reimplementar checagem de papel bruto em paralelo a esta função.

## Definition of Done para uma nova capability/rota/endpoint protegido

Toda change que adiciona uma capability, rota, endpoint ou ação protegida **nesta mesma change** deve, antes de ser considerada completa:

1. **Declarar a `PermissionKey`** em [`PERMISSION_CATALOG`](./src/permission-catalog.ts), sob a capability correta, com `key` prefixada por `<capability>.` (ex.: `participants.betting-agents.create`).
2. **Preencher os metadados de apresentação**: `label` e `description` em português, não vazios, e um `order` numérico único dentro da capability (define a ordem de exibição na UI — nunca reaproveitar um `order` já usado na mesma capability).
3. **Decidir explicitamente o acesso de `OWNER`, `ADMIN` e `USER`** em [`ROLE_PERMISSION_MAP`](./src/role-permission-map.ts). `OWNER` é sempre o catálogo inteiro (`[...PERMISSION_KEYS]`) — nunca uma lista manual paralela. Para `ADMIN`/`USER`, incluir a chave na lista concede; não incluir nega — ambas são decisões, nenhuma delas pode ficar pendente de uma change futura.
4. **Aplicar enforcement no backend** chamando `hasPermission(actorRole, permissionKey)` no caso de uso ou controller correspondente — nunca uma checagem de papel bruto (`role === 'ADMIN'`) equivalente e paralela.
5. **Aplicar o gate correspondente no frontend** (rota, item de menu, ação) quando a capability tiver superfície no Web — ver `route-protection-frontend`.
6. **Confirmar a presença automática na matriz**: como a matriz servida por `GetRolePermissionMatrixUseCase` é derivada do catálogo, uma chave nova aparece automaticamente em `/configuracoes` (aba Perfis de acesso) sem código adicional — não é necessário (e não deve ser feito) hardcodar a nova chave em nenhum componente de UI.
7. **Cobrir com testes**: os testes de integridade em [`test/catalog-integrity.spec.ts`](./test/catalog-integrity.spec.ts) falham automaticamente para chave duplicada, metadata ausente/vazia, `order` duplicado dentro de uma capability, prefixo de chave incoerente com a capability, chave órfã (não autorizada para nenhum papel) ou `ROLE_PERMISSION_MAP` referenciando uma chave que não existe mais no catálogo. Rode-os como parte da change; eles são o guardrail que substitui uma revisão manual da matriz.
8. **Reconciliar changes ativas concorrentes**: se outra change ainda não implementada também declarar `PermissionKey`s (ex.: `implement-participant-registration-mvp`), registrar explicitamente que ela deve seguir este mesmo Definition of Done ao ser aplicada, em vez de reintroduzir uma checagem de papel bruto paralela.

Nenhum passo acima envolve schema, migration, tabela ou coluna Prisma — o catálogo é, e continua sendo, uma constante de código.
