#!/usr/bin/env bash
# Modo interativo: pede o caminho, executa o scan e pergunta antes de limpar.
#
# Uso:
#   ./interactive-clean.sh
set -euo pipefail

DIR_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR_SCRIPT}/_common.sh"

main() {
  echo "Informe o caminho da pasta:"
  read -r caminho

  "${DIR_SCRIPT}/scan-zone-identifier.sh" "$caminho"

  echo
  echo -ne "Deseja remover os arquivos encontrados? [y/N] "
  read -r resposta
  if [[ "$resposta" =~ ^[YySs]$ ]]; then
    "${DIR_SCRIPT}/clean-zone-identifier.sh" "$caminho" --yes
  else
    echo -e "${COR_AZUL}Operação cancelada. Nenhum arquivo foi removido.${COR_RESET}"
  fi
}

main "$@"
