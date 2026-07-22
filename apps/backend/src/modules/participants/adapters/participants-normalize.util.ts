import { normalizeSearchText } from '@bancaflow/participants';

/**
 * Normalização de texto para busca/duplicidade (nome/apelido): delega para
 * `normalizeSearchText` do domínio — a MESMA função usada pelos VOs
 * `Neighborhood`/`City` — para que o adapter de escrita (que grava
 * `nameNormalized`/`nicknameNormalized`) e a query de duplicidade (que
 * normaliza a sonda) produzam exatamente o mesmo valor.
 */
export function normalizeText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = normalizeSearchText(value);
  return normalized || null;
}
