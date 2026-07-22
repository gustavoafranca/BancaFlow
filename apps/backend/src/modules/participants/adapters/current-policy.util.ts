import type { Prisma } from '@prisma/client';

/**
 * Linha de política de remuneração lida do banco (compartilhada entre o
 * repositório e a query de leitura, que projetam as mesmas colunas de vigência).
 */
export type PolicyRow = {
  type: string;
  percentage: Prisma.Decimal | null;
  weeklyFixedAmountCents: number | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
};

/**
 * Política vigente = a de vigência aberta (`effectiveTo IS NULL`); fallback: a
 * mais recente por `effectiveFrom`. Regra única para evitar divergência entre
 * os adapters de escrita e de leitura.
 */
export function currentPolicy(policies: PolicyRow[]): PolicyRow | null {
  if (policies.length === 0) {
    return null;
  }
  const open = policies.find((p) => p.effectiveTo === null);
  if (open) {
    return open;
  }
  return [...policies].sort(
    (a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime(),
  )[0];
}
