'use client'

import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/class-name.util'

// Selection Button Group — componente canônico para representar SELEÇÃO de
// estado/opção (Tipo, Status, Perfil, Situação, Turno, Sim/Não, ...), nunca
// ação. Ajuste solicitado antes do archive de
// `standardize-frontend-drawer-and-settings-nav`: consolida os botões de
// seleção que Pessoas e Vínculos já usava de forma bespoke (Tipo/Status) e
// substitui botões de AÇÃO que na verdade representavam escolha de estado em
// Usuários ("Tornar ADMIN", "Desativar"). Ações de verdade (Salvar, Editar,
// Excluir, Redefinir senha, Fechar, Cancelar, Bloquear) continuam como
// `Button` tradicional no rodapé do Drawer — nunca neste componente.
//
// Radix (`@radix-ui/react-radio-group`, mesma família de `Dialog`/`Select`)
// cuida de semântica `radiogroup`/`radio`, navegação por teclado (setas) e
// seleção única — não reimplementado aqui. As cores reaproveitam exatamente
// os mesmos tokens/valores de `badgeVariants` (`badge.tsx`), para não criar
// paleta nova por tela.

const optionVariants = cva(
  'group inline-flex items-center gap-2 rounded-[10px] border border-input bg-background px-4 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors cursor-pointer hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      variant: {
        neutral: 'data-[state=checked]:border-border data-[state=checked]:bg-secondary data-[state=checked]:text-foreground data-[state=checked]:hover:bg-secondary',
        success:
          'data-[state=checked]:border-[rgba(0,199,115,0.24)] data-[state=checked]:bg-[rgba(0,199,115,0.11)] data-[state=checked]:text-primary data-[state=checked]:hover:bg-[rgba(0,199,115,0.11)]',
        warning:
          'data-[state=checked]:border-[rgba(245,166,35,0.3)] data-[state=checked]:bg-[rgba(245,166,35,0.14)] data-[state=checked]:text-[#C8880A] data-[state=checked]:hover:bg-[rgba(245,166,35,0.14)]',
        info: 'data-[state=checked]:border-[rgba(91,143,212,0.3)] data-[state=checked]:bg-[rgba(91,143,212,0.14)] data-[state=checked]:text-[#5B8FD4] data-[state=checked]:hover:bg-[rgba(91,143,212,0.14)]',
        purple:
          'data-[state=checked]:border-[rgba(130,90,210,0.3)] data-[state=checked]:bg-[rgba(130,90,210,0.14)] data-[state=checked]:text-[#7A5CD4] data-[state=checked]:hover:bg-[rgba(130,90,210,0.14)]',
        danger:
          'data-[state=checked]:border-[rgba(224,85,85,0.25)] data-[state=checked]:bg-[rgba(224,85,85,0.1)] data-[state=checked]:text-[#E05555] data-[state=checked]:hover:bg-[rgba(224,85,85,0.1)]',
      },
    },
    defaultVariants: { variant: 'success' },
  },
)

const dotVariants = cva('h-[7px] w-[7px] shrink-0 rounded-full bg-muted-foreground', {
  variants: {
    variant: {
      neutral: 'group-data-[state=checked]:bg-foreground',
      success: 'group-data-[state=checked]:bg-primary',
      warning: 'group-data-[state=checked]:bg-[#C8880A]',
      info: 'group-data-[state=checked]:bg-[#5B8FD4]',
      purple: 'group-data-[state=checked]:bg-[#7A5CD4]',
      danger: 'group-data-[state=checked]:bg-[#E05555]',
    },
  },
  defaultVariants: { variant: 'success' },
})

export type SelectionButtonVariant = NonNullable<VariantProps<typeof optionVariants>['variant']>

export interface SelectionButtonOption<T extends string = string> {
  value: T
  label: string
  /** Cor semântica da opção quando selecionada — mesmos tokens de `Badge`. Default: `success`. */
  variant?: SelectionButtonVariant
  disabled?: boolean
}

export interface SelectionButtonGroupProps<T extends string = string>
  extends Omit<React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>, 'value' | 'onValueChange' | 'defaultValue'> {
  value: T
  onValueChange: (value: T) => void
  options: SelectionButtonOption<T>[]
  'aria-label': string
}

const SelectionButtonGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  SelectionButtonGroupProps
>(({ className, options, value, onValueChange, disabled, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    value={value}
    onValueChange={(next) => onValueChange(next)}
    disabled={disabled}
    className={cn('flex flex-wrap gap-2', className)}
    {...props}
  >
    {options.map((option) => (
      <RadioGroupPrimitive.Item
        key={option.value}
        value={option.value}
        disabled={disabled || option.disabled}
        className={optionVariants({ variant: option.variant ?? 'success' })}
      >
        <span className={dotVariants({ variant: option.variant ?? 'success' })} />
        {option.label}
      </RadioGroupPrimitive.Item>
    ))}
  </RadioGroupPrimitive.Root>
))
SelectionButtonGroup.displayName = 'SelectionButtonGroup'

export { SelectionButtonGroup }
