import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { ArrowLeft, ChevronRight, RotateCcw, Printer, Package } from 'lucide-react'
import { useVenueStore, type SearchOptions } from '@/store/venueStore'
import { SeatDetailPanel } from '@/components/SeatDetailPanel'
import { BatchActions } from '@/components/BatchActions'
import { ZoneStatsPanel } from '@/components/ZoneStatsPanel'
import { SeatSearch } from '@/components/SeatSearch'
import { UndoRedoButtons } from '@/components/UndoRedoButtons'

export default function ZonePlan() {
  const { zoneId } = useParams<{ zoneId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const zone = useVenueStore((s) => s.zones.find((z) => z.id === zoneId))
  const zones = useVenueStore((s) => s.zones)
  const clearZoneSeats = useVenueStore((s) => s.clearZoneSeats)
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [panelOpen, setPanelOpen] = useState(false)
  const [highlightedSeatIds, setHighlightedSeatIds] = useState<Set<string>>(new Set())
  const [globalSearchHighlightedIds, setGlobalSearchHighlightedIds] = useState<Set<string>>(new Set())
  const [isJumpedFromSupplies, setIsJumpedFromSupplies] = useState(false)
  const hasScrolledRef = useRef(false)

  const mergedHighlightedIds = useMemo(() => {
    if (highlightedSeatIds.size > 0) {
      return highlightedSeatIds
    }
    return globalSearchHighlightedIds
  }, [highlightedSeatIds, globalSearchHighlightedIds])

  const locationState = location.state as {
    from?: string
    filterMode?: string
    searchText?: string
    expandedZones?: string[]
    globalSearchQuery?: string
    globalSearchTicketStatus?: string
    globalSearchObstruction?: string
  } | null

  const selectedSeatIds = useMemo(() => Array.from(selectedIds), [selectedIds])

  const searchSeats = useVenueStore((s) => s.searchSeats)

  useEffect(() => {
    const seatIdFromUrl = searchParams.get('seatId')
    const fromGlobalSearch = locationState?.from === 'overview' && (
      locationState.globalSearchQuery ||
      locationState.globalSearchTicketStatus ||
      locationState.globalSearchObstruction
    )

    if (fromGlobalSearch && zoneId) {
      const options: SearchOptions = {}
      if (locationState.globalSearchQuery) {
        options.memberName = locationState.globalSearchQuery
        options.seatNumber = locationState.globalSearchQuery
        options.supplies = locationState.globalSearchQuery
        options.obstructionNote = locationState.globalSearchQuery
      }
      if (locationState.globalSearchTicketStatus) {
        options.ticketStatus = locationState.globalSearchTicketStatus as SearchOptions['ticketStatus']
      }
      if (locationState.globalSearchObstruction === 'obstructed') {
        options.isObstructed = true
      } else if (locationState.globalSearchObstruction === 'clear') {
        options.isObstructed = false
      }

      const results = searchSeats(zoneId, options)
      const allHighlightedIds = new Set(results.map((r) => r.seat.id))
      setGlobalSearchHighlightedIds(allHighlightedIds)
    }

    if (seatIdFromUrl && zoneId) {
      const zoneSeats = useVenueStore.getState().seats[zoneId] || []
      const seatExists = zoneSeats.some((s) => s.id === seatIdFromUrl)
      if (seatExists) {
        setSelectedSeatId(seatIdFromUrl)
        setPanelOpen(true)
        if (!fromGlobalSearch) {
          setHighlightedSeatIds(new Set([seatIdFromUrl]))
        }
        if (locationState?.from === 'supplies') {
          setIsJumpedFromSupplies(true)
        }
        setTimeout(() => {
          const seatElement = document.querySelector(`[data-seat-id="${seatIdFromUrl}"]`)
          if (seatElement && !hasScrolledRef.current) {
            seatElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
            hasScrolledRef.current = true
          }
        }, 100)
      }
    }
  }, [searchParams, zoneId, locationState, searchSeats])

  const handleBack = () => {
    if (locationState?.from === 'supplies') {
      navigate('/supplies', {
        state: {
          filterMode: locationState.filterMode,
          searchText: locationState.searchText,
          expandedZones: locationState.expandedZones,
        },
      })
    } else {
      navigate('/')
    }
  }

  const clearSeatParam = () => {
    if (searchParams.has('seatId')) {
      setSearchParams({})
    }
  }

  if (!zone || !zoneId) {
    return (
      <div className="min-h-screen bg-base bg-grid-pattern flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/30 mb-3">区域不存在</p>
          <button onClick={() => navigate('/')} className="text-neon-pink text-sm hover:underline">
            返回总览
          </button>
        </div>
      </div>
    )
  }

  const handleSelectSeat = (seatId: string | null) => {
    setSelectedSeatId(seatId)
    if (seatId) {
      setPanelOpen(true)
      setSearchParams({ seatId })
    } else {
      clearSeatParam()
    }
  }

  const handleBatchSelect = (ids: Set<string>) => {
    setSelectedIds(ids)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleClearZone = () => {
    if (confirm(`确认清空「${zone.name}」所有座位信息？`)) {
      clearZoneSeats(zoneId)
    }
  }

  const handleSearchResultClick = (seatId: string) => {
    setSelectedSeatId(seatId)
    setPanelOpen(true)
  }

  return (
    <div className="min-h-screen bg-base bg-grid-pattern flex flex-col">
      <header className="glass-panel border-0 border-b border-white/[0.06] rounded-none px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-white/40 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} /> {locationState?.from === 'supplies' ? '物资清单' : '总览'}
        </button>
        <ChevronRight size={14} className="text-white/15" />
        {locationState?.from === 'supplies' && (
          <>
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-neon-cyan/60 hover:text-neon-cyan transition-colors text-xs"
            >
              <Package size={12} /> 物资清单
            </button>
            <ChevronRight size={14} className="text-white/15" />
          </>
        )}

        <div className="flex items-center gap-2 overflow-x-auto flex-1">
          {zones.map((z) => (
            <button
              key={z.id}
              onClick={() => navigate(`/zone/${z.id}`)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs transition-all ${
                z.id === zoneId
                  ? 'text-white font-medium'
                  : 'text-white/30 hover:text-white/60'
              }`}
              style={
                z.id === zoneId
                  ? { backgroundColor: z.color + '20', border: `1px solid ${z.color}40`, color: z.color }
                  : { border: '1px solid transparent' }
              }
            >
              {z.name}
            </button>
          ))}
        </div>

        <UndoRedoButtons />

        <button
          onClick={() => navigate(`/print/${zoneId}`)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white/40 hover:text-white text-xs transition-all"
        >
          <Printer size={12} /> 打印
        </button>

        <button
          onClick={handleClearZone}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white/20 hover:text-red-400 text-xs transition-all"
        >
          <RotateCcw size={12} /> 重置区域
        </button>
      </header>

      <div className="flex-1 flex">
        <div className="flex-1 overflow-auto p-4">
          <SeatSearch
            zoneId={zoneId}
            onResultClick={handleSearchResultClick}
            highlightedSeatIds={highlightedSeatIds}
            onHighlightChange={setHighlightedSeatIds}
          />

          <div className="mt-4">
            <BatchActions
              zoneId={zoneId}
              selectedSeatIds={selectedSeatIds}
              onClearSelection={clearSelection}
            />
          </div>

          <div className="mt-4 overflow-x-auto pb-4">
            <SeatGridWrapper
              zoneId={zoneId}
              selectedSeatId={selectedSeatId}
              onSelectSeat={handleSelectSeat}
              onBatchSelect={handleBatchSelect}
              selectedIds={selectedIds}
              highlightedIds={mergedHighlightedIds}
              isJumpedFromSupplies={isJumpedFromSupplies}
            />
          </div>

          <div className="mt-4 lg:hidden">
            <ZoneStatsPanel zoneId={zoneId} />
          </div>
        </div>

        <div className="hidden lg:flex flex-col w-72 border-l border-white/[0.06]">
          <div className="flex-1 overflow-y-auto">
            {panelOpen && selectedSeatId ? (
              <SeatDetailPanel
                zoneId={zoneId}
                seatId={selectedSeatId}
                onClose={() => { setPanelOpen(false); setSelectedSeatId(null); clearSeatParam() }}
              />
            ) : (
              <ZoneStatsPanel zoneId={zoneId} />
            )}
          </div>
        </div>
      </div>

      {panelOpen && selectedSeatId && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 max-h-[60vh] overflow-y-auto glass-panel border-0 border-t border-white/[0.06] rounded-t-2xl">
          <SeatDetailPanel
            zoneId={zoneId}
            seatId={selectedSeatId}
            onClose={() => { setPanelOpen(false); setSelectedSeatId(null); clearSeatParam() }}
          />
        </div>
      )}
    </div>
  )
}

function SeatGridWrapper({
  zoneId,
  selectedSeatId,
  onSelectSeat,
  onBatchSelect,
  selectedIds,
  highlightedIds,
  isJumpedFromSupplies,
}: {
  zoneId: string
  selectedSeatId: string | null
  onSelectSeat: (seatId: string | null) => void
  onBatchSelect: (ids: Set<string>) => void
  selectedIds: Set<string>
  highlightedIds: Set<string>
  isJumpedFromSupplies: boolean
}) {
  const zone = useVenueStore((s) => s.zones.find((z) => z.id === zoneId))
  const seats = useVenueStore((s) => s.seats[zoneId] || [])
  const [isDragging, setIsDragging] = useState(false)
  const [dragAction, setDragAction] = useState<'select' | 'deselect'>('select')
  const [localSelected, setLocalSelected] = useState<Set<string>>(selectedIds)

  if (!zone) return null

  const handleMouseDown = (seatId: string, e: React.MouseEvent) => {
    e.preventDefault()
    const newSelected = new Set(localSelected)
    if (newSelected.has(seatId)) {
      newSelected.delete(seatId)
      setDragAction('deselect')
    } else {
      newSelected.add(seatId)
      setDragAction('select')
    }
    setLocalSelected(newSelected)
    onBatchSelect(newSelected)
    setIsDragging(true)
    onSelectSeat(seatId)
  }

  const handleMouseEnter = (seatId: string) => {
    if (!isDragging) return
    const newSelected = new Set(localSelected)
    if (dragAction === 'select') {
      newSelected.add(seatId)
    } else {
      newSelected.delete(seatId)
    }
    setLocalSelected(newSelected)
    onBatchSelect(newSelected)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const rowLabels = Array.from({ length: zone.rows }, (_, i) => String.fromCharCode(65 + (i % 26)))

  return (
    <div className="select-none" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      {localSelected.size > 0 && (
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs text-white/40">已选择 <span className="font-mono text-neon-pink">{localSelected.size}</span> 个座位</span>
          <button
            onClick={() => { setLocalSelected(new Set()); onBatchSelect(new Set()) }}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            取消选择
          </button>
        </div>
      )}

      <div className="inline-block">
        <div className="flex mb-1 pl-8">
          {Array.from({ length: zone.cols }, (_, i) => (
            <div key={i} className="w-9 text-center text-[10px] font-mono text-white/20">
              {i + 1}
            </div>
          ))}
        </div>

        {Array.from({ length: zone.rows }, (_, row) => (
          <div key={row} className="flex items-center mb-1">
            <div className="w-7 text-right pr-1 text-[10px] font-mono text-white/25">
              {rowLabels[row]}
            </div>
            {Array.from({ length: zone.cols }, (_, col) => {
              const seat = seats.find((s) => s.row === row && s.col === col)
              if (!seat) return <div key={col} className="seat-cell seat-empty" />

              const isBatchSelected = localSelected.has(seat.id)
              const isCurrentlySelected = seat.id === selectedSeatId
              const isHighlighted = highlightedIds.has(seat.id)
              const hasMember = !!seat.memberName
              const hasColor = !!seat.cheeringColor

              let bgStyle: React.CSSProperties = {}
              let cellClass = 'seat-cell relative '

              if (hasColor) {
                bgStyle = {
                  backgroundColor: seat.cheeringColor + (isHighlighted && !isBatchSelected && !isCurrentlySelected ? '45' : '30'),
                  borderColor: seat.cheeringColor + (isHighlighted ? '90' : '60'),
                  boxShadow: isBatchSelected || isCurrentlySelected ? `0 0 12px ${seat.cheeringColor}50` : isHighlighted ? `0 0 10px ${seat.cheeringColor}40` : `0 0 4px ${seat.cheeringColor}20`,
                }
                cellClass += 'seat-occupied '
              } else if (hasMember) {
                if (isHighlighted) {
                  bgStyle = {
                    backgroundColor: 'rgba(255, 46, 151, 0.25)',
                    borderColor: 'rgba(255, 46, 151, 0.6)',
                    boxShadow: '0 0 10px rgba(255, 46, 151, 0.3)',
                  }
                }
                cellClass += 'seat-occupied bg-surface-lighter border-white/20 '
              } else {
                if (isHighlighted) {
                  bgStyle = {
                    backgroundColor: 'rgba(255, 46, 151, 0.15)',
                    borderColor: 'rgba(255, 46, 151, 0.5)',
                    boxShadow: '0 0 8px rgba(255, 46, 151, 0.25)',
                  }
                }
                cellClass += 'seat-empty '
              }

              if (seat.isObstructed) cellClass += 'seat-obstructed '
              if (isBatchSelected || isCurrentlySelected) {
                cellClass += 'seat-selected '
                if (isJumpedFromSupplies && isCurrentlySelected) {
                  cellClass += 'seat-jump-highlight '
                }
              }
              if (isHighlighted && !isBatchSelected && !isCurrentlySelected) cellClass += 'animate-pulse-soft '

              return (
                <div
                  key={col}
                  data-seat-id={seat.id}
                  className={cellClass}
                  style={bgStyle}
                  onMouseDown={(e) => handleMouseDown(seat.id, e)}
                  onMouseEnter={() => handleMouseEnter(seat.id)}
                  title={seat.memberName ? `${seat.memberName} (${seat.seatNumber})` : seat.seatNumber}
                >
                  {seat.isObstructed && !hasMember && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400/60" />
                  )}
                  {hasMember ? (
                    <span className="text-xs font-bold" style={{ color: hasColor ? seat.cheeringColor : '#fff' }}>
                      {seat.memberName.charAt(0)}
                    </span>
                  ) : (
                    <span className="text-[9px] text-white/15">{col + 1}</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-4 mt-4 px-1 text-[11px] text-white/30">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-dashed border-white/15" />
          <span>空座</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-neon-pink/30 border border-neon-pink/60" />
          <span>已分配</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded relative border border-white/15">
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-400/60" />
          </div>
          <span>视线遮挡</span>
        </div>
      </div>
    </div>
  )
}
