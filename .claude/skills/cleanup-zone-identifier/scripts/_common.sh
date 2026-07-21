#!/usr/bin/env bash
# Funções compartilhadas pelos scripts de limpeza de Zone.Identifier.
# Não é executado diretamente: é carregado via `source` pelos outros scripts.

readonly COR_AZUL='\033[1;34m'
readonly COR_VERDE='\033[1;32m'
readonly COR_AMARELO='\033[1;33m'
readonly COR_VERMELHO='\033[1;31m'
readonly COR_RESET='\033[0m'

# Pastas sempre ignoradas na busca (evita descer em node_modules, .git etc.)
readonly PASTAS_IGNORADAS=(node_modules .git dist build)

# Valida o caminho recebido como parâmetro.
# Bloqueia: caminho vazio, raiz do sistema (/) e caminhos inexistentes.
validar_caminho() {
  local caminho="$1"

  if [[ -z "$caminho" ]]; then
    echo -e "${COR_VERMELHO}Erro: informe um caminho como parâmetro.${COR_RESET}" >&2
    echo "Uso: $0 <caminho>" >&2
    exit 1
  fi

  if [[ "$caminho" == "/" ]]; then
    echo -e "${COR_VERMELHO}Erro: execução na raiz do sistema (/) não é permitida.${COR_RESET}" >&2
    exit 1
  fi

  if [[ ! -d "$caminho" ]]; then
    echo -e "${COR_VERMELHO}Erro: a pasta '${caminho}' não existe.${COR_RESET}" >&2
    exit 1
  fi
}

# Imprime (com terminador \0) os arquivos *:Zone.Identifier encontrados
# dentro do caminho informado, ignorando as PASTAS_IGNORADAS.
buscar_arquivos() {
  local caminho="$1"
  find "$caminho" \
    \( -path "*/node_modules/*" -o -path "*/.git/*" -o -path "*/dist/*" -o -path "*/build/*" \) -prune \
    -o -type f -name "*:Zone.Identifier" -print0
}

# Converte bytes para um formato legível (KiB/MiB/GiB), com fallback
# caso `numfmt` não esteja disponível no sistema.
formatar_tamanho() {
  local bytes="$1"
  numfmt --to=iec-i --suffix=B "$bytes" 2>/dev/null || echo "${bytes} bytes"
}
