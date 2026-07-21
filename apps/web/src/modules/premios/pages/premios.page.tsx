'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '@/shared/theme/theme-provider'
import { useCurrentUser } from '@/shared/session/use-current-user'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { IconSearch, IconCheck, IconX, IconPrint, IconCalendar, IconClock } from '@/shared/components/icons'
import { initials } from '@/shared/lib/format.util'
import { DEBITOS, CAMBISTAS, BASE_PREMIOS } from '../data/premios.sample'
import { fmt, todayStr, nowStr, TURNO_BG, TURNO_COL } from '../lib/premios.util'
import { computeSettlement } from '../lib/settlement'
import { IcoPremios } from '../components/icons'
import { FeedRow } from '../components/FeedRow'
import type { Situacao, Tratamento, Turno, DrawerTab, SitMeta, TratMeta, Premio, RowVM } from '../types'

export function PremiosPage() {
  const { c, dark } = useTheme()
  const currentUser = useCurrentUser()
  const currentUserName = currentUser.status === 'success' ? currentUser.data.name : ''
  const bancaNome = currentUser.status === 'success' ? currentUser.data.banca.name : ''

  const inputBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'
  const G = c.green

  /* metadados de situação/tratamento */
  const sitMeta: Record<Situacao, SitMeta> = useMemo(
    () => ({
      pendente: { label: 'Pendente', c: '#C8880A', bg: 'rgba(245,166,35,0.12)', bd: 'rgba(245,166,35,0.28)', icon: <IconClock size={12} /> },
      validado: { label: 'Validado', c: G, bg: dark ? 'rgba(0,199,115,0.12)' : 'rgba(0,153,102,0.08)', bd: dark ? 'rgba(0,199,115,0.28)' : 'rgba(0,153,102,0.2)', icon: <IconCheck size={12} /> },
      nao_procedente: { label: 'Não procedente', c: '#8BA89A', bg: 'rgba(138,168,154,0.1)', bd: 'rgba(138,168,154,0.2)', icon: <IconX size={12} /> },
      pago: { label: 'Pago', c: '#5B8FD4', bg: 'rgba(91,143,212,0.12)', bd: 'rgba(91,143,212,0.28)', icon: <IconCheck size={12} /> },
      cancelado: { label: 'Cancelado', c: '#E05555', bg: 'rgba(224,85,85,0.1)', bd: 'rgba(224,85,85,0.24)', icon: <IconX size={12} /> },
    }),
    [G, dark],
  )
  const tratMeta: Record<Tratamento, TratMeta> = useMemo(
    () => ({
      registrar: { label: 'Registrado', c: c.muted, bg: inputBg, bd: c.cardB },
      acertar: { label: 'Acertado', c: '#5B8FD4', bg: 'rgba(91,143,212,0.12)', bd: 'rgba(91,143,212,0.28)' },
      abater: { label: 'Abateu débito', c: '#7A5CD4', bg: 'rgba(122,92,212,0.12)', bd: 'rgba(122,92,212,0.28)' },
    }),
    [c.muted, c.cardB, inputBg],
  )

  /* ── estado ── */
  const [formDataRef, setFormDataRef] = useState(todayStr)
  const [formTurno, setFormTurno] = useState<Turno>('Manhã')
  const [formValor, setFormValor] = useState('')
  const [formTipo, setFormTipo] = useState('')
  const [formTratamento, setFormTratamento] = useState<Tratamento>('registrar')
  const [formValorAbater, setFormValorAbater] = useState('')
  const [formSituacao, setFormSituacao] = useState<Situacao>('pendente')
  const [formAcerto, setFormAcerto] = useState(false)
  const [formDescricao, setFormDescricao] = useState('')
  const [cambistaSearch, setCambistaSearch] = useState('')
  const [cambistaDropOpen, setCambistaDropOpen] = useState(false)
  const [formCambistaId, setFormCambistaId] = useState<number | null>(null)

  const [premios, setPremios] = useState<Premio[]>(BASE_PREMIOS)
  const [tableSearch, setTableSearch] = useState('')
  const [sitFilter, setSitFilter] = useState<'' | Situacao>('')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerPremioId, setDrawerPremioId] = useState<number | null>(null)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('dados')

  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [printPremioId, setPrintPremioId] = useState<number | null>(null)

  const [toastVisible, setToastVisible] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const nextId = useRef(100)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const showToast = (msg: string) => {
    setToastVisible(true)
    setToastMsg(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), 2800)
  }

  /* ── dropdown de cambistas ── */
  const srch = cambistaSearch.trim().toLowerCase()
  const cambistaDropItems = (srch
    ? CAMBISTAS.filter(
        (p) =>
          p.nome.toLowerCase().includes(srch) ||
          (p.apelido && p.apelido.toLowerCase().includes(srch)) ||
          p.talao.startsWith(cambistaSearch.trim()),
      )
    : CAMBISTAS
  ).map((p) => ({
    ...p,
    initials: initials(p.nome),
    sub: [p.apelido, 'Talão ' + p.talao, p.dono ? 'Dono: ' + p.dono : null].filter(Boolean).join(' · '),
    selected: formCambistaId === p.id,
  }))

  const selCambista = CAMBISTAS.find((p) => p.id === formCambistaId) || null
  const hasCambistaSelected = !!selCambista

  /* ── estado do formulário ── */
  const formValorNum = parseFloat(formValor) || 0
  const formValorBd = formValorNum > 0 ? G : inputBorder
  const cambistaInputBd = cambistaDropOpen ? G : inputBorder

  const canAcerto = formSituacao === 'validado' || formSituacao === 'pago'
  const actualAcerto = canAcerto ? formAcerto : false
  const formToggleBg = actualAcerto ? G : inputBg
  const formToggleBd = actualAcerto ? G : c.cardB
  const formDotLeft = actualAcerto ? 22 : 3
  const formAcertoBg = actualAcerto ? c.glow : inputBg
  const formAcertoBd = actualAcerto ? c.glowB : c.cardB
  const formAcertoHint =
    formSituacao === 'pendente' ? 'Só disponível após validação' : actualAcerto ? 'Será incluído no cálculo' : 'Não impactará o acerto'

  /* ── tratamento financeiro (cálculo isolado em `lib/settlement.ts`) ── */
  const debitoCambista = formCambistaId ? DEBITOS[formCambistaId] || 0 : 0
  const mkTrat = (t: Tratamento) => {
    const sel = formTratamento === t
    return { bg: sel ? c.glow : inputBg, bd: sel ? G : c.cardB, cc: sel ? G : c.sub, fw: sel ? 700 : 400, dot: sel ? G : c.cardB }
  }
  const tratRegistrarP = mkTrat('registrar')
  const tratAcertarP = mkTrat('acertar')
  const tratAbaterP = mkTrat('abater')
  const showAbaterPanel = formTratamento === 'abater' && hasCambistaSelected

  const previewSettlement = computeSettlement({
    tratamento: formTratamento,
    situacaoSelecionada: formSituacao,
    valorPremio: formValorNum,
    valorAbaterInformado: formValorAbater !== '' ? parseFloat(formValorAbater) || 0 : undefined,
    debitoAtualCambista: debitoCambista,
    considerarAcertoSolicitado: actualAcerto,
  })
  const abaterDefaultVal = debitoCambista > 0 ? Math.min(formValorNum, debitoCambista) : 0
  const abaterSaldo =
    previewSettlement.debitoRestante >= 0
      ? 'Débito restante: ' + fmt(previewSettlement.debitoRestante)
      : 'Crédito gerado: ' + fmt(Math.abs(previewSettlement.debitoRestante))
  const abaterSaldoC = previewSettlement.debitoRestante >= 0 ? '#C8880A' : G

  /* ── pode salvar ── */
  const canSave = hasCambistaSelected && formValorNum > 0
  const salvarBtnBg = canSave ? G : dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  const salvarBtnC = canSave ? '#fff' : c.muted
  const salvarShadow = canSave ? '0 4px 18px ' + c.shadow : 'none'
  const salvarCursor = canSave ? 'pointer' : 'not-allowed'

  const savePremio = (withPrint: boolean) => {
    // Gating derivado do próprio contrato de dados (`canSave`), não só do
    // atributo `disabled` do botão — revalidado aqui antes de salvar.
    if (!canSave) return
    const id = nextId.current
    const now = nowStr()
    const settlement = computeSettlement({
      tratamento: formTratamento,
      situacaoSelecionada: formSituacao,
      valorPremio: formValorNum,
      valorAbaterInformado: formValorAbater !== '' ? parseFloat(formValorAbater) || 0 : undefined,
      debitoAtualCambista: debitoCambista,
      considerarAcertoSolicitado: actualAcerto,
    })
    const newP: Premio = {
      id,
      dataRef: formDataRef,
      turno: formTurno,
      cambistaId: formCambistaId as number,
      valor: formValorNum,
      tipo: formTipo,
      situacao: settlement.situacao,
      tratamento: formTratamento,
      valorAbatido: settlement.valorAbatido,
      saldoGerado: settlement.saldoGerado,
      considerarAcerto: settlement.considerarAcerto,
      descricao: formDescricao,
      // Registrado pelo usuário autenticado atual — nunca fabricado.
      criadoPor: currentUserName,
      criadoEm: now,
      validadoPor: null,
      validadoEm: null,
      obsVld: '',
    }
    nextId.current += 1
    setPremios((prev) => [newP, ...prev])
    setFormValor('')
    setFormTipo('')
    setFormTratamento('registrar')
    setFormValorAbater('')
    setFormDescricao('')
    setFormCambistaId(null)
    setCambistaSearch('')
    setFormSituacao('pendente')
    setFormAcerto(false)
    if (withPrint) {
      setPrintPremioId(id)
      setPrintModalOpen(true)
    } else {
      showToast('Prêmio/reclamação registrado!')
    }
  }

  /* ── lista filtrada ── */
  const filtered = premios.filter((p) => {
    if (sitFilter && p.situacao !== sitFilter) return false
    if (tableSearch.trim()) {
      const s = tableSearch.trim().toLowerCase()
      const cb = CAMBISTAS.find((x) => x.id === p.cambistaId)
      if (!cb) return false
      if (!cb.nome.toLowerCase().includes(s) && !(cb.apelido && cb.apelido.toLowerCase().includes(s)) && !cb.talao.includes(tableSearch.trim()))
        return false
    }
    return true
  })

  const tableRows: RowVM[] = filtered.map((p) => ({
    premio: p,
    cambista: CAMBISTAS.find((x) => x.id === p.cambistaId),
    sit: sitMeta[p.situacao] || sitMeta.pendente,
    trat: tratMeta[p.tratamento] || tratMeta.registrar,
  }))

  const sumValidado = filtered.filter((p) => p.situacao === 'validado' || p.situacao === 'pago').reduce((a, p) => a + p.valor, 0)
  const sumPendente = filtered.filter((p) => p.situacao === 'pendente').reduce((a, p) => a + p.valor, 0)
  const sumAcerto = filtered
    .filter((p) => p.considerarAcerto && (p.situacao === 'validado' || p.situacao === 'pago'))
    .reduce((a, p) => a + p.valor, 0)

  /* ── drawer ── */
  const dp = drawerOpen && drawerPremioId ? premios.find((p) => p.id === drawerPremioId) || null : null
  const dc = dp ? CAMBISTAS.find((x) => x.id === dp.cambistaId) || null : null
  const dsm = dp ? sitMeta[dp.situacao] || sitMeta.pendente : null
  const dtm = dp ? tratMeta[dp.tratamento] || tratMeta.registrar : null
  const dAcerto = dp ? dp.considerarAcerto : false
  const dCanAcerto = !!(dp && (dp.situacao === 'validado' || dp.situacao === 'pago'))
  const drawerAcertoOn = dAcerto && dCanAcerto

  const drawerLogs: { acao: string; por: string; em: string; dotC: string; dotB: string }[] = dp
    ? (
        [
          dp.criadoEm ? { acao: 'Registrado', por: dp.criadoPor || '—', em: dp.criadoEm, dotC: G, dotB: c.glowB } : null,
          dp.validadoPor
            ? {
                acao: dp.situacao === 'nao_procedente' ? 'Marcado como Não Procedente' : 'Validado',
                por: dp.validadoPor,
                em: dp.validadoEm || '—',
                dotC: G,
                dotB: c.glowB,
              }
            : null,
          dp.tratamento === 'acertar' && dp.situacao === 'pago'
            ? { acao: 'Acertado na hora — movimentação gerada', por: dp.validadoPor || dp.criadoPor, em: dp.validadoEm || '—', dotC: '#5B8FD4', dotB: 'rgba(91,143,212,0.4)' }
            : null,
          dp.tratamento === 'abater' && dp.valorAbatido > 0
            ? {
                acao: 'Abateu débito: ' + fmt(dp.valorAbatido) + (dp.saldoGerado > 0 ? ' · Crédito gerado: ' + fmt(dp.saldoGerado) : ''),
                por: dp.validadoPor || dp.criadoPor,
                em: dp.validadoEm || '—',
                dotC: '#7A5CD4',
                dotB: 'rgba(122,92,212,0.4)',
              }
            : null,
          dp.situacao === 'pago' && dp.tratamento === 'registrar'
            ? { acao: 'Pago / Liquidado', por: dp.validadoPor || dp.criadoPor, em: dp.validadoEm || '—', dotC: '#5B8FD4', dotB: 'rgba(91,143,212,0.4)' }
            : null,
          dp.situacao === 'cancelado'
            ? { acao: 'Cancelado', por: dp.criadoPor || '—', em: dp.criadoEm || '—', dotC: '#E05555', dotB: 'rgba(224,85,85,0.4)' }
            : null,
        ].filter(Boolean) as { acao: string; por: string; em: string; dotC: string; dotB: string }[]
      )
    : []

  const toggleDrawerAcerto = () => {
    if (!dp || !dCanAcerto) return
    setPremios((prev) => prev.map((p) => (p.id === drawerPremioId ? { ...p, considerarAcerto: !p.considerarAcerto } : p)))
  }
  const doValidar = () => {
    if (!dp) return
    const now2 = nowStr()
    setPremios((prev) =>
      prev.map((p) => (p.id === drawerPremioId ? { ...p, situacao: 'validado', validadoPor: currentUserName, validadoEm: now2, considerarAcerto: true } : p)),
    )
    showToast('Prêmio validado com sucesso!')
  }
  const doNaoProcedente = () => {
    if (!dp) return
    const now2 = nowStr()
    setPremios((prev) =>
      prev.map((p) => (p.id === drawerPremioId ? { ...p, situacao: 'nao_procedente', validadoPor: currentUserName, validadoEm: now2, considerarAcerto: false } : p)),
    )
    showToast('Marcado como não procedente.')
  }

  /* ── impressão ── */
  const pp = printPremioId ? premios.find((p) => p.id === printPremioId) || null : null
  const pc = pp ? CAMBISTAS.find((x) => x.id === pp.cambistaId) || null : null
  const psm = pp ? sitMeta[pp.situacao] || sitMeta.pendente : null
  const printNow = nowStr()
  const printData = printNow.split(' ')[0] || ''
  const printHora = printNow.split(' ')[1] || ''

  const closePrintModal = () => setPrintModalOpen(false)
  const doPrint = (msg: string) => {
    setPrintModalOpen(false)
    showToast(msg)
  }

  /* ── estilos reutilizados ── */
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: c.muted,
    marginBottom: 6,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: inputBg,
    border: `1px solid ${inputBorder}`,
    borderRadius: 10,
    color: c.text,
    fontFamily: "'Inter', sans-serif",
  }
  const fieldCard: React.CSSProperties = {
    padding: '10px 12px',
    background: inputBg,
    border: `1px solid ${c.cardB}`,
    borderRadius: 9,
  }
  const fieldLabel: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: c.muted,
    marginBottom: 4,
  }
  const fieldValue: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: c.text }
  const receiptRow = (labelTxt: string, valueNode: React.ReactNode, valColor?: string, valWeight = 600, valSize = 11) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
      <span style={{ fontSize: 11, color: c.muted }}>{labelTxt}</span>
      <span style={{ fontSize: valSize, fontWeight: valWeight, color: valColor || c.text }}>{valueNode}</span>
    </div>
  )

  return (
    <>
      <div style={{ height: 'calc(100vh - 54px)', display: 'flex', overflow: 'hidden' }}>
        {/* ── ESQUERDA: Formulário ── */}
        <div style={{ width: 380, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', background: c.sbBg, borderRight: `1px solid ${c.sbBorder}` }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 9, background: c.glow, border: `1px solid ${c.glowB}`, color: c.green, flexShrink: 0 }}>
                {IcoPremios}
              </span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', color: c.text, lineHeight: 1.2 }}>Novo Prêmio / Reclamação</div>
                <div style={{ fontSize: 11, color: c.muted, lineHeight: 1.35 }}>Registre e acompanhe prêmios conferidos posteriormente</div>
              </div>
            </div>

            {/* DATA DE REFERÊNCIA */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Data de Referência</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: c.muted, pointerEvents: 'none' }}>
                  <IconCalendar size={12} />
                </span>
                <input
                  type="text"
                  value={formDataRef}
                  onChange={(e) => setFormDataRef(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  style={{ ...inputStyle, padding: '9px 12px 9px 30px', fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}
                />
              </div>
            </div>

            {/* TURNO */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Turno de Referência</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['Manhã', 'Tarde', 'Noite'] as Turno[]).map((t) => {
                  const sel = formTurno === t
                  return (
                    <div
                      key={t}
                      onClick={() => setFormTurno(t)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 8,
                        border: `1px solid ${sel ? TURNO_COL[t] : inputBorder}`,
                        background: sel ? TURNO_BG[t] : inputBg,
                        cursor: 'pointer',
                        fontSize: 11.5,
                        fontWeight: sel ? 700 : 400,
                        color: sel ? TURNO_COL[t] : c.sub,
                        textAlign: 'center',
                        transition: 'all 0.14s',
                      }}
                    >
                      {t}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CAMBISTA / TALÃO */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>
                Cambista / Talão <span style={{ color: '#E05555' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', display: 'flex', color: c.muted, pointerEvents: 'none', zIndex: 1 }}>
                  <IconSearch size={14} />
                </span>
                <input
                  type="text"
                  value={cambistaSearch}
                  onChange={(e) => {
                    setCambistaSearch(e.target.value)
                    setCambistaDropOpen(true)
                    setFormCambistaId(null)
                  }}
                  onFocus={() => setCambistaDropOpen(true)}
                  placeholder="Nome, apelido ou nº do talão..."
                  style={{ ...inputStyle, padding: '9px 12px 9px 32px', border: `1px solid ${cambistaInputBd}`, fontSize: 12.5, transition: 'border-color 0.15s' }}
                />
                {cambistaDropOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: c.dropdownBg, border: `1px solid ${c.cardB}`, borderRadius: 11, boxShadow: '0 14px 44px rgba(0,0,0,0.45)', zIndex: 96, overflow: 'hidden' }}>
                    <div style={{ padding: '5px 0', maxHeight: 200, overflowY: 'auto' }}>
                      {cambistaDropItems.map((opt) => (
                        <div
                          key={opt.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setFormCambistaId(opt.id)
                            setCambistaSearch('')
                            setCambistaDropOpen(false)
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', cursor: 'pointer', background: opt.selected ? c.glow : 'transparent', transition: 'background 0.1s' }}
                        >
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: opt.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {opt.initials}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: opt.selected ? G : c.text, lineHeight: 1.3 }}>{opt.nome}</div>
                            <div style={{ fontSize: 10.5, color: c.muted, lineHeight: 1.2 }}>{opt.sub}</div>
                          </div>
                          {opt.selected && (
                            <span style={{ color: c.green, display: 'flex', flexShrink: 0 }}>
                              <IconCheck size={12} />
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {hasCambistaSelected && selCambista && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: c.glow, border: `1px solid ${c.glowB}`, borderRadius: 8, marginTop: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: selCambista.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {initials(selCambista.nome)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: c.green, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selCambista.nome}</div>
                    <div style={{ fontSize: 10, color: c.muted }}>
                      {['Talão ' + selCambista.talao, selCambista.apelido, selCambista.dono ? 'Dono: ' + selCambista.dono : null].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormCambistaId(null)
                      setCambistaSearch('')
                    }}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: c.muted, padding: 0 }}
                  >
                    <IconX size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* VALOR */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>
                Valor do Prêmio <span style={{ color: '#E05555' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: c.muted, pointerEvents: 'none', zIndex: 1 }}>R$</span>
                <input
                  type="number"
                  value={formValor}
                  onChange={(e) => setFormValor(e.target.value)}
                  placeholder="0,00"
                  min={0}
                  step={0.01}
                  style={{ ...inputStyle, padding: '11px 12px 11px 36px', border: `1px solid ${formValorBd}`, fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
                />
              </div>
            </div>

            {/* TIPO */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Tipo de Prêmio</label>
              <input
                type="text"
                value={formTipo}
                onChange={(e) => setFormTipo(e.target.value)}
                placeholder="Ex: Milhar 1º, Centena, Passe..."
                style={{ ...inputStyle, padding: '9px 12px', fontSize: 13, fontWeight: 500 }}
              />
            </div>

            {/* TRATAMENTO FINANCEIRO */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Tratamento do prêmio</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {(
                  [
                    { t: 'registrar' as Tratamento, p: tratRegistrarP, title: 'Apenas registrar', sub: 'Fica pendente para acerto futuro' },
                    { t: 'acertar' as Tratamento, p: tratAcertarP, title: 'Registrar e acertar agora', sub: 'Gera movimentação e marca como pago' },
                    { t: 'abater' as Tratamento, p: tratAbaterP, title: 'Abater débito do cambista', sub: 'Usa o prêmio para quitar débito existente' },
                  ]
                ).map(({ t, p, title, sub }) => (
                  <div
                    key={t}
                    onClick={() => {
                      setFormTratamento(t)
                      setFormValorAbater('')
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 9, border: `1px solid ${p.bd}`, background: p.bg, cursor: 'pointer', transition: 'all 0.14s' }}
                  >
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${p.dot}`, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.dot }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: p.fw, color: p.cc }}>{title}</div>
                      <div style={{ fontSize: 10.5, color: c.muted, lineHeight: 1.3 }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PAINEL ABATER DÉBITO */}
            {showAbaterPanel && (
              <div style={{ marginBottom: 12, padding: 13, background: 'rgba(122,92,212,0.07)', border: '1px solid rgba(122,92,212,0.2)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10.5, color: c.muted }}>Débito atual do cambista</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#E05555', fontVariantNumeric: 'tabular-nums' }}>{fmt(debitoCambista)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10.5, color: c.muted }}>Valor do prêmio</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.green, fontVariantNumeric: 'tabular-nums' }}>R$ {formValor || '0,00'}</span>
                </div>
                <div style={{ borderTop: '1px dashed rgba(122,92,212,0.2)', paddingTop: 9 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#7A5CD4', marginBottom: 5 }}>Valor a abater</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: c.muted, pointerEvents: 'none' }}>R$</span>
                    <input
                      type="number"
                      value={formValorAbater}
                      onChange={(e) => setFormValorAbater(e.target.value)}
                      placeholder={String(abaterDefaultVal)}
                      min={0}
                      step={0.01}
                      style={{ width: '100%', padding: '8px 12px 8px 34px', background: inputBg, border: '1px solid rgba(122,92,212,0.3)', borderRadius: 8, color: c.text, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontFamily: "'Inter', sans-serif" }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: c.muted }}>Resultado</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: abaterSaldoC, fontVariantNumeric: 'tabular-nums' }}>{abaterSaldo}</span>
                </div>
              </div>
            )}

            {/* SITUAÇÃO */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Situação</label>
              <Select
                value={formSituacao}
                onValueChange={(next) => {
                  setFormSituacao(next as Situacao)
                  setFormAcerto(false)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente de validação</SelectItem>
                  <SelectItem value="validado">Validado</SelectItem>
                  <SelectItem value="nao_procedente">Não procedente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* TOGGLE CONSIDERAR ACERTO */}
            <div style={{ marginBottom: 12, padding: '11px 13px', background: formAcertoBg, border: `1px solid ${formAcertoBd}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: c.text, marginBottom: 2 }}>Considerar no acerto</div>
                <div style={{ fontSize: 10.5, color: c.muted }}>{formAcertoHint}</div>
              </div>
              <div onClick={() => canAcerto && setFormAcerto((v) => !v)} style={{ cursor: 'pointer' }}>
                <div style={{ width: 40, height: 22, borderRadius: 22, background: formToggleBg, border: `1px solid ${formToggleBd}`, position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: 3, left: formDotLeft, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </div>
              </div>
            </div>

            {/* DESCRIÇÃO */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>
                Descrição <span style={{ fontSize: 10, fontWeight: 400, color: c.muted }}>(F2 / opcional)</span>
              </label>
              <textarea
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="Ex: prêmio conferido depois, ganhador reclamou no próximo turno..."
                rows={3}
                style={{ ...inputStyle, padding: '9px 12px', fontSize: 12.5, resize: 'vertical', lineHeight: 1.55 }}
              />
            </div>

            {/* ATALHOS */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
              {[
                { k: 'Enter', t: 'avançar' },
                { k: 'F2', t: 'observação' },
                { k: 'F4', t: 'salvar+impr.' },
                { k: 'Esc', t: 'limpar' },
              ].map((s) => (
                <span key={s.k} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, background: inputBg, border: `1px solid ${c.cardB}`, color: c.muted, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ color: c.sub, fontWeight: 600 }}>{s.k}</span> {s.t}
                </span>
              ))}
            </div>
          </div>

          {/* footer do formulário */}
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${c.sbBorder}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <button
              type="button"
              onClick={() => savePremio(false)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 10, border: 'none', background: salvarBtnBg, color: salvarBtnC, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, cursor: salvarCursor, boxShadow: salvarShadow, transition: 'all 0.15s' }}
            >
              <IconCheck size={12} />Salvar
            </button>
            <button
              type="button"
              onClick={() => savePremio(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', borderRadius: 10, background: inputBg, color: c.sub, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, cursor: salvarCursor, border: `1px solid ${c.cardB}`, transition: 'all 0.15s' }}
            >
              <IconPrint size={16} />Salvar e Imprimir
            </button>
            <div style={{ textAlign: 'center', fontSize: 10, color: c.muted }}>{filtered.length} registros · clique em qualquer linha para detalhes</div>
          </div>
        </div>

        {/* ── DIREITA: Feed ── */}
        <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, background: c.bg }}>
          {/* top bar */}
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${c.cardB}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.025em', color: c.text }}>Prêmios e Reclamações</span>
                <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: c.glow, color: c.green, fontWeight: 700, border: `1px solid ${c.glowB}` }}>{filtered.length}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 8, padding: '6px 11px' }}>
                  <span style={{ display: 'flex', color: c.muted, flexShrink: 0 }}>
                    <IconSearch size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar cambista, talão..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: c.text, fontSize: 12.5, width: 150, fontFamily: "'Inter', sans-serif" }}
                  />
                </div>
                <Select
                  value={sitFilter || 'ALL'}
                  onValueChange={(next) => setSitFilter(next === 'ALL' ? '' : (next as Situacao))}
                >
                  <SelectTrigger aria-label="Filtrar por situação" className="h-auto w-[170px] py-1.5 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas as situações</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="validado">Validado</SelectItem>
                    <SelectItem value="nao_procedente">Não procedente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* totais */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 10.5, color: c.muted }}>Total validado</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: c.green, fontVariantNumeric: 'tabular-nums' }}>{fmt(sumValidado)}</span>
              </div>
              <div style={{ width: 1, height: 14, background: c.cardB }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 10.5, color: c.muted }}>Pendente</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#C8880A', fontVariantNumeric: 'tabular-nums' }}>{fmt(sumPendente)}</span>
              </div>
              <div style={{ width: 1, height: 14, background: c.cardB }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 10.5, color: c.muted }}>No acerto</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#5B8FD4', fontVariantNumeric: 'tabular-nums' }}>{fmt(sumAcerto)}</span>
              </div>
            </div>
          </div>

          {/* cabeçalho de colunas */}
          <div style={{ padding: '0 20px', borderBottom: `1px solid ${c.cardB}`, flexShrink: 0, background: c.sbBg }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 70px 1fr 90px 100px 105px 130px 55px 44px', gap: 8, padding: '7px 0' }}>
              {[
                { t: 'Data Ref.' },
                { t: 'Turno' },
                { t: 'Cambista / Talão' },
                { t: 'Valor', right: true },
                { t: 'Tipo' },
                { t: 'Situação' },
                { t: 'Tratamento' },
                { t: 'Criado por' },
              ].map((h, i) => (
                <span key={i} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: c.muted, textAlign: h.right ? 'right' : 'left' }}>
                  {h.t}
                </span>
              ))}
              <span />
            </div>
          </div>

          {/* linhas */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 16px' }}>
            {tableRows.map((vm) => (
              <FeedRow
                key={vm.premio.id}
                vm={vm}
                c={c}
                onView={() => {
                  setDrawerPremioId(vm.premio.id)
                  setDrawerTab('dados')
                  setDrawerOpen(true)
                }}
                onPrint={() => {
                  setDrawerPremioId(vm.premio.id)
                  setDrawerTab('dados')
                  setDrawerOpen(true)
                }}
              />
            ))}

            {tableRows.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '80px 20px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: c.glow, border: `1px solid ${c.glowB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.green }}>{IcoPremios}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: c.sub }}>Nenhum registro encontrado</div>
                <div style={{ fontSize: 12.5, color: c.muted, textAlign: 'center', maxWidth: 240, lineHeight: 1.55 }}>Use o formulário ao lado para registrar um prêmio ou reclamação.</div>
              </div>
            )}
            <div style={{ height: 12 }} />
          </div>
        </div>
      </div>

      {/* ── BACKDROP + DRAWER ── */}
      {cambistaDropOpen && <div onClick={() => setCambistaDropOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 94 }} />}
      {drawerOpen && <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 140, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />}

      {drawerOpen && dp && (
        <div style={{ position: 'fixed', right: 0, top: 54, height: 'calc(100vh - 54px)', width: 440, zIndex: 150, background: c.sbBg, borderLeft: `1px solid ${c.sbBorder}`, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 48px rgba(0,0,0,0.38)' }}>
          {/* header do drawer */}
          <div style={{ padding: '14px 18px 0', borderBottom: `1px solid ${c.sbBorder}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: dc ? dc.avatarBg : '', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {dc ? initials(dc.nome) : ''}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.text, lineHeight: 1.25 }}>{dc ? dc.nome : ''}</div>
                  <div style={{ fontSize: 11, color: c.muted, lineHeight: 1.25 }}>
                    Talão {dc ? dc.talao : '—'} · {dp.dataRef} · {dp.turno}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  title="Imprimir"
                  onClick={() => {
                    setPrintPremioId(drawerPremioId)
                    setPrintModalOpen(true)
                  }}
                  style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.muted }}
                >
                  <IconPrint size={16} />
                </button>
                <button type="button" onClick={() => setDrawerOpen(false)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: inputBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.muted }}>
                  <IconX size={12} />
                </button>
              </div>
            </div>
            {/* valor destaque */}
            <div style={{ padding: '10px 14px', background: c.glow, border: `1px solid ${c.glowB}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: c.green }}>Valor do Prêmio</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: c.green, fontVariantNumeric: 'tabular-nums' }}>{fmt(dp.valor)}</span>
            </div>
            {/* tabs */}
            <div style={{ display: 'flex', gap: 2 }}>
              {(
                [
                  { id: 'dados' as DrawerTab, label: 'Dados' },
                  { id: 'validacao' as DrawerTab, label: 'Validação' },
                  { id: 'historico' as DrawerTab, label: 'Histórico' },
                ]
              ).map((tab) => {
                const active = drawerTab === tab.id
                return (
                  <div
                    key={tab.id}
                    onClick={() => setDrawerTab(tab.id)}
                    style={{ padding: '8px 14px', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? c.green : c.muted, borderBottom: `2px solid ${active ? c.green : 'transparent'}`, transition: 'all 0.13s' }}
                  >
                    {tab.label}
                  </div>
                )
              })}
            </div>
          </div>

          {/* corpo do drawer */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
            {/* TAB DADOS */}
            {drawerTab === 'dados' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                  <div style={fieldCard}>
                    <div style={fieldLabel}>Data Referência</div>
                    <div style={fieldValue}>{dp.dataRef}</div>
                  </div>
                  <div style={fieldCard}>
                    <div style={fieldLabel}>Turno</div>
                    <div style={fieldValue}>{dp.turno}</div>
                  </div>
                  <div style={fieldCard}>
                    <div style={fieldLabel}>Cambista</div>
                    <div style={fieldValue}>{dc ? dc.nome : ''}</div>
                  </div>
                  <div style={fieldCard}>
                    <div style={fieldLabel}>Talão</div>
                    <div style={fieldValue}>{dc ? dc.talao : '—'}</div>
                  </div>
                </div>
                {dp.tipo && dp.tipo.trim() && (
                  <div style={fieldCard}>
                    <div style={fieldLabel}>Tipo de Prêmio</div>
                    <div style={fieldValue}>{dp.tipo}</div>
                  </div>
                )}
                {dsm && (
                  <div style={{ padding: '10px 12px', background: dsm.bg, border: `1px solid ${dsm.bd}`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: dsm.c }}>Situação</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: dsm.c }}>{dsm.label}</span>
                  </div>
                )}
                {dtm && (
                  <div style={{ padding: '10px 12px', background: dtm.bg, border: `1px solid ${dtm.bd}`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: dtm.c }}>Tratamento financeiro</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: dtm.c }}>{dtm.label}</span>
                  </div>
                )}
                {dp.tratamento === 'abater' && (
                  <div style={{ padding: '10px 13px', background: 'rgba(122,92,212,0.07)', border: '1px solid rgba(122,92,212,0.2)', borderRadius: 9, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10.5, color: c.muted }}>Valor abatido</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#7A5CD4', fontVariantNumeric: 'tabular-nums' }}>{dp.valorAbatido ? fmt(dp.valorAbatido) : ''}</span>
                    </div>
                    {dp.saldoGerado > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10.5, color: c.muted }}>Crédito gerado</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: c.green, fontVariantNumeric: 'tabular-nums' }}>{fmt(dp.saldoGerado)}</span>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ padding: '10px 12px', background: drawerAcertoOn ? c.glow : inputBg, border: `1px solid ${drawerAcertoOn ? c.glowB : c.cardB}`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: drawerAcertoOn ? G : c.sub }}>Considerar no Acerto</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: drawerAcertoOn ? G : c.sub }}>{drawerAcertoOn ? 'Sim' : 'Não'}</span>
                </div>
                {dp.descricao && dp.descricao.trim() && (
                  <div style={{ padding: '11px 12px', background: inputBg, border: `1px solid ${c.cardB}`, borderRadius: 9 }}>
                    <div style={{ ...fieldLabel, marginBottom: 6 }}>Observação</div>
                    <div style={{ fontSize: 12.5, color: c.sub, lineHeight: 1.55 }}>{dp.descricao}</div>
                  </div>
                )}
                {dc && dc.dono && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'rgba(122,92,212,0.07)', border: '1px solid rgba(122,92,212,0.18)', borderRadius: 9 }}>
                    <span style={{ fontSize: 11, color: '#7A5CD4', fontWeight: 600 }}>Dono do talão:</span>
                    <span style={{ fontSize: 11.5, color: c.text, fontWeight: 600 }}>{dc.dono}</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB VALIDAÇÃO */}
            {drawerTab === 'validacao' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {dsm && (
                  <div style={{ padding: '12px 14px', background: dsm.bg, border: `1px solid ${dsm.bd}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: dsm.c }}>{dsm.label}</span>
                    <span style={{ display: 'flex', color: dsm.c }}>{dsm.icon}</span>
                  </div>
                )}
                {dp.validadoPor && (
                  <>
                    <div style={{ padding: '11px 12px', background: inputBg, border: `1px solid ${c.cardB}`, borderRadius: 9 }}>
                      <div style={{ ...fieldLabel, marginBottom: 5 }}>Validado por</div>
                      <div style={fieldValue}>{dp.validadoPor}</div>
                      <div style={{ fontSize: 10.5, color: c.muted, marginTop: 2 }}>{dp.validadoEm || ''}</div>
                    </div>
                    {dp.obsVld && dp.obsVld.trim() && (
                      <div style={{ padding: '11px 12px', background: inputBg, border: `1px solid ${c.cardB}`, borderRadius: 9 }}>
                        <div style={{ ...fieldLabel, marginBottom: 5 }}>Observação da validação</div>
                        <div style={{ fontSize: 12.5, color: c.sub, lineHeight: 1.55 }}>{dp.obsVld}</div>
                      </div>
                    )}
                  </>
                )}
                {dp.situacao === 'pendente' && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '11px 13px', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.22)', borderRadius: 9 }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>⚠️</span>
                    <span style={{ fontSize: 11.5, color: '#C8880A', lineHeight: 1.5 }}>Este prêmio ainda não foi validado. Não impactará o acerto até ser validado.</span>
                  </div>
                )}
                {/* toggle considerar no acerto */}
                <div style={{ padding: '12px 14px', background: inputBg, border: `1px solid ${c.cardB}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: c.text, marginBottom: 2 }}>Considerar no Acerto</div>
                    <div style={{ fontSize: 10.5, color: c.muted }}>Inclui este valor no cálculo do acerto</div>
                  </div>
                  <div onClick={toggleDrawerAcerto} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <div style={{ width: 40, height: 22, borderRadius: 22, background: drawerAcertoOn ? G : inputBg, border: `1px solid ${drawerAcertoOn ? G : c.cardB}`, position: 'relative', transition: 'background 0.2s' }}>
                      <div style={{ position: 'absolute', top: 3, left: drawerAcertoOn ? 22 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                    </div>
                  </div>
                </div>
                {/* ações de validação */}
                {dp.situacao === 'pendente' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: c.muted, marginBottom: 4 }}>Ações de Validação</div>
                    <button type="button" onClick={doValidar} style={{ width: '100%', padding: 10, borderRadius: 9, background: c.glow, color: c.green, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', border: `1px solid ${c.glowB}`, transition: 'all 0.13s' }}>
                      Validar Prêmio
                    </button>
                    <button type="button" onClick={doNaoProcedente} style={{ width: '100%', padding: 10, borderRadius: 9, background: 'rgba(224,85,85,0.08)', color: '#E05555', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(224,85,85,0.22)', transition: 'all 0.13s' }}>
                      Marcar como Não Procedente
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB HISTÓRICO */}
            {drawerTab === 'historico' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {drawerLogs.map((log, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: log.dotC, border: `2px solid ${log.dotB}`, flexShrink: 0 }} />
                      {i < drawerLogs.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 24, background: c.cardB, marginTop: 4 }} />}
                    </div>
                    <div style={{ paddingBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: c.text, lineHeight: 1.3 }}>{log.acao}</div>
                      <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>
                        {log.por} · {log.em}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL DE IMPRESSÃO ── */}
      {printModalOpen && pp && (
        <div onClick={closePrintModal} style={{ position: 'fixed', inset: 0, zIndex: 450, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 480, background: c.dropdownBg, border: `1px solid ${c.cardB}`, borderRadius: 20, boxShadow: '0 28px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${c.cardB}`, display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, background: c.glow, border: `1px solid ${c.glowB}`, color: c.green }}>
                <IconPrint size={16} />
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', color: c.text }}>Imprimir Comprovante</div>
                <div style={{ fontSize: 11, color: c.muted }}>Deseja imprimir o comprovante deste prêmio/reclamação?</div>
              </div>
            </div>
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${c.cardB}` }}>
              <div style={{ padding: 16, background: inputBg, border: `1px solid ${c.cardB}`, borderRadius: 12, fontVariantNumeric: 'tabular-nums' }}>
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: c.text, letterSpacing: '0.04em' }}>{bancaNome.toUpperCase() || '—'}</div>
                  <div style={{ fontSize: 10, color: c.muted, marginTop: 2 }}>Comprovante de Prêmio / Reclamação</div>
                  <div style={{ fontSize: 9, color: c.muted, marginTop: 2 }}>
                    {printData} · {printHora}
                  </div>
                </div>
                <div style={{ borderTop: `1px dashed ${c.cardB}`, marginBottom: 10 }} />
                {receiptRow('Cambista', pc ? pc.nome : '')}
                {receiptRow('Talão', pc ? pc.talao : '—')}
                {receiptRow('Data Referência', pp.dataRef)}
                {receiptRow('Turno', pp.turno)}
                <div style={{ borderTop: `1px dashed ${c.cardB}`, margin: '8px 0' }} />
                {receiptRow('Valor do Prêmio', fmt(pp.valor), c.green, 800, 13)}
                {pp.tipo && pp.tipo.trim() && receiptRow('Tipo', pp.tipo)}
                {receiptRow('Tratamento', (tratMeta[pp.tratamento] || tratMeta.registrar).label)}
                {pp.tratamento === 'abater' && pp.valorAbatido > 0 && (
                  <>
                    {receiptRow('Valor abatido', fmt(pp.valorAbatido), '#7A5CD4', 700)}
                    {pp.saldoGerado > 0 && receiptRow('Crédito gerado', fmt(pp.saldoGerado), c.green, 700)}
                  </>
                )}
                {receiptRow('Situação', psm ? psm.label : '', psm ? psm.c : c.text, 700)}
                {pp.descricao && pp.descricao.trim() && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: c.muted }}>Observação</span>
                    <span style={{ fontSize: 11, color: c.sub, maxWidth: 220, textAlign: 'right', lineHeight: 1.3 }}>{pp.descricao}</span>
                  </div>
                )}
                <div style={{ borderTop: `1px dashed ${c.cardB}`, marginTop: 10, paddingTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: c.muted }}>Responsável: {pp.criadoPor}</span>
                    <span style={{ fontSize: 9, color: c.muted }}>BancaFlow v1.0</span>
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px solid ${c.cardB}` }}>
                    <div style={{ fontSize: 9, color: c.muted, textAlign: 'center' }}>Assinatura / Conferência: ___________________________</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 22px 18px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: c.muted, marginBottom: 10 }}>Imprimir via</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                {[
                  { emoji: '🖨️', label: 'Térmica', msg: 'Enviando para impressora térmica...' },
                  { emoji: '📄', label: 'PDF', msg: 'Gerando PDF do comprovante...' },
                  { emoji: '🖨️', label: 'Comum', msg: 'Enviando para impressora comum...' },
                ].map((opt) => (
                  <div key={opt.label} onClick={() => doPrint(opt.msg)} style={{ padding: '12px 8px', borderRadius: 10, border: `1px solid ${c.cardB}`, background: inputBg, cursor: 'pointer', textAlign: 'center', transition: 'all 0.13s' }}>
                    <div style={{ fontSize: 17, marginBottom: 4 }}>{opt.emoji}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: c.sub }}>{opt.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={closePrintModal} style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: c.green, color: '#fff', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.12s' }}>
                  Agora não
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toastVisible && (
        <div style={{ position: 'fixed', bottom: 22, right: 22, zIndex: 500, display: 'flex', alignItems: 'center', gap: 9, padding: '11px 18px', background: c.green, color: '#fff', borderRadius: 12, boxShadow: '0 6px 24px rgba(0,199,115,0.25)', fontSize: 13, fontWeight: 700, pointerEvents: 'none', fontFamily: "'Inter', sans-serif" }}>
          <span style={{ display: 'flex' }}>
            <IconCheck size={12} />
          </span>
          {toastMsg}
        </div>
      )}
    </>
  )
}
