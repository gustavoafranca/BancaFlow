import type { LastAcerto } from '../types'
import { fmtNow } from '../lib/acerto.util'
import { IcoPrint } from './icons'

type Props = {
  x: import('../types').Ext
  data: LastAcerto
  /** Nome do usuário autenticado que realizou o acerto — vem da sessão real, nunca hardcoded. */
  operador: string
  /** Nome de exibição da banca do usuário autenticado — vem da sessão real, nunca hardcoded. */
  bancaNome: string
  onClose: () => void
  onPrint: (kind: 'termica' | 'pdf' | 'comum') => void
}

export function PrintModal({ x, data, operador, bancaNome, onClose, onPrint }: Props) {
  const now = fmtNow()
  const printData = now.split(' ')[0] || ''
  const printHora = now.split(' ')[1] || ''
  const saldoC = data.saldoOk ? x.green : '#E05555'
  const hasObs = !!(data.obs && data.obs.trim())

  const printOptions: { kind: 'termica' | 'pdf' | 'comum'; emoji: string; label: string }[] = [
    { kind: 'termica', emoji: '🖨️', label: 'Térmica' },
    { kind: 'pdf', emoji: '📄', label: 'PDF' },
    { kind: 'comum', emoji: '🖨️', label: 'Comum' },
  ]

  const row = (label: string, value: string, valColor: string, valWeight = 600, valSize = 11) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
      <span style={{ fontSize: 11, color: x.muted }}>{label}</span>
      <span style={{ fontSize: valSize, fontWeight: valWeight, color: valColor }}>{value}</span>
    </div>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 450, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 480, background: x.dropdownBg, border: `1px solid ${x.cardB}`, borderRadius: 20, boxShadow: '0 28px 80px rgba(0,0,0,0.7)' }}>
        {/* header */}
        <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${x.cardB}`, display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, background: x.glow, border: `1px solid ${x.glowB}`, color: x.green }}>{IcoPrint()}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', color: x.text }}>Acerto Registrado!</div>
            <div style={{ fontSize: 11, color: x.muted }}>Deseja imprimir o comprovante?</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, padding: '5px 11px', background: x.glow, border: `1px solid ${x.glowB}`, borderRadius: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: x.green }}>{data.pessoa}</span>
          </div>
        </div>

        {/* comprovante */}
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${x.cardB}` }}>
          <div style={{ padding: 16, background: x.inputBg, border: `1px solid ${x.cardB}`, borderRadius: 12, fontVariantNumeric: 'tabular-nums' }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: x.text, letterSpacing: '0.04em' }}>{bancaNome.toUpperCase() || '—'}</div>
              <div style={{ fontSize: 10, color: x.muted, marginTop: 2 }}>Comprovante de Acerto</div>
              <div style={{ fontSize: 9, color: x.muted, marginTop: 2 }}>{printData} · {printHora}</div>
            </div>
            <div style={{ borderTop: `1px dashed ${x.cardB}`, marginBottom: 10 }} />
            {row('Pessoa', data.pessoa, x.text)}
            {row('Saldo Anterior', data.saldoAnterior, x.text)}
            {row('Valor Acertado', data.valorAcerto, x.green, 800, 12)}
            <div style={{ borderTop: `1px dashed ${x.cardB}`, margin: '8px 0' }} />
            {row('Saldo Restante', data.saldoFinal, saldoC, 700)}
            {row('Forma Pagamento', data.formaPag, x.text)}
            {hasObs && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: x.muted }}>Obs</span>
                <span style={{ fontSize: 11, color: x.sub, maxWidth: 220, textAlign: 'right', lineHeight: 1.3 }}>{data.obs}</span>
              </div>
            )}
            <div style={{ borderTop: `1px dashed ${x.cardB}`, marginTop: 8, paddingTop: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: x.muted }}>Operador: {operador || '—'} · BancaFlow v1.0</div>
            </div>
          </div>
        </div>

        {/* imprimir via */}
        <div style={{ padding: '16px 22px 18px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: x.muted, marginBottom: 10 }}>Imprimir via</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
            {printOptions.map((o) => (
              <div key={o.label} onClick={() => onPrint(o.kind)} style={{ padding: '12px 8px', borderRadius: 10, border: `1px solid ${x.cardB}`, background: x.inputBg, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 17, marginBottom: 4 }}>{o.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: x.sub }}>{o.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: x.green, color: '#fff', fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Agora não</button>
          </div>
        </div>
      </div>
    </div>
  )
}
