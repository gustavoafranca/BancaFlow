# Plano 03 — Núcleo Financeiro / Ledger

**Estado:** `DECISIONS_PENDING`  
**Change:** `implement-financial-ledger-mvp`  
**Diagrama:** `.docs/diagrams/03-finance-core.excalidraw`

## Modelo e regras

Extrato de direitos/obrigações separado de pagamento real: `FinancialAccount`, `LedgerEntry` imutável, `SourceReference` idempotente e `Reversal` compensatória. Saldo é projeção. Comissão cria direito; prêmio cria obrigação; acerto liquida; caixa registra dinheiro. Dinheiro não usa ponto flutuante.

## D16

`OWNER` configura política semanal versionada com percentual, `deductPrizes` e `deductAgentCompensation`. Base: `max(vendas - deduções habilitadas, 0)`. Confirmação manual gera crédito sem caixa. Prêmio tardio gera ajuste atual referenciando período original. Sem dívida/carry-forward de base negativa.

Casos candidatos: registrar movimento idempotente, consultar extrato/saldo, reverter, simular/confirmar fixo semanal e comissão sobre lucro.

Decisões bloqueantes: convenção crédito/débito; tipos de conta; permissões; arredondamento; definição da semana; reprocessamento/ajustes.
