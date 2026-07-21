import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/class-name.util';

// Badge (pílula colorida) compartilhada — tarefa 4.3. Generaliza as cores já
// usadas nos badges bespoke (turno em `lancamentos`, status em `cambistas`,
// saldo em `acerto`/`premios`): verde (sucesso/ativo), âmbar (atenção/manhã),
// azul (informação/tarde/crédito), roxo (noite), vermelho (perigo/inativo/
// devendo). O módulo escolhe qual `variant` corresponde a qual valor de
// domínio (ex.: turno "manhã" → `variant="warning"`) — a Badge não conhece
// turnos, status de conta ou qualquer conceito de negócio.
const badgeVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
  {
    variants: {
      variant: {
        neutral: 'border-border bg-secondary text-secondary-foreground',
        success: 'border-[rgba(0,199,115,0.24)] bg-[rgba(0,199,115,0.11)] text-primary',
        warning: 'border-[rgba(245,166,35,0.3)] bg-[rgba(245,166,35,0.14)] text-[#C8880A]',
        info: 'border-[rgba(91,143,212,0.3)] bg-[rgba(91,143,212,0.14)] text-[#5B8FD4]',
        purple: 'border-[rgba(130,90,210,0.3)] bg-[rgba(130,90,210,0.14)] text-[#7A5CD4]',
        danger: 'border-[rgba(224,85,85,0.25)] bg-[rgba(224,85,85,0.1)] text-[#E05555]',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
