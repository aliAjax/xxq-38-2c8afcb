import { useMemo } from 'react'
import { Users, MapPinned, AlertTriangle, Ticket } from 'lucide-react'
import { useVenueStore } from '@/store/venueStore'
import type { TicketStatus } from '@/types'

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string }> = {
  none: { label: '未处理', color: '#666' },
  confirmed: { label: '已确认', color: '#39FF14' },
  pending: { label: '待处理', color: '#FFE600' },
  exchanged: { label: '已换票', color: '#5AC8FA' },
}

export function ZoneStatsPanel({ zoneId }: { zoneId: string }) {
  const zone = useVenueStore((s) => s.zones.find((z) => z.id === zoneId))
  const seats = useVenueStore((s) => s.seats[zoneId] || [])

  const stats = useMemo(() => {
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
  }, [seats])

  const suppliesList = useMemo(() => {
    return seats
      .filter((s) => s.memberName && s.supplies.trim())
      .map((s) => ({ name: s.memberName, supplies: s.supplies }))
  }, [seats])

  if (!zone) return null

  return (
    <div className="glass-panel p-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color, boxShadow: `0 0 8px ${zone.color}50` }} />
        <h3 className="font-bold text-white text-sm">{zone.name}</h3>
        <span className="text-xs font-mono text-white/25 ml-auto">{zone.rows}×{zone.cols}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MiniStat icon={<Users size={12} />} label="已分配" value={`${stats.assigned}/${stats.total}`} color="#FF2E97" />
        <MiniStat icon={<AlertTriangle size={12} />} label="遮挡" value={String(stats.obstructed)} color="#FFE600" />
        <MiniStat icon={<MapPinned size={12} />} label="分配率" value={`${stats.total > 0 ? Math.round((stats.assigned / stats.total) * 100) : 0}%`} color="#00F5FF" />
        <MiniStat icon={<Ticket size={12} />} label="已确认" value={String(stats.confirmed)} color="#39FF14" />
      </div>

      {stats.total > 0 && (
        <div>
          <div className="text-xs text-white/30 mb-1.5">分配进度</div>
          <div className="w-full h-1.5 bg-surface-lighter rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(stats.assigned / stats.total) * 100}%`,
                backgroundColor: zone.color,
                boxShadow: `0 0 8px ${zone.color}40`,
              }}
            />
          </div>
        </div>
      )}

      {(stats.confirmed + stats.pending + stats.exchanged) > 0 && (
        <div>
          <div className="text-xs text-white/30 mb-1.5">换票状态</div>
          <div className="space-y-1">
            {(['confirmed', 'pending', 'exchanged'] as TicketStatus[]).map((status) => {
              const count = stats[status === 'confirmed' ? 'confirmed' : status === 'pending' ? 'pending' : 'exchanged']
              if (count === 0) return null
              const cfg = STATUS_CONFIG[status]
              return (
                <div key={status} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                  <span className="text-xs text-white/50">{cfg.label}</span>
                  <span className="text-xs font-mono ml-auto" style={{ color: cfg.color }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {suppliesList.length > 0 && (
        <div>
          <div className="text-xs text-white/30 mb-1.5">物资清单</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {suppliesList.map((item, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <span className="text-white/50 shrink-0">{item.name}</span>
                <span className="text-white/25">:</span>
                <span className="text-white/40">{item.supplies}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-surface-light/50 rounded-lg p-2">
      <div className="flex items-center gap-1 text-white/25 mb-0.5">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <div className="font-mono text-sm font-bold" style={{ color }}>{value}</div>
    </div>
  )
}
