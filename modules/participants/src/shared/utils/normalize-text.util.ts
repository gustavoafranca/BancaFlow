const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

/**
 * Normalização compartilhada para busca/agrupamento/duplicidade: trim,
 * colapso de espaços, remoção de acentos e caixa baixa. Única implementação
 * usada pelos VOs `Neighborhood`/`City` (endereço) e pela normalização de
 * nome/apelido feita na camada de infraestrutura (`nameNormalized`/
 * `nicknameNormalized`), garantindo que ambos os lados produzam sempre o
 * mesmo valor normalizado para a mesma entrada.
 */
export function normalizeSearchText(value: string): string {
  const collapsed = value.trim().replace(/\s+/g, ' ');
  if (!collapsed) {
    return '';
  }
  return collapsed.normalize('NFD').replace(DIACRITICS, '').toLowerCase();
}
