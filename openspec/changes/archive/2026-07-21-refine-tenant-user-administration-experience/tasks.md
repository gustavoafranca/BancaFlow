## 1. Auditoria e coordenação inicial

- [x] 1.1 Revalidar o estado de `enable-tenant-user-administration` com `openspec list`, `openspec validate enable-tenant-user-administration --strict` e leitura dos artefatos finais para confirmar que o refinamento parte da entrega atual, não de uma reconstrução.
- [x] 1.2 Auditar ocorrências atuais de `<select>`, Dialog/Drawer, Tabs/Accordion/Collapsible, botões destrutivos e overlays em `apps/web/src/**`, registrando no relatório da change quais ocorrências entram neste escopo e quais ficam como migração futura.
- [x] 1.3 Conferir changes ativas (`implement-participant-registration-mvp`, `add-multitenant-subdomain-skill`) e registrar se alguma nova rota/capability protegida precisa reconciliar `PermissionKey`, matriz e UI antes de implementação.
- [x] 1.4 Confirmar novamente, antes de editar produto, que nenhum requisito desta change exige tabela, coluna, relação ou migration Prisma.

## 2. Web primitives e tema compartilhado

- [x] 2.1 Ajustar `apps/web/src/shared/theme/theme-provider.tsx`, `apps/web/src/app/layout.tsx` e/ou `apps/web/src/app/globals.css` para aplicar os CSS custom properties do tema ativo em `document.documentElement` ou `document.body`, cobrindo portals Radix sem duplicar tokens por componente.
- [x] 2.2 Adicionar tokens destrutivos canônicos em `toDesignTokens`/CSS global (`--destructive`, `--destructive-foreground`, `--destructive-muted`, `--destructive-border`) com contraste validado em claro e escuro.
- [x] 2.3 Adicionar `variant="destructive"` em `apps/web/src/shared/components/ui/button.tsx` e cobrir default, hover, focus-visible, disabled e tamanhos nos testes de `button.spec.tsx`.
- [x] 2.4 Criar `apps/web/src/shared/components/ui/select.tsx` e `select.spec.tsx`; usar Radix Select da mesma família já adotada se o pacote não existir, atualizando `apps/web/package.json`/lock somente para essa dependência justificada.
- [x] 2.5 Criar primitives mínimos `tabs.tsx`/`tabs.spec.tsx` e `collapsible.tsx` ou `accordion.tsx`/spec em `apps/web/src/shared/components/ui`, caso não exista componente compartilhado equivalente.
- [x] 2.6 Ajustar `apps/web/src/shared/components/ui/dialog.tsx` e `dialog.spec.tsx` apenas se o drawer compartilhado precisar de header/footer sticky, largura responsiva, corpo rolável ou API genérica para lista-detalhe.
- [x] 2.7 Testar troca de tema com Dialog, Drawer e Select abertos, garantindo ausência de overlay branco no dark mode e sem flash incorreto na hidratação.

## 3. Backend Identity: senha temporária e paginação

- [x] 3.1 Substituir `apps/backend/src/modules/identity/adapters/temporary-password.generator.ts` por gerador humano CSPRNG com 5 palavras de vocabulário ASCII neutro de 2048 itens, 2 dígitos não ambíguos e 1 símbolo, documentando o cálculo de entropia no código ou teste.
- [x] 3.2 Adicionar testes determinísticos do gerador via fake/port e testes do gerador real por invariantes em `apps/backend/src/modules/identity/adapters/*temporary-password*.spec.ts` ou local equivalente: `StrongPassword`, formato, ausência de caracteres ambíguos proibidos e falha segura.
- [x] 3.3 Atualizar testes de `modules/identity/test/admin-create-user-account.use-case.spec.ts` e `admin-reset-password.use-case.spec.ts` para confirmar exibição única, `mustChangePassword`, ausência de log/persistência em texto puro e reuso do mesmo port.
- [x] 3.4 Adicionar `@Max(100)` ou equivalente em `apps/backend/src/modules/identity/dto/list-user-accounts.dto.ts`, preservando `page >= 1`, `pageSize >= 1` e default `20`.
- [x] 3.5 Atualizar `apps/backend/src/modules/identity/dto/accounts-dto.spec.ts` e e2e de `GET /api/accounts` para rejeitar `pageSize` acima do limite e cobrir zero itens, uma página, múltiplas páginas e última página incompleta.

## 4. Catálogo de permissões e integridade

- [x] 4.1 Atualizar `openspec`/documentação interna ou README do módulo Access Control conforme necessário para explicitar o Definition of Done de novas permissões sem criar banco.
- [x] 4.2 Reforçar `modules/access-control/test/catalog-integrity.spec.ts` para falhar em chave duplicada, metadata ausente, papel sem decisão explícita, matriz divergente e capability protegida sem cobertura planejada de enforcement/UI quando a change adicionar tal capability.
- [x] 4.3 Revisar `modules/access-control/src/permission-catalog.ts`, `permission-key.ts` e `role-permission-map.ts` para garantir que labels, descriptions, order e agrupamento em português continuam completos e que `OWNER|ADMIN|USER` têm decisão explícita para cada chave.
- [x] 4.4 Reconciliar `implement-participant-registration-mvp` antes da sua aplicação, registrando que novas rotas protegidas de cambistas devem consumir as chaves já catalogadas e aparecer na matriz automaticamente.

## 5. Configurações: abas e Perfis de acesso

- [x] 5.1 Refatorar `apps/web/src/modules/configuracoes/pages/configuracoes.page.tsx` para usar Tabs compartilhadas com abas **Usuários** e **Perfis de acesso**, mantendo gate por `identity.accounts.list` e estados loading/forbidden/error.
- [x] 5.2 Atualizar `apps/web/src/modules/configuracoes/components/role-permissions-matrix.tsx` para usar Collapsible/Accordion por capability, legenda de permitido/não permitido, explicação de papéis fixos, estado inicial compacto e responsividade mobile.
- [x] 5.3 Garantir que a matriz use `label`/`description` do backend e não exiba chaves técnicas cruas quando houver metadados de apresentação.
- [x] 5.4 Cobrir em `configuracoes.page.spec.tsx`, `role-permissions-matrix` spec novo ou existente e `access-control.client.spec.ts`: abas, grupos recolhíveis, loading, forbidden, erro, catálogo vazio, teclado e leitura por labels.

## 6. Configurações: usuários em lista-detalhe/drawer

- [x] 6.1 Substituir selects nativos de `apps/web/src/modules/configuracoes/components/usuarios-section.tsx` e `create-account-dialog.tsx` pelo `Select` compartilhado, sem estado duplicado e preservando React Hook Form.
- [x] 6.2 Criar ou refatorar um drawer de usuário em `apps/web/src/modules/configuracoes/components/` que use `DialogContent variant="drawer"` para detalhe, criação e edição, mantendo composição específica de usuário dentro do módulo.
- [x] 6.3 Tornar a linha de usuário clicável e acionável por Enter/Espaço para abrir detalhe, com estado selecionado, título acessível, retorno de foco, fechamento por Escape e layout mobile em largura total.
- [x] 6.4 Remover a coluna extensa de ações pequenas da tabela, mantendo no máximo affordance discreto de detalhe/mais ações; mover edição, papel, status, senha e sessões para hierarquia clara dentro do drawer.
- [x] 6.5 Manter modais de confirmação para status, troca de papel, reset de senha e revogação de sessão; aplicar `Button destructive` e impedir que controles internos disparem abertura do drawer.
- [x] 6.6 Exibir senha temporária de criação/reset em bloco legível com ação de copiar, aviso de exibição única e sem persistência após fechar/navegar.
- [x] 6.7 Ajustar `use-user-accounts.ts` para preservar filtros/página ao abrir/fechar drawer e recarregar a fonte autoritativa após mutação, voltando para página válida quando necessário.
- [x] 6.8 Atualizar `usuarios-section.spec.tsx` e specs de componentes novos para clique/teclado na linha, prevenção de propagação, criação/detalhe/edição em drawer, confirmações, senha copiável, paginação, filtros e erros.

## 7. Logout destrutivo e alinhado

- [x] 7.1 Refatorar `apps/web/src/app/(private)/_shell/logout-modal.tsx` para incluir ícone, título, descrição curta por opção, hierarquia visual e botões responsivos sem quebra confusa em telas estreitas.
- [x] 7.2 Ajustar `logout-modal-provider.tsx` para rastrear loading independente por ação (`device`/`all`), impedir duplo envio, manter modal aberto em erro e redirecionar para `/login` somente após sucesso.
- [x] 7.3 Aplicar `Button variant="destructive"` apenas na ação global sensível ou no tratamento visual definido em design, mantendo `Sair deste dispositivo` como principal recomendada e `Cancelar` como foco inicial.
- [x] 7.4 Atualizar `logout-modal.spec.tsx`, `app-navbar.spec.tsx` e `app-sidebar.spec.tsx` para foco inicial, retorno de foco, erro, loading independente, cada API correta, duplo clique, Escape e responsividade básica.

## 8. Migração limitada de selects relacionados

- [x] 8.1 Migrar selects simples relacionados ao escopo em `apps/web/src/modules/premios/pages/premios.page.tsx` somente se a troca para o primitive compartilhado não redesenhar o fluxo nem copiar implementação específica do drawer de Prêmios.
- [x] 8.2 Registrar ocorrências fora de escopo em `apps/web/src/modules/acerto/**` e outras páginas como follow-up de migração do design system, sem ampliar esta change para redesign geral.

## 9. E2E, visual e gates finais

- [x] 9.1 Rodar testes unitários de `packages/shared`, `modules/access-control` e `modules/identity`, incluindo os novos testes de integridade e senha temporária.
- [x] 9.2 Rodar testes backend afetados em `apps/backend/test/identity` e `apps/backend/test/access-control` com Postgres real, cobrindo isolamento entre bancas, `OWNER`/`ADMIN`/`USER`, paginação, criação, atualização, mudança de papel, status, senha e sessões.
- [x] 9.3 Rodar testes Web (`apps/web`) cobrindo Select, Tabs/Collapsible, Dialog/Drawer, Configurações, Perfil e shell/logout.
- [x] 9.4 Rodar E2E ou teste de navegador para logout local/global e fluxos críticos de administração quando banco e navegador reais estiverem disponíveis; se não estiverem, manter a task aberta e registrar comando/bloqueio exato.
- [x] 9.5 Fazer validação visual manual em claro/escuro, desktop/mobile, com Dialog, Drawer e Select abertos; registrar contraste, foco visível, ausência de popup branco no dark mode e ausência de overlap de textos.
- [x] 9.6 Rodar `npm run lint`, `npm run check-types`, testes e build dos pacotes afetados; documentar qualquer falha pré-existente não relacionada.
- [x] 9.7 Confirmar por `git diff` que nenhum arquivo Prisma model/migration foi criado ou alterado.
- [x] 9.8 Rodar `openspec validate refine-tenant-user-administration-experience --strict` e corrigir todas as inconsistências antes de iniciar implementação.
