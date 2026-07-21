'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/shared/lib/class-name.util'

// Primitive compartilhada de abas (tarefa 2.5), para áreas com seções de
// alto nível (ex.: Configurações: Usuários / Perfis de acesso). Radix
// (`@radix-ui/react-tabs`) cuida de teclado (setas/Home/End) e associação
// `tab`/`tabpanel` via `aria-controls`/`aria-labelledby` — não é
// reimplementado aqui.

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1 rounded-md border border-border bg-secondary p-1',
      className,
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-[calc(theme(borderRadius.md)-2px)] px-3 py-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors',
      'hover:text-foreground',
      'focus-visible:ring-2 focus-visible:ring-ring',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-4 outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
