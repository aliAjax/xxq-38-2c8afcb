import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ticket, Check, ChevronRight, ListTodo } from 'lucide-react'
import { useVenueStore } from '@/store/venueStore'
import type { TicketStatus, Seat, Zone } from '@/types'

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string }> = {
  none: { label: '未处理', color: '#666' },
  confirmed: { label: '已确认待换', color: '#39FF14' },
  pending: { label: '待处理', color: '#FFE600' },
  exchanged: { label: '已换票', color: '#5AC8FA' },
}

interface SeatWithZone extends Seat {
  zoneName: string
  zoneColor: string
}

export function ExchangeTodoPanel() {
  const navigate = useNavigate()
  const zones = useVenueStore((s) => s.zones)
  const allSeats = useVenueStore((s) => s.seats)
  const updateSeat = useVenueStore((s) => s.updateSeat)
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set())

  const todoSeats = useMemo(() => {
    const result: SeatWithZone[] = []
    for (const zone of zones) {
      const seats = allSeats[zone.id] || []
      for (const seat of seats) {
        if (seat.memberName && (seat.ticketStatus === 'pending' || seat.ticketStatus === 'confirmed')) {
          result.push({
            ...seat,
            zoneName: zone.name,
            zoneColor: zone.color,
          })
        }
      }
    }
    return result
  }, [zones, allSeats])

  const groupedByZoneAndStatus = useMemo(() => {
    const groups: Record<string, {
      zone: Zone
      pending: SeatWithZone[]
      confirmed: SeatWithZone[]
    }> = {}
    for (const seat of todoSeats) {
      const zone = zones.find((z) => z.id === seat.zoneId)!
      if (!groups[zone.id]) {
        groups[zone.id] = { zone, pending: [], confirmed: [] }
      }
      if (seat.ticketStatus === 'pending') {
        groups[zone.id].pending.push(seat)
      } else if (seat.ticketStatus === 'confirmed') {
        groups[zone.id].confirmed.push(seat)
      }
    }
    return groups
  }, [todoSeats, zones])

  const pendingCount = todoSeats.filter((s) => s.ticketStatus === 'pending').length
  const confirmedCount = todoSeats.filter((s) => s.ticketStatus === 'confirmed').length
  const totalCount = todoSeats.length

  const toggleZone = (zoneId: string) => {
    const next = new Set(expandedZones)
    if (next.has(zoneId)) {
      next.delete(zoneId)
    } else {
      next.add(zoneId)
    }
    setExpandedZones(next)
  }

  const handleMarkExchanged = (e: React.MouseEvent, zoneId: string, seatId: string) => {
    e.stopPropagation()
    updateSeat(zoneId, seatId, { ticketStatus: 'exchanged' })
  }

  const handleJumpToSeat = (zoneId: string, seatId: string) => {
    navigate(`/zone/${zoneId}?seatId=${seatId}`)
  }

  const sortSeats = (seats: SeatWithZone[]) => {
    return [...seats].sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, {
      numeric: true,
      sensitivity: 'base'
    }))
  }

  if (totalCount === 0) {
    return (
      <div className="glass-panel p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <ListTodo size={16} className="text-neon-cyan" />
        <h3 className="text-sm font-medium text-white/40">换票待办</h3>
      </div>
      <div className="text-center py-6">
        <div className="text-3xl mb-2">🎉</div>
        <p className="text-white/20 text-sm">暂无待处理的换票事项</p>
      </div>
    </div>
    )
  }

  return (
    <div className="glass-panel p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListTodo size={16} className="text-neon-cyan" />
          <h3 className="text-sm font-medium text-white/40">换票待办</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FFE60020', color: '#FFE600' }}>
            待处理 {pendingCount}
          </span>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: '#39FF1420', color: '#39FF14' }}>
            待换票 {confirmedCount}
          </span>
        </div>
      </div>

      <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {Object.entries(groupedByZoneAndStatus).map((entry) => {
          const [zoneId, data] = entry
          const { zone, pending, confirmed } = data
          const zoneTotal = pending.length + confirmed.length
          const isExpanded = expandedZones.has(zoneId)
          return (
            <div key={zoneId} className="bg-surface-light/30 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleZone(zoneId)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-light/50 transition-colors">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: zone.color, boxShadow: `0 0 6px ${zone.color}60` }}
                />
                <span className="text-sm text-white/70 font-medium truncate">{zone.name}</span>
                <span className="text-xs font-mono text-white/30 shrink-0">{zoneTotal}项</span>
                <ChevronRight
                  size={14}
                  className="ml-auto text-white/20 shrink-0 transition-transform"
                  style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}
                />
              </button>

              {isExpanded && (
                <div className="px-3 pb-2 space-y-2">
                  {pending.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_CONFIG.pending.color }} />
                        <span className="text-xs text-white/30">待处理</span>
                        <span className="text-xs font-mono text-white/20 ml-auto">{pending.length}</span>
                      </div>
                      <div className="space-y-1">
                        {sortSeats(pending).map((seat) => (
                          <SeatItem
                            key={seat.id}
                            seat={seat}
                            onMarkExchanged={(e) => handleMarkExchanged(e, seat.zoneId, seat.id)}
                            onClick={() => handleJumpToSeat(seat.zoneId, seat.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {confirmed.length > 0 && (
                    <div className={pending.length > 0 ? 'pt-1' : ''}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_CONFIG.confirmed.color }} />
                        <span className="text-xs text-white/30">已确认待换</span>
                        <span className="text-xs font-mono text-white/20 ml-auto">{confirmed.length}</span>
                      </div>
                      <div className="space-y-1">
                        {sortSeats(confirmed).map((seat) => (
                          <SeatItem
                            key={seat.id}
                            seat={seat}
                            onMarkExchanged={(e) => handleMarkExchanged(e, seat.zoneId, seat.id)}
                            onClick={() => handleJumpToSeat(seat.zoneId, seat.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SeatItem({
  seat, onMarkExchanged, onClick }: {
  seat: SeatWithZone
  onMarkExchanged: (e: React.MouseEvent) => void
  onClick: () => void
}) {
  const statusCfg = STATUS_CONFIG[seat.ticketStatus]
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.03] hover:border-white/[0.06] border border-transparent cursor-pointer group transition-all"
    >
      <Ticket size={12} className="text-white/20 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-white/70 truncate">{seat.memberName}</span>
          <span className="text-[10px] font-mono text-white/25 shrink-0">#{seat.seatNumber}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusCfg.color }} />
          <span className="text-[10px] text-white/25 truncate">{statusCfg.label}</span>
        </div>
      </div>
      <button
        onClick={onMarkExchanged}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neon-cyan/20 text-white/20 hover:text-neon-cyan transition-all"
        title="标记为已换票"
      >
        <Check size={14} />
      </button>
    </div>
  )
}
