---
name: cleanup-zone-identifier
description: Localizar e remover arquivos `*:Zone.Identifier` (metadados NTFS gerados pelo Windows) em qualquer pasta acessada via WSL2/Ubuntu. Oferece modo somente leitura (scan), modo de limpeza com confirmação e modo interativo. Usar quando o pedido for "limpa zone identifier", "remove duplicações do wsl", "limpar arquivos identifier", "apagar arquivos do windows no wsl", "scan de zone identifier" ou variações sobre arquivos de metadados do Windows aparecendo dentro do WSL.
---

# Cleanup Zone.Identifier

## Objetivo

Ao copiar arquivos do Windows para dentro do WSL (via Explorer, downloads do navegador no Windows, etc.), o NTFS grava um metadado extra chamado "Alternate Data Stream" (ADS) com informação de origem do arquivo. No WSL, esse metadado aparece como um arquivo separado com o sufixo `:Zone.Identifier`, por exemplo:

```
arquivo.pdf:Zone.Identifier
imagem.png:Zone.Identifier
backup.zip:Zone.Identifier
```

Esses arquivos são apenas metadados de segurança do Windows (indicam a "zona" de onde o arquivo veio — internet, rede, etc.) e normalmente podem ser removidos sem nenhum impacto no projeto ou no arquivo original.

Esta skill localiza esses arquivos em qualquer pasta, mostra quantidade/tamanho/local e remove com segurança, sempre pedindo confirmação antes de apagar.

## Como funciona

A skill tem três scripts, todos em `scripts/`:

1. **`scan-zone-identifier.sh <caminho>`** — busca somente leitura. Lista os arquivos encontrados, quantidade, tamanho total e tempo de busca. Nunca apaga nada.
2. **`clean-zone-identifier.sh <caminho>`** — faz a mesma busca, mostra a lista e pede confirmação (`[y/N]`) antes de remover. Reporta quantos foram removidos.
3. **`interactive-clean.sh`** — modo guiado: pergunta o caminho, executa o scan e depois pergunta se deve limpar.

Todos os scripts compartilham `scripts/_common.sh`, que centraliza as validações de segurança e a busca dos arquivos.

## Estrutura

```
cleanup-zone-identifier/
├── SKILL.md
├── scripts/
│   ├── _common.sh                 # funções compartilhadas (validação, busca, formatação)
│   ├── scan-zone-identifier.sh    # modo somente leitura
│   ├── clean-zone-identifier.sh   # modo de limpeza com confirmação
│   └── interactive-clean.sh       # modo interativo (pergunta o caminho)
└── examples/
    ├── example-scan.md
    └── example-clean.md
```

## Comandos

```bash
# Somente localizar (não apaga nada)
.claude/skills/cleanup-zone-identifier/scripts/scan-zone-identifier.sh <caminho>

# Localizar e remover, com confirmação
.claude/skills/cleanup-zone-identifier/scripts/clean-zone-identifier.sh <caminho>

# Modo interativo (pergunta o caminho)
.claude/skills/cleanup-zone-identifier/scripts/interactive-clean.sh
```

## Fluxo de uso

1. Rodar `scan-zone-identifier.sh <caminho>` para ver o que existe (recomendado sempre rodar primeiro).
2. Revisar a lista e a estatística de quantidade/tamanho.
3. Se estiver tudo certo, rodar `clean-zone-identifier.sh <caminho>` e confirmar com `y`.
4. Alternativamente, usar `interactive-clean.sh` para fazer os dois passos em um fluxo só, sem digitar o caminho duas vezes.

Veja exemplos completos de saída em [`examples/example-scan.md`](examples/example-scan.md) e [`examples/example-clean.md`](examples/example-clean.md).

## Casos de uso reconhecidos

- "limpa zone identifier"
- "remove duplicações do wsl"
- "limpar arquivos identifier"
- "apagar arquivos do windows no wsl"
- "scan de zone identifier"
- Qualquer pedido para localizar/remover arquivos `*:Zone.Identifier` em um projeto

## Regras de segurança

- **Bloqueia execução em `/`**: nunca varre ou apaga a partir da raiz do sistema.
- **Bloqueia caminho vazio**: `clean-zone-identifier.sh` e `scan-zone-identifier.sh` exigem o parâmetro `<caminho>`; sem ele, o script aborta com erro.
- **Valida existência da pasta** antes de qualquer busca.
- **Nunca usa `sudo` automaticamente** — se um arquivo exigir privilégios elevados para ser removido, o script reporta a falha em vez de escalar permissões sozinho.
- **Preview antes de apagar**: a limpeza sempre lista os arquivos encontrados e pede confirmação (`[y/N]`, aceita `s`/`S` para "sim") antes de remover qualquer coisa.
- **Ignora pastas pesadas por padrão**: `node_modules`, `.git`, `dist` e `build` nunca são varridas, evitando buscas lentas ou remoções em pastas geradas/versionadas.

## Observações sobre WSL e NTFS

- O sufixo `:Zone.Identifier` vem de um recurso do NTFS chamado _Alternate Data Streams_ (ADS), usado pelo Windows para marcar a "zona de segurança" de onde um arquivo veio (ex.: Internet, rede local).
- Esse metadado só aparece como arquivo separado quando o filesystem NTFS é acessado por fora do Windows (como no WSL) — no Windows nativo ele fica "escondido" dentro do próprio arquivo e não aparece no Explorer.
- Remover esses arquivos **não afeta o conteúdo do arquivo original** (`arquivo.pdf` continua intacto); apenas descarta a marcação de origem.
- Costumam se acumular bastante em projetos grandes quando arquivos são copiados em lote do Windows (ex.: assets, anexos, backups) — rodar o scan periodicamente evita ruído em buscas e diffs.

## Alias sugerido

Para rodar o modo interativo de qualquer lugar, adicione ao seu `~/.bashrc` ou `~/.zshrc`:

```bash
alias cleanzone="bash /home/gustavo/Projetos/BancaFlow/.claude/skills/cleanup-zone-identifier/scripts/interactive-clean.sh"
```

Depois de `source ~/.bashrc` (ou reabrir o terminal), basta digitar `cleanzone`.

## Melhorias futuras sugeridas

- Flag `--yes`/`-y` para pular a confirmação em automações (ex.: rodar no `postCreateCommand` de um devcontainer).
- Flag `--ignore` para customizar as pastas ignoradas por execução, sem editar `_common.sh`.
- Opção de mover os arquivos para uma lixeira temporária (`~/.cache/zone-identifier-trash`) em vez de apagar direto, com expiração automática.
- Hook de `git` (pre-commit) para alertar se algum `*:Zone.Identifier` for staged por engano.
