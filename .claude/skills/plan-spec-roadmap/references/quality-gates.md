# Gates de qualidade

## Definition of Ready

Recalcular o gate a partir do conteúdo e das evidências atuais. O campo de estado e checkboxes marcados não bastam quando houver contradições, links quebrados ou artefatos desatualizados.

Exigir antes de `READY_FOR_SPEC`:

- objetivo, valor, escopo e fora de escopo claros;
- atores, permissões e jornadas relevantes definidos;
- dependências e impactos conhecidos;
- zero decisão `CRITICAL/OPEN`;
- incremento selecionado com resultado vertical, dependências, change name e capability specs definidos;
- demais increments explicitamente fora do escopo do prompt atual;
- domínio, invariantes, estados e falhas aplicáveis descritos;
- casos de uso e critérios de aceitação verificáveis;
- segurança, tenancy, auditoria, idempotência e concorrência avaliadas;
- persistência, Backend, Web, eventos e migração marcados como definidos ou não aplicáveis;
- estratégia de testes e riscos registrada;
- diagrama atualizado ou explicitamente não aplicável;
- inconsistências entre fontes resolvidas ou bloqueadas.

## Definition of Done

Exigir antes de documentação/arquivamento:

- entregas implementadas ou desvios aprovados;
- critérios de aceitação rastreados a testes/evidências;
- segurança, isolamento e migrações verificados quando aplicáveis;
- plano, spec, código e testes comparados;
- divergências classificadas e resolvidas ou aceitas;
- documentação operacional e de usuário atualizada quando aplicável;
- rollout, rollback e observabilidade confirmados quando aplicáveis;
- revisão e autorização de arquivamento registradas.

## Relatório de revisão

Separar em: conformidades comprovadas, divergências, lacunas, riscos residuais e itens não verificáveis. Para cada afirmação, citar arquivo, teste, comando, saída ou decisão. Não afirmar conformidade por ausência de falha observada.
