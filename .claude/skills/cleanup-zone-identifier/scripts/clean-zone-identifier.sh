#!/usr/bin/env bash
# Remove (com confirmação) arquivos *:Zone.Identifier dentro de um caminho.
#
# Uso:
#   ./clean-zone-identifier.sh <caminho> [--yes]
#
# --yes: pula a pergunta de confirmação (usado internamente pelo
#        interactive-clean.sh, que já confirmou com o usuário antes de chamar
#        este script).
set -euo pipefail

DIR_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR_SCRIPT}/_common.sh"

main() {
  local caminho="${1:-}"
  local confirmar_automaticamente="${2:-}"
  validar_caminho "$caminho"

  local caminho_absoluto
  caminho_absoluto="$(cd "$caminho" && pwd)"

  echo -e "${COR_AZUL}🔍 Procurando arquivos Zone.Identifier para remoção...${COR_RESET}"
  echo
  echo -e "📁 Pasta:"
  echo -e " ${caminho_absoluto}"
  echo

  local arquivos=()
  while IFS= read -r -d '' arquivo; do
    arquivos+=("$arquivo")
  done < <(buscar_arquivos "$caminho_absoluto")

  local total="${#arquivos[@]}"

  if [[ "$total" -eq 0 ]]; then
    echo -e "${COR_VERDE}✅ Nenhum arquivo Zone.Identifier encontrado. Nada a remover.${COR_RESET}"
    exit 0
  fi

  echo -e "${COR_AMARELO}⚠️  Foram encontrados ${total} arquivos Zone.Identifier${COR_RESET}"
  echo
  for arquivo in "${arquivos[@]}"; do
    echo "- ${arquivo#"$caminho_absoluto"/}"
  done
  echo

  if [[ "$confirmar_automaticamente" == "--yes" ]]; then
    echo "Deseja remover? [y/N] y (confirmado anteriormente)"
  else
    echo -ne "Deseja remover? [y/N] "
    read -r resposta
    if [[ ! "$resposta" =~ ^[YySs]$ ]]; then
      echo -e "${COR_AZUL}Operação cancelada. Nenhum arquivo foi removido.${COR_RESET}"
      exit 0
    fi
  fi

  local inicio fim duracao removidos=0
  inicio=$(date +%s%N)

  for arquivo in "${arquivos[@]}"; do
    if rm -f "$arquivo" 2>/dev/null; then
      removidos=$((removidos + 1))
    else
      echo -e "${COR_VERMELHO}Falha ao remover: ${arquivo}${COR_RESET}"
    fi
  done

  fim=$(date +%s%N)
  duracao=$(awk "BEGIN {printf \"%.2f\", ($fim-$inicio)/1000000000}")

  echo
  echo -e "${COR_VERDE}🧹 Arquivos removidos com sucesso!${COR_RESET}"
  echo -e "   Removidos: ${removidos}/${total}"
  echo -e "   Tempo: ${duracao}s"
}

main "$@"
