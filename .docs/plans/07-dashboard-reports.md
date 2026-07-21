# Plano 07 — Dashboard e Relatórios

**Estado:** `DISCOVERY`  
**Change:** `implement-operational-dashboard-reports-mvp`  
**Diagrama:** `.docs/diagrams/07-dashboard-reports.excalidraw`

Dashboard básico: lançamentos, vendas e dinheiro entregue por dia/turno. Administração: maiores vendedores, créditos, débitos, devedores e caixa. Relatórios por Cambista/geral: vendas, prêmios, comissões e acertos em períodos diário a trimestral.

Usar queries/read models CQRS filtrados por banca/permissão. Indicadores finais dependem da estabilização dos eventos e significados financeiros anteriores.
