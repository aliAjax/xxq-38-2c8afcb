import { X, User, Palette, Package, Ticket, Eye } from 'lucide-react'
import { useVenueStore } from '@/store/venueStore'
import type { TicketStatus } from '@/types'

const PRESET_COLORS = [
  '#FF2E97', '#00F5FF', '#FFE600', '#39FF14',
  '#FF6B35', '#BF5AF2', '#5AC8FA', '#FF3B30',
  '#FF69B4', '#7B68EE', '#00CED1', '#FFD700',
  '#E040FB', '#00E676', '#FF9100', '#448AFF',
]

const TICKET_OPTIONS: { value: TicketStatus; label: string; color: string }[] = [
  { value: 'none', label: '未处理', color: '#666' },
  { value: 'confirmed', label: '已确认', color: '#39FF14' },
  { value: 'pending', label: '待处理', color: '#FFE600' },
  { value: 'exchanged', label: '已换票', color: '#5AC8FA' },
]

interface SeatDetailPanelProps {
  zoneId: string
  seatId: string | null
  onClose: () => void
}

export function SeatDetailPanel({ zoneId, seatId, onClose }: SeatDetailPanelProps) {
  const seat = useVenueStore((s) => {
    if (!seatId) return null
    return s.seats[zoneId]?.find((se) => se.id === seatId) || null
  })
  const updateSeat = useVenueStore((s) => s.updateSeat)

  if (!seat) {
    return (
      <div className="glass-panel p-5 h-full flex items-center justify-center">
        <p className="text-white/20 text-sm">点击座位查看详情</p>
      </div>
    )
  }

  const handleUpdate = (updates: Record<string, unknown>) => {
    updateSeat(zoneId, seat.id, updates)
  }

  return (
    <div className="glass-panel p-5 h-full overflow-y-auto animate-slide-in-right">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-white text-sm">座位详情</h3>
          <span className="text-xs font-mono text-white/30">第 {seat.seatNumber} 座</span>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-1">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <FieldGroup icon={<User size={14} />} label="成员姓名">
          <input
            value={seat.memberName}
            onChange={(e) => handleUpdate({ memberName: e.target.value })}
            placeholder="输入成员名称"
            className="w-full bg-surface-light border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-neon-pink/50 transition-colors"
          />
        </FieldGroup>

        <FieldGroup icon={<Palette size={14} />} label="应援色">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handleUpdate({ cheeringColor: seat.cheeringColor === c ? '' : c })}
                className="w-6 h-6 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c,
                  borderColor: seat.cheeringColor === c ? '#fff' : 'transparent',
                  boxShadow: seat.cheeringColor === c ? `0 0 8px ${c}60` : 'none',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={seat.cheeringColor || '#FF2E97'}
              onChange={(e) => handleUpdate({ cheeringColor: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
            />
            <span className="text-xs font-mono text-white/30">{seat.cheeringColor || '未选择'}</span>
            {seat.cheeringColor && (
              <button
                onClick={() => handleUpdate({ cheeringColor: '' })}
                className="text-xs text-white/20 hover:text-white/50 transition-colors ml-auto"
              >
                清除
              </button>
            )}
          </div>
        </FieldGroup>

        <FieldGroup icon={<Package size={14} />} label="携带物资">
          <textarea
            value={seat.supplies}
            onChange={(e) => handleUpdate({ supplies: e.target.value })}
            placeholder="例如：荧光棒×2、手幅、应援毛巾"
            rows={2}
            className="w-full bg-surface-light border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-neon-pink/50 transition-colors resize-none"
          />
        </FieldGroup>

        <FieldGroup icon={<Ticket size={14} />} label="换票状态">
          <div className="flex gap-1.5 flex-wrap">
            {TICKET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleUpdate({ ticketStatus: opt.value })}
                className="px-2.5 py-1 rounded-md text-xs transition-all"
                style={{
                  backgroundColor: seat.ticketStatus === opt.value ? opt.color + '20' : 'transparent',
                  border: `1px solid ${seat.ticketStatus === opt.value ? opt.color + '60' : 'rgba(255,255,255,0.06)'}`,
                  color: seat.ticketStatus === opt.value ? opt.color : 'rgba(255,255,255,0.3)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup icon={<Eye size={14} />} label="视线遮挡">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => handleUpdate({ isObstructed: !seat.isObstructed })}
              className={`relative w-10 h-5 rounded-full transition-colors ${seat.isObstructed ? 'bg-yellow-400/40' : 'bg-surface-lighter'}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${seat.isObstructed ? 'left-5 bg-yellow-400' : 'left-0.5 bg-white/30'}`}
              />
            </button>
            <span className={`text-xs ${seat.isObstructed ? 'text-yellow-400' : 'text-white/30'}`}>
              {seat.isObstructed ? '有遮挡' : '无遮挡'}
            </span>
          </div>
          {seat.isObstructed && (
            <input
              value={seat.obstructionNote}
              onChange={(e) => handleUpdate({ obstructionNote: e.target.value })}
              placeholder="遮挡原因（如：柱子、音响）"
              className="w-full bg-surface-light border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-yellow-400/50 transition-colors"
            />
          )}
        </FieldGroup>
      </div>

      <div className="mt-6 pt-4 border-t border-white/[0.06]">
        <button
          onClick={() => {
            updateSeat(zoneId, seat.id, {
              memberName: '',
              cheeringColor: '',
              isObstructed: false,
              obstructionNote: '',
              ticketStatus: 'none',
              supplies: '',
            })
            onClose()
          }}
          className="w-full py-2 rounded-lg text-sm text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          清空此座位信息
        </button>
      </div>
    </div>
  )
}

function FieldGroup({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-white/40 text-xs mb-1.5">
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </div>
  )
}
