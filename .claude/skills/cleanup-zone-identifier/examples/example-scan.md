# Exemplo — Scan (somente leitura)

```bash
./scan-zone-identifier.sh /home/gustavo/projetos/bancaflow
```

## Saída esperada

```
🔍 Procurando arquivos Zone.Identifier...

📁 Pasta:
 /home/gustavo/projetos/bancaflow

📦 Arquivos encontrados: 14

- src/teste.pdf:Zone.Identifier
- assets/logo.png:Zone.Identifier
- backup/file.zip:Zone.Identifier

📊 Estatísticas:
   Quantidade: 14
   Tamanho total: 1.2KiB
   Tempo de busca: 0.08s

💡 Sugestão: execute "/caminho/scripts/clean-zone-identifier.sh" "/home/gustavo/projetos/bancaflow" para remover esses arquivos com segurança.
```

## Quando nada é encontrado

```bash
./scan-zone-identifier.sh /home/gustavo/projetos/vazio
```

```
🔍 Procurando arquivos Zone.Identifier...

📁 Pasta:
 /home/gustavo/projetos/vazio

✅ Nenhum arquivo Zone.Identifier encontrado.
⏱️  Tempo de busca: 0.02s
```

## Erros comuns

```bash
./scan-zone-identifier.sh
# Erro: informe um caminho como parâmetro.

./scan-zone-identifier.sh /
# Erro: execução na raiz do sistema (/) não é permitida.

./scan-zone-identifier.sh /caminho/que/nao/existe
# Erro: a pasta '/caminho/que/nao/existe' não existe.
```
