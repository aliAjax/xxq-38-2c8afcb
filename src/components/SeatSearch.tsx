import { useState, useEffect } from 'react'
import { Search, X, User, MapPin, Package, Ticket, ChevronDown } from 'lucide-react'
import { useVenueStore, type SeatSearchResult, type SearchOptions } from '@/store/venueStore'
import type { TicketStatus } from '@/types'

const TICKET_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'none', label: '全部' },
  { value: 'confirmed', label: '已确认' },
  { value: 'pending', label: '待处理' },
  { value: 'exchanged', label: '已换票' },
]

interface SeatSearchProps {
  zoneId: string
  onResultClick: (seatId: string) => void
  highlightedSeatIds: Set<string>
  onHighlightChange: (seatIds: Set<string>) => void
}

export function SeatSearch({ zoneId, onResultClick, highlightedSeatIds, onHighlightChange }: SeatSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [memberName, setMemberName] = useState('')
  const [seatNumber, setSeatNumber] = useState('')
  const [supplies, setSupplies] = useState('')
  const [ticketStatus, setTicketStatus] = useState<TicketStatus | undefined>(undefined)
  const [searchResults, setSearchResults] = useState<SeatSearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const searchSeats = useVenueStore((s) => s.searchSeats)

  const handleSearch = () => {
    const options: SearchOptions = {
      memberName: memberName || undefined,
      seatNumber: seatNumber || undefined,
      supplies: supplies || undefined,
      ticketStatus,
    }
    const results = searchSeats(zoneId, options)
    setSearchResults(results)
    setHasSearched(true)

    const highlightedIds = new Set(results.map((r) => r.seat.id))
    onHighlightChange(highlightedIds)
  }

  const handleClear = () => {
    setMemberName('')
    setSeatNumber('')
    setSupplies('')
    setTicketStatus(undefined)
    setSearchResults([])
    setHasSearched(false)
    onHighlightChange(new Set())
  }

  useEffect(() => {
    const hasAnyFilter = memberName || seatNumber || supplies || ticketStatus
    if (hasAnyFilter) {
      handleSearch()
    } else {
      setSearchResults([])
      setHasSearched(false)
      onHighlightChange(new Set())
    }
  }, [memberName, seatNumber, supplies, ticketStatus, zoneId])

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'memberName': return '姓名'
      case 'seatNumber': return '座号'
      case 'supplies': return '物资'
      case 'ticketStatus': return '换票'
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

  const hasActiveFilters = memberName || seatNumber || supplies || ticketStatus

  return (
    <div className="glass-panel rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Search size={16} className="text-neon-pink" />
          <span className="text-sm font-medium text-white">座位搜索</span>
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-neon-pink/20 text-neon-pink">
              已筛选
            </span>
          )}
          {hasSearched && searchResults.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-white/10 text-white/60">
              {searchResults.length} 个结果
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
          <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-white/40 text-xs mb-1.5">
                <User size={12} />
                <span>成员姓名</span>
              </div>
              <input
                type="text"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="搜索成员姓名"
                className="w-full bg-surface-light border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-neon-pink/50 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-white/40 text-xs mb-1.5">
                <MapPin size={12} />
                <span>座位号</span>
              </div>
              <input
                type="text"
                value={seatNumber}
                onChange={(e) => setSeatNumber(e.target.value)}
                placeholder="如: 3-5"
                className="w-full bg-surface-light border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-neon-pink/50 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-white/40 text-xs mb-1.5">
                <Package size={12} />
                <span>物资关键词</span>
              </div>
              <input
                type="text"
                value={supplies}
                onChange={(e) => setSupplies(e.target.value)}
                placeholder="如: 荧光棒"
                className="w-full bg-surface-light border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-neon-pink/50 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-white/40 text-xs mb-1.5">
                <Ticket size={12} />
                <span>换票状态</span>
              </div>
              <select
                value={ticketStatus || ''}
                onChange={(e) => setTicketStatus((e.target.value as TicketStatus) || undefined)}
                className="w-full bg-surface-light border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-neon-pink/50 transition-colors appearance-none cursor-pointer"
                style={{ backgroundImage: 'none' }}
              >
                {TICKET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value === 'none' ? '' : opt.value} className="bg-surface-light">
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
              {searchResults.length === 0 ? (
                <div className="py-8 text-center">
                  <Search size={32} className="mx-auto text-white/10 mb-2" />
                  <p className="text-sm text-white/30">没有找到匹配的座位</p>
                  <p className="text-xs text-white/20 mt-1">试试调整搜索条件</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {searchResults.map((result) => (
                    <button
                      key={result.seat.id}
                      onClick={() => onResultClick(result.seat.id)}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        highlightedSeatIds.has(result.seat.id)
                          ? 'bg-neon-pink/10 border border-neon-pink/30'
                          : 'bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]'
                      }`}
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
                            <p className="text-xs text-white/40 mt-0.5 truncate max-w-[200px]">
                              {result.seat.supplies}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] ${getTicketColor(result.seat.ticketStatus)}`}>
                          {getTicketLabel(result.seat.ticketStatus)}
                        </span>
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
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
          )}
        </div>
      )}
    </div>
  )
}
