# Prompt — Propor spec de segurança real no perfil

## Missão

Crie uma proposta OpenSpec completa, sem implementar código, para habilitar em `/perfil` uma aba **Segurança** baseada nos contratos reais de Identity.

O resultado vertical deve permitir que qualquer usuário autenticado (`OWNER`, `ADMIN` ou `USER`) consulte suas sessões ativas, identifique a sessão atual, encerre outra sessão da própria conta e altere voluntariamente a própria senha informando a senha atual.

Preserve a linguagem visual do protótipo anterior do Claude Design, mas não restaure mocks, 2FA, atividade, localização ou qualquer dado sem fonte autoritativa.

## Incremento selecionado

- **ID local:** `PROFILE-SECURITY-01` — follow-up de Identity, separado dos INC-02/INC-03 administrativos do plano 08.
- **Área:** `foundation`.
- **Change sugerida:** `enable-profile-security-management`.
- **Resultado:** segurança da própria conta funcional em `/perfil`, de ponta a ponta.
- **Specs candidatas:**
  - `session-management` — MODIFIED;
  - `credential-management` — MODIFIED;
  - `self-profile-management` — MODIFIED.

Não crie capability concorrente se essas specs já possuírem ownership claro. Justifique a decisão no `design.md`.

## Como executar

1. Use `openspec-propose`.
2. Execute `openspec list --json` e descarte colisão com change ativa equivalente.
3. Leia todas as fontes e inspecione o código real antes de criar artefatos.
4. Crie `proposal.md`, `design.md`, delta specs e `tasks.md` para uma única change vertical.
5. Não implemente, não aplique, não arquive e não altere os planos nesta execução.
6. Execute `openspec validate enable-profile-security-management --strict`.
7. Informe o próximo comando sem executar `/opsx:apply`.

## Fontes obrigatórias

Leia, nesta ordem:

1. instruções locais da raiz, `apps/backend`, `apps/web` e `modules/identity`;
2. `.docs/plans/00-project-context.md`;
3. `.docs/plans/00-bancaflow-mvp-roadmap.md`;
4. `.docs/plans/foundation/08-identity-profile-and-tenant-user-administration.md`;
5. `openspec/specs/session-management/spec.md`;
6. `openspec/specs/credential-management/spec.md`;
7. `openspec/specs/self-profile-management/spec.md`;
8. `openspec/specs/route-protection-frontend/spec.md`;
9. `openspec/specs/web-frontend-boundaries/spec.md`;
10. `openspec/specs/web-frontend-testing/spec.md`;
11. `openspec/changes/archive/2026-07-18-align-profile-settings-experience/`;
12. `openspec/changes/archive/2026-07-16-harden-identity-authentication-mvp/`, nos trechos de sessão, senha, cookies e erros;
13. implementação e testes indicados abaixo.

Specs sincronizadas e domínio/Backend prevalecem sobre o protótipo. O protótipo é referência visual, não regra de negócio. Toda divergência deve aparecer nos artefatos OpenSpec.

## Evidência inicial a revalidar

Já existem e estão ligados ao controller:

- `ListSessionsUseCase` → `GET /api/auth/sessions`;
- `RevokeSessionUseCase` → `DELETE /api/auth/sessions/:sessionId`;
- `ChangePasswordUseCase` → `PATCH /api/auth/password`;
- `LogoutAllUseCase` → `POST /api/auth/logout-all`.

A troca voluntária exige senha atual e nova, valida `StrongPassword`, persiste a credencial, revoga todas as **outras** sessões, mantém a atual e reemite o access token HttpOnly dentro da transação.

### Lacuna 1 — projeção de sessão

Hoje `SessionInfoDto` contém somente `sessionId`, `createdAt` e `deviceInfo?`. Isso não permite identificar com segurança a sessão atual.

A entidade já possui `expiresAt`, e o `AuthContext` já possui `sessionId`. Especifique o ajuste mínimo, sem migração, para retornar também:

- `isCurrent`, calculado no Backend com o `sessionId` autenticado;
- `expiresAt`, derivado da sessão persistida.

Não exponha tokens, digest, segredo, IP inexistente, localização ou claims desnecessárias. Não invente `lastSeenAt`.

### Lacuna 2 — senha atual incorreta

`credential-management` afirma que senha atual incorreta retorna `400`, mas o mapeamento atual de `IDENTITY.INVALID_CREDENTIALS` retorna `401`. No Web, `changePassword()` usa `fetchWithRefresh`; esse `401` de negócio pode provocar refresh/retry e falso redirecionamento de sessão expirada.

Defina uma resposta segura e não ambígua, coerente com a spec principal e distinguível de autenticação expirada. O cliente deve mapear código de erro autoritativo, não apenas status genérico.

### Estado atual do Web

- `auth.client.ts` já possui `changePassword()` e `logoutAll()`, mas não lista/revoga sessões;
- `/perfil` removeu a antiga aba Segurança porque ela era estática;
- `/trocar-senha` implementa a troca **obrigatória**, distinta deste fluxo voluntário;
- o schema client-safe atual está dentro de `app/trocar-senha` e não pode ser importado por `modules/perfil`.

## Inspeção obrigatória

### Identity/Backend

- `modules/identity/src/app/use-case/list-sessions.use-case.ts` e testes;
- `modules/identity/src/app/use-case/revoke-session.use-case.ts` e testes;
- `modules/identity/src/user-account/use-case/change-password.use-case.ts` e testes;
- `modules/identity/src/shared/dto/session-info.dto.ts`;
- `modules/identity/src/session/session.entity.ts` e repository;
- `apps/backend/src/modules/identity/identity.controller.ts`, DTOs, module e testes HTTP/E2E;
- mapeamento de erros e `JwtCookieAuthGuard`.

### Web

- todo `apps/web/src/modules/perfil/`;
- `apps/web/src/app/(private)/perfil/page.tsx`;
- `apps/web/src/shared/api/auth.client.ts` e testes;
- `apps/web/src/shared/session/refresh-on-expire.ts` e testes;
- `apps/web/src/app/trocar-senha/`;
- primitives reais de formulário/feedback;
- `apps/web/e2e/` e documentação.

Use a change arquivada de alinhamento, assets existentes e a tela atual como referência visual. Sem `.dc.html`, não execute `import-cloud-design-next`.

## Decisões obrigatórias

### D1 — Aba Segurança real

- Restaurar **Segurança** ao lado de **Informações** para todos os papéis.
- Conter somente sessões reais e troca voluntária de senha.
- Manter `app/**/page.tsx` fina; estado e interação pertencem ao módulo `perfil`.
- Não restaurar a aba **Atividade**.

### D2 — Sessões autoritativas

- O Backend calcula `isCurrent`; o browser não lê JWT HttpOnly.
- A UI mostra apenas criação, expiração e `deviceInfo` disponíveis.
- É permitido derivar do User-Agent um rótulo amigável, com fallback honesto “Dispositivo não identificado”.
- Não mostrar localização, IP, última atividade ou “online”.

### D3 — Revogação individual

- Sessões não atuais oferecem **Encerrar sessão** com confirmação acessível.
- A atual é marcada **Sessão atual** e não usa o DELETE como ação comum.
- Após mutação, refazer a leitura autoritativa antes de atualizar definitivamente a UI.
- Tratar corrida/idempotência visual se a sessão já desapareceu.
- Não adicionar “encerrar todas” só porque `logoutAll()` existe; essa jornada fica fora salvo justificativa explícita.

### D4 — Troca voluntária no perfil

O formulário contém senha atual, nova senha e confirmação. Envia apenas `currentPassword` e `newPassword`.

Exija:

- `autocomplete` correto;
- feedback distinto para senha atual incorreta, senha fraca, sessão expirada e falha técnica;
- bloqueio de submissão duplicada;
- limpeza dos campos sensíveis após sucesso;
- mensagem informando que as demais sessões foram encerradas;
- refetch de sessões após sucesso, restando somente a atual;
- nenhuma chamada manual a `refresh()`, pois o Backend já reemite o cookie.

### D5 — Validação Web sem acoplamento invertido

- `StrongPassword` no domínio continua autoritativo; Web é somente UX.
- `modules/perfil` não importa de `app/trocar-senha`.
- Inventarie ownership e extraia apenas validadores client-safe realmente compartilháveis, ou proponha composição sem cópias divergentes.
- Preserve `/trocar-senha`, que continua enviando somente `newPassword`.

### D6 — Zero mock

Não restaurar `perfil.sample.ts`, 2FA, histórico de atividade, “último acesso”, localização, IP, estatísticas ou alteração de senha de terceiros.

## Escopo

- ajuste mínimo de `SessionInfoDto`/listagem (`isCurrent`, `expiresAt`), sem Prisma;
- resposta não ambígua para senha atual incorreta;
- clientes tipados para listar/revogar sessões e trocar senha;
- aba Segurança, formulário voluntário e lista real;
- loading, erro, vazio, confirmação, sucesso, foco e sincronização;
- testes de aplicação, HTTP, client, schema, componente, acessibilidade e E2E;
- documentação dos contratos.

## Fora de escopo

- INC-02/INC-03 do plano 08 e todo plano 09;
- `/configuracoes`, administração de terceiros e reset administrativo;
- mudança funcional em `/trocar-senha`, além de preservar/refatorar validação comum;
- logout global, salvo decisão explícita;
- MFA/2FA, auditoria, atividade, IP, geolocalização e `lastSeenAt`;
- campo Prisma/migração;
- redesign geral ou nova importação Claude Design;
- implementação durante a proposta.

## Invariantes

- `userId`, `bancaId` e `currentSessionId` vêm somente do `AuthContext`.
- Sessão alheia nunca é listada/revogada nem tem existência revelada.
- Tokens permanecem HttpOnly.
- Senhas nunca são logadas, devolvidas, persistidas em claro ou mantidas após sucesso.
- Confirmação é campo apenas do Web.
- Senha atual incorreta não significa sessão expirada.
- Falha transacional mantém senha e sessões anteriores.
- Falha de refetch é falha de sincronização, não autorização para fabricar estado.

## Cenários mínimos

1. OWNER, ADMIN e USER acessam a aba Segurança.
2. Lista retorna apenas sessões ativas da própria conta/Banca.
3. Sessão atual é marcada via `isCurrent` do Backend.
4. Dados ausentes usam fallback honesto, sem localização/atividade inventada.
5. Outra sessão é encerrada e a lista autoritativa recarregada.
6. Sessão alheia não é revelada.
7. Loading, vazio e erros são acessíveis.
8. Senha atual correta + nova forte/confirmada concluem a troca.
9. Após sucesso, campos são limpos e somente a sessão atual permanece.
10. Senha atual incorreta não dispara refresh/redirect falso.
11. Senha fraca é rejeitada no Web e autoritativamente no Backend.
12. Confirmação divergente não envia request.
13. Falha transacional não altera senha/sessões.
14. `/trocar-senha` continua enviando somente `newPassword`.
15. Nenhum mock, 2FA ou atividade aparece.
16. E2E com dois contextos no tenant isolado `pw-e2e.localhost` cria duas sessões reais, identifica a atual, revoga a outra e valida a troca de senha.

## Ordem esperada de `tasks.md`

1. inventário/reconciliação de contratos e specs;
2. delta specs e ownership;
3. DTO/use case de sessão;
4. controller e erro de senha atual;
5. testes Backend;
6. tipos/clientes/mappers/hooks Web;
7. schema/form comum preservando `/trocar-senha`;
8. aba/componentes de Segurança;
9. acessibilidade e sincronização pós-mutação;
10. testes Web/HTTP;
11. E2E real, sem `skip`/`fixme`;
12. lint, typecheck, testes, build e validação OpenSpec.

Cada tarefa deve nomear comportamento e evidência; não use “implementar segurança” genericamente.

## Skills

### Proposta

- `openspec-propose` — criar e validar os artefatos;
- `frontend-module-workflow` e `frontend-form-schema` — critérios Web;
- `module-dto`, `module-use-case` e `backend-controller` — restrições do ajuste Backend.

Não execute skills de aplicação nesta fase.

### Aplicação futura

- `openspec-apply-change`;
- `frontend-module-workflow`;
- `frontend-form-schema`;
- `module-dto`;
- `module-use-case`;
- `backend-controller`.

### Não usar

- `config-new-module`, `config-shared-frontend`, `import-cloud-design-next`;
- `backend-prisma-data`/`config-prisma`;
- skills de Access Control;
- `plan-spec-roadmap`, salvo nova decisão crítica descoberta.

## Gates da aplicação futura

A spec deve exigir, usando scripts reais dos `package.json`:

- testes direcionados dos três use cases;
- testes de controller/HTTP, isolamento e erros;
- testes de cliente, schema, componentes e acessibilidade;
- regressão de `/trocar-senha`;
- lint, typecheck, suítes relevantes e build;
- Playwright real em `.localhost`, sem teste vazio/ignorado;
- `openspec validate enable-profile-security-management --strict`.

## Saída solicitada

Crie todos os artefatos OpenSpec da change. Ao final, informe:

- artefatos e specs modificadas;
- contrato confirmado e ajustes propostos;
- identificação segura da sessão atual;
- reconciliação do erro de senha atual incorreta;
- elementos visuais restaurados e excluídos;
- skills da aplicação;
- resultado da validação estrita;
- próximo comando, sem implementar.
