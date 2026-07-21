'use client'

import { useTheme } from '@/shared/theme/theme-provider'
import { IconPlus } from '@/shared/components/icons'
import { Button } from '@/shared/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/ui/table'
import { RECENT, SYSTEM_STATUS } from '../data/dashboard.sample'
import { IcoTicket, IcoWallet, IcoAlert, IcoCash, IcoUp, IcoDn } from '../components/icons'

export function DashboardPage() {
  const { c } = useTheme()

  const cardBase: React.CSSProperties = {
    background: c.card,
    border: `1px solid ${c.cardB}`,
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  }
  const kpiLabel: React.CSSProperties = {
    fontSize: 10.5,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: c.muted,
    lineHeight: 1.45,
    maxWidth: 90,
  }
  const kpiIconBox = (bg: string, border: string, color: string): React.CSSProperties => ({
    width: 36,
    height: 36,
    borderRadius: 10,
    background: bg,
    border: `1px solid ${border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color,
    flexShrink: 0,
  })
  const kpiValue: React.CSSProperties = {
    fontSize: 25,
    fontWeight: 800,
    letterSpacing: '-0.03em',
    color: c.text,
    marginBottom: 10,
  }

  return (
    <div style={{ padding: '26px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.025em', color: c.text, marginBottom: 4 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13, color: c.muted }}>Quarta-feira, 25 de junho de 2026</p>
        </div>
        <Button
          type="button"
          className="rounded-[11px] px-5 py-2.5"
          style={{ boxShadow: `0 4px 18px ${c.shadow}` }}
        >
          <IconPlus size={16} />
          Novo Lançamento
        </Button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 22 }}>
        {/* Total Vendido Hoje */}
        <div style={cardBase}>
          <div
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 100,
              height: 100,
              background: `radial-gradient(circle at top right, ${c.glow}, transparent 68%)`,
              pointerEvents: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={kpiLabel}>Total Vendido Hoje</span>
            <div style={kpiIconBox(c.glow, c.glowB, c.green)}>
              <IcoTicket />
            </div>
          </div>
          <div style={kpiValue}>R$ 12.847,50</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 600, color: '#00C773' }}>
              <IcoUp /> 8,4%
            </span>
            <span style={{ fontSize: 11.5, color: c.muted }}>vs. ontem</span>
          </div>
        </div>

        {/* Total Recebido */}
        <div style={cardBase}>
          <div
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 100,
              height: 100,
              background: `radial-gradient(circle at top right, ${c.glow}, transparent 68%)`,
              pointerEvents: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={kpiLabel}>Total Recebido</span>
            <div style={kpiIconBox(c.glow, c.glowB, c.green)}>
              <IcoWallet />
            </div>
          </div>
          <div style={kpiValue}>R$ 9.320,00</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 600, color: '#00C773' }}>
              <IcoUp /> 5,2%
            </span>
            <span style={{ fontSize: 11.5, color: c.muted }}>vs. ontem</span>
          </div>
        </div>

        {/* Débitos Pendentes */}
        <div style={cardBase}>
          <div
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 100,
              height: 100,
              background: 'radial-gradient(circle at top right, rgba(224,85,85,0.07), transparent 68%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={kpiLabel}>Débitos Pendentes</span>
            <div style={kpiIconBox('rgba(224,85,85,0.1)', 'rgba(224,85,85,0.22)', '#E05555')}>
              <IcoAlert />
            </div>
          </div>
          <div style={kpiValue}>R$ 3.527,50</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 600, color: '#E05555' }}>
              <IcoDn /> 2,1%
            </span>
            <span style={{ fontSize: 11.5, color: c.muted }}>vs. ontem</span>
          </div>
        </div>

        {/* Caixa Atual (destaque) */}
        <div
          style={{
            background: 'linear-gradient(135deg,#006640 0%,#009955 45%,#00C773 100%)',
            borderRadius: 16,
            padding: 20,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 6px 24px rgba(0,199,115,0.3)',
          }}
        >
          <div style={{ position: 'absolute', top: -22, right: -22, width: 110, height: 110, background: 'rgba(255,255,255,0.09)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -28, right: 16, width: 78, height: 78, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ ...kpiLabel, color: 'rgba(255,255,255,0.72)' }}>Caixa Atual</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
              <IcoCash />
            </div>
          </div>
          <div style={{ ...kpiValue, color: '#fff' }}>R$ 48.920,00</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>
              <IcoUp /> 12,8%
            </span>
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.62)' }}>vs. mês passado</span>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 298px', gap: 16 }}>
        {/* Activity table */}
        <div style={{ background: c.card, border: `1px solid ${c.cardB}`, borderRadius: 16, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Últimos Lançamentos</h3>
            <button type="button" style={{ fontSize: 12, color: c.green, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Ver todos →
            </button>
          </div>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Cambista</TableHead>
                <TableHead className="w-[96px]">Tipo</TableHead>
                <TableHead className="w-[108px] text-right">Valor</TableHead>
                <TableHead className="w-[88px] text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RECENT.map((row) => (
                <TableRow key={row.name}>
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: row.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {row.initials}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: c.text, lineHeight: 1.3 }}>{row.name}</div>
                        <div style={{ fontSize: 11, color: c.muted, lineHeight: 1.3 }}>{row.time}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span style={{ fontSize: 11.5, padding: '3px 10px', borderRadius: 20, fontWeight: 500, background: row.typeBg, color: row.typeC }}>
                      {row.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span style={{ fontSize: 13, fontWeight: 600, color: row.valC }}>{row.value}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span style={{ fontSize: 11.5, padding: '3px 10px', borderRadius: 20, fontWeight: 500, background: row.stBg, color: row.stC }}>
                      {row.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: c.card, border: `1px solid ${c.cardB}`, borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: c.muted, marginBottom: 14 }}>
              Cambistas Ativos
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', color: c.text, marginBottom: 10 }}>
              8 <span style={{ fontSize: 14, color: c.muted, fontWeight: 400 }}>/ 11</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: c.cardB, overflow: 'hidden', marginBottom: 7 }}>
              <div style={{ width: '72.7%', height: '100%', background: c.green, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, color: c.muted }}>72,7% disponíveis</span>
          </div>

          <div style={{ background: c.card, border: `1px solid ${c.cardB}`, borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: c.muted, marginBottom: 14 }}>
              Talões Emitidos Hoje
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', color: c.text, marginBottom: 9 }}>147</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#00C773' }}>↑ +23</span>
              <span style={{ fontSize: 11.5, color: c.muted }}>vs. ontem</span>
            </div>
          </div>

          <div style={{ background: c.card, border: `1px solid ${c.cardB}`, borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: c.muted, marginBottom: 16 }}>
              Status do Sistema
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {SYSTEM_STATUS.map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12.5, color: c.sub }}>{s.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      className={s.pulse ? 'bf-pulse-dot' : undefined}
                      style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }}
                    />
                    <span style={{ fontSize: 12, color: s.color, fontWeight: 500 }}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
