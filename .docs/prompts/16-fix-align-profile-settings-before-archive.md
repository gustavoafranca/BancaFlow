# Prompt — Corrigir `align-profile-settings-experience` antes do arquivamento

## Missão

Continue a aplicação da change OpenSpec existente `align-profile-settings-experience` e corrija os achados finais de revisão que impedem seu arquivamento seguro.

Não crie uma nova change para a navegação/perfil/configurações, não reimplemente o que já está correto e não arquive automaticamente. O objetivo é substituir evidências falsas ou incompletas por testes reais, reconciliar a documentação/configuração de desenvolvimento e deixar a change pronta para uma última revisão humana.

## Como usar

Execute:

```text
/opsx:apply align-profile-settings-experience .docs/prompts/16-fix-align-profile-settings-before-archive.md
```

## Workflow obrigatório

1. Use a skill `openspec-apply-change`.
2. Anuncie explicitamente: `Using change: align-profile-settings-experience`.
3. Execute:

```bash
openspec status --change "align-profile-settings-experience" --json
openspec instructions apply --change "align-profile-settings-experience" --json
```

4. Leia integralmente todos os `contextFiles` retornados pelas instruções de apply.
5. Reabra em `tasks.md`, antes de alterar código, as tarefas cuja evidência foi invalidada:
   - `6.1` — teste de navegação por teclado;
   - `7.1` — E2E real do fluxo de navegação para o perfil;
   - `8.1` — documentação E2E, se ainda afirmar que o teste está bloqueado/skipped;
   - `8.3` — gates finais.
6. Se for necessário ajustar a estratégia E2E ou a fronteira documental de configuração local, atualize `proposal.md`, `design.md`, delta specs e `tasks.md` de forma coerente antes de implementar. Não altere somente uma tarefa deixando os demais artefatos contraditórios.
7. Implemente os achados na ordem definida neste prompt.
8. Marque cada tarefa novamente como concluída somente depois de produzir a evidência exigida.
9. Execute todos os gates finais e `openspec validate --strict`.
10. Entregue um relatório verificável e recomende `/opsx:archive` somente se nenhum teste estiver skipped e todos os gates passarem.

## Skills e referências obrigatórias

### Skill de orquestração

- `.claude/skills/openspec-apply-change/SKILL.md`.

### Critério arquitetural Web

- `.claude/skills/frontend-module-workflow/SKILL.md` e as referências exigidas de arquitetura, slice e testes.

Use `frontend-module-workflow` para revisar navegação, semântica, testes e E2E. Não use `config-new-module`, `config-shared-frontend` ou `import-cloud-design-next`: os módulos e o design já existem.

### Fontes da change

Leia todos os caminhos concretos retornados por `openspec instructions apply`, incluindo:

- `openspec/changes/align-profile-settings-experience/proposal.md`;
- `openspec/changes/align-profile-settings-experience/design.md`;
- `openspec/changes/align-profile-settings-experience/specs/self-profile-management/spec.md`;
- `openspec/changes/align-profile-settings-experience/specs/settings-capability-visibility/spec.md`;
- `openspec/changes/align-profile-settings-experience/tasks.md`.

### Código e testes obrigatórios

- `apps/web/src/app/(private)/_shell/app-navbar.tsx`;
- `apps/web/src/app/(private)/_shell/app-navbar.spec.tsx`;
- `apps/web/src/modules/perfil/pages/perfil.page.tsx` e seu teste;
- `apps/web/src/modules/configuracoes/pages/configuracoes.page.tsx` e seu teste;
- `apps/web/e2e/perfil-navigation.e2e.spec.ts`;
- `apps/web/e2e/login-to-dashboard.e2e.spec.ts`;
- `apps/web/e2e/README.md`;
- `apps/web/playwright.config.ts`;
- `apps/backend/scripts/seed-e2e-playwright.ts`;
- `apps/backend/.env.example`;
- configuração local relevante, lendo somente as variáveis relacionadas a host/tenant e sem expor outros valores de `.env`.

## Estado confirmado pela revisão

Não repita trabalho já validado:

- `Meu Perfil` já é um `Link` real para `/perfil`;
- o dropdown fecha via `onNavigate` no clique;
- `/perfil` preserva os dados autoritativos e removeu os mocks previstos;
- `/configuracoes` exibe um estado honesto e não oferece CRUD fictício;
- os arquivos de amostra/permissões foram removidos;
- lint, tipagem, testes unitários/componentes e build passaram;
- o ambiente local atual responde `available: true` para `farizeu.localhost` e a raiz redireciona para `/login`.

Os problemas restantes são de evidência E2E, cobertura real de teclado e reprodutibilidade da configuração local.

## Achado obrigatório 1 — O E2E não pode permanecer vazio ou skipped

### Problema atual

`apps/web/e2e/perfil-navigation.e2e.spec.ts` contém:

- `test.skip(true, ...)`, que ignora todo o roteiro;
- um corpo de teste vazio;
- comentário afirmando que `farizeu.localhost` está bloqueado, embora o ambiente local atual já responda `available: true` e redirecione `/` para `/login`.

Remover apenas o `test.skip` não resolve: um teste vazio passaria sem validar navegador, login, cookie, menu ou rota.

### Correção obrigatória

Implementar um E2E Playwright real que:

1. use um tenant e uma conta exclusivamente de teste, preparados por seed idempotente e protegido;
2. abra um host `.localhost` válido;
3. realize login real pelo navegador;
4. confirme que a sessão/cookies reais permitem entrar na área privada;
5. abra o menu da conta;
6. ative **Meu Perfil**;
7. confirme a URL final terminando em `/perfil`;
8. confirme pelo menos um dado autoritativo do usuário de teste na página;
9. prove que a navegação ocorreu sem cair em `/unavailable`.

O arquivo não pode conter `test.skip`, `test.fixme`, execução condicional que silenciosamente não rode o fluxo, nem corpo vazio.

### Segurança e isolamento do seed

- Não apague nem recrie a Banca real/local `farizeu` com credencial conhecida apenas para satisfazer o teste.
- Reutilize preferencialmente o tenant isolado `pw-e2e` e o seed seguro já existente em `seed-e2e-playwright.ts`.
- Preserve as travas existentes do seed: ambiente development/test, `ALLOW_E2E_SEED=true` explícito e banco local.
- Não registre senha, cookie ou token no relatório.

### Reconciliação do host esperado

Se o teste real usar `pw-e2e.localhost` em vez de `farizeu.localhost`, atualize antes os artefatos OpenSpec para expressar corretamente a intenção verificável:

- o comportamento **Meu Perfil → `/perfil`** é independente do código da Banca;
- o E2E deve usar um tenant `.localhost` isolado e seguro;
- `farizeu.localhost` continua como smoke test/manual de ambiente local, não como tenant que o runner pode destruir ou receber credencial fixa;
- a dependência `restore-localhost-tenant-routing` só permanece registrada se ainda existir uma falha reproduzível real.

Não altere o hostname do teste silenciosamente e não use dados reais para manter uma frase antiga da spec.

## Achado obrigatório 2 — O teste de teclado precisa realmente enviar `Enter`

### Problema atual

O teste chamado `"Meu Perfil" é navegável por teclado (foco + Enter aciona o link)` apenas executa `profileLink.focus()` e verifica `toHaveFocus()`. Ele não envia `Enter`, não aciona `onNavigate` e não comprova que o dropdown fecha.

### Correção obrigatória

Atualize o teste para:

1. abrir o menu da conta;
2. alcançar ou focar **Meu Perfil**;
3. enviar `Enter` por `userEvent.keyboard('{Enter}')`;
4. confirmar o `href="/perfil"`;
5. confirmar que o dropdown fechou na mesma interação;
6. manter a cobertura do clique por mouse separada.

O mock de `next/link`, se continuar necessário, deve reproduzir tanto clique quanto ativação nativa por teclado de um `<a>`. Não faça o teste passar chamando diretamente `onNavigate` ou uma função interna do componente.

## Achado obrigatório 3 — Configuração local precisa ser reproduzível

### Problema atual

O ambiente local em execução usa:

```env
BANCA_HOST_SUFFIX=".localhost"
```

e `farizeu.localhost` funciona, mas `apps/backend/.env.example` ainda apresenta `.bancaflow.com.br`. Um novo ambiente configurado a partir do exemplo pode reproduzir `/unavailable`.

Além disso, `apps/web/e2e/README.md` afirma simultaneamente que `.localhost` é o padrão de desenvolvimento e que o teste está bloqueado porque o ambiente só aceita `.bancaflow.com.br`.

### Correção obrigatória

Reconciliar configuração e documentação para distinguir explicitamente:

- desenvolvimento/E2E: `.localhost`;
- produção: `.bancaflow.com.br` configurado por variável de ambiente no deploy.

Atualize `apps/backend/.env.example` e a documentação relevante sem incluir secrets.

Esta correção é somente de exemplo/documentação operacional. Não altere o algoritmo do `TenantResolverMiddleware`, a fronteira de confiança de `X-Forwarded-Host`, proxy/CIDRs ou regras de segurança nesta change.

Se os artefatos atuais classificarem qualquer alteração em `.env.example` como fora de escopo absoluto, faça primeiro uma atualização mínima e coerente dos artefatos para permitir documentação de configuração necessária ao E2E, mantendo código de resolução de tenant fora de escopo.

## Revisões adicionais obrigatórias

### Texto de `/configuracoes`

Corrija a concordância do título atual. Use uma formulação natural, por exemplo:

```text
Área de configurações ainda não disponível
```

ou:

```text
Configurações ainda não estão disponíveis
```

Não reintroduza nenhum dado, submenu ou ação fictícia.

### Busca por resíduos

Confirme novamente a ausência de:

- `perfil.sample.ts`;
- `configuracoes.sample.ts`;
- `lib/permissions.ts` e `permissions.spec.ts`;
- imports, tipos, ícones ou testes órfãos decorrentes dessas remoções;
- `test.skip`/`test.fixme` no novo E2E de perfil.

Não trate skips de outras suítes, se existirem e forem alheios à change, como autorização para ignorar o E2E novo.

## Gates obrigatórios

### OpenSpec

```bash
openspec validate align-profile-settings-experience --strict
```

### Web

```bash
cd apps/web
npm run lint
npm run check-types
npm test -- --runInBand --no-cache
npm run build
```

### E2E de navegador

Com Postgres, backend e Web preparados conforme o README, execute explicitamente o arquivo:

```bash
cd apps/web
npx playwright test e2e/perfil-navigation.e2e.spec.ts
```

O resultado exigido é pelo menos um teste executado e aprovado. `1 skipped`, `no tests found`, teste vazio ou execução apenas de suíte mockada não satisfazem o gate.

Também confirme, sem expor credenciais:

- o endpoint de contexto retorna `available: true` para o host `.localhost` usado no teste;
- a raiz do host local não reescreve para `/unavailable`.

## Critérios de conclusão

Só considere a implementação pronta para arquivamento quando:

- o teste de teclado realmente enviar `Enter` e provar o fechamento do dropdown;
- o E2E Playwright possuir passos reais e passar sem skip;
- o seed usar somente dados isolados de teste;
- `.env.example`/README distinguirem desenvolvimento e produção sem contradição;
- o texto de `/configuracoes` estiver correto;
- nenhum mock removido tiver sido reintroduzido;
- todas as tarefas reabertas estiverem novamente concluídas com evidência;
- OpenSpec strict, lint, typecheck, testes, build e E2E estiverem verdes.

## Saída solicitada

Ao final, apresente:

- tarefas reabertas e concluídas nesta execução;
- arquivos alterados;
- estratégia segura de tenant/seed usada no E2E;
- quantidade de testes unitários/componentes executados;
- quantidade de testes Playwright executados, aprovados e skipped;
- resultado de lint, typecheck, build e OpenSpec strict;
- confirmação de que nenhum `test.skip`/corpo vazio permanece no E2E de perfil;
- desvios de artefatos atualizados, se houve reconciliação do hostname E2E;
- próximo comando recomendado.

Não execute `/opsx:archive` automaticamente. Apenas recomende o arquivamento se todos os critérios acima estiverem satisfeitos.
