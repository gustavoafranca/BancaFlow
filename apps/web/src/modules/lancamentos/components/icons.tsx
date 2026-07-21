import type { ReactNode } from 'react'

// Ícones de linha inline (Feather-style), movidos de `lancamentos/_components/icons.tsx`.
// Alguns (Search/Check/CheckSm/X/Edit/Trash/Calendar/Clock/ChevLeft/ChevRight)
// têm equivalentes em `shared/components/icons` — a convergência para o
// componente JSX compartilhado fica para a limpeza da Fase 9, dado o volume de
// call-sites que usam a convenção de constante pré-instanciada (`{IcoX}`, não
// `<IconX/>`) nesta página; risco desproporcional para este passo de migração.
export const svg = (size: number, children: ReactNode) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
)

export const IcoSearch = svg(
  14,
  <>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </>,
)
export const IcoCheck = svg(14, <polyline points="20 6 9 17 4 12" />)
export const IcoCheckSm = svg(12, <polyline points="20 6 9 17 4 12" />)
export const IcoXSmall = svg(
  12,
  <>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </>,
)
export const IcoEdit = svg(
  13,
  <>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </>,
)
export const IcoTrash = svg(
  13,
  <>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </>,
)
export const IcoClock = svg(
  13,
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </>,
)
export const IcoBolt = svg(14, <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />)
export const IcoMsgSq = svg(
  13,
  <>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <line x1="9" y1="9" x2="15" y2="9" />
    <line x1="9" y1="13" x2="13" y2="13" />
  </>,
)
export const IcoCalendar = svg(
  14,
  <>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </>,
)
export const IcoPencil = svg(
  13,
  <>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </>,
)
export const IcoChevLeft = svg(14, <path d="m15 18-6-6 6-6" />)
export const IcoChevRight = svg(14, <path d="m9 18 6-6-6-6" />)
export const IcoDespesa = svg(
  12,
  <>
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <line x1="9" y1="7" x2="17" y2="7" />
    <line x1="9" y1="11" x2="17" y2="11" />
    <line x1="9" y1="15" x2="14" y2="15" />
  </>,
)
