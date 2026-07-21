// Ícones específicos deste módulo (uso único — não promovidos a `shared`
// enquanto não houver um segundo consumidor real, ver `web-component-ownership`).
function svg(size: number, children: React.ReactNode) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

export function IcoTicket() {
  return svg(16, <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />)
}

export function IcoWallet() {
  return svg(
    16,
    <>
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
      <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
      <circle cx="18" cy="12" r="2" />
    </>,
  )
}

export function IcoAlert() {
  return svg(
    16,
    <>
      <polyline points="10.29 3.86 1.82 18 1.82 18" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>,
  )
}

export function IcoCash() {
  return svg(
    16,
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </>,
  )
}

export function IcoUp() {
  return svg(12, <polyline points="18 15 12 9 6 15" />)
}

export function IcoDn() {
  return svg(12, <polyline points="6 9 12 15 18 9" />)
}
