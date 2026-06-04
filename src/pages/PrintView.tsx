import { useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Printer, Settings, X, User, Palette, Ticket, Eye, Package, Download } from 'lucide-react'
import { useVenueStore } from '@/store/venueStore'
import type { Seat, Zone, TicketStatus } from '@/types'

export interface PrintOptions {
  showMemberName: boolean
  showCheeringColor: boolean
  showTicketStatus: boolean
  showObstruction: boolean
  showSupplies: boolean
  layout: 'overview' | 'single-zone'
  zoneId?: string
}

const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  none: '未处理',
  confirmed: '已确认',
  pending: '待处理',
  exchanged: '已换票',
}

const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  none: '#9CA3AF',
  confirmed: '#10B981',
  pending: '#F59E0B',
  exchanged: '#3B82F6',
}

export default function PrintView() {
  const navigate = useNavigate()
  const { zoneId: urlZoneId } = useParams<{ zoneId?: string }>()
  const [searchParams] = useSearchParams()
  const zones = useVenueStore((s) => s.zones)
  const allSeats = useVenueStore((s) => s.seats)

  const [showSettings, setShowSettings] = useState(false)
  const [options, setOptions] = useState<PrintOptions>(() => ({
    showMemberName: true,
    showCheeringColor: true,
    showTicketStatus: searchParams.get('ticket') === '1',
    showObstruction: searchParams.get('obstruction') === '1',
    showSupplies: searchParams.get('supplies') === '1',
    layout: urlZoneId ? 'single-zone' : 'overview',
    zoneId: urlZoneId,
  }))

  const targetZones = useMemo(() => {
    if (options.layout === 'single-zone' && options.zoneId) {
      return zones.filter((z) => z.id === options.zoneId)
    }
    return zones
  }, [zones, options.layout, options.zoneId])

  const handlePrint = () => {
    window.print()
  }

  const updateOption = <K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-white print:bg-white">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors text-sm"
        >
          <ArrowLeft size={16} /> 返回
        </button>

        <div className="flex-1" />

        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm"
        >
          <Settings size={14} /> 显示设置
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-neon-pink text-white hover:bg-neon-pink/90 transition-colors text-sm"
        >
          <Printer size={14} /> 打印
        </button>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">显示设置</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">版式</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateOption('layout', 'overview')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${
                      options.layout === 'overview'
                        ? 'bg-neon-pink text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    全场总览
                  </button>
                  <button
                    onClick={() => updateOption('layout', 'single-zone')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${
                      options.layout === 'single-zone'
                        ? 'bg-neon-pink text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    单区域
                  </button>
                </div>
              </div>

              {options.layout === 'single-zone' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">选择区域</label>
                  <select
                    value={options.zoneId || ''}
                    onChange={(e) => updateOption('zoneId', e.target.value || undefined)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-neon-pink/50"
                  >
                    <option value="">请选择区域</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 block">显示内容</label>
                {[
                  { key: 'showMemberName', label: '成员姓名', icon: <User size={14} /> },
                  { key: 'showCheeringColor', label: '应援色', icon: <Palette size={14} /> },
                  { key: 'showTicketStatus', label: '换票状态', icon: <Ticket size={14} /> },
                  { key: 'showObstruction', label: '遮挡标记', icon: <Eye size={14} /> },
                  { key: 'showSupplies', label: '物资摘要', icon: <Package size={14} /> },
                ].map(({ key, label, icon }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options[key as keyof PrintOptions] as boolean}
                      onChange={(e) => updateOption(key as keyof PrintOptions, e.target.checked)}
                      className="w-4 h-4 text-neon-pink rounded focus:ring-neon-pink border-gray-300"
                    />
                    <span className="text-gray-500">{icon}</span>
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-lg bg-neon-pink text-white text-sm hover:bg-neon-pink/90 transition-colors"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 print:p-0">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 print:mb-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {options.layout === 'single-zone' && options.zoneId
                ? `${zones.find((z) => z.id === options.zoneId)?.name || '座位图'}`
                : '全场座位总览'}
            </h1>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="space-y-8 print:space-y-6">
            {targetZones.map((zone) => (
              <ZonePrintSection key={zone.id} zone={zone} seats={allSeats[zone.id] || []} options={options} />
            ))}
          </div>

          {options.showSupplies && (
            <div className="mt-10 print:mt-6">
              <SuppliesSummarySection zones={targetZones} allSeats={allSeats} />
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-4 justify-center text-xs text-gray-500 print:mt-4">
            {options.showCheeringColor && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border border-gray-300 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400" />
                <span>应援色填充</span>
              </div>
            )}
            {options.showObstruction && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border border-gray-300 bg-yellow-100">
                  <span className="text-yellow-600 text-[8px]">!</span>
                </div>
                <span>视线遮挡</span>
              </div>
            )}
            {options.showTicketStatus && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded border border-gray-300" style={{ backgroundColor: TICKET_STATUS_COLORS.confirmed + '30' }} />
                  <span>已确认</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded border border-gray-300" style={{ backgroundColor: TICKET_STATUS_COLORS.pending + '30' }} />
                  <span>待处理</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded border border-gray-300" style={{ backgroundColor: TICKET_STATUS_COLORS.exchanged + '30' }} />
                  <span>已换票</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ZonePrintSection({ zone, seats, options }: { zone: Zone; seats: Seat[]; options: PrintOptions }) {
  const rowLabels = Array.from({ length: zone.rows }, (_, i) => String.fromCharCode(65 + (i % 26)))

  return (
    <div className="border border-gray-200 rounded-xl p-4 print:border-gray-300 print:shadow-none">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{zone.name}</h2>
        <div className="text-sm text-gray-500">
          {zone.rows} 行 × {zone.cols} 列 · 共 {seats.length} 座
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          <div className="flex mb-1 pl-8">
            {Array.from({ length: zone.cols }, (_, i) => (
              <div key={i} className="w-10 text-center text-[10px] font-mono text-gray-400">
                {i + 1}
              </div>
            ))}
          </div>

          {Array.from({ length: zone.rows }, (_, row) => (
            <div key={row} className="flex items-center mb-0.5">
              <div className="w-7 text-right pr-1 text-[10px] font-mono text-gray-400">
                {rowLabels[row]}
              </div>
              {Array.from({ length: zone.cols }, (_, col) => {
                const seat = seats.find((s) => s.row === row && s.col === col)
                if (!seat) return <div key={col} className="w-10 h-10" />

                return (
                  <PrintSeatCell
                    key={col}
                    seat={seat}
                    options={options}
                    zoneColor={zone.color}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PrintSeatCell({ seat, options, zoneColor }: { seat: Seat; options: PrintOptions; zoneColor: string }) {
  const hasMember = !!seat.memberName

  let bgColor = '#F9FAFB'
  let borderColor = '#E5E7EB'
  let textColor = '#9CA3AF'

  if (hasMember) {
    if (options.showCheeringColor && seat.cheeringColor) {
      bgColor = seat.cheeringColor + '25'
      borderColor = seat.cheeringColor + '60'
      textColor = '#374151'
    } else {
      bgColor = '#F3F4F6'
      borderColor = '#D1D5DB'
      textColor = '#374151'
    }
  }

  if (options.showTicketStatus && seat.ticketStatus !== 'none') {
    borderColor = TICKET_STATUS_COLORS[seat.ticketStatus]
  }

  return (
    <div
      className="w-10 h-10 flex flex-col items-center justify-center rounded-md relative transition-all"
      style={{
        backgroundColor: bgColor,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: borderColor,
      }}
    >
      {options.showObstruction && seat.isObstructed && (
        <span
          className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-bold"
          style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}
        >
          !
        </span>
      )}

      {hasMember ? (
        <>
          {options.showMemberName && (
            <span
              className="text-[10px] font-bold truncate max-w-full px-0.5"
              style={{ color: options.showCheeringColor && seat.cheeringColor ? seat.cheeringColor : textColor }}
            >
              {seat.memberName}
            </span>
          )}
          {!options.showMemberName && options.showCheeringColor && seat.cheeringColor && (
            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: seat.cheeringColor }} />
          )}
          {!options.showMemberName && !options.showCheeringColor && (
            <span className="text-[8px] text-gray-500">{seat.seatNumber}</span>
          )}
        </>
      ) : (
        <span className="text-[8px] text-gray-300">{seat.col + 1}</span>
      )}
    </div>
  )
}

function SuppliesSummarySection({ zones, allSeats }: { zones: Zone[]; allSeats: Record<string, Seat[]> }) {
  const suppliesMap = useMemo(() => {
    const map = new Map<string, { count: number; members: string[] }>()

    for (const zone of zones) {
      const seats = allSeats[zone.id] || []
      for (const seat of seats) {
        if (!seat.supplies || !seat.memberName) continue

        const items = seat.supplies.split(/[、,，\n]+/).filter((s) => s.trim())
        for (const item of items) {
          const trimmed = item.trim()
          if (!trimmed) continue

          const match = trimmed.match(/^(.+?)(?:[×x*](\d+))?$/)
          if (!match) continue

          const [, name, qtyStr] = match
          const qty = qtyStr ? parseInt(qtyStr, 10) : 1

          const key = name.trim()
          const existing = map.get(key)
          if (existing) {
            existing.count += qty
            if (!existing.members.includes(seat.memberName)) {
              existing.members.push(seat.memberName)
            }
          } else {
            map.set(key, { count: qty, members: [seat.memberName] })
          }
        }
      }
    }

    return map
  }, [zones, allSeats])

  if (suppliesMap.size === 0) {
    return null
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 print:border-gray-300">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">物资汇总</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from(suppliesMap.entries()).map(([item, { count, members }]) => (
          <div key={item} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-gray-900">{item}</span>
              <span className="text-neon-pink font-bold">×{count}</span>
            </div>
            <div className="mt-1 text-[10px] text-gray-500 truncate">
              {members.slice(0, 3).join('、')}
              {members.length > 3 && ` 等${members.length}人`}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
