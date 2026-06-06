import { useState } from 'react'
import { Paintbrush, Ticket, Trash2, X, Eye } from 'lucide-react'
import { useVenueStore } from '@/store/venueStore'
import type { TicketStatus } from '@/types'

const QUICK_COLORS = [
  '#FF2E97', '#00F5FF', '#FFE600', '#39FF14',
  '#FF6B35', '#BF5AF2', '#5AC8FA', '#FF3B30',
]

interface BatchActionsProps {
  zoneId: string
  selectedSeatIds: string[]
  onClearSelection: () => void
}

export function BatchActions({ zoneId, selectedSeatIds, onClearSelection }: BatchActionsProps) {
  const batchUpdateSeats = useVenueStore((s) => s.batchUpdateSeats)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [ticketPickerOpen, setTicketPickerOpen] = useState(false)
  const [obstructionPickerOpen, setObstructionPickerOpen] = useState(false)
  const [obstructionNote, setObstructionNote] = useState('')

  if (selectedSeatIds.length === 0) return null

  const handleBatchColor = (color: string) => {
    batchUpdateSeats(zoneId, selectedSeatIds, { cheeringColor: color })
    setColorPickerOpen(false)
    onClearSelection()
  }

  const handleBatchTicket = (status: TicketStatus) => {
    batchUpdateSeats(zoneId, selectedSeatIds, { ticketStatus: status })
    setTicketPickerOpen(false)
    onClearSelection()
  }

  const handleBatchClear = () => {
    batchUpdateSeats(zoneId, selectedSeatIds, {
      memberName: '',
      cheeringColor: '',
      isObstructed: false,
      obstructionNote: '',
      ticketStatus: 'none',
      supplies: '',
    })
    onClearSelection()
  }

  const handleBatchObstruction = (isObstructed: boolean) => {
    batchUpdateSeats(zoneId, selectedSeatIds, {
      isObstructed,
      obstructionNote: isObstructed ? obstructionNote.trim() : '',
    })
    setObstructionPickerOpen(false)
    setObstructionNote('')
    onClearSelection()
  }

  return (
    <div className="glass-panel p-3 flex items-center gap-2 animate-fade-in">
      <span className="text-xs text-white/40 mr-2">
        批量操作 <span className="font-mono text-neon-pink">{selectedSeatIds.length}</span> 座
      </span>

      <div className="relative">
        <button
          onClick={() => { setColorPickerOpen(!colorPickerOpen); setTicketPickerOpen(false) }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-light border border-white/[0.06] text-white/50 hover:text-white text-xs transition-all"
        >
          <Paintbrush size={12} /> 上色
        </button>
        {colorPickerOpen && (
          <div className="absolute bottom-full left-0 mb-2 glass-panel p-2 flex gap-1.5 z-20">
            {QUICK_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handleBatchColor(c)}
                className="w-6 h-6 rounded-full hover:scale-110 transition-transform"
                style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}40` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => { setTicketPickerOpen(!ticketPickerOpen); setColorPickerOpen(false); setObstructionPickerOpen(false) }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-light border border-white/[0.06] text-white/50 hover:text-white text-xs transition-all"
        >
          <Ticket size={12} /> 换票状态
        </button>
        {ticketPickerOpen && (
          <div className="absolute bottom-full left-0 mb-2 glass-panel p-2 flex gap-1.5 z-20">
            {([
              { value: 'confirmed' as TicketStatus, label: '已确认', color: '#39FF14' },
              { value: 'pending' as TicketStatus, label: '待处理', color: '#FFE600' },
              { value: 'exchanged' as TicketStatus, label: '已换票', color: '#5AC8FA' },
              { value: 'none' as TicketStatus, label: '未处理', color: '#666' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleBatchTicket(opt.value)}
                className="px-2 py-1 rounded text-xs transition-all whitespace-nowrap"
                style={{ backgroundColor: opt.color + '20', color: opt.color, border: `1px solid ${opt.color}40` }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => { setObstructionPickerOpen(!obstructionPickerOpen); setColorPickerOpen(false); setTicketPickerOpen(false) }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-light border border-white/[0.06] text-white/50 hover:text-white text-xs transition-all"
        >
          <Eye size={12} /> 视线遮挡
        </button>
        {obstructionPickerOpen && (
          <div className="absolute bottom-full left-0 mb-2 glass-panel p-3 z-20 w-56">
            <div className="mb-2">
              <div className="text-xs text-white/30 mb-1.5">遮挡原因（可选）</div>
              <input
                value={obstructionNote}
                onChange={(e) => setObstructionNote(e.target.value)}
                placeholder="如：柱子、音响、大屏幕..."
                className="w-full bg-surface-light border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-yellow-400/50 transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleBatchObstruction(true)}
                className="flex-1 px-2 py-1.5 rounded text-xs transition-all"
                style={{ backgroundColor: '#FFE60020', color: '#FFE600', border: '1px solid #FFE60040' }}
              >
                设置遮挡
              </button>
              <button
                onClick={() => handleBatchObstruction(false)}
                className="flex-1 px-2 py-1.5 rounded text-xs transition-all bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white/60"
              >
                取消遮挡
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleBatchClear}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-light border border-white/[0.06] text-white/30 hover:text-red-400 text-xs transition-all"
      >
        <Trash2 size={12} /> 清空
      </button>

      <button
        onClick={onClearSelection}
        className="ml-auto p-1.5 text-white/20 hover:text-white/60 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}
