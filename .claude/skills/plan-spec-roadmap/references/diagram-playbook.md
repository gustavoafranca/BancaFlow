# Playbook de diagrama Excalidraw

## Frames

Manter frames separados para:

1. atores e jornada;
2. sucessos e falhas;
3. domínio e agregados;
4. portas e adapters;
5. dependências e eventos;
6. legenda, regras e pendências.

## Regras de edição

- Ler o arquivo existente antes de editar e preservar elementos, IDs e agrupamentos úteis.
- Preferir acrescentar ou reorganizar a recriar o diagrama inteiro.
- Usar cores e formas de forma consistente; explicar a semântica na legenda.
- Diferenciar confirmado, hipótese, pendência e fora de escopo visualmente.
- Evitar um diagrama monolítico e conexões cruzadas sem rótulo.
- Manter texto curto no desenho e detalhes normativos no plano.
- Validar que o JSON permanece editável e que referências do plano apontam para o arquivo correto.

## Sincronização

Após alterar o plano, atualizar apenas os frames afetados. Se houver divergência, registrar pendência no diagrama e considerar o plano textual como autoridade até reconciliação.
