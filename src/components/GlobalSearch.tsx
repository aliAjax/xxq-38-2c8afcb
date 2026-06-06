import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Package, Ticket, Eye, ChevronDown, ChevronRight } from 'lucide-react'
import { useVenueStore, type GlobalSearchGroup, type SearchOptions } from '@/store/venueStore'
import type { TicketStatus } from '@/types'

const TICKET_OPTIONS: { value: TicketStatus | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'none', label: '未处理' },
  { value: 'confirmed', label: '已确认' },
  { value: 'pending', label: '待处理' },
  { value: 'exchanged', label: '已换票' },
]

const OBSTRUCTION_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'obstructed', label: '有遮挡' },
  { value: 'clear', label: '无遮挡' },
]

export function GlobalSearch() {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const [ticketStatus, setTicketStatus] = useState<TicketStatus | ''>('')
  const [obstructionFilter, setObstructionFilter] = useState<string>('')
  const [searchGroups, setSearchGroups] = useState<GlobalSearchGroup[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set())
  const hasAutoExpandedRef = useRef(false)

  const searchAllSeats = useVenueStore((s) => s.searchAllSeats)

  const handleClear = useCallback(() => {
    setQuery('')
    setTicketStatus('')
    setObstructionFilter('')
    setSearchGroups([])
    setHasSearched(false)
    hasAutoExpandedRef.current = false
  }, [])

  useEffect(() => {
    const hasAnyFilter = query || ticketStatus || obstructionFilter
    if (hasAnyFilter) {
      const options: SearchOptions = {}
      if (query.trim()) {
        options.memberName = query
        options.seatNumber = query
        options.supplies = query
        options.obstructionNote = query
      }
      if (ticketStatus) {
        options.ticketStatus = ticketStatus
      }
      if (obstructionFilter === 'obstructed') {
        options.isObstructed = true
      } else if (obstructionFilter === 'clear') {
        options.isObstructed = false
      }

      const results = searchAllSeats(options)
      setSearchGroups(results)
      setHasSearched(true)

      if (results.length > 0 && !hasAutoExpandedRef.current) {
        setExpandedZones(new Set(results.map((g) => g.zoneId)))
        hasAutoExpandedRef.current = true
      }
    } else {
      setSearchGroups([])
      setHasSearched(false)
    }
  }, [query, ticketStatus, obstructionFilter, searchAllSeats])

  const toggleZone = (zoneId: string) => {
    const next = new Set(expandedZones)
    if (next.has(zoneId)) {
      next.delete(zoneId)
    } else {
      next.add(zoneId)
    }
    setExpandedZones(next)
  }

  const handleResultClick = (zoneId: string, seatId: string) => {
    navigate(`/zone/${zoneId}?seatId=${seatId}`, {
      state: {
        from: 'overview',
        globalSearchQuery: query,
        globalSearchTicketStatus: ticketStatus,
        globalSearchObstruction: obstructionFilter,
      },
    })
  }

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'memberName': return '姓名'
      case 'seatNumber': return '座号'
      case 'supplies': return '物资'
      case 'ticketStatus': return '换票'
      case 'obstructionNote': return '遮挡备注'
      case 'isObstructed': return '遮挡状态'
      default: return field
    }
  }

  const getTicketColor = (status: TicketStatus) => {
    switch (status) {
      case 'confirmed': return 'text-green-400'
      case 'pending': return 'text-yellow-400'
      case 'exchanged': return 'text-blue-400'
      default: return 'text-white/30'
    }
  }

  const getTicketLabel = (status: TicketStatus) => {
    switch (status) {
      case 'confirmed': return '已确认'
      case 'pending': return '待处理'
      case 'exchanged': return '已换票'
      default: return '未处理'
    }
  }

  const totalResults = searchGroups.reduce((sum, g) => sum + g.results.length, 0)
  const hasActiveFilters = query || ticketStatus || obstructionFilter

  return (
    <div className="glass-panel rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Search size={16} className="text-neon-cyan" />
          <span className="text-sm font-medium text-white">全局搜索</span>
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-neon-cyan/20 text-neon-cyan">
              已筛选
            </span>
          )}
          {hasSearched && totalResults > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-white/10 text-white/60">
              {totalResults} 个结果
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-white/[0.06]">
          <div className="pt-3">
            <div className="flex items-center gap-1.5 text-white/40 text-xs mb-1.5">
              <Search size={12} />
              <span>关键词搜索</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索成员、座号、物资、遮挡备注..."
                className="w-full bg-surface-light border border-white/10 rounded-lg pl-3 pr-8 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-neon-cyan/50 transition-colors"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-white/40 text-xs mb-1.5">
                <Ticket size={12} />
                <span>换票状态</span>
              </div>
              <select
                value={ticketStatus}
                onChange={(e) => setTicketStatus(e.target.value as TicketStatus | '')}
                className="w-full bg-surface-light border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-neon-cyan/50 transition-colors appearance-none cursor-pointer"
              >
                {TICKET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-surface-light">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-white/40 text-xs mb-1.5">
                <Eye size={12} />
                <span>视线遮挡</span>
              </div>
              <select
                value={obstructionFilter}
                onChange={(e) => setObstructionFilter(e.target.value)}
                className="w-full bg-surface-light border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-neon-cyan/50 transition-colors appearance-none cursor-pointer"
              >
                {OBSTRUCTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-surface-light">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClear}
              className="mt-3 flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={12} /> 清除所有筛选
            </button>
          )}

          {hasSearched && (
            <div className="mt-4">
              {searchGroups.length === 0 ? (
                <div className="py-8 text-center">
                  <Search size={32} className="mx-auto text-white/10 mb-2" />
                  <p className="text-sm text-white/30">没有找到匹配的座位</p>
                  <p className="text-xs text-white/20 mt-1">试试调整搜索条件</p>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                  {searchGroups.map((group) => (
                    <div key={group.zoneId} className="space-y-2">
                      <button
                        onClick={() => toggleZone(group.zoneId)}
                        className="w-full flex items-center gap-1.5 py-1 hover:bg-white/[0.02] rounded transition-colors"
                      >
                        <ChevronRight
                          size={12}
                          className={`text-white/40 transition-transform ${expandedZones.has(group.zoneId) ? 'rotate-90' : ''}`}
                        />
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: group.zoneColor }}
                        />
                        <span className="text-xs font-medium text-white/80">{group.zoneName}</span>
                        <span className="text-[10px] text-white/30 ml-auto">
                          {group.results.length} 个结果
                        </span>
                      </button>

                      {expandedZones.has(group.zoneId) && (
                        <div className="ml-3.5 space-y-1.5 border-l border-white/[0.06] pl-3">
                          {group.results.map((result) => (
                            <button
                              key={result.seat.id}
                              onClick={() => handleResultClick(group.zoneId, result.seat.id)}
                              className="w-full p-2.5 rounded-lg text-left transition-all bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-white">
                                      {result.seat.memberName || '未分配'}
                                    </span>
                                    <span className="text-[10px] font-mono text-white/30">
                                      {result.seat.seatNumber}
                                    </span>
                                  </div>
                                  {result.seat.supplies && (
                                    <p className="text-xs text-white/40 mt-0.5 truncate max-w-[180px]">
                                      <Package size={10} className="inline mr-1 -mt-0.5 opacity-50" />
                                      {result.seat.supplies}
                                    </p>
                                  )}
                                  {result.seat.obstructionNote && result.seat.isObstructed && (
                                    <p className="text-xs text-yellow-400/60 mt-0.5 truncate max-w-[180px]">
                                      <Eye size={10} className="inline mr-1 -mt-0.5 opacity-60" />
                                      {result.seat.obstructionNote}
                                    </p>
                                  )}
                                </div>
                                <span className={`text-[10px] ${getTicketColor(result.seat.ticketStatus)}`}>
                                  {getTicketLabel(result.seat.ticketStatus)}
                                </span>
                              </div>
                              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                {result.matchedFields.map((field) => (
                                  <span
                                    key={field}
                                    className="px-1.5 py-0.5 text-[10px] rounded bg-white/[0.06] text-white/40"
                                  >
                                    {getFieldLabel(field)}
                                  </span>
                                ))}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
