// Ícones específicos deste módulo (uso único — não promovidos a `shared`
// enquanto não houver um segundo consumidor real, ver `web-component-ownership`).
// `IconEdit` (usado aqui também) já existe em `shared/components/icons` e é
// importado diretamente pela página.
function svg(size: number, children: React.ReactNode) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

export const IcoBuilding = svg(
  14,
  <>
    <rect x="1" y="3" width="15" height="18" rx="1" />
    <line x1="16" y1="8" x2="21" y2="8" />
    <line x1="16" y1="14" x2="21" y2="14" />
    <line x1="16" y1="20" x2="21" y2="20" />
    <line x1="1" y1="21" x2="22" y2="21" />
    <rect x="5" y="7" width="4" height="4" rx="0.5" />
    <rect x="5" y="13" width="4" height="4" rx="0.5" />
  </>,
)
export const IcoInfo = svg(
  14,
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="8.01" />
    <line x1="12" y1="11" x2="12" y2="16" />
  </>,
)

export const IcoLock = svg(
  16,
  <>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>,
)

export const IcoMonitor = svg(
  16,
  <>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </>,
)

export const IcoSmartphone = svg(
  16,
  <>
    <rect x="6" y="2" width="12" height="20" rx="2" />
    <line x1="11" y1="18" x2="13" y2="18" />
  </>,
)

export const IcoDeviceUnknown = svg(
  16,
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 1.8-2.5 3.5" />
    <line x1="12" y1="16.5" x2="12" y2="16.51" />
  </>,
)
