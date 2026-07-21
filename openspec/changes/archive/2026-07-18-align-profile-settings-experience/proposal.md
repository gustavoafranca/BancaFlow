## Why

O item **Meu Perfil** do menu da conta (`app-navbar.tsx`) é hoje um `DropdownItem` sem `href`/`onClick` — clicar nele não faz nada, embora `/perfil` já exista e já leia/edite dados reais de `UserAccount` via `GET`/`PATCH /api/auth/me`. Ao mesmo tempo, `/perfil` mistura esses dados reais com valores estáticos ("Membro desde", "Último acesso", estatísticas, 2FA) e com sessões/atividade fabricadas por `perfil.sample.ts`, e `/configuracoes` (módulo inteiro em estado local, sem nenhuma chamada HTTP) apresenta usuários, perfis de acesso e turnos fictícios como se fossem CRUD funcional, incluindo botões "Salvar"/"Excluir" sem qualquer handler. Isso engana qualquer usuário autenticado sobre o que o produto realmente faz hoje e antecipa, na aparência, capabilities que os planos 08 (INC-02/INC-03) e 09 (INC-04, bloqueado por D44 aberta) ainda não implementaram. Esta change reconcilia a navegação e a renderização com a implementação real, sem adiantar nenhuma dessas capabilities.

## What Changes

- Tornar **Meu Perfil** um link de navegação real para `/perfil` no dropdown da conta (`app-navbar.tsx`), com semântica de navegação (não `<div onClick>`), acessível por teclado, fechando o dropdown ao ativar — igual para `OWNER`, `ADMIN` e `USER`.
- Remover a aparência interativa do item **Configurações** do mesmo dropdown (e de qualquer entrada equivalente no menu lateral), já que `/configuracoes` não tem nenhuma capability real por trás hoje; a rota direta continua acessível e segura.
- Remover de `/perfil` a renderização de "Membro desde", "Último acesso", estatísticas rápidas fixas, o toggle de 2FA demonstrativo, e as abas/seções de sessões e atividade construídas por `perfil.sample.ts` (incluindo o próprio arquivo, se ficar sem consumidor); manter apenas nome/e-mail (editáveis), username/papel/Banca (somente leitura) e os estados de loading/erro/edição/sucesso/conflito já implementados.
- Substituir o conteúdo de `/configuracoes` (hoje `configuracoes.sample.ts` + `lib/permissions.ts` + drawers sem persistência) por um estado honesto e acessível de "capability ainda não disponível", sem listas de usuários/perfis fictícios, sem toggles de permissão editáveis e sem botões que simulem criação/edição/exclusão sem persistência real.
- Atualizar/reescrever os testes de componente afetados (`app-navbar.spec.tsx`, `perfil.page.spec.tsx`, `configuracoes.page.spec.tsx`, `permissions.spec.ts` conforme aplicável) para provar a navegação real, a ausência dos mocks removidos e o novo estado honesto de `/configuracoes`.
- Cobrir a navegação **Meu Perfil → `/perfil`** com um E2E de navegador real contra um tenant `.localhost` isolado e seguro (`pw-e2e`, já seedado por `seed-e2e-playwright.ts`), independente do código de Banca usado — a jornada não depende de `farizeu` especificamente.
- Registrar explicitamente os follow-ups que esta change **não** resolve: plano 08 INC-02/INC-03 (administração de usuários) e plano 09 INC-04 (catálogo de permissões, bloqueado por D44).

**BREAKING**: nenhuma. Não há contrato de API alterado; `/configuracoes` deixa de exibir dados fabricados, mas a rota permanece renderizável e não removida.

## Capabilities

### New Capabilities
- `settings-capability-visibility`: define como `/configuracoes` (e qualquer navegação que aponte para ela) deve se apresentar honestamente enquanto suas capabilities reais (administração de usuários do plano 08, catálogo de permissões do plano 09) não existirem — sem dados de exemplo apresentados como reais, sem ações que simulem persistência, e com o item de menu correspondente refletindo essa ausência de capability em vez de aparentar navegação funcional.

### Modified Capabilities
- `self-profile-management`: passa a exigir que o item **Meu Perfil** do menu da conta seja navegação real para `/perfil` para qualquer papel autenticado, e reforça que a página não deve apresentar dados/ações sem fonte autoritativa (removendo os elementos hoje construídos por `perfil.sample.ts` e os valores estáticos de "Membro desde"/"Último acesso"/estatísticas/2FA).

## Impact

- **Código Web:** `apps/web/src/app/(private)/_shell/app-navbar.tsx` (e `app-sidebar.tsx` se houver entrada equivalente), `apps/web/src/modules/perfil/**` (remoção de `data/perfil.sample.ts` e das seções que o consomem em `pages/perfil.page.tsx`), `apps/web/src/modules/configuracoes/**` (substituição de `data/configuracoes.sample.ts` e `lib/permissions.ts` pelo novo estado honesto).
- **Testes:** `apps/web/src/app/(private)/_shell/app-navbar.spec.tsx`, `apps/web/src/modules/perfil/pages/perfil.page.spec.tsx`, `apps/web/src/modules/configuracoes/pages/configuracoes.page.spec.tsx`, `apps/web/src/modules/configuracoes/lib/permissions.spec.ts` (removido ou substituído conforme o destino de `permissions.ts`).
- **E2E:** `apps/web/e2e/perfil-navigation.e2e.spec.ts` (novo, real, contra o tenant isolado `pw-e2e.localhost`), `apps/web/e2e/README.md` e `apps/backend/.env.example` (reconciliação de exemplo `.localhost` vs. `.bancaflow.com.br` para dev/E2E vs. produção — apenas documentação/exemplo, sem alterar `TenantResolverMiddleware`/proxy).
- **Nenhum código Backend/domínio/Prisma afetado** além do exemplo de configuração citado acima.
- **Planos:** nenhuma alteração aos planos 08/09; nenhuma decisão `DECIDED` reaberta.
