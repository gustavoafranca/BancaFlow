# unified-logout-experience Specification

## Purpose
TBD - created by archiving change enable-tenant-user-administration. Update Purpose after archive.
## Requirements
### Requirement: A single Sair action replaces the separate logout actions in the private shell
O shell privado (`app-navbar.tsx` e `app-sidebar.tsx`) SHALL apresentar uma única ação chamada **Sair** em cada ponto onde logout é oferecido, substituindo as ações separadas e diretas de logout/logout-all hoje existentes. Nenhum dos dois pontos SHALL chamar `logout()`/`logoutAll()` diretamente ao clicar; ambos SHALL apenas abrir o mesmo modal.

#### Scenario: Navbar shows a single Sair action
- **WHEN** um usuário autenticado abre o dropdown de perfil na navbar
- **THEN** existe uma única ação **Sair**, sem as duas ações separadas anteriores ("Sair" e "Sair de todos os dispositivos" como cliques diretos)

#### Scenario: Sidebar shows a single Sair action
- **WHEN** um usuário autenticado visualiza o rodapé do sidebar
- **THEN** existe uma única ação **Sair**, que abre o mesmo modal usado pela navbar

#### Scenario: Neither entry point calls the auth API directly
- **WHEN** o usuário clica em **Sair** na navbar ou no sidebar
- **THEN** nenhuma chamada a `logout()`/`logoutAll()` ocorre antes de o modal ser aberto e uma opção ser escolhida dentro dele

### Requirement: Unified logout modal offers device-scoped and all-devices logout
Ao acionar **Sair**, o sistema SHALL abrir um único modal acessível (reutilizando `shared/components/ui/dialog.tsx`) com título, explicação curta, e três ações: **Sair deste dispositivo** (chama `logout()`), **Sair de todos os dispositivos** (chama `logoutAll()`) e **Cancelar**. O modal SHALL ter foco inicial adequado, fechar por Escape quando seguro (fora de um estado de processamento), devolver o foco ao elemento que abriu o modal ao fechar, exibir estado de processamento durante a chamada, prevenir cliques duplicados, e exibir erro visível em caso de falha.

#### Scenario: Modal opens with the three actions
- **WHEN** o usuário aciona **Sair**
- **THEN** o modal abre com **Sair deste dispositivo**, **Sair de todos os dispositivos** e **Cancelar** visíveis e com foco inicial em um controle seguro (não destrutivo)

#### Scenario: Device-scoped logout calls the current logout API
- **WHEN** o usuário confirma **Sair deste dispositivo**
- **THEN** o sistema chama exclusivamente `logout()`, revogando apenas a sessão do dispositivo atual

#### Scenario: All-devices logout calls the logout-all API
- **WHEN** o usuário confirma **Sair de todos os dispositivos**
- **THEN** o sistema chama exclusivamente `logoutAll()`, revogando todas as sessões da conta

#### Scenario: Cancel closes the modal without side effects
- **WHEN** o usuário clica em **Cancelar** ou pressiona Escape fora de um estado de processamento
- **THEN** o modal fecha, nenhuma chamada de logout é feita, e o foco retorna ao elemento (navbar ou sidebar) que abriu o modal

#### Scenario: Escape is ignored while a logout request is processing
- **WHEN** o usuário pressiona Escape enquanto `logout()` ou `logoutAll()` está em andamento
- **THEN** o modal permanece aberto até a requisição concluir, evitando um fechamento que deixe o estado de sessão indefinido para o usuário

#### Scenario: Double-click is prevented during processing
- **WHEN** o usuário clica novamente em **Sair deste dispositivo** ou **Sair de todos os dispositivos** enquanto a primeira chamada ainda está em andamento
- **THEN** o segundo clique é ignorado; nenhuma segunda requisição é disparada

#### Scenario: Failure is shown visibly without navigating away
- **WHEN** `logout()` ou `logoutAll()` falha (erro de rede ou resposta de erro do Backend)
- **THEN** o modal permanece aberto, exibe uma mensagem de erro visível e acessível, e o usuário pode tentar novamente ou cancelar

#### Scenario: Successful logout redirects to login exactly once
- **WHEN** `logout()` ou `logoutAll()` responde com sucesso
- **THEN** o sistema redireciona para `/login` uma única vez, sem depender de o cliente limpar cookies (a limpeza ocorre via `Set-Cookie` do Backend na própria resposta)

### Requirement: Modal state is shared across the shell to prevent divergence
O estado de abertura/fechamento e de processamento do modal de logout SHALL ser controlado por um único provedor compartilhado no shell privado, consumido tanto por `app-navbar.tsx` quanto por `app-sidebar.tsx`, de modo que não existam duas instâncias divergentes do modal ou de seu estado.

#### Scenario: Opening from either entry point uses the same modal instance
- **WHEN** o modal é aberto a partir da navbar em uma interação, e do sidebar em outra
- **THEN** ambas as interações abrem exatamente o mesmo componente de modal, controlado pelo mesmo estado compartilhado

#### Scenario: Security tab session list is not degraded
- **WHEN** o modal único de logout é introduzido
- **THEN** a aba Segurança de `/perfil` continua listando e revogando sessões individuais exatamente como antes, sem nenhuma regressão de comportamento

### Requirement: Logout modal presents destructive hierarchy clearly
O modal único de logout SHALL distinguir ação segura, ação principal e ação sensível: `Cancelar` com foco inicial preferencial, `Sair deste dispositivo` como ação principal recomendada, e `Sair de todos os dispositivos` como ação secundária sensível usando tokens destrutivos sem competir visualmente com a principal.

#### Scenario: Modal opens with safe initial focus and aligned actions
- **WHEN** o usuário abre o modal de logout
- **THEN** o foco inicial fica em `Cancelar`, as ações cabem em telas estreitas sem quebra confusa e cada opção explica seu efeito de forma curta

### Requirement: Logout modal tracks processing per selected action
O modal SHALL manter estado de processamento independente para logout local e global. Apenas a opção escolhida SHALL exibir loading, ambas as ações SHALL impedir duplo envio enquanto uma chamada está em andamento, e falha SHALL manter o modal aberto com erro acessível.

#### Scenario: Only chosen logout action shows loading
- **WHEN** o usuário escolhe `Sair de todos os dispositivos`
- **THEN** somente essa opção indica carregamento, nenhuma segunda chamada é disparada e o redirecionamento ocorre apenas após sucesso

