'use client'

import * as React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { cn } from '@/shared/lib/class-name.util'

// Primitive compartilhada de grupos recolhíveis (tarefa 2.5), usada pela
// matriz de permissões (agrupada por capability) e por qualquer outra lista
// longa que precise iniciar compacta. Radix (`@radix-ui/react-accordion`)
// cuida de teclado (setas/Home/End) e `aria-expanded`/`aria-controls` — não é
// reimplementado aqui.

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn('border-b border-border last:border-b-0', className)}
    {...props}
  />
))
AccordionItem.displayName = AccordionPrimitive.Item.displayName

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 items-center justify-between gap-2 py-3 text-left text-sm font-semibold text-foreground outline-none transition-all',
        'hover:text-primary',
        'focus-visible:ring-2 focus-visible:ring-ring',
        '[&[data-state=open]>svg]:rotate-180',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-none data-[state=open]:animate-none"
    {...props}
  >
    <div className={cn('pb-4', className)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
