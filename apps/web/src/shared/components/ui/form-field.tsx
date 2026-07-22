import * as React from 'react'

// Rótulo+campo padrão de drawer (Cambistas, `enable-betting-agent-drawer-*`),
// promovido a primitive compartilhada para que todo drawer de
// criar/editar herde o mesmo espaçamento/tipografia em vez de reimplementar
// (ex.: `user-account-drawer.tsx` tinha uma cópia local em `useTheme()`+`style`).

export interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
}

export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-[11.5px] font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
