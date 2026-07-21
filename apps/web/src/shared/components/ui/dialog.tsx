'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/shared/lib/class-name.util'

// Primitive compartilhada de modal (tarefa 4.3). Usa Radix
// (`@radix-ui/react-dialog`, já no mesmo ecossistema de `@radix-ui/react-slot`)
// para foco/teclado/portal corretos — não reinventa essa lógica de
// acessibilidade. Cores via tokens do design system (`--popover`, `--border`),
// portanto se adaptam ao tema ativo automaticamente. Para painel lateral
// (criar/editar/visualizar recurso), usar `Drawer` em
// `shared/components/ui/drawer.tsx` — o único componente de drawer do
// sistema (`canonical-drawer`).

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close
const DialogPortal = DialogPrimitive.Portal

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm transition-opacity duration-200',
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

export type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>

// `variant="drawer"` existiu aqui até a padronização do Drawer canônico
// (`canonical-drawer`, `shared/components/ui/drawer.tsx`, que suporta
// redimensionar/maximizar/rodapé por modo — o que este `variant` fixo nunca
// suportou). Todo consumidor de painel lateral migrou para `Drawer`; `Dialog`
// volta a ser só o modal centralizado.
const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ className, children, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-1/2 top-1/2 z-[210] flex w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[20px] border border-border bg-popover text-popover-foreground shadow-2xl outline-none transition-all duration-200',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  ),
)
DialogContent.displayName = DialogPrimitive.Content.displayName

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1 border-b border-border px-5 py-4', className)}
      {...props}
    />
  )
}

/**
 * Corpo rolável entre `DialogHeader`/`DialogFooter` fixos — sobretudo para
 * `variant="drawer"`, onde o conteúdo (formulário/detalhe) costuma ser mais
 * alto que a viewport. Promovido ao primitive (tarefa 2.6) para não repetir
 * `flex-1 overflow-y-auto` em cada consumidor do drawer.
 */
function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 overflow-y-auto', className)} {...props} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-2 border-t border-border px-5 py-4', className)}
      {...props}
    />
  )
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-[15px] font-extrabold tracking-[-0.02em]', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-[11px] text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
