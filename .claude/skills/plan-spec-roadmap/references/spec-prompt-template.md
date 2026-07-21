# Guia para prompt de spec

## Pré-condição

Gerar o prompt somente com o plano comprovadamente em `READY_FOR_SPEC`. Caso contrário, listar decisões críticas, seções incompletas, dependências ou critérios de aceitação que bloqueiam o gate e parar.

## Conteúdo obrigatório

O prompt deve ser autocontido e incluir:

1. objetivo e resultado esperado;
2. fontes a ler e precedência entre elas;
3. incremento selecionado, resultado vertical, change name em kebab-case e capability specs afetadas;
4. área/trilha e caminho exato do plano, quando o projeto agrupar artefatos;
5. escopo do incremento e demais increments explicitamente fora de escopo;
6. decisões e alternativas rejeitadas;
7. atores, permissões, cenários de sucesso e falha;
8. invariantes, concorrência e idempotência aplicáveis;
9. entregas de Negócio, Backend e Web aplicáveis;
10. persistência, eventos, migração e compatibilidade aplicáveis;
11. segurança, tenancy, auditoria e requisitos não funcionais;
12. testes e critérios de aceitação;
13. skills, ferramentas e convenções locais relevantes;
14. conflitos conhecidos com código ou documentação;
15. instrução explícita para propor a spec/change sem implementar.

## OpenSpec

Com OpenSpec, pedir uma proposta completa conforme o workflow local, mas não executar comandos. Sem OpenSpec, pedir artefatos equivalentes de proposta, design, requisitos/cenários e tarefas, mantendo os mesmos gates.

## Pós-condição

Criar apenas o arquivo de prompt. Manter o plano em `READY_FOR_SPEC` até que a change/spec exista; só então registrar `SPEC_PROPOSED` com referência verificável.
