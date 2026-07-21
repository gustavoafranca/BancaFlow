import { useState } from 'react'
import type { ThemeColors } from '@/shared/theme/theme-provider'
import { IconExpand } from '@/shared/components/icons'
import { initials } from '@/shared/lib/format.util'
import { fmt, TURNO_BG, TURNO_COL } from '../lib/premios.util'
import type { RowVM } from '../types'

export function FeedRow({
  vm,
  c,
  onView,
  onPrint,
}: {
  vm: RowVM
  c: ThemeColors
  onView: () => void
  onPrint: () => void
}) {
  const [hover, setHover] = useState(false)
  const [btnHover, setBtnHover] = useState(false)
  const { premio: p, cambista: cb, sit, trat } = vm
  return (
    <div
      onClick={onView}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 70px 1fr 90px 100px 105px 130px 55px 44px',
        gap: 8,
        alignItems: 'center',
        padding: '11px 0',
        borderBottom: `1px solid ${c.cardB}`,
        cursor: 'pointer',
        borderRadius: 4,
        transition: 'background 0.12s',
        background: hover ? c.hover : 'transparent',
      }}
    >
      <div style={{ fontSize: 11.5, fontWeight: 500, color: c.sub, fontVariantNumeric: 'tabular-nums' }}>{p.dataRef}</div>

      <div>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: TURNO_BG[p.turno], color: TURNO_COL[p.turno] }}>
          {p.turno}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: cb ? cb.avatarBg : 'linear-gradient(135deg,#333,#555)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {cb ? initials(cb.nome) : '?'}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.25 }}>
            {cb ? cb.nome : 'Desconhecido'}
          </div>
          <div style={{ fontSize: 10.5, color: c.muted, lineHeight: 1.2 }}>
            {cb ? ['Talão ' + cb.talao, cb.apelido].filter(Boolean).join(' · ') : ''}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, color: c.green, fontVariantNumeric: 'tabular-nums' }}>{fmt(p.valor)}</div>

      <div style={{ fontSize: 11, fontWeight: 500, color: c.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.tipo || '—'}</div>

      <div>
        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: sit.bg, color: sit.c, border: `1px solid ${sit.bd}`, whiteSpace: 'nowrap' }}>
          {sit.label}
        </span>
      </div>

      <div>
        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: trat.bg, color: trat.c, border: `1px solid ${trat.bd}`, whiteSpace: 'nowrap' }}>
          {trat.label}
        </span>
      </div>

      <div style={{ fontSize: 10, color: c.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {p.criadoPor ? p.criadoPor.split(' ')[0] : '—'}
      </div>

      <div
        style={{ display: 'flex', justifyContent: 'flex-end' }}
        onClick={(e) => {
          e.stopPropagation()
          onPrint()
        }}
      >
        <button
          type="button"
          title="Detalhes"
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          onClick={(e) => {
            e.stopPropagation()
            onView()
          }}
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            border: 'none',
            background: btnHover ? c.glow : 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: btnHover ? c.green : c.muted,
            transition: 'all 0.12s',
          }}
        >
          <IconExpand size={13} />
        </button>
      </div>
    </div>
  )
}
