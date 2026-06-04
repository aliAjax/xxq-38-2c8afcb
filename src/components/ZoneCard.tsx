import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, AlertTriangle, Ticket, ArrowRight, Trash2 } from 'lucide-react'
import { useVenueStore } from '@/store/venueStore'

function computeZoneStats(seats: { memberName: string; isObstructed: boolean; ticketStatus: string }[]) {
  let assigned = 0
  let obstructed = 0
  let confirmed = 0
  let pending = 0
  let exchanged = 0
  for (const s of seats) {
    if (s.memberName) assigned++
    if (s.isObstructed) obstructed++
    if (s.ticketStatus === 'confirmed') confirmed++
    if (s.ticketStatus === 'pending') pending++
    if (s.ticketStatus === 'exchanged') exchanged++
  }
  return { total: seats.length, assigned, obstructed, confirmed, pending, exchanged }
}

export function ZoneCard({ zoneId }: { zoneId: string }) {
  const navigate = useNavigate()
  const zone = useVenueStore((s) => s.zones.find((z) => z.id === zoneId))
  const zoneSeats = useVenueStore((s) => s.seats[zoneId] || [])
  const removeZone = useVenueStore((s) => s.removeZone)

  const stats = useMemo(() => computeZoneStats(zoneSeats), [zoneSeats])

  if (!zone) return null

  const pct = stats.total > 0 ? Math.round((stats.assigned / stats.total) * 100) : 0

  return (
    <div className="glass-panel p-4 hover:border-white/10 transition-all group relative animate-fade-in">
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
        style={{ backgroundColor: zone.color, boxShadow: `0 0 12px ${zone.color}40` }}
      />

      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-white text-base">{zone.name}</h3>
          <span className="text-xs text-white/30 font-mono">{zone.rows}×{zone.cols}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); removeZone(zoneId) }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="space-y-2.5 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Users size={14} className="text-white/30" />
          <span className="text-white/50">已分配</span>
          <span className="ml-auto font-mono text-white/80">{stats.assigned}<span className="text-white/30">/{stats.total}</span></span>
        </div>

        <div className="w-full h-1.5 bg-surface-lighter rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: zone.color, boxShadow: `0 0 8px ${zone.color}60` }}
          />
        </div>

        {stats.obstructed > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle size={14} className="text-yellow-400/60" />
            <span className="text-white/50">遮挡座位</span>
            <span className="ml-auto font-mono text-yellow-400/80">{stats.obstructed}</span>
          </div>
        )}

        {(stats.confirmed + stats.pending + stats.exchanged) > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Ticket size={14} className="text-neon-cyan/60" />
            <span className="text-white/50">换票进度</span>
            <span className="ml-auto font-mono text-neon-cyan/80">
              {stats.confirmed + stats.exchanged}<span className="text-white/30">/{stats.assigned || '-'}</span>
            </span>
          </div>
        )}
      </div>

      <button
        onClick={() => navigate(`/zone/${zoneId}`)}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-white/[0.06] text-white/40 hover:text-white hover:border-white/15 hover:bg-white/[0.03] transition-all text-sm"
      >
        进入规划 <ArrowRight size={14} />
      </button>
    </div>
  )
}

export function GlobalStats() {
  const zones = useVenueStore((s) => s.zones)
  const allSeats = useVenueStore((s) => s.seats)

  const stats = useMemo(() => {
    let totalSeats = 0
    let totalAssigned = 0
    let totalObstructed = 0
    let confirmed = 0
    let pending = 0
    let exchanged = 0
    for (const zone of zones) {
      const seats = allSeats[zone.id] || []
      totalSeats += seats.length
      for (const s of seats) {
        if (s.memberName) totalAssigned++
        if (s.isObstructed) totalObstructed++
        if (s.ticketStatus === 'confirmed') confirmed++
        if (s.ticketStatus === 'pending') pending++
        if (s.ticketStatus === 'exchanged') exchanged++
      }
    }
    return { totalZones: zones.length, totalSeats, totalAssigned, totalObstructed, confirmed, pending, exchanged }
  }, [zones, allSeats])

  return (
    <div className="glass-panel p-4 animate-fade-in">
      <h3 className="text-sm font-medium text-white/40 mb-3">全局统计</h3>
      <div className="grid grid-cols-2 gap-3">
        <StatItem label="区域数" value={stats.totalZones} color="text-neon-pink" />
        <StatItem label="总座位" value={stats.totalSeats} color="text-neon-cyan" />
        <StatItem label="已分配" value={stats.totalAssigned} color="text-neon-green" />
        <StatItem label="遮挡座" value={stats.totalObstructed} color="text-yellow-400" />
      </div>

      {stats.totalAssigned > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="text-xs text-white/30 mb-2">换票状态分布</div>
          <div className="flex gap-2 flex-wrap">
            <TicketBadge label="已确认" count={stats.confirmed} color="#39FF14" />
            <TicketBadge label="待处理" count={stats.pending} color="#FFE600" />
            <TicketBadge label="已换票" count={stats.exchanged} color="#5AC8FA" />
          </div>
        </div>
      )}

      {stats.totalSeats > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="text-xs text-white/30 mb-2">分配进度</div>
          <div className="w-full h-2 bg-surface-lighter rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-neon-pink to-neon-purple transition-all duration-500"
              style={{ width: `${Math.round((stats.totalAssigned / stats.totalSeats) * 100)}%` }}
            />
          </div>
          <div className="text-right text-xs font-mono text-white/30 mt-1">
            {Math.round((stats.totalAssigned / stats.totalSeats) * 100)}%
          </div>
        </div>
      )}
    </div>
  )
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface-light/50 rounded-lg p-2.5">
      <div className="text-xs text-white/30 mb-0.5">{label}</div>
      <div className={`font-mono font-bold text-lg ${color}`}>{value}</div>
    </div>
  )
}

function TicketBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-surface-light/50 rounded-md px-2 py-1">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-white/50">{label}</span>
      <span className="text-xs font-mono text-white/70">{count}</span>
    </div>
  )
}
