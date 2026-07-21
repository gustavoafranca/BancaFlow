# Plano 05 — Prêmios

**Estado:** `DECISIONS_PENDING`  
**Change:** `implement-agent-prizes-mvp`  
**Diagrama:** `.docs/diagrams/05-agent-prizes.excalidraw`

Agregado `Prize`: banca, Cambista, data, turno, valor, descrição livre, origem `DIRECT | CLAIM`, estado, auditoria e referência financeira.

Reclamação não é agregado no MVP; validada, vira `Prize(source=CLAIM)`. Confirmar cria obrigação idempotente. Pagamento/abatimento pertence a Acerto. Prêmio tardio cria ajuste atual referenciando origem, sem reabrir período.

Decisões: rascunho; papéis de registro/confirmação/reversão; anexos; prêmio sem turno; prevenção/alerta de duplicidade.
