'use client'

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useTheme } from '@/shared/theme/theme-provider'
import { useCurrentUser } from '@/shared/session/use-current-user'
import {
  CAMBISTAS,
  FEED_DATE,
  INITIAL_ENTRIES,
  MONTHS,
  TURNO_BADGE_BG,
  TURNO_BADGE_C,
  TURNO_LABELS,
  camSub,
  cashKey,
  displayCents,
  fmt,
  initials,
  parsePaste,
} from '../data/lancamentos.sample'
import type { Entry, Turno } from '../types'
import {
  IcoBolt,
  IcoCalendar,
  IcoCheck,
  IcoCheckSm,
  IcoChevLeft,
  IcoChevRight,
  IcoClock,
  IcoDespesa,
  IcoEdit,
  IcoMsgSq,
  IcoPencil,
  IcoSearch,
  IcoTrash,
  IcoXSmall,
} from '../components/icons'

const TURNO_ACTIVE_C: Record<Turno, string> = { manha: '#C8880A', tarde: '#5B8FD4', noite: '#7A5CD4' }
const TURNO_ACTIVE_BG: Record<Turno, string> = {
  manha: 'rgba(245,166,35,0.14)',
  tarde: 'rgba(91,143,212,0.14)',
  noite: 'rgba(130,90,210,0.14)',
}

type CalDay = {
  key: string
  label: string
  bg: string
  bd: string
  fw: number
  color: string
  cursor: string
  onClick?: () => void
}

export function LancamentosPage() {
  const { c, dark } = useTheme()
  const currentUser = useCurrentUser()
  const currentUserName = currentUser.status === 'success' ? currentUser.data.name : ''
  const G = c.green
  const inputBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'

  /* ── form state ── */
  const [formData, setFormData] = useState(FEED_DATE)
  const [formDateEditing, setFormDateEditing] = useState(false)
  const [calMonth, setCalMonth] = useState(5)
  const [calYear, setCalYear] = useState(2026)
  const [turno, setTurno] = useState<Turno>('manha')
  const [formCambistaId, setFormCambistaId] = useState<number | null>(null)
  const [formTalaoSearch, setFormTalaoSearch] = useState('')
  const [talaoDropOpen, setTalaoDropOpen] = useState(false)
  const [formVendaCents, setFormVendaCents] = useState(0)
  const [formDinheiroCents, setFormDinheiroCents] = useState(0)
  const [formShowObs, setFormShowObs] = useState(false)
  const [formObs, setFormObs] = useState('')
  const [formDespesaOpen, setFormDespesaOpen] = useState(false)
  const [formDespesaCents, setFormDespesaCents] = useState(0)
  const [formDespesaDescricao, setFormDespesaDescricao] = useState('')

  /* ── feed state ── */
  const [entries, setEntries] = useState<Entry[]>(INITIAL_ENTRIES)
  const [nextId, setNextId] = useState(5)
  const [filterTurno, setFilterTurno] = useState<'all' | Turno>('manha')
  const [feedSearch, setFeedSearch] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  /* ── inline edit / delete state ── */
  const [editEntryId, setEditEntryId] = useState<number | null>(null)
  const [editTurno, setEditTurno] = useState<Turno>('manha')
  const [editVendaCents, setEditVendaCents] = useState(0)
  const [editDinheiroCents, setEditDinheiroCents] = useState(0)
  const [editObs, setEditObs] = useState('')
  const [deletingEntryId, setDeletingEntryId] = useState<number | null>(null)

  /* ── derived: date ── */
  const todayStr = new Date().toLocaleDateString('pt-BR')
  const formDateIsToday = formData === todayStr

  /* ── derived: calendar days ── */
  const calDays = useMemo<CalDay[]>(() => {
    const parts = (formData || '').split('/')
    const selD = parseInt(parts[0], 10) || 0
    const selM = parseInt(parts[1], 10) - 1
    const selY = parseInt(parts[2], 10) || 0
    const today = new Date()
    const firstDay = new Date(calYear, calMonth, 1).getDay()
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const days: CalDay[] = []
    for (let i = 0; i < firstDay; i++) {
      days.push({ key: `e${i}`, label: '', bg: 'transparent', bd: 'none', fw: 400, color: 'transparent', cursor: 'default' })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isSelected = d === selD && calMonth === selM && calYear === selY
      const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()
      const dd = String(d).padStart(2, '0')
      const mm = String(calMonth + 1).padStart(2, '0')
      const dateStr = `${dd}/${mm}/${calYear}`
      days.push({
        key: `d${d}`,
        label: String(d),
        bg: isSelected ? G : 'transparent',
        bd: isToday && !isSelected ? `1px solid ${G}` : 'none',
        fw: isSelected || isToday ? 700 : 400,
        color: isSelected ? '#fff' : isToday ? G : c.text,
        cursor: 'pointer',
        onClick: () => {
          setFormData(dateStr)
          setFormDateEditing(false)
        },
      })
    }
    return days
  }, [calYear, calMonth, formData, G, c.text])

  /* ── derived: talão ── */
  const srch = formTalaoSearch.trim().toLowerCase()
  const filteredCams = srch
    ? CAMBISTAS.filter(
        (cam) =>
          cam.talao.startsWith(formTalaoSearch.trim()) ||
          cam.nome.toLowerCase().includes(srch) ||
          (cam.apelido && cam.apelido.toLowerCase().includes(srch)),
      )
    : CAMBISTAS
  const selCam = CAMBISTAS.find((x) => x.id === formCambistaId) || null

  const selectCambista = (id: number) => {
    setFormCambistaId(id)
    setFormTalaoSearch('')
    setTalaoDropOpen(false)
  }

  /* ── derived: auto-calc ── */
  const vv = formVendaCents / 100
  const vm = formDinheiroCents / 100
  const hasCalc = !!(selCam && (vv > 0 || vm > 0))
  const pct = selCam ? selCam.pct || 0 : 0
  const comissao = (vv * pct) / 100
  const esperado = vv - comissao
  const diferenca = vm - esperado
  const calcComissaoStr = fmt(comissao) + (pct ? ` (${pct}%)` : '')
  const calcEsperadoStr = fmt(esperado)
  const difAbs = Math.abs(diferenca)
  let calcStatusLabel: string
  let calcStatusColor: string
  let calcBarBg: string
  let calcBarBd: string
  if (difAbs < 0.005) {
    calcStatusLabel = '✔ Zerado'
    calcStatusColor = G
    calcBarBg = c.glow
    calcBarBd = c.glowB
  } else if (diferenca > 0) {
    calcStatusLabel = '↑ Crédito ' + fmt(diferenca)
    calcStatusColor = '#5B8FD4'
    calcBarBg = 'rgba(91,143,212,0.08)'
    calcBarBd = 'rgba(91,143,212,0.2)'
  } else {
    calcStatusLabel = '↓ Devendo ' + fmt(difAbs)
    calcStatusColor = '#E05555'
    calcBarBg = 'rgba(224,85,85,0.08)'
    calcBarBd = 'rgba(224,85,85,0.2)'
  }

  /* ── derived: despesa form ── */
  const despesaValorBorder = formDespesaCents > 0 ? '#C8880A' : inputBorder
  const despesaBlockBg = dark ? 'rgba(245,166,35,0.07)' : 'rgba(245,166,35,0.06)'
  const despesaBlockBd = dark ? 'rgba(245,166,35,0.22)' : 'rgba(245,166,35,0.16)'
  const despesaBtnBg = formDespesaOpen ? (dark ? 'rgba(245,166,35,0.13)' : 'rgba(245,166,35,0.1)') : 'transparent'
  const despesaBtnBd = formDespesaOpen ? '#C8880A' : c.cardB
  const despesaBtnColor = formDespesaOpen ? '#C8880A' : c.muted

  /* ── derived: save ── */
  const canSave = !!(formCambistaId && formVendaCents > 0 && formDinheiroCents > 0)
  const saveBtnBg = canSave ? G : dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  const saveBtnColor = canSave ? '#fff' : c.muted
  const obsBtnBg = formShowObs ? c.glow : 'transparent'
  const obsBtnBd = formShowObs ? G : c.cardB
  const obsBtnColor = formShowObs ? G : c.sub

  const doSave = () => {
    // Gating derivado do próprio contrato de dados (`canSave`), não só do
    // atributo `disabled`/cursor do botão — revalidado aqui antes de salvar.
    if (!canSave || formCambistaId == null) return
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const despesa =
      formDespesaOpen && formDespesaCents > 0
        ? { valor: formDespesaCents / 100, descricao: formDespesaDescricao.trim() }
        : null
    const entry: Entry = {
      id: nextId,
      turno,
      cambistaId: formCambistaId,
      venda: formVendaCents / 100,
      dinheiro: formDinheiroCents / 100,
      obs: formObs.trim(),
      hora,
      data: formData,
      // Registrado pelo usuário autenticado atual — nunca fabricado.
      operador: currentUserName,
      despesa,
    }
    setEntries([entry, ...entries])
    setNextId(nextId + 1)
    setFormCambistaId(null)
    setFormTalaoSearch('')
    setTalaoDropOpen(false)
    setFormVendaCents(0)
    setFormDinheiroCents(0)
    setFormShowObs(false)
    setFormObs('')
    setFormDespesaOpen(false)
    setFormDespesaCents(0)
    setFormDespesaDescricao('')
    setToastVisible(true)
    window.setTimeout(() => setToastVisible(false), 2200)
  }

  /* ── derived: feed filtering ── */
  let feedEntries = entries.filter((e) => e.data === formData)
  if (filterTurno !== 'all') feedEntries = feedEntries.filter((e) => e.turno === filterTurno)
  if (feedSearch.trim()) {
    const s = feedSearch.trim().toLowerCase()
    feedEntries = feedEntries.filter((e) => {
      const cam = CAMBISTAS.find((x) => x.id === e.cambistaId)
      return !!cam && (cam.talao.includes(s) || cam.nome.toLowerCase().includes(s) || (cam.apelido && cam.apelido.toLowerCase().includes(s)))
    })
  }
  const entryCount = feedEntries.length
  const noCards = entryCount === 0

  /* ── derived: totals ── */
  const totals = feedEntries.reduce(
    (acc, e) => {
      const cam = CAMBISTAS.find((x) => x.id === e.cambistaId)
      const p = cam ? cam.pct || 0 : 0
      const com = (e.venda * p) / 100
      acc.venda += e.venda
      acc.dinheiro += e.dinheiro
      acc.comissao += com
      acc.dif += e.dinheiro - (e.venda - com)
      return acc
    },
    { venda: 0, dinheiro: 0, comissao: 0, dif: 0 },
  )
  const totalDifColor = totals.dif > 0.005 ? '#5B8FD4' : totals.dif < -0.005 ? '#E05555' : c.muted
  const totalDifStr = (totals.dif > 0.005 ? '+' : '') + fmt(Math.abs(totals.dif))

  /* ── helpers ── */
  const turnoPill = (t: Turno, cur: Turno) => {
    const sel = cur === t
    return {
      bg: sel ? TURNO_ACTIVE_BG[t] : inputBg,
      border: sel ? TURNO_ACTIVE_C[t] : inputBorder,
      color: sel ? TURNO_ACTIVE_C[t] : c.sub,
      fw: sel ? 600 : 400,
    }
  }

  const cashProps = (val: number, set: (n: number) => void, onEnter?: () => void) => ({
    value: displayCents(val),
    onChange: () => {},
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onEnter?.()
        return
      }
      if (e.key === 'Tab' || e.metaKey || e.ctrlKey) return
      e.preventDefault()
      const n = cashKey(val, e.key)
      if (n !== null) set(n)
    },
    onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      set(parsePaste(e.clipboardData.getData('text')))
    },
  })

  const label: CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: c.muted,
    marginBottom: 6,
  }
  const cashInput: CSSProperties = {
    width: '100%',
    padding: '11px 10px',
    background: inputBg,
    borderRadius: 10,
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'right',
    caretColor: 'transparent',
  }

  const openDateEdit = () => {
    const parts = (formData || '').split('/')
    const m = parseInt(parts[1], 10) - 1
    const y = parseInt(parts[2], 10)
    setCalMonth(isNaN(m) ? new Date().getMonth() : m)
    setCalYear(isNaN(y) ? new Date().getFullYear() : y)
    setFormDateEditing(true)
  }
  const prevCalMonth = () => {
    let m = calMonth - 1
    let y = calYear
    if (m < 0) {
      m = 11
      y--
    }
    setCalMonth(m)
    setCalYear(y)
  }
  const nextCalMonth = () => {
    let m = calMonth + 1
    let y = calYear
    if (m > 11) {
      m = 0
      y++
    }
    setCalMonth(m)
    setCalYear(y)
  }
  const setToday = () => {
    const d = new Date()
    const str = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    setFormData(str)
    setFormDateEditing(false)
    setCalMonth(d.getMonth())
    setCalYear(d.getFullYear())
  }

  const startEdit = (e: Entry) => {
    setEditEntryId(e.id)
    setDeletingEntryId(null)
    setEditTurno(e.turno)
    setEditVendaCents(Math.round(e.venda * 100))
    setEditDinheiroCents(Math.round(e.dinheiro * 100))
    setEditObs(e.obs || '')
  }
  const saveEdit = () => {
    if (editEntryId == null) return
    setEntries((prev) =>
      prev.map((e) =>
        e.id === editEntryId
          ? { ...e, turno: editTurno, venda: editVendaCents / 100, dinheiro: editDinheiroCents / 100, obs: editObs }
          : e,
      ),
    )
    setEditEntryId(null)
  }
  const confirmDelete = () => {
    setEntries((prev) => prev.filter((e) => e.id !== deletingEntryId))
    setDeletingEntryId(null)
  }

  const filterPillDefs: { t: 'all' | Turno; label: string }[] = [
    { t: 'all', label: 'Todos' },
    { t: 'manha', label: 'Manhã' },
    { t: 'tarde', label: 'Tarde' },
    { t: 'noite', label: 'Noite' },
  ]

  return (
    <div style={{ height: 'calc(100vh - 54px)', display: 'flex', overflow: 'hidden' }}>
      {/* backdrops */}
      {talaoDropOpen && (
        <div onClick={() => setTalaoDropOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 94 }} />
      )}
      {formDateEditing && (
        <div onClick={() => setFormDateEditing(false)} style={{ position: 'fixed', inset: 0, zIndex: 96 }} />
      )}

      {/* TOAST */}
      {toastVisible && (
        <div
          style={{
            position: 'fixed',
            bottom: 22,
            right: 22,
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '11px 18px',
            background: G,
            color: '#fff',
            borderRadius: 12,
            boxShadow: `0 6px 24px ${c.shadow}`,
            fontSize: 13,
            fontWeight: 700,
            pointerEvents: 'none',
          }}
        >
          <span style={{ display: 'flex' }}>{IcoCheck}</span>Salvo!
        </div>
      )}

      {/* ══ FORM COLUMN ══ */}
      <div
        style={{
          width: 400,
          flexShrink: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: c.sbBg,
          borderRight: `1px solid ${c.sbBorder}`,
        }}
      >
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>
          {/* title */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: c.glow,
                  border: `1px solid ${c.glowB}`,
                  color: G,
                  flexShrink: 0,
                }}
              >
                {IcoBolt}
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', color: c.text }}>Lançamento</span>
            </div>
          </div>

          {/* ① DATA */}
          <div style={{ marginBottom: 12 }}>
            <div style={label}>Data</div>
            <div style={{ position: 'relative' }}>
              {!formDateEditing ? (
                <div
                  onClick={openDateEdit}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 13px',
                    background: inputBg,
                    border: `1px solid ${inputBorder}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'flex', color: c.muted, flexShrink: 0 }}>{IcoCalendar}</span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: c.text,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {formData}
                  </span>
                  {formDateIsToday && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 20,
                        background: c.glow,
                        color: G,
                        fontWeight: 600,
                        border: `1px solid ${c.glowB}`,
                        flexShrink: 0,
                      }}
                    >
                      Hoje
                    </span>
                  )}
                  <span style={{ display: 'flex', color: c.muted, flexShrink: 0 }}>{IcoPencil}</span>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 13px',
                      background: inputBg,
                      border: `1px solid ${G}`,
                      borderRadius: 10,
                    }}
                  >
                    <span style={{ display: 'flex', color: G, flexShrink: 0 }}>{IcoCalendar}</span>
                    <input
                      type="text"
                      value={formData}
                      onChange={(e) => setFormData(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: c.text,
                        fontSize: 13.5,
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '0.02em',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormDateEditing(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        border: 'none',
                        background: G,
                        cursor: 'pointer',
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      {IcoCheckSm}
                    </button>
                  </div>

                  {/* calendar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      background: c.dropdownBg,
                      border: `1px solid ${c.cardB}`,
                      borderRadius: 14,
                      boxShadow: '0 16px 44px rgba(0,0,0,0.45)',
                      zIndex: 97,
                      padding: 14,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
                      <button
                        type="button"
                        onClick={prevCalMonth}
                        style={calNavBtn(inputBg, c.sub)}
                      >
                        {IcoChevLeft}
                      </button>
                      <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>
                        {MONTHS[calMonth]} {calYear}
                      </span>
                      <button
                        type="button"
                        onClick={nextCalMonth}
                        style={calNavBtn(inputBg, c.sub)}
                      >
                        {IcoChevRight}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 3 }}>
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((w, i) => (
                        <div
                          key={i}
                          style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: c.muted, padding: '3px 0' }}
                        >
                          {w}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                      {calDays.map((day) => (
                        <div
                          key={day.key}
                          onClick={day.onClick}
                          style={{
                            aspectRatio: '1',
                            borderRadius: 7,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: day.cursor,
                            background: day.bg,
                            border: day.bd,
                            fontSize: 12,
                            fontWeight: day.fw,
                            color: day.color,
                          }}
                        >
                          {day.label}
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={setToday}
                        style={{
                          padding: '5px 18px',
                          borderRadius: 20,
                          border: `1px solid ${c.glowB}`,
                          background: c.glow,
                          color: G,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Hoje
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormDateEditing(false)}
                        style={{
                          padding: '5px 18px',
                          borderRadius: 20,
                          border: `1px solid ${c.cardB}`,
                          background: 'transparent',
                          color: c.sub,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ② TURNO */}
          <div style={{ marginBottom: 12 }}>
            <div style={label}>
              Turno{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 9.5 }}>
                — fixo até alterar
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['manha', 'tarde', 'noite'] as Turno[]).map((t) => {
                const p = turnoPill(t, turno)
                return (
                  <div
                    key={t}
                    onClick={() => {
                      setTurno(t)
                      setFilterTurno(t)
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 8,
                      border: `1px solid ${p.border}`,
                      background: p.bg,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: p.fw,
                      color: p.color,
                      textAlign: 'center',
                      userSelect: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    {TURNO_LABELS[t]} <span style={{ fontSize: 9, opacity: 0.5 }}>{t[0].toUpperCase()}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ height: 1, background: c.sbBorder, marginBottom: 12 }} />

          {/* ③ TALÃO */}
          <div style={{ marginBottom: 10 }}>
            <div style={label}>Talão</div>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  color: c.muted,
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                {IcoSearch}
              </span>
              <input
                type="text"
                value={formTalaoSearch}
                onChange={(e) => {
                  setFormTalaoSearch(e.target.value)
                  setTalaoDropOpen(true)
                  setFormCambistaId(null)
                }}
                onFocus={() => setTalaoDropOpen(true)}
                placeholder="Nº, nome ou apelido..."
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 32px',
                  background: inputBg,
                  border: `1px solid ${talaoDropOpen ? G : inputBorder}`,
                  borderRadius: 10,
                  color: c.text,
                  fontSize: 13.5,
                }}
              />
              {talaoDropOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: c.dropdownBg,
                    border: `1px solid ${c.cardB}`,
                    borderRadius: 12,
                    boxShadow: '0 16px 44px rgba(0,0,0,0.45)',
                    zIndex: 96,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ maxHeight: 210, overflowY: 'auto', padding: '6px 0' }}>
                    {filteredCams.length === 0 ? (
                      <div style={{ padding: 16, textAlign: 'center', fontSize: 12.5, color: c.muted }}>
                        Nenhum cambista encontrado
                      </div>
                    ) : (
                      filteredCams.map((cam) => {
                        const isSel = formCambistaId === cam.id
                        return (
                          <div
                            key={cam.id}
                            onClick={() => selectCambista(cam.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '9px 13px',
                              cursor: 'pointer',
                              background: isSel ? c.glow : 'transparent',
                            }}
                          >
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: '50%',
                                background: cam.avatarBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10.5,
                                fontWeight: 700,
                                color: '#fff',
                                flexShrink: 0,
                              }}
                            >
                              {initials(cam.nome)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: isSel ? G : c.text, lineHeight: 1.3 }}>
                                {cam.talao} · {cam.nome}
                              </div>
                              <div style={{ fontSize: 11, color: c.muted, lineHeight: 1.3 }}>{camSub(cam)}</div>
                            </div>
                            {isSel && <span style={{ color: G, display: 'flex', flexShrink: 0 }}>{IcoCheck}</span>}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* selected chip */}
          {selCam && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '7px 11px',
                background: c.glow,
                border: `1px solid ${c.glowB}`,
                borderRadius: 9,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: selCam.avatarBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {initials(selCam.nome)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: G,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {selCam.talao} · {selCam.nome}
                </div>
                <div style={{ fontSize: 10.5, color: c.muted, lineHeight: 1.2 }}>{camSub(selCam)}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormCambistaId(null)
                  setFormTalaoSearch('')
                  setTalaoDropOpen(false)
                }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: c.muted,
                  flexShrink: 0,
                }}
              >
                {IcoXSmall}
              </button>
            </div>
          )}

          {/* ④ VENDA + ⑤ DINHEIRO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <div style={label}>Venda</div>
              <input
                type="text"
                {...cashProps(formVendaCents, setFormVendaCents)}
                placeholder="0,00"
                style={{
                  ...cashInput,
                  border: `1px solid ${formVendaCents > 0 ? G : inputBorder}`,
                  color: formVendaCents > 0 ? c.text : c.muted,
                }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ ...label, marginBottom: 0 }}>Dinheiro</span>
                <button
                  type="button"
                  onClick={() => setFormDespesaOpen((v) => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '2px 9px 2px 7px',
                    borderRadius: 5,
                    border: `1px solid ${despesaBtnBd}`,
                    background: despesaBtnBg,
                    color: despesaBtnColor,
                    fontSize: 9,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ display: 'flex', marginRight: 1 }}>{IcoDespesa}</span>+ Despesa{' '}
                  <span style={{ opacity: 0.45, fontSize: 7.5, marginLeft: 2 }}>Alt+D</span>
                </button>
              </div>
              <input
                type="text"
                {...cashProps(formDinheiroCents, setFormDinheiroCents, () => {
                  if (canSave) doSave()
                })}
                placeholder="0,00"
                style={{
                  ...cashInput,
                  border: `1px solid ${formDinheiroCents > 0 ? G : inputBorder}`,
                  color: formDinheiroCents > 0 ? c.text : c.muted,
                }}
              />
            </div>
          </div>

          {/* DESPESA block */}
          {formDespesaOpen && (
            <div
              style={{
                marginBottom: 10,
                padding: '11px 13px',
                background: despesaBlockBg,
                border: `1px solid ${despesaBlockBd}`,
                borderRadius: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
                <span style={{ display: 'flex', color: '#C8880A' }}>{IcoDespesa}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#C8880A', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Despesa vinculada
                </span>
                <span style={{ flex: 1 }} />
                <button
                  type="button"
                  onClick={() => setFormDespesaOpen(false)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: c.muted,
                  }}
                >
                  {IcoXSmall}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                <div>
                  <div style={{ ...label, fontSize: 9.5, letterSpacing: '0.07em', marginBottom: 5 }}>Valor</div>
                  <input
                    type="text"
                    {...cashProps(formDespesaCents, setFormDespesaCents)}
                    placeholder="0,00"
                    style={{
                      width: '100%',
                      padding: '8px 9px',
                      background: inputBg,
                      border: `1px solid ${despesaValorBorder}`,
                      borderRadius: 8,
                      color: formDespesaCents > 0 ? c.text : c.muted,
                      fontSize: 15,
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                      textAlign: 'right',
                      caretColor: 'transparent',
                    }}
                  />
                </div>
                <div>
                  <div style={{ ...label, fontSize: 9.5, letterSpacing: '0.07em', marginBottom: 5 }}>
                    Descrição{' '}
                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 9 }}>— opcional</span>
                  </div>
                  <input
                    type="text"
                    value={formDespesaDescricao}
                    onChange={(e) => setFormDespesaDescricao(e.target.value)}
                    placeholder="água, transporte..."
                    style={{
                      width: '100%',
                      padding: '8px 9px',
                      background: inputBg,
                      border: `1px solid ${inputBorder}`,
                      borderRadius: 8,
                      color: c.text,
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* AUTO-CALC */}
          {hasCalc && (
            <div
              style={{
                padding: '10px 13px',
                background: calcBarBg,
                border: `1px solid ${calcBarBd}`,
                borderRadius: 10,
                marginBottom: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: c.muted }}>Comissão</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: G, fontVariantNumeric: 'tabular-nums' }}>
                  {calcComissaoStr}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: 11, color: c.muted }}>Esperado banca</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: c.text, fontVariantNumeric: 'tabular-nums' }}>
                  {calcEsperadoStr}
                </span>
              </div>
              <div style={{ height: 1, background: calcBarBd, marginBottom: 7 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: c.muted }}>Situação</span>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: calcStatusColor, letterSpacing: '-0.01em' }}>
                  {calcStatusLabel}
                </span>
              </div>
            </div>
          )}

          {/* OBS */}
          {formShowObs && (
            <div>
              <div style={label}>
                Obs{' '}
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 9.5 }}>
                  — Enter salva · Shift+Enter nova linha
                </span>
              </div>
              <textarea
                rows={2}
                value={formObs}
                onChange={(e) => setFormObs(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (canSave) doSave()
                  }
                }}
                placeholder="Observação opcional..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: inputBg,
                  border: `1px solid ${inputBorder}`,
                  borderRadius: 10,
                  color: c.text,
                  fontSize: 13,
                  resize: 'none',
                  lineHeight: 1.5,
                  minHeight: 58,
                }}
              />
            </div>
          )}
        </div>

        {/* form footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${c.sbBorder}`,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setFormShowObs((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 12px',
              borderRadius: 9,
              border: `1px solid ${obsBtnBd}`,
              background: obsBtnBg,
              color: obsBtnColor,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span style={{ display: 'flex' }}>{IcoMsgSq}</span>
            <span
              style={{
                fontSize: 9.5,
                padding: '1px 5px',
                background: inputBg,
                borderRadius: 3,
                border: `1px solid ${inputBorder}`,
                fontWeight: 700,
              }}
            >
              F2
            </span>
          </button>
          <button
            type="button"
            onClick={doSave}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 0',
              borderRadius: 10,
              border: 'none',
              background: saveBtnBg,
              color: saveBtnColor,
              fontSize: 14,
              fontWeight: 700,
              cursor: canSave ? 'pointer' : 'not-allowed',
              boxShadow: canSave ? `0 4px 18px ${c.shadow}` : 'none',
              letterSpacing: '-0.01em',
            }}
          >
            Salvar{' '}
            <span style={{ fontSize: 11, padding: '2px 6px', background: 'rgba(255,255,255,0.2)', borderRadius: 4, fontWeight: 700 }}>
              ↵
            </span>
          </button>
        </div>
      </div>

      {/* ══ FEED COLUMN ══ */}
      <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, background: c.bg }}>
        {/* feed header */}
        <div style={{ padding: '13px 20px', borderBottom: `1px solid ${c.cardB}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.025em', color: c.text }}>Feed · {formData}</span>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 9px',
                  borderRadius: 20,
                  background: c.glow,
                  color: G,
                  fontWeight: 700,
                  border: `1px solid ${c.glowB}`,
                }}
              >
                {entryCount}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  background: inputBg,
                  border: `1px solid ${inputBorder}`,
                  borderRadius: 8,
                  padding: '6px 11px',
                }}
              >
                <span style={{ display: 'flex', color: c.muted, flexShrink: 0 }}>{IcoSearch}</span>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={feedSearch}
                  onChange={(e) => setFeedSearch(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: c.text, fontSize: 12.5, width: 100 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {filterPillDefs.map((fp) => {
                  const sel = filterTurno === fp.t
                  return (
                    <div
                      key={fp.t}
                      onClick={() => setFilterTurno(fp.t)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 20,
                        border: `1px solid ${sel ? G : c.cardB}`,
                        background: sel ? c.glow : 'transparent',
                        cursor: 'pointer',
                        fontSize: 11.5,
                        fontWeight: sel ? 600 : 400,
                        color: sel ? G : c.sub,
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fp.label}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          {/* stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <Stat label="Venda" value={fmt(totals.venda)} color={c.text} muted={c.muted} />
            <Divider color={c.cardB} />
            <Stat label="Dinheiro" value={fmt(totals.dinheiro)} color={c.text} muted={c.muted} />
            <Divider color={c.cardB} />
            <Stat label="Comissão" value={fmt(totals.comissao)} color={G} muted={c.muted} />
            <Divider color={c.cardB} />
            <Stat label="Saldo" value={totalDifStr} color={totalDifColor} muted={c.muted} />
          </div>
        </div>

        {/* feed list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
          {noCards ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 11,
                padding: '70px 20px',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 13,
                  background: c.glow,
                  border: `1px solid ${c.glowB}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: G,
                }}
              >
                {IcoBolt}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: c.sub }}>Nenhum lançamento para {formData}</div>
              <div style={{ fontSize: 12.5, color: c.muted, textAlign: 'center', maxWidth: 220, lineHeight: 1.55 }}>
                Use o formulário ao lado para registrar o primeiro lançamento.
              </div>
            </div>
          ) : (
            feedEntries.map((e) => {
              const cam = CAMBISTAS.find((x) => x.id === e.cambistaId)
              const p = cam ? cam.pct || 0 : 0
              const com = (e.venda * p) / 100
              const esp = e.venda - com
              const dif2 = e.dinheiro - esp
              const dif2abs = Math.abs(dif2)
              const avatarBg = cam ? cam.avatarBg : 'linear-gradient(135deg,#333,#666)'
              const camNome = cam ? cam.nome : '?'
              const talaoNum = cam ? cam.talao : '?'
              const inits = cam ? initials(cam.nome) : '??'
              let statusLabel: string
              let statusC: string
              let statusBg: string
              let statusBd: string
              let hasDif = false
              let difStr = ''
              if (dif2abs < 0.005) {
                statusLabel = 'Zerado'
                statusC = G
                statusBg = c.glow
                statusBd = c.glowB
              } else if (dif2 > 0) {
                statusLabel = 'Crédito'
                statusC = '#5B8FD4'
                statusBg = 'rgba(91,143,212,0.1)'
                statusBd = 'rgba(91,143,212,0.22)'
                hasDif = true
                difStr = '+' + fmt(dif2)
              } else {
                statusLabel = 'Devendo'
                statusC = '#E05555'
                statusBg = 'rgba(224,85,85,0.1)'
                statusBd = 'rgba(224,85,85,0.22)'
                hasDif = true
                difStr = fmt(dif2abs)
              }
              const isEditing = editEntryId === e.id
              const isDeleting = deletingEntryId === e.id
              const cardBorder = isEditing ? 'rgba(245,166,35,0.4)' : isDeleting ? 'rgba(224,85,85,0.4)' : c.cardB

              return (
                <div
                  key={e.id}
                  style={{
                    background: c.card,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 14,
                    marginBottom: 9,
                    overflow: 'hidden',
                  }}
                >
                  {/* VIEW */}
                  {!isEditing && !isDeleting && (
                    <div style={{ padding: '13px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                        <Avatar bg={avatarBg} inits={inits} size={32} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: c.text, lineHeight: 1.25 }}>
                            {talaoNum} · {camNome}
                          </div>
                          <div style={{ fontSize: 11, color: c.muted, lineHeight: 1.25 }}>{cam ? camSub(cam) : ''}</div>
                        </div>
                        <span
                          style={{
                            fontSize: 10.5,
                            padding: '3px 9px',
                            borderRadius: 20,
                            fontWeight: 600,
                            background: TURNO_BADGE_BG[e.turno],
                            color: TURNO_BADGE_C[e.turno],
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {TURNO_LABELS[e.turno]}
                        </span>
                        <span style={{ fontSize: 11, color: c.muted, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                          {e.hora}
                        </span>
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          <CardActionBtn title="Editar" color={c.muted} onClick={() => startEdit(e)}>
                            {IcoEdit}
                          </CardActionBtn>
                          <CardActionBtn
                            title="Excluir"
                            color={c.muted}
                            onClick={() => {
                              setDeletingEntryId(e.id)
                              setEditEntryId(null)
                            }}
                          >
                            {IcoTrash}
                          </CardActionBtn>
                          <CardActionBtn title={`Por: ${e.operador} às ${e.hora} · ${e.data}`} color={c.muted}>
                            {IcoClock}
                          </CardActionBtn>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '9px 12px',
                          background: inputBg,
                          borderRadius: 9,
                          border: `1px solid ${c.cardBL}`,
                        }}
                      >
                        <ValueBlock label="Venda" value={fmt(e.venda)} color={c.text} muted={c.muted} />
                        <span style={{ color: c.muted, fontSize: 13, flexShrink: 0 }}>→</span>
                        <ValueBlock label="Dinheiro" value={fmt(e.dinheiro)} color={c.text} muted={c.muted} />
                        <div style={{ width: 1, height: 30, background: c.cardB, margin: '0 4px', flexShrink: 0 }} />
                        <div>
                          <div style={{ ...miniLabel, color: c.muted }}>Comissão</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: G, fontVariantNumeric: 'tabular-nums' }}>
                            {p ? `${fmt(com)} (${p}%)` : '—'}
                          </div>
                        </div>
                        <div style={{ flex: 1 }} />
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: 8,
                            background: statusBg,
                            border: `1px solid ${statusBd}`,
                            flexShrink: 0,
                          }}
                        >
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusC, flexShrink: 0 }} />
                          <span style={{ fontSize: 12.5, fontWeight: 800, color: statusC, letterSpacing: '-0.01em' }}>
                            {statusLabel}
                          </span>
                          {hasDif && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: statusC, fontVariantNumeric: 'tabular-nums' }}>
                              {difStr}
                            </span>
                          )}
                        </div>
                      </div>
                      {!!(e.obs && e.obs.trim()) && (
                        <div
                          style={{
                            marginTop: 8,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 7,
                            padding: '6px 10px',
                            background: c.glow,
                            borderRadius: 7,
                            border: `1px solid ${c.glowB}`,
                          }}
                        >
                          <span style={{ display: 'flex', color: c.muted, flexShrink: 0, marginTop: 1 }}>{IcoMsgSq}</span>
                          <span style={{ fontSize: 12, color: c.sub, lineHeight: 1.45 }}>{e.obs}</span>
                        </div>
                      )}
                      {!!(e.despesa && e.despesa.valor > 0) && (
                        <div
                          style={{
                            marginTop: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                            padding: '5px 10px',
                            background: dark ? 'rgba(245,166,35,0.08)' : 'rgba(245,166,35,0.06)',
                            borderRadius: 7,
                            border: `1px solid ${dark ? 'rgba(245,166,35,0.22)' : 'rgba(245,166,35,0.14)'}`,
                          }}
                        >
                          <span style={{ display: 'flex', color: '#C8880A', flexShrink: 0 }}>{IcoDespesa}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#C8880A', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(e.despesa.valor)}
                          </span>
                          {!!e.despesa.descricao && (
                            <span style={{ fontSize: 11.5, color: c.muted }}>· {e.despesa.descricao}</span>
                          )}
                          <span style={{ flex: 1 }} />
                          <span
                            style={{
                              fontSize: 8.5,
                              padding: '1px 6px',
                              background: dark ? 'rgba(245,166,35,0.14)' : 'rgba(245,166,35,0.09)',
                              color: '#C8880A',
                              borderRadius: 4,
                              fontWeight: 700,
                              letterSpacing: '0.06em',
                              border: `1px solid ${dark ? 'rgba(245,166,35,0.22)' : 'rgba(245,166,35,0.14)'}`,
                            }}
                          >
                            DESPESA
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* EDIT */}
                  {isEditing && (
                    <div style={{ padding: '13px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}>
                        <Avatar bg={avatarBg} inits={inits} size={32} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>
                            {talaoNum} · {camNome}
                          </div>
                          <div style={{ fontSize: 11, color: c.muted }}>Editando</div>
                        </div>
                        <span
                          style={{
                            fontSize: 10.5,
                            padding: '3px 9px',
                            borderRadius: 20,
                            background: 'rgba(245,166,35,0.14)',
                            color: '#C8880A',
                            fontWeight: 600,
                            border: '1px solid rgba(245,166,35,0.3)',
                          }}
                        >
                          Edição
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                        {(['manha', 'tarde', 'noite'] as Turno[]).map((t) => {
                          const pl = turnoPill(t, editTurno)
                          return (
                            <div
                              key={t}
                              onClick={() => setEditTurno(t)}
                              style={{
                                flex: 1,
                                padding: '6px 0',
                                borderRadius: 7,
                                border: `1px solid ${pl.border}`,
                                background: pl.bg,
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: pl.fw,
                                color: pl.color,
                                textAlign: 'center',
                              }}
                            >
                              {TURNO_LABELS[t]}
                            </div>
                          )
                        })}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
                        <div>
                          <div style={{ ...miniLabel, color: c.muted, marginBottom: 5 }}>Venda</div>
                          <input
                            type="text"
                            {...cashProps(editVendaCents, setEditVendaCents)}
                            style={editCashInput(inputBg, inputBorder, c.text)}
                          />
                        </div>
                        <div>
                          <div style={{ ...miniLabel, color: c.muted, marginBottom: 5 }}>Dinheiro</div>
                          <input
                            type="text"
                            {...cashProps(editDinheiroCents, setEditDinheiroCents)}
                            style={editCashInput(inputBg, inputBorder, c.text)}
                          />
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ ...miniLabel, color: c.muted, marginBottom: 5 }}>Observação</div>
                        <textarea
                          value={editObs}
                          onChange={(ev) => setEditObs(ev.target.value)}
                          rows={2}
                          placeholder="Opcional..."
                          style={{
                            width: '100%',
                            padding: '7px 11px',
                            background: inputBg,
                            border: `1px solid ${inputBorder}`,
                            borderRadius: 8,
                            color: c.text,
                            fontSize: 12.5,
                            resize: 'none',
                            lineHeight: 1.45,
                            minHeight: 50,
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7 }}>
                        <button type="button" onClick={() => setEditEntryId(null)} style={ghostBtn(c.cardB, c.sub)}>
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={saveEdit}
                          style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: G, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* DELETE CONFIRM */}
                  {isDeleting && (
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, opacity: 0.4 }}>
                        <Avatar bg={avatarBg} inits={inits} size={32} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>
                            {talaoNum} · {camNome}
                          </div>
                          <div style={{ fontSize: 11.5, color: c.muted }}>
                            {fmt(e.venda)} venda · {fmt(e.dinheiro)} dinheiro
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 13px',
                          background: 'rgba(224,85,85,0.09)',
                          borderRadius: 9,
                          border: '1px solid rgba(224,85,85,0.24)',
                        }}
                      >
                        <span style={{ fontSize: 13, color: '#E05555', fontWeight: 500 }}>Excluir este lançamento?</span>
                        <div style={{ display: 'flex', gap: 7 }}>
                          <button type="button" onClick={() => setDeletingEntryId(null)} style={ghostBtn(c.cardB, c.sub)}>
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={confirmDelete}
                            style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#E05555', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
          <div style={{ height: 12 }} />
        </div>
      </div>
    </div>
  )
}

/* ── small presentational helpers ── */
const miniLabel: CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: 2,
}

const calNavBtn = (bg: string, color: string): CSSProperties => ({
  width: 28,
  height: 28,
  borderRadius: 7,
  border: 'none',
  background: bg,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color,
})

const ghostBtn = (border: string, color: string): CSSProperties => ({
  padding: '6px 14px',
  borderRadius: 7,
  border: `1px solid ${border}`,
  background: 'transparent',
  color,
  fontSize: 12.5,
  cursor: 'pointer',
})

const editCashInput = (bg: string, border: string, color: string): CSSProperties => ({
  width: '100%',
  padding: '8px 9px',
  background: bg,
  border: `1px solid ${border}`,
  borderRadius: 8,
  color,
  fontSize: 15,
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
  caretColor: 'transparent',
})

function Stat({ label, value, color, muted }: { label: string; value: string; color: string; muted: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 10.5, color: muted }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

function Divider({ color }: { color: string }) {
  return <div style={{ width: 1, height: 14, background: color }} />
}

function Avatar({ bg, inits, size }: { bg: string; inits: string; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10.5,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
      }}
    >
      {inits}
    </div>
  )
}

function ValueBlock({ label, value, color, muted }: { label: string; value: string; color: string; muted: string }) {
  return (
    <div>
      <div style={{ ...miniLabel, color: muted }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  )
}

function CardActionBtn({
  title,
  color,
  onClick,
  children,
}: {
  title: string
  color: string
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 26,
        height: 26,
        borderRadius: 7,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
      }}
    >
      {children}
    </button>
  )
}
