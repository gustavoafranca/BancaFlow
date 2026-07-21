# Plano 04 — Lançamentos

**Estado:** `DECISIONS_PENDING`  
**Change:** `implement-agent-entries-mvp`  
**Diagrama:** `.docs/diagrams/04-agent-entries.excalidraw`

Registrar por Cambista, data e turno: venda bruta e dinheiro entregue. `AgentEntry` guarda banca, Cambista, data, turno, valores, snapshot da política, comissão, valor esperado, variação de saldo e estado.

Invariantes: um por `(banca,cambista,data,turno)`; lançamento zerado não é criado (D17); Cambista/turno ativos e da banca; snapshot imutável; confirmação gera movimentos idempotentes.

`expectedRemittance = grossSales - agentCompensation`  
`balanceDelta = cashRemitted - expectedRemittance`

Decisões: rascunho ou confirmação imediata; prazo/permissão de correção; entrega maior que venda; cancelamento após reflexo financeiro; consequência de não distinguir “não trabalhou”, “vendeu zero” e “faltou lançar”.
