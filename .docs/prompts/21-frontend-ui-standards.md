# Spec Prompt: Padronização de Drawer, Status e Navegação de Configurações (Web)

> Prompt de preparação para uma **nova change OpenSpec**. Escopo exclusivamente **Web** (`apps/web`). Backend, contratos de API e regras de negócio **não** mudam.

---

## 0. Contexto e por que esta change existe

Esta é uma correção de **layout/arquitetura de UI**, não de regra de negócio. Ela fecha uma dívida deixada pelas duas changes anteriores (ambas **ainda não arquivadas**):

- `openspec/changes/enable-tenant-user-administration`
- `openspec/changes/refine-tenant-user-administration-experience`

A change `refine-...` já **declarou** (em `specs/web-interaction-primitives/spec.md`) que o padrão "linha abre drawer; criar/editar em drawer; ação destrutiva em modal" é **canônico**. Porém o **componente compartilhado nunca foi criado**: cada tela reimplementou o seu. Esta change entrega finalmente esse componente e migra as telas.

### Decisões já tomadas (não reabrir)

1. **Fundação técnica do Drawer**: componente **novo em `apps/web/src/shared/components/ui`**, construído sobre **Radix** (mesma família do `Dialog`/`Select` já usados), com foco gerenciado, fechamento por Escape, portal que herda os **tokens do tema ativo** (claro/escuro), replicando o **visual** do drawer de `Pessoas e Vínculos` e adicionando resize/maximizar. Pessoas é apenas **referência visual** — não é para portar o markup inline como está.
2. **Performance de testes** é **requisito desta change** (seção 8), não uma change separada.
3. **Estratégia OpenSpec**: esta é uma **change nova que estende** as specs de `web-interaction-primitives`/`web-frontend-testing`. Ao concluir, **arquivar** `enable-...` e `refine-...` como implementadas.

### Estado atual do código (fonte da verdade)

| Onde | O que é hoje | Ação |
|---|---|---|
| `src/modules/pessoas/pages/pessoas.page.tsx` | Drawer 100% inline (`style`+tokens `c`), com resize/maximizar/abas/footer por modo. Tela **mock** (dados de `pessoas.sample.ts`). | **Referência visual.** Migrar para o componente novo. |
| `src/modules/configuracoes/components/user-account-drawer.tsx` | Reinvenção sobre `Dialog` (Radix). Não é drawer real, sem resize/maximizar. | Migrar para o Drawer canônico. |
| `src/modules/acerto/components/AcertoDrawer.tsx` / `DetailDrawer.tsx` | Mais duas variações próprias. | Migrar para o Drawer canônico. |
| `src/shared/components/ui/` | Tem `dialog`, `select`, `tabs`, `accordion`, `button`, `badge`, etc. **Não tem `drawer`.** | Criar `drawer.tsx` (+ `drawer.spec.tsx`). |
| `src/modules/configuracoes/pages/configuracoes.page.tsx` | Navegação Usuários/Perfis via `Tabs`. | Trocar por navegação lateral por rota (seção 5). |

---

## 1. Objetivo

1. Criar **um único** componente de Drawer compartilhado, oficial para **Criar / Editar / Visualizar** em todo o sistema, eliminando os drawers duplicados.
2. Padronizar **status de registro** em apenas `Ativo`/`Inativo`, separando "status" de "ações" (ex.: bloquear).
3. Transformar **Configurações** em uma área com **navegação lateral por rota**, escalável.
4. Garantir que a padronização **não aumente** o tempo de execução dos testes — idealmente reduza, por consolidação.

Preservar todas as permissões e regras de negócio existentes.

---

## 2. Componente Drawer canônico

Arquivo: `apps/web/src/shared/components/ui/drawer.tsx` (+ testes). API composicional no estilo dos primitives existentes (ex.: `Dialog*`), controlada por `open`/`onOpenChange`.

### 2.1 Contrato mínimo (props / subcomponentes)

- **Estado**: `open`, `onOpenChange`.
- **Cabeçalho**: `title` dinâmico por contexto; botão **fechar**; botão **maximizar/restaurar**. Título acessível (`aria-labelledby`) e badge opcional de modo (ex.: "Visualização").
- **Modo**: `mode: 'create' | 'edit' | 'view'` — controla quais ações do rodapé aparecem.
- **Redimensionamento**: arraste horizontal por mouse **e** teclado; `minWidth`/`maxWidth` configuráveis; largura persistida por instância enquanto aberto. Maximizar ocupa praticamente toda a tela; restaurar volta à largura anterior.
- **Corpo**: scroll independente; suporte a **abas** (reusar/compor com o primitive `Tabs` já existente) seguindo o visual atual. Ex. de abas: Dados, Permissões, Segurança, Sessões, Endereços, Valores, Histórico.
- **Rodapé fixo**, ações dependentes do modo (seção 2.2).
- **Estados**: `loading` (bloqueia ações e mostra progresso), erro, `disabled`.
- **Acessibilidade**: foco inicial gerenciado, `focus trap`, fechamento por Escape, retorno de foco ao gatilho, portal herdando tokens do tema (claro/escuro) — sem "popup branco" no dark.

### 2.2 Rodapé por modo

- **Criar**: `Fechar` + `Salvar` (Salvar é o botão principal).
- **Editar**: `Excluir` (quando permitido) + `Fechar` + `Salvar Alterações` (principal).
- **Visualizar**: `Fechar` + `Editar` (quando permitido); `Excluir` quando permitido.
- Ações destrutivas (Excluir) usam **modal de confirmação** e `Button variant="destructive"` (token destrutivo canônico já previsto na spec de interaction-primitives).

### 2.3 Regras de uso (herda de `web-interaction-primitives`)

- Lista/tabela de recurso detalhável: **linha abre drawer**; criar/editar em drawer; destrutivo em modal.
- Cliques em controles internos da linha **não** propagam para abrir o drawer.
- Tabelas analíticas, relatórios, seleção em massa e formulários curtos contextualizados **não** são obrigados a usar drawer.

---

## 3. Padronização de Status

- Todo cadastro usa apenas **`Ativo` / `Inativo`**, com os mesmos componentes visuais (`Badge` + presentation helper, ver `account-status.presentation.ts`).
- **Não** usar "Ativar/Desativar/Bloquear" como se fossem o status.
- Bloqueio (quando existir) é **ação independente** do status: `Bloquear` / `Desbloquear`, exibidas separadamente das ações de status.
- Manter a semântica de status já vinda do backend — apenas **padronizar a apresentação**.

---

## 4. Componente reutilizável — regra geral

- Novos cadastros **devem** usar o Drawer canônico. Proibido criar novos drawers ad-hoc.
- Evitar duplicação de layout: o que for genérico vive em `shared/`; o que for específico do domínio (campos, abas, submit) vive no módulo e é injetado como conteúdo.

---

## 5. Área de Configurações — navegação lateral por rota

Substituir a navegação por `Tabs` por um **layout com sidebar interna**, usando **rotas reais** do App Router.

### 5.1 Rotas

Área sob `/(private)/configuracoes` com layout próprio (sidebar fixa) e sub-rotas, por exemplo:

```
/configuracoes            → redireciona para /configuracoes/geral (ou primeira permitida)
/configuracoes/geral
/configuracoes/usuarios
/configuracoes/perfis
/configuracoes/turnos
/configuracoes/jogo
/configuracoes/seguranca
/configuracoes/auditoria
```

(Menu de exemplo do produto: Geral, Usuários, Perfis de acesso, Turnos, Configuração do Jogo, Segurança, Auditoria, Outros. Itens ainda não implementados podem existir como placeholder já preparado.)

### 5.2 Comportamento

- Sidebar **fixa**, item selecionado **destacado**, navegação **por rota** (URL muda, deep-link funciona).
- **Interna** à área de Configurações — **não** substitui o menu principal (`_shell`).
- Expansão futura sem alterar o layout (adicionar rota = adicionar item).

---

## 6. Permissões (inalteradas no backend)

- Sem permissão de editar → esconder `Salvar`/`Salvar Alterações`.
- Sem permissão de excluir → esconder `Excluir`.
- Sem permissão de ver um submenu → esconder o item na sidebar de Configurações e proteger a rota (mesmo gate já usado, ex.: `useHasPermission('identity.accounts.list')`).
- Backend continua sendo a autoridade (403 nas chamadas reais); o frontend só oculta/gateia.

---

## 7. Escopo de migração

Revisar e migrar para o padrão, nesta ordem de prioridade:

1. **Configurações → Usuários** (`user-account-drawer.tsx`) e **Perfis de acesso**.
2. **Pessoas e Vínculos** (`pessoas.page.tsx`) — vira consumidora do componente que ela mesma inspirou.
3. **Acerto** (`AcertoDrawer.tsx`, `DetailDrawer.tsx`), **Cambistas**, **Turnos**.

Cada migração remove o drawer local e passa a usar o componente compartilhado, preservando os campos/abas/comportamento de dados atuais.

---

## 8. Performance de testes (requisito não-funcional)

Baseline medido: **236 testes / 42 suites**, ~**13s** (Jest) / ~**17s** com cold start, em ~8 núcleos. Suites mais caras são renders de página inteira (`usuarios-section` ~9,3s; `perfil.page` ~6,6s; `premios.page` ~6,2s) e overlays Radix no jsdom (o *focus-reentrancy guard* em `jest.setup.ts` é sintoma de focus-scopes aninhados).

Requisitos:

- **Não regredir** o tempo total do `npm run test` do Web após a change; meta: **igual ou menor** que o baseline.
- Testar o **Drawer canônico em isolamento** (unit): abrir/fechar, foco/retorno de foco, Escape, resize (mouse+teclado), maximizar/restaurar, rodapé por modo, `loading`, tema claro/escuro/portal. As páginas que o consomem **deixam de re-testar** o comportamento do drawer e cobrem só a integração específica do domínio (dados/campos/submit).
- Ao consolidar 3+ drawers em 1, remover os testes duplicados de comportamento de drawer espalhados por página.
- Avaliar (e registrar decisão) ajustes de configuração Jest que reduzam custo sem perder cobertura: `maxWorkers`, separar suites unit×integração, evitar render de página inteira quando um render de componente basta. Um Drawer único sobre um só focus-scope Radix deve **reduzir** a necessidade do reentrancy-guard.

---

## 9. Critérios de aceite

- Existe **um único** componente oficial de Drawer em `shared/components/ui/drawer.tsx`, com teste próprio.
- Todos os drawers do sistema usam esse componente; `user-account-drawer`, `AcertoDrawer`, `DetailDrawer` e o drawer inline de `pessoas` foram migrados/removidos.
- Drawer tem: fechar, maximizar/restaurar, redimensionar (mouse + teclado), rodapé padronizado por modo, título dinâmico, scroll de corpo independente, abas quando aplicável, `loading`.
- Overlay herda tokens do tema; sem fundo branco no dark mode; acessível por teclado e leitor de tela.
- Status usa apenas `Ativo`/`Inativo`; bloqueio (se houver) é ação separada.
- Configurações tem sidebar interna com navegação **por rota**; deep-link e destaque de item funcionam; item sem permissão fica oculto e a rota protegida.
- Permissões preservadas; **sem** regressão de regra de negócio; backend inalterado.
- Tempo de execução dos testes **≤ baseline**; comportamento do drawer testado uma vez (isolado), não replicado por página.

---

## 10. Perguntas em aberto (resolver ao propor a spec)

1. **Turnos / Configuração do Jogo / Auditoria** já têm dados/telas ou entram como placeholder de rota nesta change?
2. Onde persistir a **largura preferida** do drawer — só em memória por sessão, ou preferência do usuário (localStorage)?
3. **Excluir Pessoa/Usuário** existe de fato no backend hoje, ou o botão `Excluir` deve ficar oculto até haver endpoint?
4. Migração dos drawers de **Acerto** pode entrar nesta change ou vira fase 2 (para manter o diff revisável)?

---

## Observações finais

- Referência **visual**: drawer de `Pessoas e Vínculos`. Fundação **técnica**: Radix + primitives compartilhados.
- Ao mexer em componente global, validar todas as telas impactadas (claro/escuro, desktop/mobile, overlay aberto).
- Priorizar consistência visual, reuso e manutenibilidade. Não criar componente novo quando já houver padrão reutilizável.
