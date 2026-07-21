// Ícones específicos deste módulo (uso único — não promovidos a `shared`
// enquanto não houver um segundo consumidor real, ver `web-component-ownership`).
// `IconSearch`/`IconCheck`/`IconX` (usados aqui também) já existem em
// `shared/components/icons` e são importados diretamente pela página.
function svg(size: number, children: React.ReactNode) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

export const IcoLink = svg(
  16,
  <>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </>,
)
export const IcoLinkSm = svg(
  13,
  <>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </>,
)
export const IcoStar = svg(
  16,
  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />,
)
export const IcoArrow = svg(
  16,
  <>
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </>,
)
