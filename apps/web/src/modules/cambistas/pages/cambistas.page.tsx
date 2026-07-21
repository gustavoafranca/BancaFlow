'use client'

import { useTheme } from '@/shared/theme/theme-provider'
import { IconPlus, IconUsers, IconSearch } from '@/shared/components/icons'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/ui/table'
import { initials } from '@/shared/lib/format.util'
import { CAMBISTAS, DONOS, AVATAR_GRADS } from '../data/cambistas.sample'
import { IcoAtivo, IcoInativo, IcoTalaoStat } from '../components/icons'

export function CambistasPage() {
  const { c } = useTheme()

  const stats = {
    total: CAMBISTAS.length,
    ativos: CAMBISTAS.filter((x) => x.status === 'Ativo').length,
    inativos: CAMBISTAS.filter((x) => x.status === 'Inativo').length,
    taloes: CAMBISTAS.length,
  }

  const statCard = (
    iconBg: string,
    iconBorder: string,
    iconColor: string,
    icon: React.ReactNode,
    value: React.ReactNode,
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
    <div style={{ padding: '26px 28px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.025em', color: c.text, marginBottom: 5 }}>
            Cambistas
          </h1>
          <p style={{ fontSize: 13, color: c.muted, lineHeight: 1.6 }}>
            Gerencie cambistas, talões, vínculos e remunerações.
          </p>
        </div>
        <Button
          type="button"
          className="whitespace-nowrap rounded-[11px] px-5 py-2.5"
          style={{ boxShadow: `0 4px 18px ${c.shadow}` }}
        >
          <IconPlus size={15} />
          Adicionar Cambista
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        {statCard(c.glow, c.glowB, c.green, <IconUsers size={18} />, stats.total, c.text, 'Total')}
        {statCard(c.glow, c.glowB, c.green, <IcoAtivo />, stats.ativos, c.green, 'Ativos')}
        {statCard('rgba(224,85,85,0.1)', 'rgba(224,85,85,0.22)', '#E05555', <IcoInativo />, stats.inativos, '#E05555', 'Inativos')}
        {statCard('rgba(91,143,212,0.12)', 'rgba(91,143,212,0.22)', '#5B8FD4', <IcoTalaoStat />, stats.taloes, '#5B8FD4', 'Talões')}
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
          <Input
            type="text"
            placeholder="Buscar por nome, apelido ou talão..."
            leftIcon={<IconSearch size={14} />}
            className="max-w-[300px]"
            aria-label="Buscar por nome, apelido ou talão"
          />
          <span style={{ fontSize: 12, color: c.muted }}>{stats.total} cambistas cadastrados</span>
        </div>

        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nome</TableHead>
              <TableHead className="w-[100px]">Apelido</TableHead>
              <TableHead className="w-[70px]">Talão</TableHead>
              <TableHead>Dono / Banca</TableHead>
              <TableHead className="w-[130px]">Remuneração</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CAMBISTAS.map((cam) => {
              const dono = DONOS[cam.donoId]!
              const hasPct = !!cam.pct
              const hasSal = !!cam.sal
              const noRem = !cam.pct && !cam.sal
              return (
                <TableRow key={cam.id}>
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: AVATAR_GRADS[cam.id - 1] || AVATAR_GRADS[0],
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: '#fff',
                          flexShrink: 0,
                        }}
                      >
                        {initials(cam.nome)}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{cam.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell style={{ fontSize: 12.5, color: c.sub }}>{cam.apelido}</TableCell>
                  <TableCell>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: c.green,
                        background: c.glow,
                        border: `1px solid ${c.glowB}`,
                        borderRadius: 7,
                        padding: '3px 9px',
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cam.talao}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: dono.avatarBg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 9.5,
                          fontWeight: 700,
                          color: '#fff',
                          flexShrink: 0,
                        }}
                      >
                        {initials(dono.nome)}
                      </div>
                      <span style={{ fontSize: 12.5, color: c.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {dono.nome}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {hasPct && <span style={{ fontSize: 11.5, fontWeight: 600, color: c.green }}>{cam.pct}%</span>}
                      {hasSal && (
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#5B8FD4' }}>
                          R$ {cam.sal!.toLocaleString('pt-BR')}
                        </span>
                      )}
                      {noRem && <span style={{ fontSize: 11.5, color: c.muted }}>—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cam.status === 'Ativo' ? 'success' : 'danger'}>{cam.status}</Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
