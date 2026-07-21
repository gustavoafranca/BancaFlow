import * as React from 'react';
import { cn } from '@/shared/lib/class-name.util';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** `brand`: tratamento das telas de auth (borda 1.5px, glow de foco). `default`: uso geral (ex.: busca em tabelas). */
  variant?: 'default' | 'brand';
  /** Só relevante para `variant="brand"` — segue o tema local da tela de auth. */
  dark?: boolean;
  /** Ícone posicionado à esquerda (ex.: busca/usuário); ajusta o padding automaticamente. Disponível nas duas variantes. */
  leftIcon?: React.ReactNode;
  /** Elemento posicionado à direita (ex.: alternância de visibilidade de senha). Disponível nas duas variantes. */
  rightSlot?: React.ReactNode;
};

const BRAND_BASE =
  'h-[42px] w-full rounded-[10px] border-[1.5px] text-[13.5px] outline-none transition-all';
const BRAND_DARK =
  'border-[#17352B] bg-[rgba(0,0,0,0.28)] text-[#EDF5F0] placeholder:text-[#1E4030] focus:border-[#00C773] focus:bg-[rgba(0,199,115,0.05)] focus:shadow-[0_0_0_3px_rgba(0,199,115,0.13)]';
const BRAND_LIGHT =
  'border-[#D3E2D9] bg-[#F5F8F6] text-[#1B1F1D] placeholder:text-[#AABDB5] focus:border-[#009966] focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,153,102,0.11)]';
const DEFAULT_BASE =
  'flex h-10 w-full rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, type = 'text', variant = 'default', dark = true, leftIcon, rightSlot, ...props },
    ref,
  ) => {
    const isBrand = variant === 'brand';
    const input = (
      <input
        type={type}
        className={cn(
          isBrand ? BRAND_BASE : DEFAULT_BASE,
          isBrand && (dark ? BRAND_DARK : BRAND_LIGHT),
          // O design original aplica `pl-9 pr-[38px]` juntos sempre que há
          // ícone à esquerda (mesmo sem slot à direita, ex.: campo usuário) —
          // reproduzido aqui fielmente, não condicionado a `rightSlot`.
          leftIcon ? 'pl-9 pr-[38px]' : isBrand ? 'px-3' : 'px-3 py-2',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
    if (!leftIcon && !rightSlot) return input;
    return (
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center">
            {leftIcon}
          </span>
        )}
        {input}
        {rightSlot && (
          <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center">
            {rightSlot}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
