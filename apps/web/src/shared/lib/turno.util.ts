import type { BadgeProps } from '@/shared/components/ui/badge'

// Mapa de turno compartilhado (tarefa 4.4) — consolida `TURNO_LABELS`/
// `TURNO_BADGE_BG`/`TURNO_BADGE_C` de `lancamentos/_components/data.ts` e
// `TURNO_LBL`/`TURNO_BG`/`TURNO_COL` de `acerto/_components/shared.tsx`
// (valores idênticos nos dois arquivos). Com a primitive `Badge` (tarefa 4.3)
// já cobrindo essas mesmas cores por variante, o mapa de cor bruto (bg/hex por
// turno) deixa de ser necessário — os módulos usam `TURNO_BADGE_VARIANT` com
// `<Badge variant={...}>` em vez de aplicar `style={{ background, color }}`
// manualmente.
export type Turno = 'manha' | 'tarde' | 'noite'

export const TURNO_LABELS: Record<Turno, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
}

export const TURNO_BADGE_VARIANT: Record<Turno, NonNullable<BadgeProps['variant']>> = {
  manha: 'warning',
  tarde: 'info',
  noite: 'purple',
}
