# Exemplo — Limpeza (com confirmação)

```bash
./clean-zone-identifier.sh /home/gustavo/projetos/bancaflow
```

## Saída esperada

```
🔍 Procurando arquivos Zone.Identifier para remoção...

📁 Pasta:
 /home/gustavo/projetos/bancaflow

⚠️  Foram encontrados 14 arquivos Zone.Identifier

- src/teste.pdf:Zone.Identifier
- assets/logo.png:Zone.Identifier
- backup/file.zip:Zone.Identifier

Deseja remover? [y/N] y

🧹 Arquivos removidos com sucesso!
   Removidos: 14/14
   Tempo: 0.05s
```

## Cancelando a remoção

```
Deseja remover? [y/N] n
Operação cancelada. Nenhum arquivo foi removido.
```

## Modo interativo

```bash
./interactive-clean.sh
```

```
Informe o caminho da pasta:
/home/gustavo/projetos/bancaflow

🔍 Procurando arquivos Zone.Identifier...
...
📦 Arquivos encontrados: 14
...

Deseja remover os arquivos encontrados? [y/N] y

🔍 Procurando arquivos Zone.Identifier para remoção...
...
🧹 Arquivos removidos com sucesso!
   Removidos: 14/14
```

## Regras de segurança em ação

```bash
./clean-zone-identifier.sh /
# Erro: execução na raiz do sistema (/) não é permitida.

./clean-zone-identifier.sh
# Erro: informe um caminho como parâmetro.
```
