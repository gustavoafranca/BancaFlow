// Ícones deste módulo, movidos de `acerto/_components/shared.tsx` mantendo a
// mesma convenção de chamada (`IcoSearch()`, não `<IconSearch />`) para não
// exigir tocar cada um dos vários call-sites em `AcertoDrawer`/`DetailDrawer`/
// `PrintModal`/`acerto.page.tsx`. `IcoSearch`/`IcoCheckSm`/`IcoXSm`/`IcoCalSm`/
// `IcoExpand`/`IcoPrint`/`IcoAudit` têm equivalentes em `shared/components/icons`
// (já usados por outros módulos) — a convergência para o componente JSX
// compartilhado fica para a limpeza da Fase 9, quando todos os consumidores
// (incluindo os demais call-sites deste arquivo) puderem migrar de uma vez.
const mk = (size: number, children: React.ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

export const IcoSearch = (s = 14) => mk(s, <><circle cx={11} cy={11} r={8} /><line x1={21} y1={21} x2={16.65} y2={16.65} /></>)
export const IcoCheckSm = (s = 12) => mk(s, <polyline points="20 6 9 17 4 12" />)
export const IcoXSm = (s = 12) => mk(s, <><line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} /></>)
export const IcoAcerto = (s = 16) => mk(s, <><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x={9} y={3} width={6} height={4} rx={1} /><polyline points="9 12 11 14 15 10" /></>)
export const IcoCalSm = (s = 12) => mk(s, <><rect x={3} y={4} width={18} height={18} rx={2} /><line x1={16} y1={2} x2={16} y2={6} /><line x1={8} y1={2} x2={8} y2={6} /><line x1={3} y1={10} x2={21} y2={10} /></>)
export const IcoExpand = (s = 13) => mk(s, <><line x1={15} y1={3} x2={21} y2={3} /><line x1={21} y1={3} x2={21} y2={9} /><line x1={9} y1={21} x2={3} y2={21} /><line x1={3} y1={21} x2={3} y2={15} /><line x1={21} y1={3} x2={14} y2={10} /><line x1={3} y1={21} x2={10} y2={14} /></>)
export const IcoPrint = (s = 16) => mk(s, <><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x={6} y={14} width={12} height={8} rx={0} /></>)
export const IcoAudit = (s = 13) => mk(s, <><circle cx={12} cy={12} r={10} /><line x1={12} y1={6} x2={12} y2={12} /><line x1={12} y1={12} x2={16} y2={14} /></>)
