# Plano 06 — Acertos e Caixa

**Estado:** `DISCOVERY`  
**Changes candidatas:** `implement-settlements-mvp` e `implement-cashbox-mvp`  
**Diagrama:** `.docs/diagrams/06-settlements-cash.excalidraw`

`Settlement` liquida direitos/obrigações; `Cashbox` representa onde está o dinheiro; `CashMovement` registra entrada/saída real; `Expense/Advance` explica saída e possível débito do participante. Mesmo contexto financeiro, agregados diferentes.

Acertos são geralmente semanais, manuais, parciais/totais e podem envolver Cambista, Recolhe e outros. Combustível, manutenção, salário e adiantamento exigem auditoria/reversão.

Decisões: quantidade/ciclo dos caixas; caixa diário/turno; vínculo acerto-caixa; seleção de movimentos; parcial/sobra; despesas/adiantamentos; permissões/aprovações; dinheiro/Pix/outros meios.
