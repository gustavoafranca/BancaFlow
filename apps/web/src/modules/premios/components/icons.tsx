// Ícones específicos deste módulo (uso único — não promovidos a `shared`
// enquanto não houver um segundo consumidor real, ver `web-component-ownership`).
// `IconSearch`/`IconCheck`(→CheckSm)/`IconX`(→XSm)/`IconExpand`/`IconPrint`/
// `IconCalendar`(→CalSm)/`IconClock` já existem em `shared/components/icons` e
// são importados diretamente pela página; só `IcoPremios` é exclusivo daqui.
function svg(size: number, children: React.ReactNode) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

export const IcoPremios = svg(
  16,
  <>
    <circle cx="12" cy="8" r="6" />
    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
  </>,
)
