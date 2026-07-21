## Context

`AccountRoleType` (`'OWNER'|'ADMIN'|'USER'`) já existe hoje como tipo simples dentro de `modules/identity/src/user-account/vo/account-role.vo.ts`, usado por checagens de papel bruto espalhadas em casos de uso (`ToggleAccountStatusUseCase`, `AdminResetPasswordUseCase`): `if (data.actorRole !== 'OWNER' && data.actorRole !== 'ADMIN') return Result.fail(FORBIDDEN)`. Não existe, hoje, nenhuma checagem granular por ação — apenas por papel bruto, duplicada em cada caso de uso.

Este change introduz um bounded context novo, `Access Control`, dedicado exclusivamente ao catálogo de permissões e ao mapeamento papel → permissões, e resolve quatro bloqueios identificados na primeira revisão arquitetural desta proposta:

1. o catálogo não estava enumerado — apenas prometido;
2. coexistiam duas fontes de autorização (checagem de papel bruto + porta de permissão "além dela");
3. a política de leitura da matriz completa contradizia a exigência de que USER veja somente suas próprias permissões;
4. a direção de dependência entre Identity e Access Control fechava um ciclo.

Uma segunda revisão apontou que a v1 desta correção ainda deixava a fonte única violada em três pontos concretos — o endpoint da própria matriz, `AdminResetPasswordUseCase` e os três casos de uso de Participants (change separada) continuavam autorizando por papel bruto — e que o plano 09 não havia sido reconciliado com os artefatos já corrigidos. D5, D6 e D8/D9 abaixo, e a tabela normativa, refletem essa segunda correção.

## Goals / Non-Goals

**Goals:**
- Dar significado operacional explícito, **enumerado e testável** a `OWNER|ADMIN|USER`, cobrindo exatamente as ações já implementadas/aprovadas em Identity e Participants.
- Tornar a porta de permissão a **única** fonte de decisão de "papel autoriza ação", eliminando a checagem de papel bruto duplicada em casos de uso.
- Separar claramente autorização por papel/ação (catálogo) de invariantes contextuais de domínio (ADMIN não gerencia OWNER, autoproteção, isolamento de tenant), que continuam pertencendo a Identity.
- Resolver a direção de dependência entre bounded contexts sem ciclo.
- Prover dois contratos de leitura coerentes com quem pode ver o quê.

**Non-Goals:**
- Perfis personalizados/nomeados além dos 3 papéis fixos (INC-05, condicional a necessidade de negócio futura).
- UI de administração/edição de permissões em runtime.
- Enumeração de permissões de capacidades ainda não modeladas ou ainda em `DISCOVERY` (Financeiro, Lançamentos, Prêmios, Acertos/Caixa, Dashboard; plano 08 INC-02/INC-03; plano 01 INC-02/INC-03).
- Persistência do catálogo em tabela (nasce em código-fonte).
- Ocultação de controles administrativos no Web além da própria tela de Perfis de Acesso — não há hoje nenhuma tela real de administração de conta no Web para gatear (ver proposal.md, Fora de escopo).

## Catálogo normativo de permissões (resolve D44 neste recorte)

Enumeração completa e fechada nesta fase. Toda `PermissionKey` fora desta lista não existe no catálogo — referenciá-la é erro de configuração, não decisão de autorização.

| PermissionKey | OWNER | ADMIN | USER | Origem |
|---|---:|---:|---:|---|
| `identity.profile.read-own` | ✓ | ✓ | ✓ | plano 08, `GetAuthenticatedUserContextUseCase` (implementado) |
| `identity.profile.update-own` | ✓ | ✓ | ✓ | plano 08 INC-01, `UpdateOwnProfileUseCase` (implementado, change `enable-self-profile-management`) |
| `identity.password.change-own` | ✓ | ✓ | ✓ | plano 08, `ChangePasswordUseCase` (implementado, sem restrição de papel) |
| `identity.accounts.toggle-status` | ✓ | ✓ | — | plano 08, `ToggleAccountStatusUseCase` (implementado); invariante contextual "ADMIN não gerencia OWNER" permanece no domínio de Identity, não neste catálogo |
| `identity.accounts.reset-password` | ✓ | ✓ | — | plano 08, `AdminResetPasswordUseCase` (implementado); mesma invariante contextual acima |
| `participants.betting-agents.create` | ✓ | ✓ | — | plano 01 INC-01, `CreateBettingAgent` (`READY_FOR_SPEC`, spec `betting-agent-catalog`; change `implement-participant-registration-mvp`, reconciliada nesta revisão para consumir `hasPermission`) |
| `participants.betting-agents.list` | ✓ | ✓ | — | plano 01 INC-01, `ListBettingAgents` (idem) |
| `participants.betting-agents.read` | ✓ | ✓ | — | plano 01 INC-01, `GetBettingAgent` (idem) |
| `access-control.role-permissions.read` | ✓ | ✓ | — | esta própria change — autoriza `GET /api/access-control/role-permissions`; sem esta chave, o endpoint da matriz seria a única rota autorizada por papel bruto, violando D4 |

`OWNER` está marcado explicitamente em todas as linhas (não apenas implícito) — a implementação, porém, pode continuar tratando `OWNER` como autoridade máxima incondicional (curto-circuito antes de consultar o mapa), desde que o resultado observável seja idêntico a esta tabela.

**Consumidores desta tabela por change:** as 6 chaves `identity.*` (5) e `access-control.*` (1) são aplicadas dentro desta própria change (`establish-authoritative-role-permissions`), nos casos de uso já existentes em Identity e no próprio controller de Access Control. As 3 chaves `participants.*` são aplicadas na change `implement-participant-registration-mvp` (ainda não implementada), que foi atualizada nesta revisão para consumir `hasPermission` em vez de checagem de papel bruto — ver "Dependência cruzada" no `proposal.md` daquela change. Nenhuma das 9 chaves fica sem um consumidor real: isso é o que torna `hasPermission` a fonte única de fato, não apenas declarada.

Ações **não incluídas** nesta fase, por não terem spec detalhada aprovada (ficam fora, não "implícitas"): criação/listagem/edição de contas de terceiros por OWNER/ADMIN (plano 08 INC-02/INC-03, `DISCOVERY`); ativação/inativação e edição de perfil de `BettingAgent` (plano 01 INC-02, `DISCOVERY`); histórico de remuneração (plano 01 INC-03, `DISCOVERY`).

## Decisions

### D1 — Bounded context próprio (`Access Control`), não dentro de Identity
O catálogo vive em `modules/access-control`, com ciclo de vida distinto de conta/sessão.
- **Alternativa rejeitada:** embutir o catálogo dentro de Identity — acoplaria a evolução do catálogo (que cresce a cada capacidade do roadmap) à evolução de conta/sessão.

### D2 — `PermissionKey` como união literal TypeScript; validação de fronteira separada da checagem de autorização
`PermissionKey` é definida como união literal fechada (`type PermissionKey = 'identity.profile.read-own' | ... | 'access-control.role-permissions.read'`), garantindo erro de compilação para chave desconhecida em qualquer chamador interno tipado. Duas funções distintas, com responsabilidades que não se sobrepõem:
- `parsePermissionKey(value: unknown): Result<PermissionKey>` — função de fronteira, usada apenas onde a chave chega como string não tipada (log, teste, futura extensão dinâmica); falha com erro de configuração dedicado (`ACCESS_CONTROL.UNKNOWN_PERMISSION_KEY`) para qualquer valor fora do conjunto fechado.
- `hasPermission(actorRole: AccountRoleType, permissionKey: PermissionKey): boolean` — função **total** e pura sobre o domínio já tipado: como `PermissionKey` só pode assumir os valores do conjunto fechado (garantido em tempo de compilação para qualquer chamador interno), esta função nunca lança e nunca recebe uma chave "desconhecida" — ela apenas consulta `RolePermissionMap` e retorna `true`/`false`.

Nenhum caso de uso interno chama `parsePermissionKey`: todos referenciam a `PermissionKey` como literal de código (ex.: `'identity.accounts.toggle-status'`), verificado pelo compilador. `parsePermissionKey` existe só para a fronteira onde não há esse tipo estático.
- **Alternativa rejeitada (da v1 desta proposta):** `PermissionKey` como VO de string livre validado apenas por formato (`capacidade.recurso.acao`) — aceitava chaves bem formadas porém inexistentes.
- **Alternativa rejeitada (da v2 desta proposta):** fazer `hasPermission` lançar para chave desconhecida — misturava, na mesma função, uma checagem de fronteira (parsing) com uma decisão de autorização (função total sobre tipo já validado), tornando `hasPermission` parcial sem necessidade.

### D3 — `RolePermissionMap` e `PermissionCatalog` são políticas de domínio imutáveis, não agregados
Nenhum dos dois possui identidade, ciclo de vida, mutação ou fronteira transacional — são constantes de configuração definidas em código e uma função pura de consulta sobre elas. Tratá-los como "agregado" (como a v1 desta proposta fazia) enfraquece a linguagem DDD do projeto. São modelados como **política de domínio** (`RolePermissionMap`) e **catálogo de configuração** (`PermissionCatalog`), ambos sem estado mutável.
- **Alternativa rejeitada:** chamá-los de agregados — não possuem identidade nem invariante transacional própria; qualquer "agregado" aqui seria apenas um rótulo, não uma modelagem real.

### D4 — Porta única de checagem substitui, sem exceção, toda checagem de papel bruto que decide "papel × ação"
`hasPermission(actorRole: AccountRoleType, permissionKey: PermissionKey): boolean` (função total, ver D2) é a **única** fonte de decisão sobre "este papel autoriza esta ação", em **todo** consumidor que hoje faz checagem de papel bruto equivalente a uma das 9 `PermissionKey`s da tabela normativa — sem exceção para o próprio endpoint de leitura da matriz (ver D6) e sem exceção entre changes (ver D8, sobre `implement-participant-registration-mvp`). Casos de uso que hoje fazem `if (actorRole !== 'OWNER' && actorRole !== 'ADMIN') FORBIDDEN` substituem essa linha pela consulta à porta — não mantêm as duas checagens em paralelo. Invariantes contextuais que não são "papel autoriza ação genérica" (ex.: `ADMIN` nunca gerencia `OWNER`, autoproteção `actorId !== targetId`, isolamento `target.bancaId === actor.bancaId`) permanecem como validações explícitas no próprio caso de uso/domínio de origem, executadas **depois** da checagem de permissão — o catálogo não tenta representá-las como permissões de papel, pois não são "o papel X pode fazer Y", são regras sobre a relação entre ator e alvo.
- **Alternativa rejeitada (da v1 desta proposta):** manter a checagem de papel bruto e "adicionar" a checagem de permissão além dela — produzia duas fontes de autoridade sem definição de qual prevalece.
- **Alternativa rejeitada (da v2 desta proposta):** abrir uma exceção para o endpoint da própria matriz e para `AdminResetPasswordUseCase`, sob a justificativa de evitar "o catálogo checar acesso a si mesmo" — a justificativa não procede: não há dependência circular em consultar `hasPermission` a partir do controller de Access Control (é uma chamada direta dentro do mesmo processo, não uma requisição HTTP recursiva); a exceção foi removida e substituída pela chave `access-control.role-permissions.read` (D6) e pela migração de `AdminResetPasswordUseCase` (D9).

### D5 — Escopo do catálogo restrito a ações com spec aprovada (resolve D44 do plano 09 apenas neste recorte)
Ver tabela normativa acima. Todas as 9 `PermissionKey`s correspondem a casos de uso já implementados ou com spec `READY_FOR_SPEC`/aprovada — nenhuma é inventada para capacidades ainda em `DISCOVERY`.
- **Nota:** isso não fecha a decisão D44 original do plano 09 (que pergunta sobre o catálogo "completo" incluindo capacidades futuras); resolve apenas o subconjunto necessário e já decidível para este change avançar. Capacidades futuras registram suas próprias `PermissionKey`s quando suas specs avançarem, seguindo o mesmo formato desta tabela.

### D6 — Dois contratos de leitura: apenas a matriz administrativa usa `hasPermission`; `/me` usa somente autenticação
- `GET /api/access-control/role-permissions` — matriz completa papel × permissão, autorizada via `hasPermission(actorRole, 'access-control.role-permissions.read')` (chave concedida a `OWNER`/`ADMIN` na tabela normativa). Não há dependência circular em consultar a própria porta de permissão a partir do controller de Access Control: é uma chamada de função direta, no mesmo processo, não uma requisição HTTP recursiva — a justificativa da v1 desta proposta (evitar o catálogo "checar acesso a si mesmo") não procedia e foi removida.
- `GET /api/access-control/me/permissions` — protegido apenas por `JwtCookieAuthGuard` (autenticação), **sem** checagem de `hasPermission`: retorna as permissões efetivas do próprio ator autenticado (calculadas a partir do `RolePermissionMap` para o `actorRole` do `AuthContext`), disponível a qualquer papel autenticado. Não requer nem consulta uma `PermissionKey` própria — exigir uma permissão prévia para consultar "quais são minhas próprias permissões" seria circular (o ator precisaria já saber que tem a permissão de consultar suas permissões). Este é o único ponto de leitura do catálogo que não passa por `hasPermission`, por design, não por exceção.
- **Alternativa rejeitada (da v1 desta proposta):** um único endpoint de matriz completa aberto a qualquer autenticado — contradizia a exigência (plano 09, Atores e permissões) de que `USER` veja somente suas próprias permissões efetivas, não a matriz de outros papéis.
- **Alternativa rejeitada (da v2 desta proposta):** autorizar `role-permissions` com checagem de papel bruto no controller, por não haver, segundo a justificativa anterior, uma `PermissionKey` "neutra" para isso — corrigido adicionando `access-control.role-permissions.read` à tabela normativa (D5), eliminando a única exceção que restava à fonte única de autorização.

### D7 — Direção de dependência entre Identity e Access Control, sem ciclo; `PermissionChecker` como porta injetada (revisado)
`AccountRoleType` (união literal `'OWNER'|'ADMIN'|'USER'`, sem lógica) migra de `modules/identity/src/user-account/vo/account-role.vo.ts` para `packages/shared`. A partir disso, `modules/access-control` depende apenas de `@bancaflow/shared` — **zero dependência de `modules/identity`**. O `AccountRole` (VO com validação/normalização) permanece em `modules/identity`, apenas reexportando/usando o tipo compartilhado como seu tipo de valor interno.

**Revisão desta decisão (terceira rodada de revisão):** a v3 desta change fazia cada caso de uso de Identity importar a função `hasPermission` diretamente de `@bancaflow/access-control`. Uma revisão apontou que isso não segue o padrão local de portas injetadas (`Clock`, `SessionRepository`, `PasswordCryptoProvider` — todos interfaces definidas em `modules/identity/src/shared/ports/`, injetadas via construtor, implementadas por adapters no composition root) e dificulta substituição em teste. Corrigido: `modules/identity/src/shared/ports/permission-checker.port.ts` define

```ts
export interface PermissionChecker {
  hasPermission(actorRole: AccountRoleType, permissionKey: PermissionKey): boolean;
}
```

(`PermissionKey` importado como tipo de `@bancaflow/access-control` — não fecha ciclo, pois Access Control segue sem depender de Identity). Todos os 5 casos de uso que consultam permissão (`ToggleAccountStatusUseCase`, `AdminResetPasswordUseCase`, `GetAuthenticatedUserContextUseCase`, `UpdateOwnProfileUseCase`, `ChangePasswordUseCase`) recebem `permissions: PermissionChecker` no construtor. O composition root (`apps/backend/src/modules/identity/adapters/access-control-permission-checker.adapter.ts`) implementa a porta delegando para `hasPermission` de `@bancaflow/access-control`, e é o único ponto do backend que importa a função diretamente.

```text
depois (sem ciclo, porta injetada):
  packages/shared ──exports AccountRoleType──▶ modules/access-control (exporta hasPermission, PermissionKey)
         │                                            ▲
         │                                            │ implementa
         └──consumed by──▶ modules/identity            │
                 (define PermissionChecker) ◀───AccessControlPermissionChecker (apps/backend, composition root)
```
- **Alternativa rejeitada (v3):** casos de uso de Identity importando `hasPermission` diretamente — funciona e não fecha ciclo, mas não segue o padrão local de porta injetada e acopla os casos de uso à implementação concreta de Access Control, dificultando substituição em teste.
- **Alternativa rejeitada:** manter `AccountRoleType` em Identity e fazer Access Control importá-lo diretamente — fecharia o ciclo assim que Identity também passasse a depender de Access Control.

### D8 — Reconciliação cross-change: Participants consome `hasPermission`, com dependência de ordem explícita
As 3 `PermissionKey`s `participants.betting-agents.create|list|read` são aplicadas em `implement-participant-registration-mvp` (change separada, ainda não implementada — todas as tasks seguem `[ ]`). Nesta revisão, `proposal.md`, `design.md` e `tasks.md` daquela change foram atualizados para que `CreateBettingAgent`, `ListBettingAgents` e `GetBettingAgent` autorizem via `hasPermission`, não mais por checagem de papel bruto embutida no caso de uso. Como as duas changes são independentes no OpenSpec (nenhuma expressa `dependsOn` a outra formalmente), a dependência de ordem é registrada como texto explícito nos dois artefatos: `implement-participant-registration-mvp` só pode ter suas tasks de autorização (2.4.2–2.4.4, 3.2.4) implementadas depois que `modules/access-control` existir com essas 3 chaves mapeadas.
- **Alternativa rejeitada:** deixar a change de Participants inalterada e apenas declarar nesta change que "o catálogo será consumido futuramente" — isso manteria uma checagem de papel bruto real no código-fonte, violando D4 assim que a change de Participants fosse aplicada isoladamente.

### D9 — `AdminResetPasswordUseCase` migra para `hasPermission`, junto com `ToggleAccountStatusUseCase`
`AdminResetPasswordUseCase` (Identity, implementado) possui hoje a mesma checagem de papel bruto (`actorRole !== 'OWNER' && actorRole !== 'ADMIN' → FORBIDDEN`) e a mesma invariante contextual (`ADMIN` não reseta senha de `OWNER`) que `ToggleAccountStatusUseCase`. Como `identity.accounts.reset-password` já está na tabela normativa (D5), deixar esse caso de uso com checagem bruta seria uma segunda violação de D4 no mesmo módulo. Migra-se pelo mesmo padrão: `hasPermission(actorRole, 'identity.accounts.reset-password')` substitui a checagem de papel; a invariante contextual permanece como validação separada, após a checagem de permissão.
- **Alternativa rejeitada:** migrar apenas `ToggleAccountStatusUseCase` e declarar `AdminResetPasswordUseCase` como "migração futura" — deixaria uma `PermissionKey` já catalogada (`identity.accounts.reset-password`) sem nenhum consumidor real nesta change, contradizendo a própria tabela normativa.

### D10 — DTOs de leitura carregam metadados de apresentação, não apenas chaves técnicas
Cada entrada de permissão nos dois DTOs de leitura inclui `key` (a `PermissionKey`), `label` (rótulo curto em português para exibição, ex.: "Ativar/desativar conta"), `description` (frase curta explicando a ação) e `order` (inteiro, ordenação estável dentro da capacidade), além do agrupamento por `capability` (`identity`, `participants`, `access-control`) com seu próprio `label`/`order`. Isso evita que o Web precise inventar apresentação ou exibir chaves cruas (`identity.accounts.toggle-status`) na tela `/configuracoes → Perfis de Acesso`.

Forma de `GET /api/access-control/role-permissions`:
```json
{
  "capabilities": [
    {
      "capability": "identity",
      "label": "Identidade e conta",
      "order": 1,
      "permissions": [
        {
          "key": "identity.profile.read-own",
          "label": "Consultar o próprio perfil",
          "description": "Ver nome, e-mail e papel da própria conta",
          "order": 1,
          "roles": ["OWNER", "ADMIN", "USER"]
        }
      ]
    }
  ]
}
```

Forma de `GET /api/access-control/me/permissions`:
```json
{
  "role": "ADMIN",
  "permissions": [
    { "key": "identity.profile.read-own", "label": "Consultar o próprio perfil" }
  ]
}
```
- **Alternativa rejeitada (da v2 desta proposta):** retornar apenas `{ key, roles }`/`{ role, permissions: string[] }` — obrigaria o Web a manter seu próprio dicionário de rótulos, divergente do backend, ou exibir chaves técnicas cruas ao usuário final.

### D11 — Catálogo com fonte primária única (`as const`), não três listas paralelas (revisado)
A v3 mantinha `PermissionKey` (união literal), `PERMISSION_KEYS` (array) e `PERMISSION_CATALOG` (dados de apresentação) como três declarações independentes — o TypeScript impedia referenciar uma chave inválida em código novo, mas nada garantia que as três listas fossem idênticas entre si; uma quarta revisão apontou o risco real de uma chave nova compilar em `PermissionKey` sem aparecer no catálogo/mapa. Corrigido: `PERMISSION_CATALOG` (em `permission-catalog.ts`) passa a ser a única fonte, declarada `as const`; `PermissionKey` e `PERMISSION_KEYS` (em `permission-key.ts`) são **derivados** dela via indexação de tipo (`(typeof PERMISSION_CATALOG)[number]['permissions'][number]['key']`) e `flatMap` em runtime — uma chave só existe se estiver cadastrada no catálogo. Um teste de integridade (`test/catalog-integrity.spec.ts`) verifica adicionalmente: ausência de duplicatas, que `PERMISSION_KEYS` bate exatamente com as chaves do catálogo, que `RolePermissionMap` não referencia chave fora do catálogo, e que toda chave do catálogo é autorizada para pelo menos um papel (sem permissão órfã).
- **Alternativa rejeitada (v3):** manter as três declarações e confiar apenas na revisão humana para mantê-las sincronizadas — é exatamente o tipo de divergência silenciosa que este catálogo existe para eliminar.

### D12 — As três permissões de autoatendimento ganham enforcement real (revisado)
`identity.profile.read-own`, `identity.profile.update-own` e `identity.password.change-own` estavam na tabela normativa desde a v1, mas nenhum caso de uso as consultava — uma quinta revisão apontou que isso violava o próprio critério desta change ("nenhuma das chaves fica sem consumidor real"). Corrigido: `GetAuthenticatedUserContextUseCase`, `UpdateOwnProfileUseCase` e `ChangePasswordUseCase` passam a consultar `hasPermission` (via a porta `PermissionChecker`, D7) para suas respectivas chaves. Como as três são concedidas a `OWNER`, `ADMIN` e `USER` igualmente, nenhum comportamento observável muda para usuários finais — o valor da mudança é arquitetural: a tabela normativa deixa de conter promessas sem correspondência em código.
- `GetAuthenticatedUserContextUseCase`/`UpdateOwnProfileUseCase` ganham `actorRole: AccountRoleType` no input (antes ausente, pois eram operações puramente "sobre si mesmo" sem checagem de papel); `ChangePasswordUseCase` deriva o papel da própria conta já carregada (`account.role.value`), sem exigir um campo novo no input, já que a senha só pode ser trocada pelo próprio titular autenticado.
- **Alternativa rejeitada:** remover as três chaves do catálogo por não terem enforcement — descartada porque as ações são reais (perfil e senha do próprio usuário existem e são usadas em produção); a chave estar sem consumidor era o defeito, não a chave em si.

## Risks / Trade-offs

- **[Risco] Migrar `AccountRoleType` para `packages/shared` toca um tipo usado em múltiplos casos de uso de Identity** → Mitigação: é apenas um alias de tipo (`'OWNER'|'ADMIN'|'USER'`), sem lógica; a migração é um `export type` movido + atualização de imports, sem mudança de comportamento; `AccountRole` (VO) continua em Identity.
- **[Risco] Catálogo cobre só 8 ações, podendo parecer limitado** → Mitigação aceita conscientemente: é exatamente a superfície com spec aprovada hoje; capacidades futuras adicionam suas próprias chaves seguindo o mesmo formato, sem inventar granularidade de capacidades em `DISCOVERY`.
- **[Trade-off] Sem tabela Prisma, qualquer mudança no catálogo exige deploy** → Aceito nesta fase: não há necessidade de edição em runtime enquanto não existir UI de administração de permissões (fora de escopo).
- **[Trade-off] Nenhum controle real do Web é gateado por permissão nesta fase além da própria tela de Perfis de Acesso** → Aceito e registrado explicitamente (ver Non-Goals): criar um controle apenas para demonstrar ocultação seria decorativo; a próxima capacidade a expor uma ação administrativa real no Web (plano 08 INC-02/INC-03) deve consumir `GET /api/access-control/me/permissions` para isso.

## Migration Plan

Sem migração de banco. Passos de implementação:
1. Mover `AccountRoleType` de `modules/identity` para `packages/shared`; atualizar imports em Identity (VO, casos de uso existentes) sem mudar comportamento.
2. Criar módulo `access-control` (domínio: `PermissionKey`, `PermissionCatalog`, `RolePermissionMap`, porta `hasPermission`), dependendo apenas de `@bancaflow/shared`.
3. Expor `GET /api/access-control/role-permissions` (OWNER/ADMIN) e `GET /api/access-control/me/permissions` (qualquer autenticado).
4. Modificar `ToggleAccountStatusUseCase` para substituir a checagem de papel bruto pela consulta a `hasPermission`, preservando a invariante contextual "ADMIN não gerencia OWNER" como validação separada, após a checagem de permissão.
5. Substituir `apps/web/src/modules/configuracoes/lib/permissions.ts` pela integração real com `GET /api/access-control/role-permissions`.
6. Sem rollback de dados necessário — reversão é apenas reverter o deploy (catálogo é código-fonte).

## Open Questions

- Quando plano 08 INC-02/INC-03 e plano 01 INC-02/INC-03 avançarem para `READY_FOR_SPEC`, suas specs deverão adicionar as `PermissionKey`s correspondentes a esta tabela normativa, seguindo o mesmo formato (chave, papéis autorizados, origem). Não bloqueia esta change.
- A pergunta mais ampla da decisão D44 do plano 09 (catálogo cobrindo todas as capacidades do roadmap mestre) permanece aberta e deve ser revisitada a cada nova capacidade que avançar.
