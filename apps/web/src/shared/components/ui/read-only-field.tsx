import * as React from 'react'

// Campo rótulo+valor no visual de um input desabilitado, promovido a
// primitive compartilhada (`enable-betting-agent-drawer-*`) — modo view de
// drawer lê como um formulário preenchido, não como cartões soltos. Também
// serve para campos imutáveis no modo edit (ex.: Código).

export interface ReadOnlyFieldProps {
  label: string
  value: React.ReactNode
}

export function ReadOnlyField({ label, value }: ReadOnlyFieldProps) {
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex h-10 w-full items-center rounded-md border border-input bg-secondary/40 px-3 text-sm text-foreground">
        {value}
      </div>
    </div>
  )
}
