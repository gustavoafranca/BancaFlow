#!/usr/bin/env bash
# Localiza (sem apagar) arquivos *:Zone.Identifier dentro de um caminho.
#
# Uso:
#   ./scan-zone-identifier.sh <caminho>
set -euo pipefail

DIR_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${DIR_SCRIPT}/_common.sh"

main() {
  local caminho="${1:-}"
  validar_caminho "$caminho"

  local caminho_absoluto
  caminho_absoluto="$(cd "$caminho" && pwd)"

  echo -e "${COR_AZUL}🔍 Procurando arquivos Zone.Identifier...${COR_RESET}"
  echo
  echo -e "📁 Pasta:"
  echo -e " ${caminho_absoluto}"
  echo

  local inicio fim duracao
  inicio=$(date +%s%N)

  local arquivos=()
  while IFS= read -r -d '' arquivo; do
    arquivos+=("$arquivo")
  done < <(buscar_arquivos "$caminho_absoluto")

  fim=$(date +%s%N)
  duracao=$(awk "BEGIN {printf \"%.2f\", ($fim-$inicio)/1000000000}")

  local total="${#arquivos[@]}"

  if [[ "$total" -eq 0 ]]; then
    echo -e "${COR_VERDE}✅ Nenhum arquivo Zone.Identifier encontrado.${COR_RESET}"
    echo -e "⏱️  Tempo de busca: ${duracao}s"
    exit 0
  fi

  echo -e "${COR_AMARELO}📦 Arquivos encontrados: ${total}${COR_RESET}"
  echo

  local tamanho_total=0
  local arquivo tamanho
  for arquivo in "${arquivos[@]}"; do
    echo "- ${arquivo#"$caminho_absoluto"/}"
    tamanho=$(stat -c%s "$arquivo" 2>/dev/null || echo 0)
    tamanho_total=$((tamanho_total + tamanho))
  done

  echo
  echo -e "📊 Estatísticas:"
  echo -e "   Quantidade: ${total}"
  echo -e "   Tamanho total: $(formatar_tamanho "$tamanho_total")"
  echo -e "   Tempo de busca: ${duracao}s"
  echo
  echo -e "${COR_AZUL}💡 Sugestão: execute \"${DIR_SCRIPT}/clean-zone-identifier.sh\" \"${caminho_absoluto}\" para remover esses arquivos com segurança.${COR_RESET}"
}

main "$@"
