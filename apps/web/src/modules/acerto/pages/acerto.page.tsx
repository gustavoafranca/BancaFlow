'use client'

import { useState } from 'react'
import { useTheme } from '@/shared/theme/theme-provider'
import { useCurrentUser } from '@/shared/session/use-current-user'
import { PESSOAS, BASE_ENTRIES } from '../data/acerto.sample'
import type { Entry, LastAcerto } from '../types'
import { ext } from '../types'
import {
  fmt,
  fmtSaldo,
  tipoMetaFor,
  todayStr,
  offsetDate,
  offsetMonth,
  FORMA_LABELS,
  TURNO_BG,
  TURNO_COL,
} from '../lib/acerto.util'
import { initials } from '@/shared/lib/format.util'
import { TURNO_LABELS } from '@/shared/lib/turno.util'
import { IcoAcerto, IcoCalSm, IcoCheckSm, IcoExpand, IcoSearch, IcoXSm } from '../components/icons'
import { DetailDrawer } from '../components/DetailDrawer'
import { AcertoDrawer } from '../components/AcertoDrawer'
import { PrintModal } from '../components/PrintModal'

type Turno = Entry['turno']
type Preset = 'hoje' | 'ontem' | 'semana' | 'mes' | ''

const cloneEntries = () => BASE_ENTRIES.map((e) => ({ ...e, despesas: e.despesas.map((d) => ({ ...d })), ajustes: e.ajustes.map((a) => ({ ...a })) }))

export function AcertoPage() {
  const { c, dark } = useTheme()
  const x = ext(c, dark)
  const currentUser = useCurrentUser()
  const operadorNome = currentUser.status === 'success' ? currentUser.data.name : ''
  const bancaNome = currentUser.status === 'success' ? currentUser.data.banca.name : ''

  /* ── estado ── */
  const [entries, setEntries] = useState<Entry[]>(cloneEntries)
  const [dateStart, setDateStart] = useState('24/06/2026')
  const [dateEnd, setDateEnd] = useState('27/06/2026')
  const [preset, setPreset] = useState<Preset>('semana')
  const [selectedTurnos, setSelectedTurnos] = useState<Turno[]>(['manha', 'tarde', 'noite'])
  const [personSearch, setPersonSearch] = useState('')
  const [personDropOpen, setPersonDropOpen] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null)
  const [tipoFilter, setTipoFilter] = useState('')
  const [tableSearch, setTableSearch] = useState('')
  const [drawerEntryId, setDrawerEntryId] = useState<number | null>(null)
  const [acertoOpen, setAcertoOpen] = useState(false)
  const [acertoValor, setAcertoValor] = useState('')
  const [acertoFormaPag, setAcertoFormaPag] = useState('')
  const [acertoObs, setAcertoObs] = useState('')
  const [lastAcerto, setLastAcerto] = useState<LastAcerto | null>(null)
  const [printOpen, setPrintOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2800)
  }

  /* ── filtro de pessoa ── */
  const srch = personSearch.trim().toLowerCase()
  const personDropItems = (srch
    ? PESSOAS.filter((p) => p.nome.toLowerCase().includes(srch) || p.apelido.toLowerCase().includes(srch) || (p.talao && p.talao.startsWith(personSearch.trim())) || p.tipo.toLowerCase().includes(srch))
    : PESSOAS)
  const selPerson = PESSOAS.find((p) => p.id === selectedPersonId) || null

  /* ── entradas filtradas ── */
  const filtered = entries.filter((e) => {
    if (selectedTurnos.length > 0 && !selectedTurnos.includes(e.turno)) return false
    if (selectedPersonId && e.pessoaId !== selectedPersonId) return false
    if (tipoFilter && e.tipo !== tipoFilter) return false
    if (tableSearch.trim()) {
      const s = tableSearch.trim().toLowerCase()
      const p = PESSOAS.find((pp) => pp.id === e.pessoaId)
      if (!p) return false
      if (!p.nome.toLowerCase().includes(s) && !p.apelido.toLowerCase().includes(s) && !(p.talao && p.talao.includes(s)) && !p.tipo.toLowerCase().includes(s)) return false
    }
    return true
  })

  const entryCount = filtered.length

  /* ── resumo ── */
  const sumVenda = filtered.filter((e) => e.tipo === 'lancamento').reduce((a, e) => a + e.valor, 0)
  const sumDinheiro = filtered.filter((e) => e.tipo === 'lancamento').reduce((a, e) => a + (e.valor + e.impacto), 0)
  const sumDesp = filtered.filter((e) => e.tipo === 'despesa' || e.tipo === 'ajuste').reduce((a, e) => a + e.valor, 0)
  const sumAjuste = filtered.filter((e) => e.tipo === 'ajuste').reduce((a, e) => a + e.valor, 0)
  const sumCredito = filtered.filter((e) => e.tipo === 'credito' || e.tipo === 'pagamento').reduce((a, e) => a + e.valor, 0)
  const sumDebito = filtered.filter((e) => e.tipo === 'debito' || e.impacto < 0).reduce((a, e) => a + Math.abs(e.impacto), 0)
  const saldo = filtered.reduce((a, e) => a + e.impacto, 0)
  const saldoStr = fmtSaldo(saldo)

  let saldoBg: string, saldoBd: string, saldoC: string, saldoGlow: string, saldoLabel: string, saldoLabelShort: string
  if (Math.abs(saldo) < 0.01) {
    saldoBg = x.glow; saldoBd = x.glowB; saldoC = x.green; saldoGlow = 'rgba(0,199,115,0.25)'; saldoLabel = 'Contas zeradas — nenhuma pendência'; saldoLabelShort = x.green
  } else if (saldo < 0) {
    saldoBg = 'rgba(224,85,85,0.08)'; saldoBd = 'rgba(224,85,85,0.22)'; saldoC = '#E05555'; saldoGlow = 'rgba(224,85,85,0.2)'; saldoLabel = 'Pessoa(s) devem à banca'; saldoLabelShort = '#E05555'
  } else {
    saldoBg = 'rgba(91,143,212,0.08)'; saldoBd = 'rgba(91,143,212,0.22)'; saldoC = '#5B8FD4'; saldoGlow = 'rgba(91,143,212,0.2)'; saldoLabel = 'Banca deve às pessoas'; saldoLabelShort = '#5B8FD4'
  }

  const canAcerto = entryCount > 0
  const realizarBtnBg = canAcerto ? x.green : dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  const realizarBtnC = canAcerto ? '#fff' : x.muted

  /* ── ações ── */
  const toggleTurno = (t: Turno) => setSelectedTurnos((cur) => (cur.includes(t) ? cur.filter((v) => v !== t) : [...cur, t]))
  const applyPreset = (p: Preset) => {
    if (p === 'hoje') { const t = todayStr(); setDateStart(t); setDateEnd(t) }
    else if (p === 'ontem') { const t = offsetDate(-1); setDateStart(t); setDateEnd(t) }
    else if (p === 'semana') { setDateStart(offsetDate(-6)); setDateEnd(todayStr()) }
    else if (p === 'mes') { setDateStart(offsetMonth(0)); setDateEnd(todayStr()) }
    setPreset(p)
  }
  const openAcerto = () => { if (canAcerto) { setAcertoValor(''); setAcertoFormaPag(''); setAcertoObs(''); setAcertoOpen(true) } }
  const confirmAcerto = () => {
    const valorNum = parseFloat(acertoValor) || 0
    // Gating derivado do próprio contrato de dados (`canAcerto`/valor/forma),
    // não só do atributo `disabled` do botão: revalidado aqui antes de
    // confirmar, para que a ação real fique protegida mesmo se o botão que a
    // dispara for contornado.
    if (!canAcerto || !(valorNum > 0 && acertoFormaPag)) return
    const saldoSign = saldo < 0 ? -1 : 1
    const newSaldo = saldo + valorNum * saldoSign
    const la: LastAcerto = {
      pessoa: selPerson ? selPerson.nome : 'Todas as Pessoas',
      saldoAnterior: saldoStr,
      valorAcerto: fmt(valorNum),
      saldoFinal: Math.abs(newSaldo) < 0.01 ? 'R$ 0,00' : fmtSaldo(newSaldo),
      saldoOk: Math.abs(newSaldo) < 0.01 || newSaldo > 0,
      formaPag: FORMA_LABELS[acertoFormaPag] || acertoFormaPag,
      obs: acertoObs,
    }
    setAcertoOpen(false)
    setLastAcerto(la)
    setPrintOpen(true)
  }
  const toggleDesp = (despIndex: number) => {
    if (drawerEntryId == null) return
    setEntries((cur) => cur.map((e) => (e.id !== drawerEntryId ? e : { ...e, despesas: e.despesas.map((d, j) => (j === despIndex ? { ...d, incluir: !d.incluir } : d)) })))
  }

  const drawerEntry = drawerEntryId != null ? entries.find((e) => e.id === drawerEntryId) || null : null

  /* estilos reutilizados */
  const filterLabel: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: x.muted, marginBottom: 7 }
  const dateInput: React.CSSProperties = { width: '100%', padding: '8px 9px 8px 27px', background: x.inputBg, border: `1px solid ${x.inputBorder}`, borderRadius: 9, color: x.text, fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }
  const colHead: React.CSSProperties = { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: x.muted }
  const gridCols = '95px 80px 1fr 90px 115px 130px 38px'

  const presets: { id: Preset; label: string }[] = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'ontem', label: 'Ontem' },
    { id: 'semana', label: '7 dias' },
    { id: 'mes', label: 'Mês' },
  ]
  const turnos: Turno[] = ['manha', 'tarde', 'noite']

  return (
    <div style={{ height: 'calc(100vh - 54px)', display: 'flex', overflow: 'hidden' }}>
      {/* ── ESQUERDA: filtros + resumo ── */}
      <div style={{ width: 374, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', background: x.sbBg, borderRight: `1px solid ${x.sbBorder}` }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>
          {/* título */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 9, background: x.glow, border: `1px solid ${x.glowB}`, color: x.green, flexShrink: 0 }}>{IcoAcerto()}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', color: x.text, lineHeight: 1.2 }}>Acerto</div>
              <div style={{ fontSize: 11, color: x.muted, lineHeight: 1.35 }}>Gerencie créditos, débitos, despesas e movimentações</div>
            </div>
          </div>

          {/* período */}
          <div style={{ marginBottom: 13 }}>
            <div style={filterLabel}>Período</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 22px 1fr', gap: 5, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: x.muted, pointerEvents: 'none' }}>{IcoCalSm()}</span>
                <input type="text" value={dateStart} onChange={(e) => { setDateStart(e.target.value); setPreset('') }} placeholder="DD/MM/AAAA" style={dateInput} />
              </div>
              <div style={{ textAlign: 'center', fontSize: 12, color: x.muted }}>→</div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: x.muted, pointerEvents: 'none' }}>{IcoCalSm()}</span>
                <input type="text" value={dateEnd} onChange={(e) => { setDateEnd(e.target.value); setPreset('') }} placeholder="DD/MM/AAAA" style={dateInput} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
              {presets.map((p) => {
                const sel = preset === p.id
                return (
                  <div key={p.id} onClick={() => applyPreset(p.id)} style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${sel ? x.green : x.cardB}`, background: sel ? x.glow : 'transparent', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: sel ? x.green : x.sub }}>
                    {p.label}
                  </div>
                )
              })}
            </div>
          </div>

          {/* turnos */}
          <div style={{ marginBottom: 13 }}>
            <div style={filterLabel}>Turnos</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {turnos.map((t) => {
                const sel = selectedTurnos.includes(t)
                return (
                  <div key={t} onClick={() => toggleTurno(t)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${sel ? TURNO_COL[t] : x.inputBorder}`, background: sel ? TURNO_BG[t] : x.inputBg, cursor: 'pointer', fontSize: 11.5, fontWeight: sel ? 700 : 400, color: sel ? TURNO_COL[t] : x.sub, textAlign: 'center', userSelect: 'none' }}>
                    {TURNO_LABELS[t]}
                  </div>
                )
              })}
            </div>
          </div>

          {/* pessoa / vínculo */}
          <div style={{ marginBottom: 13 }}>
            <div style={filterLabel}>Pessoa / Vínculo</div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: x.muted, pointerEvents: 'none', zIndex: 1 }}>{IcoSearch()}</span>
              <input
                type="text" value={personSearch}
                onChange={(e) => { setPersonSearch(e.target.value); setPersonDropOpen(true); setSelectedPersonId(null) }}
                onFocus={() => setPersonDropOpen(true)}
                placeholder="Nome, apelido, talão, função..."
                style={{ width: '100%', padding: '9px 12px 9px 32px', background: x.inputBg, border: `1px solid ${personDropOpen ? x.green : x.inputBorder}`, borderRadius: 10, color: x.text, fontSize: 12.5 }}
              />
              {personDropOpen && (
                <>
                  <div onClick={() => setPersonDropOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 94 }} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: x.dropdownBg, border: `1px solid ${x.cardB}`, borderRadius: 11, boxShadow: '0 14px 44px rgba(0,0,0,0.45)', zIndex: 96, overflow: 'hidden' }}>
                    <div style={{ padding: '5px 0', maxHeight: 210, overflowY: 'auto' }}>
                      <div onClick={() => { setSelectedPersonId(null); setPersonSearch(''); setPersonDropOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', cursor: 'pointer' }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: x.inputBg, border: `1px solid ${x.cardB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: x.muted, flexShrink: 0 }}>ALL</div>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: x.sub }}>Todas as pessoas</span>
                      </div>
                      {personDropItems.map((opt) => {
                        const sel = selectedPersonId === opt.id
                        const sub = [opt.apelido, opt.talao ? 'Talão ' + opt.talao : null].filter(Boolean).join(' · ')
                        return (
                          <div key={opt.id} onClick={(e) => { e.stopPropagation(); setSelectedPersonId(opt.id); setPersonSearch(''); setPersonDropOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', cursor: 'pointer', background: sel ? x.glow : 'transparent' }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: opt.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(opt.nome)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: sel ? x.green : x.text, lineHeight: 1.3 }}>{opt.nome}</div>
                              <div style={{ fontSize: 10.5, color: x.muted, lineHeight: 1.2 }}>{sub}</div>
                            </div>
                            <span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: opt.typeBg, color: opt.typeC, whiteSpace: 'nowrap', flexShrink: 0 }}>{opt.tipo}</span>
                            {sel && <span style={{ color: x.green, display: 'flex', flexShrink: 0 }}>{IcoCheckSm()}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
            {selPerson && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', background: x.glow, border: `1px solid ${x.glowB}`, borderRadius: 8, marginTop: 7 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: selPerson.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(selPerson.nome)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: x.green, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selPerson.nome}</div>
                  <div style={{ fontSize: 10, color: x.muted }}>{[selPerson.tipo, selPerson.talao ? 'Talão ' + selPerson.talao : null].filter(Boolean).join(' · ')}</div>
                </div>
                <button onClick={() => { setSelectedPersonId(null); setPersonSearch('') }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: x.muted, padding: 0 }}>{IcoXSm()}</button>
              </div>
            )}
          </div>

          {/* tipo de movimentação */}
          <div style={{ marginBottom: 14 }}>
            <div style={filterLabel}>Tipo de Movimentação</div>
            <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: x.inputBg, border: `1px solid ${x.inputBorder}`, borderRadius: 9, color: x.text, fontSize: 12.5, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}>
              <option value="">Todos os tipos</option>
              <option value="lancamento">Lançamento</option>
              <option value="despesa">Despesa</option>
              <option value="ajuste">Ajuste / Prêmio</option>
              <option value="pagamento">Pagamento</option>
              <option value="credito">Crédito</option>
              <option value="debito">Débito</option>
            </select>
          </div>

          <div style={{ height: 1, background: x.sbBorder, marginBottom: 13 }} />

          {/* resumo financeiro */}
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: x.green, marginBottom: 10 }}>Resumo Financeiro</div>

          <div style={{ padding: '13px 15px', background: saldoBg, border: `1px solid ${saldoBd}`, borderRadius: 13, marginBottom: 9, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: saldoGlow, pointerEvents: 'none' }} />
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: saldoC, marginBottom: 6 }}>Saldo Atual</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: saldoC, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{saldoStr}</div>
            <div style={{ fontSize: 10.5, color: saldoC, opacity: 0.75, marginTop: 4, lineHeight: 1.35 }}>{saldoLabel}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            <SumCard label="Total Venda" value={fmt(sumVenda)} labelC={x.muted} valueC={x.text} bg={x.card} bd={x.cardB} />
            <SumCard label="Total Dinheiro" value={fmt(sumDinheiro)} labelC={x.muted} valueC={x.text} bg={x.card} bd={x.cardB} />
            <SumCard label="Despesas" value={fmt(sumDesp)} labelC="#C8880A" valueC="#C8880A" bg="rgba(245,166,35,0.07)" bd="rgba(245,166,35,0.18)" />
            <SumCard label="Ajustes" value={fmt(sumAjuste)} labelC="#7A5CD4" valueC="#7A5CD4" bg="rgba(122,92,212,0.07)" bd="rgba(122,92,212,0.18)" />
            <SumCard label="Crédito" value={fmt(sumCredito)} labelC="#5B8FD4" valueC="#5B8FD4" bg="rgba(91,143,212,0.08)" bd="rgba(91,143,212,0.2)" />
            <SumCard label="Débito" value={fmt(sumDebito)} labelC="#E05555" valueC="#E05555" bg="rgba(224,85,85,0.07)" bd="rgba(224,85,85,0.18)" />
          </div>
        </div>

        {/* footer esquerdo */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${x.sbBorder}`, flexShrink: 0 }}>
          <button
            onClick={openAcerto} disabled={!canAcerto}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 10, border: 'none', background: realizarBtnBg, color: realizarBtnC, fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, cursor: canAcerto ? 'pointer' : 'not-allowed', boxShadow: canAcerto ? `0 4px 18px ${x.shadow}` : 'none', letterSpacing: '-0.01em' }}
          >
            <span style={{ display: 'flex' }}>{IcoAcerto()}</span>Realizar Acerto
          </button>
          <div style={{ textAlign: 'center', marginTop: 6, fontSize: 10.5, color: x.muted }}>{entryCount} movimentações · {dateStart} → {dateEnd}</div>
        </div>
      </div>

      {/* ── DIREITA: feed ── */}
      <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, background: x.bg }}>
        {/* top bar */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${x.cardB}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.025em', color: x.text }}>Linha Financeira</span>
              <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: x.glow, color: x.green, fontWeight: 700, border: `1px solid ${x.glowB}` }}>{entryCount}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: x.inputBg, border: `1px solid ${x.inputBorder}`, borderRadius: 8, padding: '6px 11px' }}>
              <span style={{ display: 'flex', color: x.muted, flexShrink: 0 }}>{IcoSearch()}</span>
              <input type="text" placeholder="Buscar pessoa..." value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} style={{ background: 'transparent', border: 'none', color: x.text, fontSize: 12.5, width: 130, outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <MiniStat label="Saldo" value={saldoStr} color={saldoLabelShort} />
            <Divider bg={x.cardB} />
            <MiniStat label="Crédito" value={fmt(sumCredito)} color="#5B8FD4" />
            <Divider bg={x.cardB} />
            <MiniStat label="Débito" value={fmt(sumDebito)} color="#E05555" />
            <Divider bg={x.cardB} />
            <MiniStat label="Despesas" value={fmt(sumDesp)} color="#C8880A" />
          </div>
        </div>

        {/* cabeçalho de colunas */}
        <div style={{ padding: '0 20px', borderBottom: `1px solid ${x.cardB}`, flexShrink: 0, background: x.sbBg }}>
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, padding: '7px 0' }}>
            <span style={colHead}>Tipo</span>
            <span style={colHead}>Data</span>
            <span style={colHead}>Pessoa / Vínculo</span>
            <span style={colHead}>Turno</span>
            <span style={{ ...colHead, textAlign: 'right' }}>Valor</span>
            <span style={{ ...colHead, textAlign: 'center' }}>Impacto</span>
            <span />
          </div>
        </div>

        {/* linhas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 16px' }}>
          {filtered.map((e) => {
            const p = PESSOAS.find((pp) => pp.id === e.pessoaId)
            const tm = tipoMetaFor(e.tipo, x.green)
            const imp = e.impacto
            const impAbs = Math.abs(imp)
            let impLabel: string, impC: string, impBg: string, impBd: string
            if (impAbs < 0.01) { impLabel = 'Zerado'; impC = x.green; impBg = x.glow; impBd = x.glowB }
            else if (imp > 0) { impLabel = '+' + fmt(imp); impC = '#5B8FD4'; impBg = 'rgba(91,143,212,0.1)'; impBd = 'rgba(91,143,212,0.22)' }
            else { impLabel = '-' + fmt(impAbs); impC = '#E05555'; impBg = 'rgba(224,85,85,0.09)'; impBd = 'rgba(224,85,85,0.22)' }
            const sub = p ? [p.tipo, p.talao ? 'Talão ' + p.talao : null, p.apelido].filter(Boolean).join(' · ') : ''
            return (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${x.cardB}`, borderRadius: 4 }}>
                <div>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600, background: tm.bg, color: tm.c, whiteSpace: 'nowrap', border: `1px solid ${tm.bd}` }}>{tm.label}</span>
                </div>
                <div style={{ fontSize: 11, color: x.muted, fontVariantNumeric: 'tabular-nums', lineHeight: 1.4 }}>{e.data}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: p ? p.avatarBg : 'linear-gradient(135deg,#333,#555)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{p ? initials(p.nome) : '?'}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: x.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.25 }}>{p ? p.nome : 'Desconhecido'}</div>
                    <div style={{ fontSize: 10.5, color: x.muted, lineHeight: 1.2 }}>{sub}</div>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: TURNO_BG[e.turno], color: TURNO_COL[e.turno], fontWeight: 600 }}>{TURNO_LABELS[e.turno]}</span>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: x.text, fontVariantNumeric: 'tabular-nums' }}>{fmt(e.valor)}</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: impBg, color: impC, border: `1px solid ${impBd}`, whiteSpace: 'nowrap' }}>{impLabel}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDrawerEntryId(e.id)} title="Detalhes" style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: x.muted }}>{IcoExpand()}</button>
                </div>
              </div>
            )
          })}

          {entryCount === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '80px 20px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: x.glow, border: `1px solid ${x.glowB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: x.green }}>{IcoAcerto()}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: x.sub }}>Nenhuma movimentação encontrada</div>
              <div style={{ fontSize: 12.5, color: x.muted, textAlign: 'center', maxWidth: 240, lineHeight: 1.55 }}>Ajuste os filtros de período, turno, pessoa ou tipo para visualizar.</div>
            </div>
          )}
          <div style={{ height: 12 }} />
        </div>
      </div>

      {/* ── overlays ── */}
      {drawerEntry && (
        <DetailDrawer x={x} dark={dark} entry={drawerEntry} pessoa={PESSOAS.find((p) => p.id === drawerEntry.pessoaId)} onClose={() => setDrawerEntryId(null)} onToggleDesp={toggleDesp} />
      )}
      {acertoOpen && (
        <AcertoDrawer
          x={x} dark={dark} selPerson={selPerson} saldo={saldo}
          valor={acertoValor} setValor={setAcertoValor}
          formaPag={acertoFormaPag} setFormaPag={setAcertoFormaPag}
          obs={acertoObs} setObs={setAcertoObs}
          onClose={() => setAcertoOpen(false)} onConfirm={confirmAcerto}
        />
      )}
      {printOpen && lastAcerto && (
        <PrintModal
          x={x} data={lastAcerto} operador={operadorNome} bancaNome={bancaNome}
          onClose={() => setPrintOpen(false)}
          onPrint={(kind) => { setPrintOpen(false); showToast(kind === 'termica' ? 'Enviando para impressora térmica...' : kind === 'pdf' ? 'Gerando PDF do comprovante...' : 'Enviando para impressora comum...') }}
        />
      )}
      {toast && (
        <div style={{ position: 'fixed', bottom: 22, right: 22, zIndex: 500, display: 'flex', alignItems: 'center', gap: 9, padding: '11px 18px', background: x.green, color: '#fff', borderRadius: 12, boxShadow: `0 6px 24px ${x.shadow}`, fontSize: 13, fontWeight: 700, pointerEvents: 'none' }}>
          <span style={{ display: 'flex' }}>{IcoCheckSm()}</span>{toast}
        </div>
      )}
    </div>
  )
}

/* ── subcomponentes locais ── */
function SumCard({ label, value, labelC, valueC, bg, bd }: { label: string; value: string; labelC: string; valueC: string; bg: string; bd: string }) {
  return (
    <div style={{ padding: '10px 12px', background: bg, border: `1px solid ${bd}`, borderRadius: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: labelC, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: valueC, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}
function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 10.5, color: 'inherit', opacity: 0.75 }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}
function Divider({ bg }: { bg: string }) {
  return <div style={{ width: 1, height: 14, background: bg }} />
}
