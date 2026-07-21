// Ícones específicos deste módulo (uso único — não promovidos a `shared`
// enquanto não houver um segundo consumidor real, ver `web-component-ownership`).
function svg(size: number, children: React.ReactNode) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

export const IcoZap = svg(20, <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />)
