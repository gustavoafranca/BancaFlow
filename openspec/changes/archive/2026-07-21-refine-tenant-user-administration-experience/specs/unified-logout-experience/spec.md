## ADDED Requirements

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
