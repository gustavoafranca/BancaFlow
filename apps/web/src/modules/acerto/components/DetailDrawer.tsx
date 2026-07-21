import type { Ext, Entry, Pessoa } from '../types'
import { fmt, tipoMetaFor } from '../lib/acerto.util'
import { initials } from '@/shared/lib/format.util'
import { TURNO_LABELS } from '@/shared/lib/turno.util'
import { IcoXSm } from './icons'

type Props = {
  x: Ext
  dark: boolean
  entry: Entry
  pessoa: Pessoa | undefined
  onClose: () => void
  onToggleDesp: (despIndex: number) => void
}

export function DetailDrawer({ x, dark, entry, pessoa, onClose, onToggleDesp }: Props) {
  const tm = tipoMetaFor(entry.tipo, x.green)
  const imp = entry.impacto
  const impAbs = Math.abs(imp)

  let resBg: string, resBd: string, resC: string, resLabel: string, resVal: string
  if (impAbs < 0.01) {
    resBg = x.glow; resBd = x.glowB; resC = x.green; resLabel = 'Zerado'; resVal = 'R$ 0,00'
  } else if (imp > 0) {
    resBg = 'rgba(91,143,212,0.1)'; resBd = 'rgba(91,143,212,0.22)'; resC = '#5B8FD4'; resLabel = 'Crédito'; resVal = '+' + fmt(imp)
  } else {
    resBg = 'rgba(224,85,85,0.1)'; resBd = 'rgba(224,85,85,0.22)'; resC = '#E05555'; resLabel = 'Débito'; resVal = '-' + fmt(impAbs)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 140 }} />
      <div
        style={{
          position: 'fixed', right: 0, top: 54, height: 'calc(100vh - 54px)', width: 430, zIndex: 150,
          background: x.sbBg, borderLeft: `1px solid ${x.sbBorder}`, display: 'flex', flexDirection: 'column',
          boxShadow: '-10px 0 48px rgba(0,0,0,0.38)',
        }}
      >
        {/* header */}
        <div style={{ padding: '14px 18px 12px', borderBottom: `1px solid ${x.sbBorder}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: pessoa?.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {pessoa ? initials(pessoa.nome) : ''}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: x.text, lineHeight: 1.25 }}>{pessoa?.nome}</div>
                <div style={{ fontSize: 11, color: x.muted, lineHeight: 1.25 }}>
                  {pessoa ? [pessoa.tipo, pessoa.talao ? 'Talão ' + pessoa.talao : null].filter(Boolean).join(' · ') : ''} · {entry.data}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: x.inputBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: x.muted }}>
              {IcoXSm()}
            </button>
          </div>
          <div style={{ padding: '10px 13px', background: resBg, border: `1px solid ${resBd}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: resC }}>{resLabel}</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: resC, fontVariantNumeric: 'tabular-nums' }}>{resVal}</span>
          </div>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 18 }}>
            {[
              { label: 'Tipo', value: tm.label },
              { label: 'Valor', value: fmt(entry.valor) },
              { label: 'Turno', value: TURNO_LABELS[entry.turno] },
            ].map((cell) => (
              <div key={cell.label} style={{ padding: '10px 11px', background: x.inputBg, border: `1px solid ${x.cardB}`, borderRadius: 9 }}>
                <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: x.muted, marginBottom: 4 }}>{cell.label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: x.text, fontVariantNumeric: 'tabular-nums' }}>{cell.value}</div>
              </div>
            ))}
          </div>

          {entry.despesas.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C8880A', marginBottom: 9 }}>Despesas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {entry.despesas.map((d, i) => {
                  const inc = d.incluir
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px',
                        background: inc ? (dark ? 'rgba(245,166,35,0.08)' : 'rgba(245,166,35,0.05)') : x.inputBg,
                        border: `1px solid ${inc ? 'rgba(245,166,35,0.22)' : x.cardB}`, borderRadius: 9,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: x.text, marginBottom: 2 }}>{d.desc}</div>
                        <div style={{ fontSize: 10.5, color: x.muted }}>{d.tipo}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#C8880A', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(d.valor)}</div>
                      <div onClick={() => onToggleDesp(i)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}>
                        <div style={{ width: 36, height: 20, borderRadius: 20, background: inc ? 'rgba(245,166,35,0.85)' : x.inputBg, border: `1px solid ${inc ? 'rgba(245,166,35,0.5)' : x.cardB}`, position: 'relative', transition: 'background 0.2s' }}>
                          <div style={{ position: 'absolute', top: 2, left: inc ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: inc ? '#fff' : x.muted, transition: 'left 0.2s' }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: inc ? '#C8880A' : x.muted, whiteSpace: 'nowrap' }}>{inc ? 'No acerto' : 'Ignorar'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {entry.ajustes.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7A5CD4', marginBottom: 9 }}>Ajustes Financeiros</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {entry.ajustes.map((a, i) => {
                  const isVal = a.status === 'validado'
                  const stBg = isVal ? (dark ? 'rgba(0,199,115,0.12)' : 'rgba(0,153,102,0.08)') : dark ? 'rgba(245,166,35,0.13)' : 'rgba(245,166,35,0.1)'
                  const stC = isVal ? x.green : '#C8880A'
                  const stBd = isVal ? x.glowB : 'rgba(245,166,35,0.28)'
                  return (
                    <div key={i} style={{ padding: '10px 12px', background: dark ? 'rgba(122,92,212,0.07)' : 'rgba(122,92,212,0.05)', border: '1px solid rgba(122,92,212,0.18)', borderRadius: 9 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 7 }}>
                        <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: x.text, marginBottom: 2 }}>{a.desc}</div>
                          <div style={{ fontSize: 10.5, color: x.muted }}>{a.data}</div>
                        </div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#7A5CD4', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(a.valor)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10.5, padding: '2px 9px', borderRadius: 20, fontWeight: 600, background: stBg, color: stC, border: `1px solid ${stBd}` }}>{isVal ? 'Validado' : 'Pendente'}</span>
                        {a.validadoPor && <span style={{ fontSize: 10.5, color: x.muted }}>Por: {a.validadoPor}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div style={{ padding: '11px 18px', borderTop: `1px solid ${x.sbBorder}`, flexShrink: 0, textAlign: 'center' }}>
          <span style={{ fontSize: 10.5, color: x.muted }}>Registrado por {entry.operador} às {entry.hora}</span>
        </div>
      </div>
    </>
  )
}
