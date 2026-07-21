import type { Ext, Pessoa } from '../types'
import { fmt, fmtSaldo } from '../lib/acerto.util'
import { initials } from '@/shared/lib/format.util'
import { IcoXSm, IcoAcerto, IcoAudit } from './icons'

type Props = {
  x: Ext
  dark: boolean
  selPerson: Pessoa | null
  saldo: number
  valor: string
  setValor: (v: string) => void
  formaPag: string
  setFormaPag: (v: string) => void
  obs: string
  setObs: (v: string) => void
  onClose: () => void
  onConfirm: () => void
}

export function AcertoDrawer({ x, dark, selPerson, saldo, valor, setValor, formaPag, setFormaPag, obs, setObs, onClose, onConfirm }: Props) {
  const personBg = selPerson ? selPerson.avatarBg : 'linear-gradient(135deg,#005533,#00C773)'
  const personInitials = selPerson ? initials(selPerson.nome) : 'ALL'
  const personNome = selPerson ? selPerson.nome : 'Todas as Pessoas'

  const saldoStr = fmtSaldo(saldo)
  let saldoBg: string, saldoBd: string, saldoC: string, saldoLabel: string
  if (Math.abs(saldo) < 0.01) {
    saldoBg = x.glow; saldoBd = x.glowB; saldoC = x.green; saldoLabel = 'Zerado'
  } else if (saldo < 0) {
    saldoBg = 'rgba(224,85,85,0.1)'; saldoBd = 'rgba(224,85,85,0.25)'; saldoC = '#E05555'; saldoLabel = 'Devendo à banca'
  } else {
    saldoBg = 'rgba(91,143,212,0.1)'; saldoBd = 'rgba(91,143,212,0.25)'; saldoC = '#5B8FD4'; saldoLabel = 'Banca deve a esta pessoa'
  }

  const valorNum = parseFloat(valor) || 0
  const hasValor = valorNum > 0
  const saldoSign = saldo < 0 ? -1 : 1

  let resultLabel = '', resultVal = ''
  if (hasValor) {
    const newSaldo = saldo + valorNum * saldoSign
    if (Math.abs(newSaldo) < 0.01) { resultLabel = 'Zerado'; resultVal = 'R$ 0,00' }
    else if (newSaldo > 0) { resultLabel = 'Crédito gerado'; resultVal = '+' + fmt(newSaldo) }
    else { resultLabel = 'Saldo restante'; resultVal = '-' + fmt(Math.abs(newSaldo)) }
  }
  const resultC = resultLabel === 'Crédito gerado' ? '#5B8FD4' : resultLabel === 'Zerado' ? x.green : '#E05555'

  const canDo = hasValor && !!formaPag
  const btnBg = canDo ? x.green : dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  const btnC = canDo ? '#fff' : x.muted

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
      <div
        style={{
          position: 'fixed', right: 0, top: 54, height: 'calc(100vh - 54px)', width: 460, zIndex: 210,
          background: x.sbBg, borderLeft: `1px solid ${x.sbBorder}`, display: 'flex', flexDirection: 'column',
          boxShadow: '-12px 0 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* header */}
        <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${x.sbBorder}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: personBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{personInitials}</div>
              <div>
                <div style={{ fontSize: 13, color: x.muted, fontWeight: 500, lineHeight: 1.2 }}>Realizar Acerto</div>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.025em', color: x.text, lineHeight: 1.25 }}>{personNome}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: x.inputBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: x.muted }}>{IcoXSm()}</button>
          </div>
          <div style={{ padding: '12px 15px', background: saldoBg, border: `1px solid ${saldoBd}`, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: saldoC, marginBottom: 4 }}>Saldo Atual</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: saldoC, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>{saldoStr}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10.5, color: saldoC, opacity: 0.7, lineHeight: 1.4 }}>{saldoLabel}</div>
            </div>
          </div>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {/* valor do acerto */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: x.text, marginBottom: 7, letterSpacing: '-0.01em' }}>
              Quanto será acertado agora? <span style={{ color: '#E05555' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: x.muted, pointerEvents: 'none', zIndex: 1 }}>R$</span>
              <input
                type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" min={0} step={0.01}
                style={{ width: '100%', padding: '13px 13px 13px 36px', background: x.inputBg, border: `1px solid ${x.green}`, borderRadius: 11, color: x.text, fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
              />
            </div>
          </div>

          {/* preview saldo */}
          {hasValor && (
            <div style={{ padding: '14px 16px', background: x.inputBg, border: `1px solid ${x.cardB}`, borderRadius: 11, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ fontSize: 11.5, color: x.muted }}>Saldo anterior</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: x.sub, fontVariantNumeric: 'tabular-nums' }}>{saldoStr}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ fontSize: 11.5, color: x.muted }}>Valor acertado</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: x.green, fontVariantNumeric: 'tabular-nums' }}>{fmt(valorNum)}</span>
              </div>
              <div style={{ borderTop: `1px solid ${x.cardB}`, margin: '7px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: resultC }}>{resultLabel}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: resultC, fontVariantNumeric: 'tabular-nums' }}>{resultVal}</span>
              </div>
            </div>
          )}

          {/* forma de pagamento */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: x.text, marginBottom: 7 }}>Forma de Pagamento <span style={{ color: '#E05555' }}>*</span></label>
            <select
              value={formaPag} onChange={(e) => setFormaPag(e.target.value)}
              style={{ width: '100%', padding: '10px 13px', background: x.inputBg, border: `1px solid ${x.inputBorder}`, borderRadius: 10, color: x.text, fontSize: 13, fontWeight: 500, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
            >
              <option value="">Selecionar forma...</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="transferencia">Transferência</option>
              <option value="fiado">Fiado</option>
              <option value="descontar">Descontar depois</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          {/* observação */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: x.text, marginBottom: 7 }}>Observação <span style={{ fontSize: 10, fontWeight: 400, color: x.muted }}>(opcional)</span></label>
            <textarea
              value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex: Pendência do dia 25, combinado para pagar amanhã..." rows={3}
              style={{ width: '100%', padding: '10px 13px', background: x.inputBg, border: `1px solid ${x.inputBorder}`, borderRadius: 10, color: x.text, fontSize: 12.5, resize: 'vertical', lineHeight: 1.55 }}
            />
          </div>

          {/* auditoria note */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 13px', background: x.glow, border: `1px solid ${x.glowB}`, borderRadius: 9, marginBottom: 4 }}>
            <span style={{ display: 'flex', color: x.green, flexShrink: 0, marginTop: 1 }}>{IcoAudit()}</span>
            <span style={{ fontSize: 11, color: x.sub, lineHeight: 1.55 }}>Toda movimentação será registrada em auditoria com usuário, data e horário.</span>
          </div>
        </div>

        {/* footer */}
        <div style={{ padding: '14px 20px 16px', borderTop: `1px solid ${x.sbBorder}`, flexShrink: 0 }}>
          <button
            onClick={onConfirm} disabled={!canDo}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', borderRadius: 11, border: 'none', background: btnBg, color: btnC, fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, cursor: canDo ? 'pointer' : 'not-allowed', boxShadow: canDo ? `0 4px 18px ${x.shadow}` : 'none', letterSpacing: '-0.01em' }}
          >
            <span style={{ display: 'flex' }}>{IcoAcerto()}</span>Confirmar Acerto
          </button>
        </div>
      </div>
    </>
  )
}
