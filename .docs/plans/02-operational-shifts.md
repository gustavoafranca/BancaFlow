# Plano 02 — Turnos

**Estado:** `READY_FOR_SPEC`  
**Change:** `implement-operational-shifts-mvp`  
**Diagrama:** `.docs/diagrams/02-operational-shifts.excalidraw`

Cada banca cria, lista, renomeia, ativa e inativa turnos usados em lançamentos/prêmios. Turno possui nome e estado; nome normalizado é único por banca; turno usado não é excluído e inativo não recebe fatos novos.

Domínio candidato: agregado `OperationalShift`; VOs `OperationalShiftId`, `ShiftName`, `ShiftStatus`, `BancaId`; portas `OperationalShiftRepository`/`OperationalShiftQuery`; casos de uso de criar, renomear, ativar, inativar, obter e listar.

Fora do MVP: hora inicial/final, cutoff, sorteio e janela de apostas; pertencem futuramente a `BettingWindow/DrawSchedule`.

Aceitação: bancas distintas podem ter “Manhã”; uma banca não pode ter duplicata após normalização. Histórico mostra turno inativado.
