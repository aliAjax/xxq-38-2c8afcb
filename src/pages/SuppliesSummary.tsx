import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, Filter, ChevronDown, ChevronUp, User, MapPin, Edit2, Check, X } from 'lucide-react'
import { useVenueStore } from '@/store/venueStore'
import type { Seat } from '@/types'

type FilterMode = 'all' | 'withSupplies' | 'unassigned'

interface EditingState {
  zoneId: string
  seatId: string
  value: string
}

export default function SuppliesSummary() {
  const navigate = useNavigate()
  const zones = useVenueStore((s) => s.zones)
  const allSeats = useVenueStore((s) => s.seats)
  const updateSeat = useVenueStore((s) => s.updateSeat)

  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set(zones.map((z) => z.id)))
  const [searchText, setSearchText] = useState('')
  const [editing, setEditing] = useState<EditingState | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditing(null)
  }, [filterMode, searchText])

  const zoneData = useMemo(() => {
    return zones.map((zone) => {
      const seats = allSeats[zone.id] || []
      let filtered = seats

      if (filterMode === 'withSupplies') {
        filtered = seats.filter((s) => s.memberName && s.supplies)
      } else if (filterMode === 'unassigned') {
        filtered = seats.filter((s) => !s.memberName)
      }

      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase()
        filtered = filtered.filter(
          (s) =>
            s.memberName.toLowerCase().includes(q) ||
            s.supplies.toLowerCase().includes(q) ||
            s.seatNumber.toLowerCase().includes(q)
        )
      }

      return {
        zone,
        seats: filtered,
        totalSeats: seats.length,
        assignedCount: seats.filter((s) => s.memberName).length,
        suppliesCount: seats.filter((s) => s.memberName && s.supplies).length,
        unassignedCount: seats.filter((s) => !s.memberName).length,
      }
    }).filter((zd) => zd.seats.length > 0)
  }, [zones, allSeats, filterMode, searchText])

  const globalStats = useMemo(() => {
    let totalSeats = 0
    let totalAssigned = 0
    let totalWithSupplies = 0
    let totalUnassigned = 0
    for (const zone of zones) {
      const seats = allSeats[zone.id] || []
      totalSeats += seats.length
      totalAssigned += seats.filter((s) => s.memberName).length
      totalWithSupplies += seats.filter((s) => s.memberName && s.supplies).length
      totalUnassigned += seats.filter((s) => !s.memberName).length
    }
    return { totalSeats, totalAssigned, totalWithSupplies, totalUnassigned }
  }, [zones, allSeats])

  const toggleZone = (zoneId: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev)
      if (next.has(zoneId)) {
        next.delete(zoneId)
      } else {
        next.add(zoneId)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedZones(new Set(zones.map((z) => z.id)))
  }

  const collapseAll = () => {
    setExpandedZones(new Set())
  }

  const handleStartEdit = (seat: Seat) => {
    if (!seat.memberName) return
    setEditing({
      zoneId: seat.zoneId,
      seatId: seat.id,
      value: seat.supplies,
    })
  }

  const handleSaveEdit = () => {
    if (!editing) return
    updateSeat(editing.zoneId, editing.seatId, { supplies: editing.value })
    setEditing(null)
  }

  const handleCancelEdit = () => {
    setEditing(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    }
    if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const isEditing = (seat: Seat) => {
    return editing?.zoneId === seat.zoneId && editing?.seatId === seat.id
  }

  return (
    <div className="min-h-screen bg-base bg-grid-pattern">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-white/[0.04] text-white/40 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <Package size={24} className="text-neon-cyan" />
            <h1 className="text-2xl font-black text-white text-glow-cyan">物资汇总清单</h1>
          </div>
          <p className="text-sm text-white/30 ml-[88px]">按区域汇总成员携带物资信息</p>
        </header>

        <div className="glass-panel p-4 mb-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Filter size={14} className="text-white/30" />
            <span className="text-xs text-white/30 mr-1">筛选</span>
            {([
              { key: 'all' as FilterMode, label: '全部' },
              { key: 'withSupplies' as FilterMode, label: '已填写物资' },
              { key: 'unassigned' as FilterMode, label: '未分配座位' },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilterMode(opt.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  filterMode === opt.key
                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                    : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white/60 hover:border-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索成员、物资或座号..."
              className="flex-1 bg-surface-light border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-neon-cyan/50 transition-colors"
            />
            <div className="flex gap-1">
              <button
                onClick={expandAll}
                className="px-2.5 py-2 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
              >
                全部展开
              </button>
              <button
                onClick={collapseAll}
                className="px-2.5 py-2 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
              >
                全部收起
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="总座位" value={globalStats.totalSeats} color="text-neon-cyan" />
          <StatCard label="已分配" value={globalStats.totalAssigned} color="text-neon-green" />
          <StatCard label="已填物资" value={globalStats.totalWithSupplies} color="text-neon-pink" />
          <StatCard label="未分配" value={globalStats.totalUnassigned} color="text-white/40" />
        </div>

        {zoneData.length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <Package size={40} className="mx-auto text-white/10 mb-3" />
            <p className="text-sm text-white/30">
              {searchText || filterMode !== 'all'
                ? '没有符合筛选条件的数据'
                : '暂无区域数据，请先在总览页创建区域'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {zoneData.map((zd) => (
              <div key={zd.zone.id} className="glass-panel overflow-hidden animate-fade-in">
                <button
                  onClick={() => toggleZone(zd.zone.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: zd.zone.color, boxShadow: `0 0 8px ${zd.zone.color}40` }}
                    />
                    <span className="font-bold text-white text-sm">{zd.zone.name}</span>
                    <span className="text-xs text-white/20 font-mono">{zd.zone.rows}×{zd.zone.cols}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-white/30">
                        已填物资 <span className="text-neon-pink font-mono">{zd.suppliesCount}</span>
                      </span>
                      <span className="text-white/10">|</span>
                      <span className="text-white/30">
                        未分配 <span className="text-white/50 font-mono">{zd.unassignedCount}</span>
                      </span>
                    </div>
                    {expandedZones.has(zd.zone.id) ? (
                      <ChevronUp size={16} className="text-white/30" />
                    ) : (
                      <ChevronDown size={16} className="text-white/30" />
                    )}
                  </div>
                </button>

                {expandedZones.has(zd.zone.id) && (
                  <div className="border-t border-white/[0.06]">
                    {zd.seats.length === 0 ? (
                      <div className="py-6 text-center text-xs text-white/20">本区域无符合条件的数据</div>
                    ) : (
                      <div className="divide-y divide-white/[0.04]">
                        {zd.seats.map((seat) => (
                          <div
                            key={seat.id}
                            className={`px-4 py-2.5 flex items-center gap-4 hover:bg-white/[0.01] transition-colors ${
                              isEditing(seat) ? 'bg-white/[0.02]' : ''
                            }`}
                          >
                            <div className="w-14 shrink-0">
                              <div className="flex items-center gap-1 text-xs text-white/30">
                                <MapPin size={10} />
                                <span className="font-mono">{seat.seatNumber}</span>
                              </div>
                            </div>
                            <div className="w-24 shrink-0 truncate">
                              {seat.memberName ? (
                                <div className="flex items-center gap-1.5 text-sm text-white/80">
                                  <User size={10} className="text-white/20 shrink-0" />
                                  <span className="truncate">{seat.memberName}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-white/15 italic">未分配</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              {isEditing(seat) ? (
                                <div className="flex items-start gap-2">
                                  <textarea
                                    ref={inputRef}
                                    value={editing!.value}
                                    onChange={(e) => setEditing({ ...editing!, value: e.target.value })}
                                    onKeyDown={handleKeyDown}
                                    placeholder="输入物资..."
                                    rows={1}
                                    className="flex-1 bg-surface-light border border-neon-pink/30 rounded-lg px-2 py-1 text-sm text-white placeholder-white/20 focus:outline-none focus:border-neon-pink/50 resize-none transition-colors"
                                    style={{ minHeight: '32px' }}
                                  />
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={handleSaveEdit}
                                      className="p-1 rounded hover:bg-neon-green/20 text-neon-green transition-colors"
                                      title="保存"
                                    >
                                      <Check size={14} />
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/60 transition-colors"
                                      title="取消"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              ) : seat.memberName ? (
                                <div
                                  className="group flex items-center gap-1.5 cursor-pointer"
                                  onClick={() => handleStartEdit(seat)}
                                >
                                  <Package size={10} className="text-neon-pink/50 shrink-0" />
                                  {seat.supplies ? (
                                    <span className="text-sm text-white/60 truncate group-hover:text-white/80 transition-colors">
                                      {seat.supplies}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-white/15 italic group-hover:text-white/30 transition-colors">
                                      点击填写物资
                                    </span>
                                  )}
                                  <Edit2
                                    size={10}
                                    className="opacity-0 group-hover:opacity-100 text-white/20 shrink-0 ml-1 transition-opacity"
                                  />
                                </div>
                              ) : (
                                <span className="text-xs text-white/8 italic">—</span>
                              )}
                            </div>
                            {seat.cheeringColor && !isEditing(seat) && (
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: seat.cheeringColor }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass-panel p-3 text-center">
      <div className={`font-mono font-bold text-xl ${color}`}>{value}</div>
      <div className="text-xs text-white/30 mt-0.5">{label}</div>
    </div>
  )
}
