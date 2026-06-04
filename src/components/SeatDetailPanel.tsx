import { useState } from 'react'
import { X, User, Palette, Package, Ticket, Eye, MessageSquare, Clock, Trash2, Plus } from 'lucide-react'
import { useVenueStore } from '@/store/venueStore'
import type { TicketStatus, ActivityLogEntry, ActivityLogType } from '@/types'

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

const ACTIVITY_TYPE_CONFIG: Record<ActivityLogType, { label: string; color: string; icon: string }> = {
  assignMember: { label: '分配成员', color: '#FF2E97', icon: '👤' },
  changeTicketStatus: { label: '换票状态', color: '#5AC8FA', icon: '🎫' },
  toggleObstruction: { label: '遮挡标记', color: '#FFE600', icon: '👁️' },
  updateSupplies: { label: '物资更新', color: '#39FF14', icon: '📦' },
  updateCheeringColor: { label: '应援色', color: '#BF5AF2', icon: '🎨' },
  addNote: { label: '添加备注', color: '#00F5FF', icon: '📝' },
  clearSeat: { label: '清空座位', color: '#FF3B30', icon: '🗑️' },
}

const TICKET_STATUS_LABELS: Record<string, string> = {
  none: '未处理',
  confirmed: '已确认',
  pending: '待处理',
  exchanged: '已换票',
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface SeatDetailPanelProps {
  zoneId: string
  seatId: string | null
  onClose: () => void
}

export function SeatDetailPanel({ zoneId, seatId, onClose }: SeatDetailPanelProps) {
  const [noteText, setNoteText] = useState('')
  const seat = useVenueStore((s) => {
    if (!seatId) return null
    return s.seats[zoneId]?.find((se) => se.id === seatId) || null
  })
  const updateSeat = useVenueStore((s) => s.updateSeat)
  const addSeatNote = useVenueStore((s) => s.addSeatNote)
  const removeSeatNote = useVenueStore((s) => s.removeSeatNote)

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

  const handleAddNote = () => {
    if (!noteText.trim()) return
    addSeatNote(zoneId, seat.id, noteText.trim())
    setNoteText('')
  }

  const handleRemoveNote = (entryId: string) => {
    removeSeatNote(zoneId, seat.id, entryId)
  }

  const activityLog = [...(seat.activityLog || [])].sort((a, b) => b.timestamp - a.timestamp)

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

      <div className="mt-6 pt-4 border-t border-white/[0.06]">
        <FieldGroup icon={<MessageSquare size={14} />} label="协作备注">
          <div className="flex gap-2 mb-3">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAddNote()
                }
              }}
              placeholder="添加备注..."
              className="flex-1 bg-surface-light border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/50 transition-colors"
            />
            <button
              onClick={handleAddNote}
              disabled={!noteText.trim()}
              className="px-3 py-1.5 rounded-lg bg-cyan-400/20 text-cyan-400 hover:bg-cyan-400/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <Plus size={14} />
            </button>
          </div>
        </FieldGroup>

        <FieldGroup icon={<Clock size={14} />} label={`变更记录 (${activityLog.length})`}>
          {activityLog.length === 0 ? (
            <p className="text-xs text-white/20 text-center py-4">暂无变更记录</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {activityLog.map((entry) => (
                <ActivityTimelineItem
                  key={entry.id}
                  entry={entry}
                  onRemove={entry.type === 'addNote' ? () => handleRemoveNote(entry.id) : undefined}
                />
              ))}
            </div>
          )}
        </FieldGroup>
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

function formatValue(value: string | boolean | undefined, fieldName?: string): string {
  if (value === undefined || value === '') return '无'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (fieldName === 'ticketStatus') {
    return TICKET_STATUS_LABELS[value] || value
  }
  return value
}

function getActivityDescription(entry: ActivityLogEntry): React.ReactNode {
  switch (entry.type) {
    case 'assignMember':
      return (
        <div>
          <span className="text-xs">
            分配成员：
            {entry.oldValue && (
              <span className="line-through text-white/30">{formatValue(entry.oldValue, entry.fieldName)}</span>
            )}
            {entry.oldValue && entry.newValue && ' → '}
            {entry.newValue && (
              <span className="text-white">{formatValue(entry.newValue, entry.fieldName)}</span>
            )}
          </span>
          {entry.note && <div className="text-xs text-white/30 mt-0.5">{entry.note}</div>}
        </div>
      )
    case 'changeTicketStatus':
      return (
        <div>
          <span className="text-xs">
            换票状态：
            <span className="line-through text-white/30">{formatValue(entry.oldValue, entry.fieldName)}</span>
            {' → '}
            <span className="text-white">{formatValue(entry.newValue, entry.fieldName)}</span>
          </span>
          {entry.note && <div className="text-xs text-white/30 mt-0.5">{entry.note}</div>}
        </div>
      )
    case 'toggleObstruction':
      return (
        <div>
          <span className="text-xs">
            遮挡标记：
            <span className="line-through text-white/30">{formatValue(entry.oldValue, entry.fieldName)}</span>
            {' → '}
            <span className={entry.newValue ? 'text-yellow-400' : 'text-white'}>
              {formatValue(entry.newValue, entry.fieldName)}
            </span>
          </span>
          {entry.note && <div className="text-xs text-yellow-400/60 mt-0.5">原因：{entry.note}</div>}
        </div>
      )
    case 'updateCheeringColor':
      return (
        <div>
          <span className="text-xs">
            应援色：
            {entry.oldValue && (
              <span className="inline-flex items-center gap-1">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.oldValue as string }}
                />
                <span className="line-through text-white/30">{entry.oldValue}</span>
              </span>
            )}
            {entry.oldValue && entry.newValue && ' → '}
            {entry.newValue ? (
              <span className="inline-flex items-center gap-1">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.newValue as string }}
                />
                <span className="text-white">{entry.newValue}</span>
              </span>
            ) : (
              <span className="text-white/30">清除</span>
            )}
          </span>
          {entry.note && <div className="text-xs text-white/30 mt-0.5">{entry.note}</div>}
        </div>
      )
    case 'updateSupplies':
      return (
        <div>
          <span className="text-xs">
            物资更新：
            {entry.oldValue && (
              <span className="line-through text-white/30">{formatValue(entry.oldValue, entry.fieldName)}</span>
            )}
            {entry.oldValue && entry.newValue && ' → '}
            {entry.newValue && (
              <span className="text-white">{formatValue(entry.newValue, entry.fieldName)}</span>
            )}
          </span>
          {entry.note && <div className="text-xs text-white/30 mt-0.5">{entry.note}</div>}
        </div>
      )
    case 'addNote':
      return (
        <div>
          <span className="text-xs text-white">{entry.note}</span>
        </div>
      )
    case 'clearSeat':
      return (
        <div>
          <span className="text-xs text-red-400">{entry.note || '清空座位信息'}</span>
        </div>
      )
    default:
      return <span className="text-xs text-white/50">未知操作</span>
  }
}

function ActivityTimelineItem({ entry, onRemove }: { entry: ActivityLogEntry; onRemove?: () => void }) {
  const config = ACTIVITY_TYPE_CONFIG[entry.type]

  return (
    <div className="flex gap-2 group">
      <div className="flex flex-col items-center">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
          style={{ backgroundColor: config.color + '20', borderColor: config.color + '40' }}
        >
          {config.icon}
        </div>
        <div className="w-px flex-1 bg-white/5" />
      </div>
      <div className="flex-1 pb-3 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium" style={{ color: config.color }}>
              {config.label}
            </span>
            <span className="text-xs text-white/30">·</span>
            <span className="text-xs text-white/30">{entry.author}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-white/20">{formatTime(entry.timestamp)}</span>
            {onRemove && (
              <button
                onClick={onRemove}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-white/30 hover:text-red-400 transition-all"
                title="删除备注"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
        <div className="mt-1">{getActivityDescription(entry)}</div>
      </div>
    </div>
  )
}
