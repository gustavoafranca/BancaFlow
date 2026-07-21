## 1. Inventário verificável (contratos, rotas, componentes, mocks, consumidores)

- [x] 1.1 Confirmar por leitura direta (não por suposição) o estado atual de `app-navbar.tsx` (`DropdownItem` sem `href`/`onClick` em "Meu Perfil"/"Configurações") e `app-sidebar.tsx` (ausência de entrada para `/perfil`/`/configuracoes`), registrando qualquer divergência encontrada em relação ao levantamento desta proposta/design antes de alterar qualquer arquivo.
- [x] 1.2 Confirmar quais campos de `/perfil` são hoje ligados a `GET`/`PATCH /api/auth/me` (via `useCurrentUser()`) versus quais vêm de literais hardcoded ou de `perfil.sample.ts`, listando arquivo:linha de cada um.
- [x] 1.3 Confirmar quais partes de `/configuracoes` fazem alguma chamada HTTP real (esperado: nenhuma) e listar todos os consumidores de `configuracoes.sample.ts` e `lib/permissions.ts`.
- [x] 1.4 Reconfirmar se `restore-localhost-tenant-routing` já existe como change/prompt separado; se não existir, registrar como dependência pendente sem criá-la nesta execução.

## 2. Ownership e delta specs (sem código)

- [x] 2.1 Validar que `self-profile-management` é o dono correto dos requisitos de navegação/honestidade de `/perfil` (nenhuma capability principal concorrente encontrada) e que `settings-capability-visibility` precisa ser criada (nenhuma capability principal existente cobre a superfície honesta de `/configuracoes`).
- [x] 2.2 Rodar `openspec validate align-profile-settings-experience --strict` após qualquer ajuste nos artefatos desta change, antes de iniciar a implementação.

## 3. Navegação do shell/dropdown

- [x] 3.1 Estender `DropdownItem` (`app-navbar.tsx`) para aceitar `href?: string` opcional, renderizando `<Link href={href} onNavigate={...}>` quando presente, preservando o branch `onClick`-apenas para itens de ação (ex.: "Sair"/"Sair de todos os dispositivos") sem alterar seu comportamento.
- [x] 3.2 Ligar o item **Meu Perfil** a `href="/perfil"`, fechando o menu da conta via `onNavigate` (não `onClick`), igual para `OWNER`/`ADMIN`/`USER`.
- [x] 3.3 Remover a aparência interativa do item **Configurações** no dropdown (sem foco de teclado ativável, sem cursor de clique, sem navegação), decidindo entre removê-lo da lista de itens ou marcá-lo como indisponível de forma acessível (`aria-disabled` ou equivalente), conforme Decisão 2 do `design.md`.
- [x] 3.4 Confirmar (ou registrar como já satisfeito, conforme achado 1.1) que o menu lateral não precisa de alteração, já que não lista `/perfil`/`/configuracoes` hoje.

## 4. Reconciliação do módulo `perfil`

- [x] 4.1 Remover do hero card de `perfil.page.tsx` os valores estáticos de "Membro desde", "Último acesso" e as estatísticas rápidas fixas, sem substituí-los por outro dado fabricado.
- [x] 4.2 Remover o toggle de 2FA demonstrativo (estado local sem persistência) e o formulário de troca de senha sem `onClick` da aba **Segurança**; se a aba ficar sem nenhum controle real após essa remoção, remover a aba da navegação por abas em vez de deixá-la vazia.
- [x] 4.3 Remover a seção "Sessões Ativas" (consumidora de `buildSessions`) e a aba **Atividade** (consumidora de `buildActivityLog`); remover a aba da navegação se ficar sem conteúdo.
- [x] 4.4 Deletar `apps/web/src/modules/perfil/data/perfil.sample.ts` depois de confirmar que nenhum arquivo o importa mais.
- [x] 4.5 Confirmar que Nome/E-mail (editáveis), Username/Papel/Banca (somente leitura) e os estados de loading/erro/edição/sucesso/conflito permanecem intactos e sem regressão.

## 5. Reconciliação do módulo `configuracoes`

- [x] 5.1 Substituir o conteúdo renderizado por `configuracoes.page.tsx` por um único estado acessível de "capability ainda não disponível", cobrindo os seis submenus atuais (`turnos`, `usuarios`, `perfis`, `whatsapp`, `apis`, `webhooks`) sem dado de exemplo e sem ação de criação/edição/exclusão simulada.
- [x] 5.2 Remover os botões "Novo Turno"/"Novo Usuário"/"Novo Perfil"/"Nova API Key"/"Novo Webhook" e os drawers de criação/edição/visualização associados.
- [x] 5.3 Deletar `apps/web/src/modules/configuracoes/data/configuracoes.sample.ts` e `apps/web/src/modules/configuracoes/lib/permissions.ts` (incluindo `permissions.spec.ts`) após confirmar ausência de outros consumidores.
- [x] 5.4 Confirmar que a rota `/configuracoes` continua renderizando com segurança e sem erro quando acessada diretamente pela URL, mesmo sem entrada funcional no menu da conta.

## 6. Testes de componente, navegação, acessibilidade e ausência de mocks

- [x] 6.1 Reescrever `app-navbar.spec.tsx` para cobrir: clique em **Meu Perfil** navega para `/perfil` e fecha o dropdown; ativação por teclado (`Tab`+`Enter`, enviando `Enter` de verdade via `userEvent.keyboard('{Enter}')`, sem chamar `onNavigate` diretamente) produz o mesmo resultado, incluindo o fechamento do dropdown; item **Configurações** não navega e não é focável como item de menu ativo.
- [x] 6.2 Atualizar `perfil.page.spec.tsx` para asserir a ausência de "Membro desde"/"Último acesso"/estatísticas/2FA/sessões/atividade, mantendo as asserções existentes de dados reais (nome/username/e-mail/papel/banca) e dos estados de edição/conflito.
- [x] 6.3 Reescrever `configuracoes.page.spec.tsx` para asserir a ausência de usuários/perfis fictícios e de ações de criação/edição simuladas, e a presença do novo estado honesto e acessível.
- [x] 6.4 Confirmar que `permissions.spec.ts` foi removido junto com `lib/permissions.ts` (não apenas esvaziado) e que nenhum outro teste depende dele.
- [x] 6.5 Rodar verificação de acessibilidade (Testing Library) sobre o novo estado de `/configuracoes` e sobre o dropdown atualizado.

## 7. E2E real do fluxo de navegação para o perfil

- [x] 7.1 Implementar um E2E Playwright real (sem `test.skip`/`test.fixme`/corpo vazio) em `apps/web/e2e/perfil-navigation.e2e.spec.ts` usando o tenant isolado e seguro `pw-e2e.localhost` (mesmo seed de `seed-e2e-playwright.ts` já usado por `login-to-dashboard.e2e.spec.ts`): login real → menu da conta → **Meu Perfil** → URL termina em `/perfil` → dado autoritativo do usuário de teste visível (`Nome Completo` = "Playwright Owner", papel "Proprietário") → confirmação de que não caiu em `/unavailable`. Executado com sucesso via `npx playwright test` (3 testes, 0 skipped).
- [x] 7.2 Confirmar que os testes de componente desta change usam rotas relativas (sem depender do host local).

## 8. Documentação, auditoria de componentes, typecheck, lint, testes e build

- [x] 8.1 Reconciliar `e2e/README.md`, `apps/backend/.env.example` e os artefatos desta change (`proposal.md`/`design.md`) para distinguir explicitamente desenvolvimento/E2E (`.localhost`) de produção (`.bancaflow.com.br`), sem contradição, e sem alterar `TenantResolverMiddleware`/proxy/CIDRs.
- [x] 8.2 Rodar detecção de órfãos para confirmar que `perfil.sample.ts`, `configuracoes.sample.ts` e `lib/permissions.ts` não deixam ícones/helpers órfãos para trás.
- [x] 8.3 Rodar `npm run lint`, `npm run check-types`, `npm test -- --runInBand --no-cache`, `npm run build` e `npx playwright test e2e/perfil-navigation.e2e.spec.ts` no Web e confirmar que todos passam sem afrouxar asserções existentes e sem skip. Todos verdes: lint OK, typecheck OK, 133/133 testes (29 suítes), build OK, 1/1 Playwright do arquivo (3/3 na suíte completa).
- [x] 8.4 Atualizar o plano 08 (`.docs/plans/foundation/08-...md`) e o plano 09 (`.docs/plans/foundation/09-...md`) apenas na seção de histórico/descobertas, se a implementação revelar qualquer divergência nova em relação ao que esta proposta já registrou — sem reabrir decisões `DECIDED`. (Nenhuma divergência nova encontrada além do já registrado; planos não alterados.)
