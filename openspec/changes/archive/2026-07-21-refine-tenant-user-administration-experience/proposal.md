## Why

A change `enable-tenant-user-administration` entregou a administração funcional de usuários, mas a experiência visual e de interação ainda tem inconsistências que aparecem justamente nos fluxos mais sensíveis: senha temporária difícil de comunicar, overlays portaled sem herdar todos os tokens de tema, selects nativos com popup claro no dark mode, tabela de usuários sobrecarregada por ações pequenas, matriz de perfis longa demais e logout sem hierarquia destrutiva clara.

Este refinamento transforma essas correções em contratos canônicos do Web para que as próximas telas administrativas reutilizem os mesmos primitives, padrões de lista-detalhe, tema, permissões e paginação, sem reconstruir o fluxo nem alterar banco.

## What Changes

- Substituir o formato da senha temporária administrativa por um formato humano, gerado por CSPRNG, fácil de ditar e digitar, forte segundo `StrongPassword`, exibido uma única vez em criação e reset administrativo, com ação de copiar e sem log/persistência em texto puro.
- Corrigir a causa-raiz de tema em overlays portaled aplicando os tokens do tema ativo em um escopo que `document.body`/portals herdam, cobrindo Dialog, Drawer, Select e futuros overlays, em modo claro/escuro e durante troca de tema com overlay aberto.
- Criar um primitive compartilhado `Select` acessível, temático e compatível com React Hook Form, usando a mesma família Radix já adotada quando o select nativo não garantir popup escuro confiável.
- Refinar a seção **Usuários** para o padrão lista-detalhe: linha clicável/teclável abre drawer lateral, criação e edição usam drawer, detalhe organiza dados, papel, status, senha e sessões, e ações destrutivas/sensíveis continuam em modal de confirmação.
- Consolidar o padrão canônico Web: recursos com detalhe e edição usam linha → drawer; criação/edição em drawer; confirmação destrutiva em modal; tabelas analíticas, seleção em massa e formulários curtos contextualizados são exceções justificadas.
- Ajustar o logout unificado para uma confirmação destrutiva clara: variante `destructive` do `Button`, tokens destrutivos canônicos, ícone e hierarquia visual, ação principal “Sair deste dispositivo”, ação sensível secundária “Sair de todos os dispositivos”, loading independente e foco seguro.
- Organizar `/configuracoes` em abas de alto nível (**Usuários** e **Perfis de acesso**), com a aba de perfis explicando que os papéis são fixos, exibindo legenda e grupos recolhíveis por capability, sem chaves técnicas cruas quando há label/descrição.
- Atualizar a regra canônica do catálogo autoritativo: toda nova capability, rota, endpoint ou ação protegida deve declarar `PermissionKey`, metadados de apresentação, decisão explícita para `OWNER|ADMIN|USER`, enforcement backend, gate frontend pertinente, presença automática na matriz e testes de integridade.
- Tornar a paginação administrativa mais robusta: preservar `PaginatedInputDTO`, `PaginatedResultDTO` e `PaginationMetaDTO`, mas limitar `pageSize` HTTP a um teto seguro documentado, manter filtros ao navegar/drawer, evitar página inválida após filtros/mutações e exibir total/contexto legível.
- Não criar tabela, coluna, relação, migração Prisma, perfil de acesso persistido, permissão individual por usuário, CRUD de chaves de permissão, biblioteca visual concorrente ou segundo design system.

## Capabilities

### New Capabilities
- `web-interaction-primitives`: primitives e contratos canônicos do Web para tema portaled, Select, Button destrutivo, Tabs, Collapsible/Accordion e shell reutilizável de drawer/lista-detalhe.

### Modified Capabilities
- `tenant-user-administration`: refina a experiência da administração já entregue para lista-detalhe em drawer, criação/edição em drawer, senha temporária legível, página/filtros/paginação robustos e ações sensíveis por modal.
- `unified-logout-experience`: ajusta o modal único de logout para hierarquia destrutiva clara, estados independentes por ação, foco seguro, erro recuperável e responsividade estreita.
- `credential-management`: muda o contrato do gerador de senha temporária administrativa para formato humano com entropia documentada, mantendo `StrongPassword`, troca obrigatória e exibição única.
- `authoritative-permission-catalog`: adiciona Definition of Done obrigatório para evolução do catálogo e proteção automatizada contra chaves/metadata/matriz divergentes.
- `session-management`: preserva os contratos de logout local/global e sessões administrativas, acrescentando requisitos de UX para confirmações destrutivas que chamam esses contratos sem redirecionar antes do sucesso.
- `settings-capability-visibility`: torna Configurações uma área em abas de alto nível, visível somente ao `OWNER` nesta versão, com Usuários e Perfis de acesso separados e legíveis.
- `route-protection-frontend`: reforça gates por `PermissionKey` para rota, menu e ações relacionadas à administração, sem depender de papel bruto no cliente.
- `user-account-management`: formaliza paginação administrativa com limite máximo de `pageSize`, manutenção de filtros/contexto e recarregamento autoritativo após mutações.
- `web-component-inventory`: exige mapear selects nativos e overlays/primitives duplicados antes de migrar ou promover componente compartilhado.
- `web-component-ownership`: registra onde primitives compartilhados ficam e impede que composição específica de Usuário vaze para `shared`.
- `web-design-migration`: consolida tema, overlay, drawer, destructive button e Select como parte da convergência do design system, sem hardcode local.
- `web-frontend-boundaries`: reforça que primitives visuais ficam no Web compartilhado, contratos de domínio ficam nos módulos, e `packages/shared` não recebe componentes visuais.
- `web-frontend-testing`: amplia a matriz de testes para teclado, foco, leitor de tela, tema claro/escuro, overlay portaled, paginação, drawer e validação visual manual.

## Impact

- **Identity/backend**: trocar apenas o adapter concreto `CryptoTemporaryPasswordGenerator`, mantendo o port `TemporaryPasswordGenerator`, `StrongPassword`, use cases atuais de criação/reset e ausência de schema/migration; adicionar limite HTTP de `pageSize` em `ListUserAccountsDto` e testes.
- **Access Control**: reforçar integridade do catálogo/matriz e metadados de apresentação; reconciliar changes ativas consumidoras de permissões, especialmente `implement-participant-registration-mvp`.
- **Web compartilhado**: ajustar `ThemeProvider`/escopo de tokens, `Dialog`/drawer se necessário, adicionar `Select`, `Tabs`, `Collapsible` ou `Accordion` mínimos se não houver primitive existente, e adicionar `Button` destructive/tokens destrutivos.
- **Web Configurações**: refatorar `apps/web/src/modules/configuracoes/**` para abas, drawer de usuário, selects compartilhados, matriz recolhível e paginação/contexto legíveis.
- **Shell privado**: refinar `apps/web/src/app/(private)/_shell/logout-modal*` para confirmação destrutiva alinhada, loading por ação e responsividade.
- **Testes/validação**: unitários de domínio/adapters, componentes, integração, e2e com banco real, navegador para logout/overlays e validação visual manual em claro/escuro e desktop/mobile.
- **Sem impacto de banco**: nenhuma migration Prisma, tabela, coluna ou relação é autorizada por esta change.
