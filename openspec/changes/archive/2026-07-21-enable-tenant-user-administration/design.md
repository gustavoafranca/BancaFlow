## Context

O plano `.docs/plans/foundation/08-identity-profile-and-tenant-user-administration.md` deixou INC-02 (provisionamento de contas adicionais) e INC-03 (ciclo de vida/troca de papel) em `DISCOVERY`, sem detalhamento suficiente para gerar spec. O plano `09-authoritative-access-control.md` entregou o catálogo fechado de `PermissionKey` e a matriz fixa (`establish-authoritative-role-permissions`, arquivada), mas registrou D44 ("cobertura ampla") como `OPEN` justamente para as capacidades de administração de conta que esta change introduz.

Toda a infraestrutura de dados necessária já existe: `UserAccount` (username, name, email opcional, role, status, passwordHash, mustChangePassword, version) e `Session` (entidade separada, já com listagem/revogação — hoje só para a própria conta). Não há agregado persistido em `access-control`; o catálogo e a matriz são constantes de código.

Esta change consolida INC-02+INC-03 em uma única primeira versão, porque a decisão de escopo já aprovada (`.docs/prompts/19-enable-tenant-user-access-management.md`) pede administração completa por status (sem exclusão física) em um único incremento, e restringe explicitamente toda administração de conta e o acesso a Configurações a `OWNER` — divergindo da decisão D32 do plano 08 (que previa `ADMIN` criando/gerenciando `ADMIN`/`USER`) e do que `establish-authoritative-role-permissions` havia concedido a `ADMIN` (`identity.accounts.toggle-status`, `identity.accounts.reset-password`, `access-control.role-permissions.read`).

## Goals / Non-Goals

**Goals:**
- OWNER administra o ciclo de vida completo (por status) das contas `ADMIN`/`USER` da própria banca: listar, visualizar, criar, editar, trocar papel, ativar/bloquear/desbloquear, redefinir senha temporária, consultar/revogar sessões de terceiro.
- Fechar a divergência de contrato registrada em `user-account-management` ("contas nascem exclusivamente via `ProvisionBanca`"), sem alterar o ciclo de vida do `OWNER` inicial.
- Ampliar o catálogo fechado de `PermissionKey` apenas com chaves efetivamente aplicadas por um endpoint/uso real, e restringir a `OWNER` toda permissão de administração de conta e a leitura da matriz.
- Unificar logout (navbar + sidebar) em um modal único, com estado compartilhado pelo shell.
- Zero alteração de schema/migração Prisma.

**Non-Goals:**
- Perfis de acesso customizados, permissões individuais por usuário, CRUD de chaves de permissão, persistência de permissões em JSON/texto.
- Múltiplos `OWNER`, transferência de titularidade, exclusão física de conta.
- `ADMIN` administrar contas ou acessar Configurações nesta versão (fica registrado como possível evolução futura, não decidida aqui).
- Auditoria estruturada de ações administrativas (risco já registrado no plano 08, permanece adiado).
- Implementação do módulo de Caixa, SSO, MFA, recuperação de senha por e-mail, redesign geral do shell.
- Alterar o schema Prisma do módulo `participants`/`betting-agents` ou implementar `implement-participant-registration-mvp` — apenas a matriz de permissões que essa change consumirá é atualizada aqui.

## Decisions

### D1 — Consolidar INC-02+INC-03 em uma única capability `tenant-user-administration`
O plano 08 havia desenhado `tenant-user-provisioning` (INC-02) e `tenant-user-lifecycle-management` (INC-03) como capabilities separadas e sequenciais. A decisão de escopo aprovada para esta change pede uma única primeira versão entregando provisionamento e ciclo de vida juntos. Alternativa considerada: manter duas capabilities separadas espelhando o plano — rejeitada porque fragmentaria uma mesma tela/fluxo de Configurações em duas changes sem necessidade, cada `UserAccount` já suporta as duas frentes com os mesmos campos, e o prompt de negócio já aprovou o escopo combinado.

### D2 — Restringir administração de conta e leitura da matriz a `OWNER`, removendo `ADMIN`
`establish-authoritative-role-permissions` concedeu `identity.accounts.toggle-status`, `identity.accounts.reset-password` e `access-control.role-permissions.read` também a `ADMIN`. A decisão de escopo desta change é explícita: `ADMIN` não administra usuários nem permissões, e apenas `OWNER` acessa Configurações. Isso é tratado como mudança de contrato deliberada (**BREAKING**), não como bug a corrigir silenciosamente — diverge da D32 do plano 08. Alternativa considerada: manter `ADMIN` com as duas permissões existentes e só adicionar as novas chaves como `OWNER`-only — rejeitada porque criaria uma matriz inconsistente (parte da administração de conta seria de `ADMIN`, parte não) e contradiria a frase explícita do prompt "`ADMIN`: (...) não administra usuários nem permissões".

### D3 — Sete novas `PermissionKey`s, todas `OWNER`-only; duas chaves existentes restringidas
Novas chaves: `identity.accounts.list`, `identity.accounts.read`, `identity.accounts.create`, `identity.accounts.update`, `identity.accounts.change-role`, `identity.accounts.sessions.read`, `identity.accounts.sessions.revoke`. Reaproveitadas com escopo restrito: `identity.accounts.toggle-status`, `identity.accounts.reset-password` (agora só `OWNER`) e `access-control.role-permissions.read` (agora só `OWNER`). Nenhuma chave nova é desconectada de um endpoint real — cada uma corresponde a exatamente um endpoint desta change. `participants.betting-agents.create` continua `OWNER`/`ADMIN`; `.list`/`.read` passam a incluir `USER` (reconciliação pedida explicitamente pelo prompt, sem tocar `.create`).

### D4 — Recurso HTTP `/api/accounts` para a administração nova; o reset de senha administrativo mantém seu contrato atual
Endpoints novos, todos com `bancaId` extraído do `AuthContext` (nunca do body/query), usando `:accountId` na rota:
- `GET /api/accounts` (`identity.accounts.list`) — paginação, busca, filtro por `role`/`status`.
- `GET /api/accounts/:accountId` (`identity.accounts.read`).
- `POST /api/accounts` (`identity.accounts.create`) — autorizado por um novo `AdminCreateUserAccountUseCase`, que valida `identity.accounts.create`, usa `bancaId`/`actorUserId` do `AuthContext`, aceita somente `role: 'ADMIN'|'USER'`, gera a senha temporária via `TemporaryPasswordGenerator` já existente, **delega a criação em si** ao `CreateUserAccountUseCase` já existente (sem duplicar suas validações), define `mustChangePassword = true` e devolve a senha temporária somente na resposta desta chamada. `CreateUserAccountUseCase` continua sem qualquer noção de "quem pediu a criação" — a autorização administrativa vive inteiramente no wrapper novo, nunca dentro do caso de uso consumido também por `ProvisionBanca`.
- `PATCH /api/accounts/:accountId` (`identity.accounts.update`) — username/name/email de terceiro, com `expectedVersion` (CAS), no mesmo padrão de `UpdateOwnProfileUseCase`.
- `PATCH /api/accounts/:accountId/role` (`identity.accounts.change-role`) — transições somente `ADMIN⇄USER`.
- `GET /api/accounts/:accountId/sessions` (`identity.accounts.sessions.read`) e `DELETE /api/accounts/:accountId/sessions/:sessionId` (`identity.accounts.sessions.revoke`) — primeira vez que sessão de terceiro é consultada/revogada de forma dedicada (hoje só existe como efeito colateral de `toggle-status`/`reset-password`).

Dois endpoints **já existentes** permanecem no lugar e no formato atuais, apenas com a permissão restrita a `OWNER` (D2/D3) e passando a aplicar a política de alvo (D8):
- `PATCH /api/accounts/:accountId/status` (`identity.accounts.toggle-status`) — já usa `:accountId` na rota; nenhuma mudança de contrato.
- `PATCH /api/auth/admin/reset-password` (`identity.accounts.reset-password`) — continua recebendo `targetUserId` no corpo, exatamente como hoje. Não é renomeado nem movido para `/api/accounts`: reaproveitar um endpoint que já funciona é preferível a uma quebra de contrato sem necessidade real, e nada nesta change exige uniformidade de formato entre todos os endpoints administrativos.

Alternativa considerada: mover `reset-password` para `PATCH /api/accounts/:accountId/password`, unificando o formato com os demais — rejeitada porque quebraria um contrato existente sem ganho funcional; a orientação geral do prompt de negócio é reaproveitar o que já existe, não uniformizar por uniformidade.

### D5 — Nova query CQRS para listagem, sem tocar o repository de escrita
`UserAccountRepository` (contrato de escrita: `findById`, `findByBancaAndUsername`, `save`) não ganha `findAll`/paginação. Em vez disso, cria-se `ListUserAccountsQuery` (porta de leitura, seguindo o padrão CQRS já usado no projeto — `module-query-cqrs`), implementada por um novo adapter Prisma que faz `findMany`/`count` direto sobre a tabela `user_accounts` existente (nenhum campo novo, nenhuma migração). Reaproveita `PaginatedInputDTO`/`PaginatedResultDTO`/`PaginationMetaDTO` de `@bancaflow/shared`, hoje já usados por outro módulo, mas ainda não por Identity.

O filtro `role IN ('ADMIN','USER')` (excluindo `OWNER` da listagem) SHALL fazer parte do `WHERE` da própria query — avaliado pelo banco antes de `count`, `skip` e `take` — nunca um filtro aplicado depois da paginação no caso de uso ou no DTO. Excluir o `OWNER` só depois de paginar corromperia `total`/`totalPages` (contaria uma linha que nunca aparece na página) e poderia produzir páginas com menos itens do que o `pageSize` pedido, ou uma página vazia quando o `OWNER` fosse a única linha da página seguinte.

### D6 — Duas novas transições no agregado `UserAccount`, seguindo o padrão `rebuild` existente
- `changeRole(newRole: AccountRole): Result<UserAccount>` — rejeita se o papel atual é `OWNER` ou se `newRole` é `OWNER` (nenhuma direção passa por `OWNER`); implementado via `rebuild` (spread raso + `tryCreate`), nunca via `Entity.cloneWith`/`clone` da base (que usa `deepMerge` e pode corromper campos `Date` como `passwordChangedAt`/`lockedUntil`).
- `renameUsername(newUsername: Username): Result<UserAccount>` — troca de `username` de terceiro (nunca do próprio ator, que continua sem esse campo no autosserviço); unicidade verificada no caso de uso via `findByBancaAndUsername`, igual ao fluxo de criação.

Ambos os métodos seguem exatamente o padrão já documentado em `modules/identity/README.md` para `rename`/`updateEmail`.

### D7 — Revogação de sessão por troca de papel; sem revogação por troca de username
Troca de papel altera a claim `role` do JWT — por isso `ChangeAccountRoleUseCase` revoga todas as sessões do alvo na mesma transação (`runInTransactionResult`), no mesmo padrão de `ToggleAccountStatusUseCase`/`AdminResetPasswordUseCase`. Troca de `username` **não** revoga sessão, pois `username` não é claim do token — consistente com a decisão já registrada no plano 08 (D40).

### D8 — Política de alvo única, sem duplicar a checagem de papel já feita pela PermissionChecker
A autorização por papel é decidida uma única vez: o controller/caso de uso consulta `hasPermission(actorRole, <PermissionKey do endpoint>)` via a porta `PermissionChecker` já existente. Nenhum caso de uso administrativo SHALL reverificar `actorRole === 'OWNER'` depois disso — isso duplicaria a fonte de autorização e contrariaria `authoritative-permission-catalog` ("`hasPermission` é a única fonte de decisões de autorização por papel").

O que sobra depois da checagem de permissão é uma relação ator↔alvo que não é representável como `PermissionKey` (ver `authoritative-permission-catalog`, "invariantes contextuais não são modeladas como permissão"). Essa parte é extraída para uma política única, `assertAdministrableTarget(actorUserId: string, target: UserAccount): Result<void>`, chamada **depois** que o alvo já foi resolvido via `UserAccountRepository.findById(accountId, bancaId-do-ator)` — a própria busca escopada por `bancaId` já resolve o isolamento de tenant; ausência de linha SHALL ser tratada com o código já existente `IDENTITY_ERRORS.ACCOUNT_NOT_FOUND` (mapeado para `404`, D11), nunca um código genérico novo, e não é responsabilidade deste helper. O helper valida apenas duas coisas sobre o alvo já resolvido: (1) `target.id !== actorUserId` — o ator não administra a própria conta por este painel; (2) `target.role !== 'OWNER'` — ninguém administra `OWNER` por este painel. Todo controller administrativo SHALL extrair `actorUserId` do `AuthContext` (nunca do body/rota) e passá-lo ao caso de uso para que esse helper possa ser aplicado — inclusive os dois controllers **já existentes** (`toggle-status`, `admin/reset-password`), cuja assinatura de caso de uso muda para receber `actorUserId`.

Reutilizado por todos os casos de uso administrativos que operam sobre uma conta-alvo específica, novos e existentes (`get`/`update`/`change-role`/`toggle-status`/`reset-password`/sessões de terceiro, e o `AdminCreateUserAccountUseCase` sobre a conta recém-criada, se aplicável). **Não se aplica a `ListUserAccountsUseCase`**, que não possui alvo — ele só verifica a permissão (`identity.accounts.list`) e consulta a `ListUserAccountsQuery` já escopada por `bancaId`. Alternativa considerada: repetir a checagem de papel e de alvo em cada caso de uso (padrão atual de `toggle-status`/`reset-password`) — rejeitada porque (a) adicionar vários casos de uso com a mesma regra duplicada aumenta o risco de um deles divergir silenciosamente, e (b) revalidar o papel do ator fora da `PermissionChecker` duplicaria a fonte de autorização sem necessidade.

### D9 — Modal de logout único com estado compartilhado no shell
Novo `LogoutModalProvider` (Context React) no shell privado, expondo `openLogoutModal()`/estado, consumido por `app-navbar.tsx` e `app-sidebar.tsx` — nenhum dos dois chama `logout()`/`logoutAll()` diretamente; ambos apenas abrem o modal compartilhado. O modal reutiliza `shared/components/ui/dialog.tsx` no mesmo padrão do diálogo de "Encerrar sessão" já existente em `modules/perfil/components/security-tab.tsx` (foco inicial, `DialogClose asChild` para Cancelar, devolução de foco ao gatilho, Escape). Falha em `logout`/`logoutAll` mantém o modal aberto com erro visível e não navega; sucesso redireciona para `/login`, com limpeza de cookies feita pelo backend na própria chamada (sem lógica adicional de limpeza no cliente).

### D10 — Gate de menu e de rota por `PermissionKey`, não por papel
O item "Configurações" no dropdown da navbar deixa de ser renderizado (não apenas desabilitado) para quem não tem `identity.accounts.list` (a mais básica das novas chaves), obtida via `GET /api/access-control/me/permissions` — hoje inexistente no frontend; esta change passa a consumi-lo pela primeira vez. Isso substitui o `disabled` hardcoded atual, que mantinha o item visível: a decisão de negócio é que o item nem apareça para quem não administra contas. O backend continua autoritativo: qualquer chamada direta às rotas novas sem a permissão recebe `403` sem vazar dados, independentemente do estado do menu.

### D11 — Contrato de erro único: `403` por falta de permissão, `404` por alvo inexistente ou de outra banca
Para todo endpoint administrativo de conta (`/api/accounts/**` e `PATCH /api/auth/admin/reset-password`), o contrato de erro segue exatamente três casos, na seguinte ordem de avaliação:
1. **`403`** — o `actorRole` não possui a `PermissionKey` do endpoint (`ADMIN`/`USER` tentando qualquer operação administrativa). Decidido por `hasPermission`, antes de qualquer busca do alvo.
2. **`404`** — o `accountId`/`targetUserId` não corresponde a nenhuma linha de `UserAccount` dentro do `bancaId` do ator (conta inexistente **ou** pertencente a outra banca — os dois casos são indistinguíveis na resposta, pois a busca já é escopada por `bancaId`). O código de domínio é o já existente `IDENTITY_ERRORS.ACCOUNT_NOT_FOUND`, nunca um código genérico novo. Nunca `403` para este caso: o ator tem a permissão de operar sobre contas da própria banca, mas o alvo simplesmente não está no seu escopo.
3. **`403`** — o alvo foi encontrado dentro da própria banca do ator, mas é o próprio ator ou é `OWNER` (política de `assertAdministrableTarget`, D8). Aqui o alvo existe e foi resolvido; a rejeição é uma regra de negócio sobre um recurso conhecido, não uma questão de enumeração — por isso `403`, não `404`.

Alternativa considerada: usar `403` também para conta inexistente/de outra banca (o que a primeira versão desta change fazia, de forma inconsistente entre specs) — rejeitada porque mistura duas semânticas diferentes (falta de permissão vs. alvo fora de escopo) sob o mesmo código, dificultando tanto os testes quanto o cliente HTTP distinguir os casos.

## Risks / Trade-offs

- [Risco] Duas changes ativas tocam a mesma matriz de permissões (`implement-participant-registration-mvp`, ainda com 0/55 tasks, e esta change) → Mitigação: esta change só altera a matriz (`participants.betting-agents.list`/`.read` ganham `USER`); a spec `betting-agent-catalog` daquela change (ainda não arquivada) precisa ser alinhada antes de sua própria implementação — registrado como tarefa de coordenação em `tasks.md`, sem editar os artefatos daquela change aqui.
- [Risco] Remover permissões de `ADMIN` é uma mudança de comportamento em produção assim que o deploy ocorrer, sem migração de dados — contas `ADMIN` com sessão ativa perdem acesso às rotas afetadas na próxima requisição (a checagem é sempre por `hasPermission` a cada request, não depende de revogar sessão) → Mitigação: nenhuma ação de dado é necessária; basta comunicar a mudança de comportamento e atualizar os testes que hoje esperam `200` para `ADMIN` nesses três recursos.
- [Risco] Inconsistência entre `403` (falta de permissão) e `404` (alvo inexistente/de outra banca) se cada endpoint implementar sua própria lógica de resolução do alvo → Mitigação: contrato único (D11), com a resolução do alvo (`findById` escopado por `bancaId`) centralizada antes de qualquer checagem de `assertAdministrableTarget`.
- [Risco] Duplicar a checagem "não administra `OWNER`"/"não administra a si mesmo" em 5+ casos de uso novos aumenta o risco de um deles divergir → Mitigação: helper único de domínio (D8), coberto por teste de unidade próprio.
- [Risco] Reintroduzir `Entity.cloneWith`/`clone` da base por engano em `changeRole`/`renameUsername` corromperia campos `Date` (bug conhecido do `deepMerge` genérico) → Mitigação: seguir estritamente o padrão `rebuild` privado já usado por `rename`/`updateEmail`/`activate`/`block`, nunca a base.
- [Trade-off] Consolidar INC-02+INC-03 em uma única change aumenta o tamanho da entrega (mais casos de uso, mais telas) em troca de evitar duas changes sequenciais tocando a mesma tabela e o mesmo módulo em curto intervalo — aceito porque a decisão de escopo já veio aprovada dessa forma.

## Migration Plan

1. Nenhuma migration de banco. Deploy padrão do backend (Identity + Access Control) seguido do frontend.
2. Ordem de entrega recomendada (ver `tasks.md` para o detalhamento): (a) catálogo/matriz de Access Control primeiro, com testes atualizados para o novo comportamento de `ADMIN`; (b) entidade/casos de uso/repositório/query de Identity; (c) controllers HTTP; (d) frontend (gate de menu, telas de usuários, modal de logout); (e) e2e.
3. Rollback: reverter o deploy do backend restaura a matriz anterior (código-fonte puro, sem estado persistido a desfazer); reverter o frontend restaura o menu desabilitado anterior. Nenhuma migração reversa é necessária.
4. Nenhuma sessão precisa ser proativamente revogada por causa da mudança de matriz — a autorização é sempre recalculada por requisição via `hasPermission`.

## Open Questions

- Se/quando `ADMIN` deve recuperar alguma capacidade de administração de conta (ex.: reset de senha de `USER`) é uma decisão de produto explicitamente fora desta change — registrar como candidato a uma versão futura, não decidir aqui.
- A reconciliação de `participants.betting-agents.list`/`.read` para `USER` depende de `implement-participant-registration-mvp` alinhar sua própria spec/tasks antes de ser implementada; esta change não pode forçar essa outra change a se atualizar, apenas deixa a matriz pronta para quando isso ocorrer.
- Se a UI deve oferecer uma via alternativa (fora deste painel) para o próprio `OWNER` trocar o próprio `username`, hoje não coberta por nenhum fluxo de autosserviço — não decidido nesta change; permanece como está (username do próprio `OWNER` é imutável por autosserviço).
