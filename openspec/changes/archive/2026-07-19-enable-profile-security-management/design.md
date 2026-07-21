## Context

`/perfil` hoje só renderiza "Informações" (nome/e-mail, `GET`/`PATCH /api/auth/me`, entregue por `enable-self-profile-management`). A aba **Segurança** existiu no protótipo original mas foi removida por `align-profile-settings-experience` porque era 100% fabricada (`perfil.sample.ts`, 2FA que só alternava estado local, sessões/atividade de amostra) — a spec `self-profile-management` hoje proíbe explicitamente restaurar qualquer coisa construída a partir daquele arquivo de amostra.

O Backend, no entanto, já implementa e liga ao controller três casos de uso de Identity sem nenhum consumidor real no Web:

- `ListSessionsUseCase` → `GET /api/auth/sessions` — lista sessões ativas (`SessionRepository.findActiveByUser`, já filtra `revokedAt IS NULL AND expiresAt > now`).
- `RevokeSessionUseCase` → `DELETE /api/auth/sessions/:sessionId` — revoga uma sessão, validando `session.userId === user.userId` (sessão de outra banca/usuário/inexistente retorna, hoje, `SESSION_NOT_FOUND` mapeado incorretamente para `401` — ver Decisão D7 abaixo, que corrige esse mapeamento para `404` como já afirmado pela spec vigente de `session-management`).
- `ChangePasswordUseCase` → `PATCH /api/auth/password` — troca voluntária: valida `currentPassword` contra o hash, exige `newPassword` forte (`StrongPassword` do domínio), persiste, revoga as **outras** sessões (mantém a atual) e reemite o access token — tudo dentro de uma transação.

A entidade `Session` já expõe `expiresAt`/`deviceInfo`/`isRevoked()`; o `AuthContext` já carrega `sessionId` da sessão autenticada. Não falta nenhuma peça de domínio nova — falta projeção (DTO), um ajuste de mapeamento de erro, e a camada Web.

Esta change é um increment de follow-up de Identity (`PROFILE-SECURITY-01`), fora da tabela de increments INC-01/02/03 do plano 08 (que trata de perfil próprio e administração de terceiros) — trabalha inteiramente dentro de capabilities já existentes (`session-management`, `credential-management`, `self-profile-management`), sem introduzir bounded context novo.

## Goals / Non-Goals

**Goals:**
- Tornar `GET /api/auth/sessions` suficiente para o Web identificar com segurança qual sessão é "a atual", sem o browser precisar decodificar o JWT HttpOnly.
- Eliminar a ambiguidade de status/código entre "senha atual incorreta" (erro de negócio, `400`) e "sessão/token inválido" (erro de autenticação, `401`), que hoje colidem em `IDENTITY.INVALID_CREDENTIALS`/`401` e enganam o silent-refresh do Web.
- Restaurar uma aba Segurança real, sustentada integralmente por esses dois contratos, reaproveitando a validação de senha forte já existente sem duplicá-la entre `/trocar-senha` e `/perfil`.

**Non-Goals:**
- Não introduzir MFA/2FA, auditoria estruturada, geolocalização, IP ou "última atividade" — nenhum desses tem fonte autoritativa hoje.
- Não alterar o fluxo de troca **obrigatória** (`/trocar-senha`, `PATCH /api/auth/mandatory-password-change`) além de fazê-lo reaproveitar os VOs de senha extraídos.
- Não introduzir "encerrar todas as sessões" como jornada de UI (o endpoint `logoutAll()` já existe para outro propósito — logout do próprio dispositivo em massa — e não é o mesmo que revogação seletiva de sessões de terceiros a partir da lista).
- Não tocar em `/configuracoes`, INC-02/INC-03 do plano 08, nem no plano 09.

## Decisions

### D1 — Aba Segurança restaurada como aba real, não como reintrodução do protótipo
`/perfil` volta a ter **Informações** e **Segurança** (mesmo componente de abas já usado por Informações), ambas disponíveis para `OWNER`, `ADMIN` e `USER` sem distinção de papel — a spec `self-profile-management` já trata a operação de perfil próprio como independente de papel, e sessão/senha da própria conta seguem o mesmo princípio. **Atividade** não retorna: não há fonte autoritativa de log de acesso hoje (`D37` do plano 08 registra essa lacuna como risco aceito e adiado). `app/(private)/perfil/page.tsx` continua fino; a aba nova vive inteiramente em `modules/perfil` (componentes de sessão + formulário de senha), seguindo a ordem de organização de `frontend-module-workflow` (contrato/tipos → shared → módulo → rotas → testes).

- **Alternativa considerada:** reaproveitar o array `tabDefs`/lógica de `perfil.page.tsx` tal como estava antes da remoção (git history). Rejeitada como cópia mecânica — o objetivo aqui é reconstruir a aba sobre dados reais desde o primeiro commit, não restaurar código morto e depois substituir seu conteúdo.

### D2 — `isCurrent` calculado no Backend; nenhuma leitura de JWT no browser

`SessionInfoDto` ganha dois campos:

```ts
export interface SessionInfoDto {
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
  deviceInfo?: string;
}
```

`ListSessionsUseCase.execute` passa a receber `currentSessionId` (vindo de `user.sessionId` do `AuthContext`, nunca do body) além de `bancaId`/`userId`, e projeta `isCurrent: session.id === data.currentSessionId` e `expiresAt: session.expiresAt`. O controller (`IdentityController.listSessions`) passa a enviar `user.sessionId` ao caso de uso. Nenhum campo de IP, localização ou "última atividade" é adicionado — `deviceInfo` já existente (user-agent bruto) continua sendo a única informação de dispositivo, e o Web deriva dali um rótulo amigável (D3) só na camada de apresentação, nunca no Backend.

- **Alternativa considerada — Web decodifica o JWT (não-HttpOnly) para obter `sessionId`:** rejeitada; os tokens são estritamente `HttpOnly` (`route-protection-frontend`), e mesmo que não fossem, comparar client-side introduziria uma fonte de verdade paralela e frágil (o Web já teve bugs de "role antiga no token" resolvidos por sempre reler o Backend em `authenticated-user-context`). O padrão estabelecido no projeto é: claims mínimas no token, projeção de exibição sempre recalculada no Backend.
- **Alternativa considerada — endpoint dedicado só para "qual é a sessão atual":** rejeitada por fragmentar em dois contratos uma informação que já é natural de compor na mesma listagem (mesmo raciocínio de `authenticated-user-context`, Decisão 2, que rejeitou endpoint dedicado só para expor `version`).

### D3 — Rótulo de dispositivo é apresentação, não persistência

`deviceInfo` (user-agent bruto, já persistido, ex.: `Mozilla/5.0 (Windows NT 10.0; ...) Chrome/120...`) não é amigável para exibição direta. O Web deriva um rótulo curto (`"Chrome no Windows"`, `"Safari no iPhone"`, etc.) por heurística simples de string no momento de renderizar, com fallback honesto **"Dispositivo não identificado"** quando `deviceInfo` for ausente/vazio ou não reconhecido — nunca inventando um valor. Essa derivação é puramente de apresentação (função pura em `modules/perfil`, sem estado, sem chamada de rede) e não é uma nova fonte de verdade: se o parser não reconhecer o padrão, o fallback honesto prevalece, o que é preferível a uma tabela de user-agents mal mantida tentando adivinhar todos os casos.

- **Alternativa considerada — mostrar o user-agent bruto sem parsing:** rejeitada por UX (string ilegível para o usuário final), mas mantida como estratégia de fallback textual mínimo apenas se necessário durante implementação — a spec não exige um parser exaustivo, só que o fallback seja honesto quando a heurística não reconhecer o padrão.

### D4 — Revogação individual: sessão atual nunca usa o DELETE como ação comum

A lista marca a sessão com `isCurrent: true` com o rótulo **"Sessão atual"** e sem botão de ação; as demais recebem **"Encerrar sessão"**, com confirmação acessível (`Dialog` já existente em `shared/components/ui/dialog.tsx`, a inspecionar suas props reais antes de compor). Após `DELETE /api/auth/sessions/:sessionId` bem-sucedido (ou já-ausente — ver corrida abaixo), o Web refaz `GET /api/auth/sessions` (nunca remove a linha otimisticamente da lista local) antes de considerar a UI atualizada — mesmo padrão de "sempre reler o autoritativo" já estabelecido por `self-profile-management` para o próprio perfil.

- **Corrida/idempotência:** se a sessão já não existir mais no momento do refetch (ex.: expirou ou já foi revogada por outra aba), ela simplesmente não aparece mais na lista recarregada — não é tratado como erro, só como uma reconciliação natural do estado autoritativo.
- **Alternativa considerada — atualização otimista da lista local, revertendo em caso de erro:** rejeitada; introduz um estado intermediário que pode divergir do servidor (ex.: outra aba já revogou a mesma sessão) e complica o teste de corrida sem necessidade — o refetch autoritativo já é barato (mesma query já usada para a listagem inicial).
- **Fora de escopo, explicitamente:** nenhum botão "encerrar todas as sessões" é adicionado só porque `logoutAll()` existe — essa é uma jornada distinta (desconectar o próprio dispositivo atual de todos os lugares) do que "revogar sessões de terceiros vistas na lista", e não há pedido de produto para uni-las aqui.

### D5 — Código de erro dedicado para senha atual incorreta, mapeado para `400`

Hoje `ChangePasswordUseCase` retorna `IDENTITY_ERRORS.INVALID_CREDENTIALS` quando `currentPassword` não confere, e o controller mapeia esse código para `401` (`STATUS_BY_CODE`). Isso é ambíguo com **todas** as outras causas de `401` (token ausente/inválido, sessão revogada/expirada) e quebra o cliente Web: `changePassword()` usa `fetchWithRefresh`, que ao ver `401` tenta um silent refresh (que **sucede**, pois a sessão continua válida — só a senha estava errada) e repete a requisição original (com a mesma senha errada), recebendo `401` de novo — e então `redirectToLoginExpired()` é chamado, mandando o usuário para `/login?expired=1` como se a sessão tivesse expirado.

Resolução: adicionar `CURRENT_PASSWORD_INCORRECT: 'IDENTITY.CURRENT_PASSWORD_INCORRECT'` a `IDENTITY_ERRORS`. `ChangePasswordUseCase` passa a retornar esse código (em vez de `INVALID_CREDENTIALS`) quando `passwordCrypto.compare` resolve `false`. O controller mapeia esse código para `400` em `STATUS_BY_CODE`, alinhado ao que `credential-management` já afirma ("Wrong current password rejects change" → `400`) — a spec principal já descrevia o comportamento correto; o código é que divergia dela. O client Web (`changePassword()`) passa a inspecionar o código de erro autoritativo do corpo da resposta (não só o status HTTP) para diferenciar "senha atual incorreta" de qualquer outro `400`/`401`, evitando içar a decisão de UX para uma heurística frágil baseada só em status.

- **Alternativa considerada — manter `401` mas fazer o Web ignorar refresh para este endpoint específico:** rejeitada; tornaria `fetchWithRefresh` ciente de detalhes de negócio de um endpoint específico (acoplamento invertido — a spec `credential-management` já é clara que a resposta deveria ser `400`, então o ajuste correto é no Backend, não uma exceção no cliente HTTP genérico).
- **Alternativa considerada — reaproveitar `PASSWORD_TOO_WEAK` (`422`) ou criar um `400` genérico sem código específico:** rejeitada; a spec exige uma resposta "segura e não ambígua" e o padrão do projeto é sempre um código de domínio estável e distinguível (`IDENTITY.*`) mapeado para status — nunca um status "nu" sem código no corpo.
- **Risco assumido:** este é o único ajuste de contrato desta change com mudança de comportamento observável (`401` → `400`, novo código). Está listado como tal em `proposal.md` (não é uma capability nova, é correção de um código já documentado incorretamente pela spec vigente) e não afeta nenhum outro chamador — `PATCH /api/auth/password` só tem um consumidor Web hoje (`changePassword()`), atualizado nesta mesma change.

### D6 — VOs de senha compartilháveis extraídos para `shared/form/`, sem `modules/perfil` importar de `app/trocar-senha`

Hoje `StrongPasswordField`/`ConfirmPasswordField` (VOs client-safe que espelham `StrongPassword` do domínio) vivem só em `app/trocar-senha/change-password.schema.ts`. `web-frontend-boundaries` proíbe um módulo importar de dentro de uma rota de outro fluxo, e a regra de ouro de `frontend-module-workflow` é nunca duplicar regra de validação divergente entre duas telas. Resolução: extrair esses dois VOs (puramente regra de força de senha e "confirmação bate com a nova senha", sem nenhum dado específico de tela) para um novo arquivo em `apps/web/src/shared/form/` (ex.: `password-fields.ts`) — mesma pasta que já hospeda o validador genérico `v` (`shared/form/validator.ts`), e composição adequada porque a regra de força de senha é genuinamente compartilhada entre `/trocar-senha` (obrigatória) e a nova troca voluntária em `/perfil`, não um detalhe de uma tela específica.

`app/trocar-senha/change-password.schema.ts` passa a importar `StrongPasswordField`/`ConfirmPasswordField` de `shared/form/password-fields.ts` em vez de defini-los localmente (sem mudança de comportamento). Um novo `modules/perfil/data/security-password.schema.ts` compõe os mesmos VOs compartilhados com um `CurrentPasswordField` local (exige apenas não-vazio, já que a validação de "senha atual correta" é sempre autoritativa do Backend) e o campo adicional `currentPassword`, formando o schema de troca voluntária (`currentPassword` + `newPassword` + `confirmPassword`, refinamento de igualdade `newPassword === confirmPassword`).

- **Alternativa considerada — `modules/perfil` importa diretamente de `app/trocar-senha`:** rejeitada explicitamente pela missão desta change (D5 do prompt) e pela direção de dependências do projeto (`app/** ` pode importar de `modules/*`/`shared/`, nunca o inverso, e módulos não importam de dentro de rotas de outro fluxo).
- **Alternativa considerada — duplicar `StrongPasswordField`/`ConfirmPasswordField` dentro de `modules/perfil`:** rejeitada; cria exatamente a cópia divergente que a missão pede para evitar (duas fontes da mesma regra de força de senha no Web, que podem divergir silenciosamente com o tempo).

### D7 — Código de erro dedicado para sessão-alvo ausente na revogação, mapeado para `404`

**Achado de revisão (P1):** `RevokeSessionUseCase` retornava `IDENTITY_ERRORS.SESSION_NOT_FOUND` quando a sessão-alvo não existe ou pertence a outro ator/banca, e o controller mapeava esse código para `401` (`STATUS_BY_CODE`) — o mesmo status usado para token ausente/inválido e sessão expirada. Como `revokeSession()` no Web usa `fetchWithRefresh`, isso reproduzia exatamente o mesmo bug corrigido pela Decisão D5 (senha atual incorreta), mas para a revogação de sessão: se a sessão-alvo já não existisse no momento do `DELETE` (ex.: outra aba já a encerrou, ou ela expirou entre a listagem e a confirmação), o Backend respondia `401`, `fetchWithRefresh` tentava um silent refresh (que **sucede**, pois a sessão do próprio ator continua válida), repetia o `DELETE` (recebendo `401` de novo, pois a sessão-alvo continua ausente) e então `redirectToLoginExpired()` era chamado — deslogando o usuário como se sua própria sessão tivesse expirado, quando na verdade era apenas a sessão-alvo (de outra aba/dispositivo) que já não existia mais. Isso é precisamente a corrida descrita na Decisão D4 ("sessão já ausente no refetch é tratada como reconciliação, não erro") — mas antes de chegar ao refetch, o próprio `fetchWithRefresh` já teria deslogado o usuário.

Resolução: adicionar `TARGET_SESSION_NOT_FOUND: 'IDENTITY.TARGET_SESSION_NOT_FOUND'` a `IDENTITY_ERRORS`, distinto de `SESSION_NOT_FOUND` (que permanece exclusivo para a ausência da **própria** sessão do ator — ex.: `ChangePasswordUseCase`/`MandatoryPasswordChangeUseCase`, onde `401` continua correto por ser uma falha de autenticação do próprio ator, não sobre um alvo de terceiro). `RevokeSessionUseCase` passa a retornar `TARGET_SESSION_NOT_FOUND` quando a sessão não existe ou não pertence ao ator; o controller mapeia esse código para `404` — alinhado ao que a spec vigente de `session-management` já afirmava ("Cannot revoke session of another banca" → `404`; o código é que divergia dela, não a spec). `revokeSession()` no Web passa a inspecionar o **status HTTP** diretamente (`404` → `not_found`, `401` → `unauthenticated`) em vez de precisar inspecionar o código do corpo para desambiguar dois significados dentro do mesmo `401` — o novo status por si só já é inequívoco.

- **Alternativa considerada — manter `401` e fazer o Web desambiguar somente pelo código do corpo (como fizemos temporariamente antes desta correção):** rejeitada como solução definitiva; embora funcionasse para uma checagem síncrona do corpo já recebido, não evita que `fetchWithRefresh` dispare o silent-refresh-e-retry ANTES dessa checagem — o `redirectToLoginExpired()` já teria sido chamado no meio do caminho quando o retry também retornasse `401`. Só um status HTTP genuinamente distinto (`404`) evita o gatilho errado dentro do próprio `fetchWithRefresh`.
- **Risco assumido:** segunda (e última) mudança de contrato observável desta change (`401` → `404` para sessão-alvo ausente na revogação), pelo mesmo racional de D5 — reconciliação de um código já divergente da spec vigente, não uma nova decisão de produto. Único consumidor é o próprio Web (`revokeSession()`), atualizado na mesma change.

### D8 — Corpo de erro do Web lido de `message[0]`, nunca de um `code` solto

**Achado de revisão (P1 — só capturado pelo Playwright real, não pelos testes mockados):** o `ApiExceptionFilter` global do Backend (`apps/backend/src/shared/errors/api-exception.filter.ts`) reconstrói o corpo de toda `HttpException` a partir de `exception.getResponse()`, mas só preserva `message` (sempre um array) — nunca reexpõe um campo `code` solto, mesmo quando `IdentityController.unwrap()` monta `{ statusCode, error: 'Identity Error', code, message: [code] }` internamente. Na resposta HTTP real, o campo `code` simplesmente não existe; o único lugar onde o código de domínio aparece é `message[0]`.

A implementação inicial de `changePassword()` (Decisão D5) lia `body?.code` para diferenciar `wrong_current_password` de `invalid` — os dois retornam `400`. Como esse campo nunca existe de fato, TODA senha atual incorreta caía silenciosamente no branch genérico `invalid`, exibindo "A nova senha não atende aos requisitos de segurança" em vez da mensagem correta. Os testes de componente (`security-password-form.spec.tsx`) mockam `changePassword()` diretamente com o resultado discriminado já pronto (`{ status: 'wrong_current_password' }`), então nunca exercitam a camada HTTP real e não detectam essa divergência de contrato; o teste unitário de `auth.client.spec.ts` também não detectava, pois construía a resposta mockada com `{ code: ... }` — reproduzindo o mesmo formato *assumido* (e errado) em vez do formato *real* do Backend. Só o Playwright rodando de ponta a ponta contra o Backend real expôs o bug.

Resolução: `changePassword()` passa a ler `body?.message?.[0]` para obter o código de domínio autoritativo. O teste de `auth.client.spec.ts` foi corrigido para mockar o formato real (`{ message: ['IDENTITY.CURRENT_PASSWORD_INCORRECT'] }`).

- **Nota para futuras changes:** qualquer cliente Web que precise desambiguar códigos de erro de domínio dentro do mesmo status HTTP deve ler `message[0]`, nunca assumir um campo `code` — o contrato real do `ApiExceptionFilter` não o expõe. Isso não é específico desta change; `login()` em `auth.client.ts` já tinha essa mesma suposição incorreta (`body?.code`) antes desta change, mas o bug ali é inofensivo porque as condições de status HTTP (`401`/`423`) sempre dominam a decisão independentemente do valor de `code` — não foi alterado aqui por estar fora do escopo desta change.

## Risks / Trade-offs

- **[Risco] Mudar o status/código de `PATCH /api/auth/password` para senha incorreta (`401` → `400`, novo código) é uma mudança de contrato observável.** → Mitigação: único consumidor é o próprio Web, atualizado na mesma change; a spec `credential-management` já documentava `400` como comportamento esperado, então isto é reconciliação de um bug, não uma nova decisão de produto.
- **[Risco] Heurística de rótulo de dispositivo (D3) pode não reconhecer todo user-agent.** → Mitigação: fallback honesto explícito ("Dispositivo não identificado"), nunca um valor inventado; a spec não exige cobertura exaustiva de user-agents.
- **[Risco] Revogar uma sessão e o Web não perceber que ela já não existe mais (corrida entre abas/dispositivos).** → Mitigação: refetch autoritativo sempre após a mutação (D4); ausência da sessão na releitura é tratada como sucesso silencioso, não erro.
- **[Risco] Extrair VOs de senha (D6) toca um arquivo já em produção (`/trocar-senha`).** → Mitigação: extração é puramente mecânica (mesmas regras, novo local de import), sem mudança de comportamento; a spec de regressão de `/trocar-senha` exige prova explícita de que o fluxo obrigatório continua idêntico.

## Migration Plan

- Nenhuma migração de schema — `expiresAt`/`deviceInfo` já existem na tabela `Session`; `isCurrent` é derivado em tempo de leitura, não persistido.
- Deploy do Backend antes do Web: os novos campos em `GET /api/auth/sessions` são aditivos; a mudança de status/código de `PATCH /api/auth/password` exige que o Web seja atualizado na mesma janela de deploy (ou logo em seguida) para não mostrar mensagem genérica de erro em vez da mensagem específica de senha incorreta — não há quebra funcional se o Web antigo rodar brevemente contra o Backend novo (o erro só deixa de ser reconhecido como "senha incorreta" especificamente e cai no branch genérico de erro do cliente antigo).
- Rollback: reverter o deploy do Backend restaura o código/status antigos; nenhum dado migrado precisa ser revertido.

## Open Questions

Nenhuma pendente para este increment. Escopo de auditoria estruturada (D37 do plano 08) e MFA/2FA permanecem fora, sem bloquear esta change.
