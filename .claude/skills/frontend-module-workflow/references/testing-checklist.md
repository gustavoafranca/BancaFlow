# Testing Checklist

Stack real de `apps/web`: Jest + `jest-environment-jsdom` + Testing Library (`npm run test`), Playwright para E2E (`npm run test:e2e`, arquivos `e2e/**/*.e2e.spec.ts`). Specs unit/component ficam colocados junto do arquivo (`*.spec.ts`/`*.spec.tsx`), como em `shared/components/ui/button.spec.tsx` e `modules/pessoas/pages/pessoas.page.spec.tsx`.

## Matriz por tipo de mudança

| Mudança | Testes esperados |
|---|---|
| Novo mapper/schema/util puro | Unit (`*.spec.ts`): casos normais + bordas (vazio, zero, opcional ausente) |
| Novo componente visual (shared ou módulo) | Component test (`*.spec.tsx`) com Testing Library: renderização, props obrigatórias, estados (loading/error/empty) se aplicável |
| Componente com interação (`'use client'`) | Component test cobrindo o evento (`userEvent`), não só render estático |
| Acessibilidade de um componente interativo novo (dialog, drawer, menu) | Verificar roles/labels acessíveis (`getByRole`, `aria-*`) no component test; não introduzir um elemento clicável sem role/semântica adequada |
| Nova/alterada rota em `app/**` | Se a rota mudar de pública→privada ou vice-versa, teste (ou revisão manual documentada) do comportamento do `proxy.ts`/matcher para essa rota |
| Novo endpoint consumido (`data/*.client.ts`) | Unit do cliente HTTP mockando `fetch`, cobrindo cada branch de `status` (`success`/`error`/códigos específicos), seguindo o padrão de `shared/api/auth.client.spec.ts` se existir um equivalente |
| Fluxo completo relevante para o usuário (login, criação de um registro, navegação entre telas) | E2E Playwright (`e2e/*.e2e.spec.ts`), seguindo o padrão de `e2e/login-to-dashboard.e2e.spec.ts` |
| Mudança visual ampla (refino de tela importada do Claude Design, mudança de tema) | Revisão manual em `npm run dev` nos dois breakpoints principais (mobile/desktop) — o projeto não tem regressão visual automatizada; não afirmar "conferido visualmente" sem ter rodado |
| Qualquer mudança | `npm run check-types` (typegen + `tsc --noEmit`) e `npm run lint` na raiz do app antes de reportar concluído |

## Gates globais

- Rodar `npm run test` (Jest) e `npm run check-types` no app `apps/web` antes de marcar uma task como concluída.
- Rodar `npm run test:e2e` quando a mudança afeta um fluxo coberto por um spec E2E existente, ou quando a tarefa pede explicitamente um novo E2E.
- Não editar um teste existente só para fazê-lo passar sem entender por que falhou — se o teste estava certo e o código quebrou o contrato, corrigir o código.
- Reportar no final da Fase 8 quais desses comandos rodaram e o resultado — nunca declarar "testado" sem ter executado.
