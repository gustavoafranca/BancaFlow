'use client'

import { useState } from 'react'
import { useTheme } from '@/shared/theme/theme-provider'
import { IconPlus, IconShare, IconUsers, IconSearch, IconCheck } from '@/shared/components/icons'
import { initials } from '@/shared/lib/format.util'
import { Drawer, DrawerContent, DrawerBody, DrawerFooter } from '@/shared/components/ui/drawer'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs'
import { Badge } from '@/shared/components/ui/badge'
import { SelectionButtonGroup, type SelectionButtonOption } from '@/shared/components/ui/selection-button-group'
import { PESSOAS, ALL_CAMBISTAS, AVATAR_BY_TIPO } from '../data/pessoas.sample'
import { IcoLink, IcoLinkSm, IcoStar, IcoArrow } from '../components/icons'
import type { Tipo, Pessoa, DrawerMode, DrawerTab } from '../types'

const labelStyle = (muted: string): React.CSSProperties => ({
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: muted,
})

// Tipo e Status são SELEÇÃO de estado/opção, não ação — Selection Button
// Group (ajuste solicitado antes do archive de
// `standardize-frontend-drawer-and-settings-nav`). Pessoas é a referência
// visual original deste padrão; migrado aqui para o componente compartilhado
// para não haver duas implementações da mesma linguagem visual.
const TIPO_SELECTION_OPTIONS: SelectionButtonOption<Tipo>[] = [
  { value: 'Dono', label: 'Dono', variant: 'success' },
  { value: 'Funcionário', label: 'Funcionário', variant: 'info' },
  { value: 'Recolhe', label: 'Recolhe', variant: 'warning' },
]

const STATUS_SELECTION_OPTIONS: SelectionButtonOption<Pessoa['status']>[] = [
  { value: 'Ativo', label: 'Ativo', variant: 'success' },
  { value: 'Inativo', label: 'Inativo', variant: 'danger' },
]

export function PessoasPage() {
  const { c, dark } = useTheme()

  /* cores extras não presentes no theme compartilhado */
  const inputBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'
  const BLUE = '#5B8FD4'
  const AMBER = '#F5A623'

  const tipoConfig: Record<Tipo, { bg: string; color: string }> = {
    Dono: { bg: 'rgba(0,199,115,0.12)', color: c.green },
    Funcionário: { bg: 'rgba(91,143,212,0.12)', color: BLUE },
    Recolhe: { bg: 'rgba(245,166,35,0.12)', color: AMBER },
  }

  /* ── estado ── */
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('add')
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('dados')
  const [editItem, setEditItem] = useState<Pessoa | null>(null)
  const [selectedCambistas, setSelectedCambistas] = useState<string[]>([])
  const [selectedTipo, setSelectedTipo] = useState<Tipo>('Funcionário')
  const [selectedStatus, setSelectedStatus] = useState<Pessoa['status']>('Ativo')

  const isViewMode = drawerMode === 'view'
  const isEditMode = drawerMode === 'edit' || drawerMode === 'add'
  const isAddMode = drawerMode === 'add'
  const drawerTitle = isAddMode ? 'Nova Pessoa' : isEditMode ? 'Editar Pessoa' : editItem ? editItem.nome : 'Pessoa'
  const showPct = selectedTipo === 'Dono' || selectedTipo === 'Recolhe'
  const fBg = isViewMode ? 'transparent' : inputBg
  const fBd = isViewMode ? c.cardBL : inputBorder

  const openAdd = () => {
    setEditItem(null)
    setSelectedCambistas([])
    setSelectedTipo('Funcionário')
    setSelectedStatus('Ativo')
    setDrawerMode('add')
    setDrawerTab('dados')
    setDrawerOpen(true)
  }
  const openView = (p: Pessoa) => {
    setEditItem(p)
    setSelectedCambistas([...p.cambistas])
    setSelectedTipo(p.tipo)
    setSelectedStatus(p.status)
    setDrawerMode('view')
    setDrawerTab('dados')
    setDrawerOpen(true)
  }
  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditItem(null)
  }
  const toggleCambista = (name: string) => {
    if (isViewMode) return
    setSelectedCambistas((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]))
  }

  const stats = {
    total: PESSOAS.length,
    donos: PESSOAS.filter((p) => p.tipo === 'Dono').length,
    funcionarios: PESSOAS.filter((p) => p.tipo === 'Funcionário').length,
    recolhes: PESSOAS.filter((p) => p.tipo === 'Recolhe').length,
  }

  const gridCols = '1fr 130px 110px 220px'
  const thStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: c.muted,
  }

  const statCard = (
    iconBg: string,
    iconBorder: string,
    iconColor: string,
    icon: React.ReactNode,
    value: number,
    valueColor: string,
    label: string,
  ) => (
    <div
      style={{
        background: c.card,
        border: `1px solid ${c.cardB}`,
        borderRadius: 14,
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 11,
          background: iconBg,
          border: `1px solid ${iconBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', color: valueColor, lineHeight: 1.15 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: c.muted, marginTop: 2 }}>
          {label}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div style={{ padding: '26px 28px' }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 20 }}>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.025em', color: c.text, marginBottom: 5 }}>
              Pessoas e Vínculos
            </h1>
            <p style={{ fontSize: 13, color: c.muted, lineHeight: 1.6 }}>
              Gerencie os envolvidos e suas relações com os cambistas.
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 11,
              border: 'none',
              background: c.green,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              boxShadow: `0 4px 18px ${c.shadow}`,
            }}
          >
            <IconPlus size={15} />
            Adicionar Pessoa
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
          {statCard(c.glow, c.glowB, c.green, <IconShare size={16} />, stats.total, c.text, 'Total')}
          {statCard(c.glow, c.glowB, c.green, IcoStar, stats.donos, c.green, 'Donos')}
          {statCard('rgba(91,143,212,0.12)', 'rgba(91,143,212,0.22)', BLUE, <IconUsers size={16} />, stats.funcionarios, BLUE, 'Funcionários')}
          {statCard('rgba(245,166,35,0.12)', 'rgba(245,166,35,0.22)', AMBER, IcoArrow, stats.recolhes, AMBER, 'Recolhes')}
        </div>

        {/* Table card */}
        <div style={{ background: c.card, border: `1px solid ${c.cardB}`, borderRadius: 16, overflow: 'hidden' }}>
          {/* search bar */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: `1px solid ${c.cardB}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: inputBg,
                border: `1px solid ${inputBorder}`,
                borderRadius: 10,
                padding: '8px 14px',
                maxWidth: 280,
                flex: 1,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', color: c.muted, flexShrink: 0 }}>
                <IconSearch size={14} />
              </span>
              <input
                type="text"
                placeholder="Buscar por nome, tipo..."
                style={{ background: 'transparent', border: 'none', outline: 'none', color: c.text, fontSize: 13, width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: c.muted }}>{stats.total} pessoas cadastradas</span>
            </div>
          </div>

          {/* table header */}
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10, padding: '10px 18px', borderBottom: `1px solid ${c.cardB}` }}>
            <span style={thStyle}>Pessoa</span>
            <span style={thStyle}>Tipo</span>
            <span style={thStyle}>Status</span>
            <span style={thStyle}>Cambistas Vinculados</span>
          </div>

          {/* table rows */}
          {PESSOAS.map((p) => {
            const tc = tipoConfig[p.tipo]
            const cambistaStr =
              p.cambistas.length === 0
                ? '—'
                : p.cambistas.length === 1
                  ? p.cambistas[0]
                  : `${p.cambistas[0]} +${p.cambistas.length - 1}`
            return (
              <div
                key={p.id}
                onClick={() => openView(p)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  gap: 10,
                  padding: '13px 18px',
                  borderBottom: `1px solid ${c.cardBL}`,
                  cursor: 'pointer',
                  alignItems: 'center',
                }}
              >
                {/* Pessoa */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: AVATAR_BY_TIPO[p.tipo],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {initials(p.nome)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.text, lineHeight: 1.3 }}>{p.nome}</div>
                    <div style={{ fontSize: 11, color: c.muted, lineHeight: 1.3 }}>{p.pct ? `${p.pct} participação` : '—'}</div>
                  </div>
                </div>

                {/* Tipo */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 11.5, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: tc.bg, color: tc.color }}>
                    {p.tipo}
                  </span>
                </div>

                {/* Status — apenas Ativo/Inativo (task 5.1: mesmo componente
                    visual de badge já usado em Contas de Usuário). */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Badge variant={p.status === 'Ativo' ? 'success' : 'danger'}>{p.status}</Badge>
                </div>

                {/* Vínculos */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', color: c.muted, flexShrink: 0 }}>{IcoLinkSm}</span>
                  <span
                    style={{
                      fontSize: 12.5,
                      color: p.cambistas.length > 0 ? c.sub : c.muted,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {cambistaStr}
                  </span>
                </div>
              </div>
            )
          })}

          {/* empty last row padding */}
          <div style={{ height: 8 }} />
        </div>
      </div>

      {/* ═══ DRAWER (canonical-drawer) ═══ */}
      <Drawer open={drawerOpen} onOpenChange={(next) => !next && closeDrawer()}>
        <DrawerContent
          title={drawerTitle}
          titleBadge={
            isViewMode ? (
              <Badge variant="neutral" className="shrink-0">
                Visualização
              </Badge>
            ) : undefined
          }
        >
          <Tabs value={drawerTab} onValueChange={(next) => setDrawerTab(next as DrawerTab)} className="flex flex-1 flex-col overflow-hidden">
            <TabsList className="mx-4 mt-3">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="vinculos">Vínculos</TabsTrigger>
            </TabsList>

            <DrawerBody key={`${editItem?.id ?? 'new'}-${drawerMode}`} style={{ padding: 20 }}>
              <TabsContent value="dados" className="mt-0">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ ...labelStyle(c.muted), marginBottom: 7 }}>Nome Completo</label>
                    <input
                      type="text"
                      defaultValue={editItem?.nome ?? ''}
                      readOnly={isViewMode}
                      placeholder="Nome da pessoa"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: fBg,
                        border: `1px solid ${fBd}`,
                        borderRadius: 10,
                        color: c.text,
                        fontSize: 13.5,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ ...labelStyle(c.muted), marginBottom: 9 }}>Tipo</label>
                    <SelectionButtonGroup
                      aria-label="Tipo"
                      value={selectedTipo}
                      onValueChange={(next) => setSelectedTipo(next as Tipo)}
                      disabled={isViewMode}
                      options={TIPO_SELECTION_OPTIONS}
                    />
                  </div>

                  {showPct && (
                    <div>
                      <label style={{ ...labelStyle(c.muted), marginBottom: 7 }}>Percentual de Participação</label>
                      <input
                        type="text"
                        defaultValue={editItem?.pct ?? ''}
                        readOnly={isViewMode}
                        placeholder="Ex: 30%"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: fBg,
                          border: `1px solid ${fBd}`,
                          borderRadius: 10,
                          color: c.text,
                          fontSize: 13.5,
                          outline: 'none',
                        }}
                      />
                      <p style={{ fontSize: 11, color: c.muted, marginTop: 5, lineHeight: 1.5 }}>
                        Percentual aplicável sobre os resultados do(s) cambista(s) vinculado(s). Deixe preparado para
                        salários/despesas no futuro.
                      </p>
                    </div>
                  )}

                  <div>
                    <label style={{ ...labelStyle(c.muted), marginBottom: 9 }}>Status</label>
                    <SelectionButtonGroup
                      aria-label="Status"
                      value={selectedStatus}
                      onValueChange={(next) => setSelectedStatus(next as Pessoa['status'])}
                      disabled={isViewMode}
                      options={STATUS_SELECTION_OPTIONS}
                    />
                  </div>

                  <div>
                    <label style={{ ...labelStyle(c.muted), marginBottom: 7 }}>
                      Observações{' '}
                      <span style={{ fontWeight: 400, fontSize: 10.5, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
                    </label>
                    <textarea
                      defaultValue={editItem?.obs ?? ''}
                      readOnly={isViewMode}
                      rows={3}
                      placeholder="Informações adicionais sobre esta pessoa..."
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: fBg,
                        border: `1px solid ${fBd}`,
                        borderRadius: 10,
                        color: c.text,
                        fontSize: 13.5,
                        resize: 'none',
                        lineHeight: 1.55,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="vinculos" className="mt-0">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      background: c.glow,
                      border: `1px solid ${c.glowB}`,
                      borderRadius: 12,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', color: c.green, flexShrink: 0 }}>{IcoLink}</span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: c.green, marginBottom: 2 }}>
                        {selectedCambistas.length} cambista(s) vinculado(s)
                      </div>
                      <div style={{ fontSize: 11.5, color: c.muted }}>
                        {isEditMode ? 'Clique nos cards abaixo para vincular ou desvincular.' : 'Clique em Editar para alterar os vínculos.'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ ...labelStyle(c.muted), marginBottom: 10 }}>Cambistas Disponíveis</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {ALL_CAMBISTAS.map((cam) => {
                        const sel = selectedCambistas.includes(cam.name)
                        return (
                          <div
                            key={cam.name}
                            onClick={() => toggleCambista(cam.name)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '11px 14px',
                              borderRadius: 11,
                              border: `1px solid ${sel ? c.green : inputBorder}`,
                              background: sel ? 'rgba(0,199,115,0.1)' : inputBg,
                              cursor: isViewMode ? 'default' : 'pointer',
                            }}
                          >
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                background: cam.avatarBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#fff',
                                flexShrink: 0,
                              }}
                            >
                              {cam.initials}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 500, color: sel ? c.green : c.sub, flex: 1 }}>{cam.name}</span>
                            <div
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                border: `1.5px solid ${sel ? c.green : inputBorder}`,
                                background: sel ? 'rgba(0,199,115,0.25)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                color: c.green,
                              }}
                            >
                              {sel && <IconCheck size={12} />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </DrawerBody>
          </Tabs>

          {/* Tela mock (sem persistência real): "Salvar"/"Salvar Alterações" fecha
              o drawer como um retorno mínimo razoável de UX, sem simular
              contrato de dados que não existe (task 4.1). */}
          {isViewMode ? (
            <DrawerFooter mode="view" onClose={closeDrawer} onEdit={() => setDrawerMode('edit')} />
          ) : (
            <DrawerFooter mode={isAddMode ? 'create' : 'edit'} onClose={closeDrawer} onSave={closeDrawer} />
          )}
        </DrawerContent>
      </Drawer>
    </>
  )
}
