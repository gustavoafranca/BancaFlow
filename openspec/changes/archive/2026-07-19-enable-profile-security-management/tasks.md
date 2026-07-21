## 1. Inventário e reconciliação de contratos

- [x] 1.1 Reconfirmar, lendo o código atual (não só este plano), o estado de `ListSessionsUseCase`, `RevokeSessionUseCase`, `ChangePasswordUseCase`, `SessionInfoDto`, `IdentityController` (`GET/DELETE /api/auth/sessions*`, `PATCH /api/auth/password`), `STATUS_BY_CODE`, `auth.client.ts`, `app/trocar-senha/**` e `modules/perfil/**`, registrando qualquer divergência encontrada em relação a `design.md` antes de alterar código.

## 2. Domínio (`modules/identity`)

- [x] 2.1 Adicionar `expiresAt: Date` e `isCurrent: boolean` a `SessionInfoDto` (`modules/identity/src/shared/dto/session-info.dto.ts`) (`module-dto`).
- [x] 2.2 Adicionar `CURRENT_PASSWORD_INCORRECT: 'IDENTITY.CURRENT_PASSWORD_INCORRECT'` a `IDENTITY_ERRORS` (`modules/identity/src/shared/errors/identity.errors.ts`).
- [x] 2.3 Atualizar `ListSessionsUseCase` (`modules/identity/src/app/use-case/list-sessions.use-case.ts`): input ganha `currentSessionId: string`; a projeção de cada sessão inclui `expiresAt` (do getter da entidade) e `isCurrent: session.id === data.currentSessionId` (`module-use-case`, `module-query-cqrs`).
- [x] 2.4 Testes de `ListSessionsUseCase`: sessão atual marcada corretamente entre múltiplas sessões ativas, nenhuma sessão marcada quando `currentSessionId` não corresponde a nenhuma ativa, `expiresAt` reflete o valor persistido, nenhum campo além do contrato é exposto (`module-use-case`).
- [x] 2.5 Atualizar `ChangePasswordUseCase` (`modules/identity/src/user-account/use-case/change-password.use-case.ts`): quando `passwordCrypto.compare` resolve `false`, retornar `IDENTITY_ERRORS.CURRENT_PASSWORD_INCORRECT` em vez de `IDENTITY_ERRORS.INVALID_CREDENTIALS` (`module-use-case`).
- [x] 2.6 Atualizar/estender os testes existentes de `ChangePasswordUseCase`: senha atual incorreta retorna `CURRENT_PASSWORD_INCORRECT` (não mais `INVALID_CREDENTIALS`); nenhuma sessão é revogada e nenhuma escrita ocorre nesse caso; demais cenários (sucesso, senha fraca, falhas técnicas, rollback) permanecem cobertos (`module-use-case`).

## 3. Backend — Controller e mapeamento de erro

- [x] 3.1 Atualizar `IdentityController.listSessions` para passar `user.sessionId` como `currentSessionId` ao `ListSessionsUseCase` (`backend-controller`).
- [x] 3.2 Atualizar `STATUS_BY_CODE` em `identity.controller.ts`: mapear `IDENTITY_ERRORS.CURRENT_PASSWORD_INCORRECT` para `HttpStatus.BAD_REQUEST` (`400`) (`backend-controller`).
- [x] 3.3 Testes e2e/integração do controller: `GET /api/auth/sessions` retorna `isCurrent`/`expiresAt` corretos para múltiplas sessões do mesmo usuário (criadas via login real em dois "dispositivos"/user-agents); `PATCH /api/auth/password` com senha atual incorreta retorna `400 IDENTITY.CURRENT_PASSWORD_INCORRECT` (não `401`), sem revogar sessões e sem alterar o hash persistido; `DELETE /api/auth/sessions/:sessionId` de sessão de outra banca continua com o comportamento hoje já coberto, sem regressão.

## 4. Web — Contrato e cliente HTTP

- [x] 4.1 Inspecionar `apps/web/src/shared/api/auth.client.ts`, `apps/web/src/shared/session/refresh-on-expire.ts`, `apps/web/src/app/trocar-senha/**`, `apps/web/src/modules/perfil/**`, `apps/web/src/shared/components/ui/dialog.tsx` e os testes existentes antes de qualquer alteração (`frontend-module-workflow`).
- [x] 4.2 Definir em `auth.client.ts` o tipo `SessionSummary` (espelhando `SessionInfoDto` estendido) e `listSessions(): Promise<...>` (`GET /api/auth/sessions`) com resultado discriminado (sucesso com lista, não autenticado, erro técnico).
- [x] 4.3 Definir em `auth.client.ts` `revokeSession(sessionId: string): Promise<...>` (`DELETE /api/auth/sessions/:sessionId`) com resultado discriminado (sucesso, já ausente/não encontrada, não autenticado, erro técnico).
- [x] 4.4 Atualizar `changePassword()` em `auth.client.ts` para reconhecer o código `IDENTITY.CURRENT_PASSWORD_INCORRECT` do corpo da resposta e devolver um status discriminado próprio (ex.: `'wrong_current_password'`), distinto de `'invalid'` (senha fraca) e de qualquer tratamento de sessão expirada; **não** introduzir nenhuma exceção de `fetchWithRefresh` específica deste endpoint.
- [x] 4.5 Testes de cliente HTTP (`auth.client.spec.ts`) cobrindo `listSessions`, `revokeSession` e o novo branch de `changePassword()` por status/código de resposta, incluindo o cenário em que a resposta antiga (`401 INVALID_CREDENTIALS`) não é mais produzida para senha incorreta.

## 5. Web — Schema de senha compartilhado

- [x] 5.1 Criar `apps/web/src/shared/form/password-fields.ts` com `StrongPasswordField`/`ConfirmPasswordField` extraídos de `app/trocar-senha/change-password.schema.ts` (mesmas regras, sem alteração de comportamento) (`frontend-form-schema`).
- [x] 5.2 Atualizar `app/trocar-senha/change-password.schema.ts` para importar os VOs de `shared/form/password-fields.ts` em vez de defini-los localmente; confirmar que `change-password-form.tsx`/`change-password-form.spec.tsx` continuam passando sem alteração de comportamento (regressão).
- [x] 5.3 Criar `apps/web/src/modules/perfil/data/security-password.schema.ts`: `CurrentPasswordField` (não vazio) + composição com `StrongPasswordField`/`ConfirmPasswordField` compartilhados, schema com `currentPassword`, `newPassword`, `confirmPassword` e refinamento de igualdade `newPassword === confirmPassword` (`frontend-form-schema`).
- [x] 5.4 Testes do novo schema: senha atual vazia rejeitada, nova senha fraca rejeitada, confirmação divergente rejeitada, combinação válida aprovada; teste de regressão confirmando que `modules/perfil` não importa nenhum arquivo de `app/trocar-senha`.

## 6. Web — Aba Segurança

- [x] 6.1 Definir o mapper/heurística de rótulo de dispositivo a partir de `deviceInfo` (função pura em `modules/perfil`), com fallback honesto explícito quando ausente/não reconhecido; testes cobrindo casos reconhecidos e o fallback (`frontend-module-workflow`).
- [x] 6.2 Implementar o hook/estado de listagem de sessões no módulo `perfil` (chama `listSessions()`, expõe loading/erro/sucesso, expõe `refetch()`), reaproveitando primitives reais de `shared/components/ui/` já existentes (`dialog.tsx` para a confirmação de revogação) após conferir suas props reais.
- [x] 6.3 Implementar os componentes da aba Segurança em `modules/perfil` (lista de sessões com sessão atual marcada e sem ação própria; ação "Encerrar sessão" nas demais, com diálogo de confirmação acessível; refetch autoritativo após revogação, sem remoção otimista da lista local).
- [x] 6.4 Implementar o formulário de troca voluntária de senha na aba Segurança usando `security-password.schema.ts`: envia somente `currentPassword`/`newPassword`; bloqueia submissão duplicada durante requisição em andamento; em sucesso, limpa os campos sensíveis, exibe mensagem de que as demais sessões foram encerradas e recarrega a listagem de sessões; em senha atual incorreta, exibe mensagem específica e não aciona nenhum fluxo de sessão expirada; nenhuma chamada manual a rotina de refresh de token após sucesso.
- [x] 6.5 Restaurar a aba **Segurança** ao lado de **Informações** em `perfil.page.tsx` (mantendo `app/(private)/perfil/page.tsx` fino), disponível igualmente para `OWNER`/`ADMIN`/`USER`; **não** restaurar a aba **Atividade** nem qualquer import de `perfil.sample.ts`.
- [x] 6.6 Implementar estados de loading, vazio (nenhuma outra sessão além da atual), erro (falha ao listar, com nova tentativa) e sucesso da aba Segurança, com acessibilidade (roles, labels, foco em mensagens de erro/confirmação), seguindo o mesmo padrão já estabelecido pela aba Informações.

## 7. Web — Testes de componente e acessibilidade

- [x] 7.1 Testes de componente da aba Segurança: lista renderiza sessões reais retornadas por `listSessions()` (mock), sessão atual marcada sem ação, revogação de outra sessão aciona `revokeSession()` seguido de refetch, sessão já ausente no refetch não gera erro visível, nenhuma sessão de amostra/`perfil.sample.ts` aparece.
- [x] 7.2 Testes de componente do formulário de troca de senha: sucesso limpa campos e recarrega sessões, senha atual incorreta exibe mensagem específica sem redirecionar, senha fraca e confirmação divergente são bloqueadas antes do envio, submissão duplicada é impedida durante requisição em andamento, falha transacional não limpa os campos nem finge sucesso.
- [x] 7.3 Atualizar `perfil.page.spec.tsx` para cobrir a navegação entre **Informações** e **Segurança**, confirmando ausência de qualquer vestígio de **Atividade**/2FA/estatísticas fixas.

## 8. Testes E2E

- [x] 8.1 Criar `apps/web/e2e/profile-security.e2e.spec.ts` contra o tenant isolado `pw-e2e.localhost` (mesmo seed de `seed-e2e-playwright.ts`): abrir dois contextos de browser, autenticar duas vezes com o mesmo usuário (duas sessões reais), abrir `/perfil → Segurança` em um contexto, identificar a sessão atual, revogar a outra sessão e confirmar seu desaparecimento após reload/refetch.
- [x] 8.2 Estender o mesmo E2E (ou um `it` irmão) para a troca voluntária de senha: senha atual correta + nova senha forte conclui com sucesso, sessão atual permanece autenticada sem novo login, e uma nova tentativa de login com a senha antiga falha. Nenhum teste usa `skip`/`fixme`.
  - **Achado de revisão (P1 — crítico, só capturado pelo E2E real):** o Playwright real (rodando de ponta a ponta contra Backend+Postgres reais) revelou que `changePassword()` em `auth.client.ts` lia `body?.code` para distinguir `wrong_current_password` de `invalid`, mas o `ApiExceptionFilter` global do Backend nunca inclui um campo `code` solto no corpo — o código de domínio autoritativo vem exclusivamente como `message[0]` (ex.: `{ message: ["IDENTITY.CURRENT_PASSWORD_INCORRECT"] }`). O teste de componente mockado (que injeta o resultado discriminado diretamente, sem passar pela camada HTTP real) não conseguia capturar essa divergência de contrato — só o E2E real, batendo no `fetchWithRefresh`/`Response.json()` de verdade, expôs o bug. Corrigido: `changePassword()` agora lê `body?.message?.[0]`; teste de `auth.client.spec.ts` atualizado para mockar o formato real de resposta (`{ message: [...] }`, não `{ code: ... }`).
- [x] 8.3 Atualizar `apps/web/e2e/README.md` documentando o novo spec e seus pré-requisitos, seguindo o padrão já estabelecido para `perfil-navigation.e2e.spec.ts`.

## 9. Gates e validação final

- [x] 9.1 `npm run lint`, `npm run check-types`/`tsc --noEmit`, suíte de testes e `npm run build` em `modules/identity`, `apps/backend` e `apps/web`, sem afrouxar nenhuma asserção existente. Rodados de fato: identity 195/195, backend 87/87 (unit) + 79/79 (e2e), web 177/177; lint/typecheck/build limpos nos três, dentro do escopo desta change (falhas em `apps/backend/test/access-control/**` e `apps/web/src/modules/configuracoes/**` pertencem a trabalho paralelo — `establish-authoritative-role-permissions` — e não são desta change).
- [x] 9.2 Rodar a suíte e2e do Backend (`apps/backend`, `jest-e2e.json`) e a suíte Playwright do Web (pré-requisitos do passo 8) de ponta a ponta. Backend e2e: 79/79. Playwright real (Backend em produção + Postgres real + `npm run dev` do Web + seed `pw-e2e`, browser Chromium headless do próprio WSL — sem necessidade de abrir no Windows): 6/6, incluindo os 3 specs já existentes (regressão) e os 3 novos cenários desta change.
- [x] 9.3 Confirmar que nenhum mock (`perfil.sample.ts` ou equivalente), 2FA de fachada ou dado de atividade/IP permanece em `/perfil` após a entrega. Confirmado por busca textual nos arquivos de produção de `modules/perfil` — as únicas ocorrências restantes são nas asserções de teste que provam a ausência.
- [x] 9.4 Rodar `openspec validate enable-profile-security-management --strict` novamente após a aplicação. Válido.
