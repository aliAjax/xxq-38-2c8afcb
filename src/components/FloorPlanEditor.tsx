import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit, Eye, RotateCcw, Move, Maximize2, Palette, Users, Trash2, Copy } from 'lucide-react'
import { useVenueStore } from '@/store/venueStore'
import { useUIStore } from '@/store/uiStore'
import type { Zone } from '@/types'

const PRESET_COLORS = [
  '#FF2E97', '#00F5FF', '#BF5AF2', '#39FF14', '#FFE600',
  '#FF6B35', '#5AC8FA', '#FF3B30', '#FF8C00', '#00D4AA',
]

interface DragState {
  type: 'move' | 'resize' | null
  zoneId: string | null
  startX: number
  startY: number
  startZoneX: number
  startZoneY: number
  startZoneWidth: number
  startZoneHeight: number
}

export function FloorPlanEditor() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLDivElement>(null)
  const zones = useVenueStore((s) => s.zones)
  const allSeats = useVenueStore((s) => s.seats)
  const updateZoneLayout = useVenueStore((s) => s.updateZoneLayout)
  const removeZone = useVenueStore((s) => s.removeZone)
  const duplicateZone = useVenueStore((s) => s.duplicateZone)
  const resetZoneLayouts = useVenueStore((s) => s.resetZoneLayouts)
  const ensureZoneLayouts = useVenueStore((s) => s.ensureZoneLayouts)

  const isEditMode = useUIStore((s) => s.floorPlanEditMode)
  const selectedZoneId = useUIStore((s) => s.selectedZoneId)
  const showColorPicker = useUIStore((s) => s.showColorPicker)
  const setIsEditMode = useUIStore((s) => s.setFloorPlanEditMode)
  const setSelectedZoneId = useUIStore((s) => s.setSelectedZoneId)
  const setShowColorPicker = useUIStore((s) => s.setShowColorPicker)
  const resetFloorPlanState = useUIStore((s) => s.resetFloorPlanState)

  const [dragState, setDragState] = useState<DragState>({
    type: null,
    zoneId: null,
    startX: 0,
    startY: 0,
    startZoneX: 0,
    startZoneY: 0,
    startZoneWidth: 0,
    startZoneHeight: 0,
  })

  useEffect(() => {
    ensureZoneLayouts()
  }, [ensureZoneLayouts])

  const getZoneStats = useCallback((zone: Zone) => {
    const seats = allSeats[zone.id] || []
    let assigned = 0
    for (const s of seats) {
      if (s.memberName) assigned++
    }
    return { total: seats.length, assigned }
  }, [allSeats])

  const handleMouseDown = (e: React.MouseEvent, zone: Zone, type: 'move' | 'resize') => {
    if (!isEditMode) return
    e.preventDefault()
    e.stopPropagation()
    setSelectedZoneId(zone.id)
    setShowColorPicker(false)
    setDragState({
      type,
      zoneId: zone.id,
      startX: e.clientX,
      startY: e.clientY,
      startZoneX: zone.x,
      startZoneY: zone.y,
      startZoneWidth: zone.width,
      startZoneHeight: zone.height,
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.type || !dragState.zoneId) return

    const deltaX = e.clientX - dragState.startX
    const deltaY = e.clientY - dragState.startY

    if (dragState.type === 'move') {
      const newX = Math.max(0, dragState.startZoneX + deltaX)
      const newY = Math.max(0, dragState.startZoneY + deltaY)
      updateZoneLayout(dragState.zoneId, { x: newX, y: newY })
    } else if (dragState.type === 'resize') {
      const newWidth = Math.max(80, dragState.startZoneWidth + deltaX)
      const newHeight = Math.max(60, dragState.startZoneHeight + deltaY)
      updateZoneLayout(dragState.zoneId, { width: newWidth, height: newHeight })
    }
  }, [dragState, updateZoneLayout])

  const handleMouseUp = useCallback(() => {
    setDragState({
      type: null,
      zoneId: null,
      startX: 0,
      startY: 0,
      startZoneX: 0,
      startZoneY: 0,
      startZoneWidth: 0,
      startZoneHeight: 0,
    })
  }, [])

  useEffect(() => {
    if (dragState.type) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragState.type, handleMouseMove, handleMouseUp])

  const handleCanvasClick = () => {
    setSelectedZoneId(null)
    setShowColorPicker(false)
  }

  const handleZoneClick = (e: React.MouseEvent, zoneId: string) => {
    e.stopPropagation()
    if (isEditMode) {
      setSelectedZoneId(zoneId)
      setShowColorPicker(true)
    } else {
      navigate(`/zone/${zoneId}`)
    }
  }

  const handleColorChange = (color: string) => {
    if (selectedZoneId) {
      updateZoneLayout(selectedZoneId, { color })
    }
  }

  const handleDeleteZone = (e: React.MouseEvent, zoneId: string) => {
    e.stopPropagation()
    if (confirm('确定要删除这个区域吗？')) {
      removeZone(zoneId)
      setSelectedZoneId(null)
      setShowColorPicker(false)
    }
  }

  const handleDuplicateZone = (e: React.MouseEvent, zoneId: string) => {
    e.stopPropagation()
    const newId = duplicateZone(zoneId)
    if (newId) {
      setSelectedZoneId(newId)
    }
  }

  const selectedZone = zones.find((z) => z.id === selectedZoneId)

  if (zones.length === 0) {
    return (
      <div className="glass-panel p-12 text-center">
        <div className="text-4xl mb-3">🏟️</div>
        <p className="text-white/30 text-sm mb-4">还没有场馆区域</p>
        <p className="text-white/20 text-xs">请先创建区域，再进行平面图布局</p>
      </div>
    )
  }

  return (
    <div className="glass-panel p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white/40">场馆平面图</h3>
          {isEditMode && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-neon-pink/20 text-neon-pink font-mono">
              编辑模式
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (isEditMode) {
                resetFloorPlanState()
              } else {
                setIsEditMode(true)
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isEditMode
                ? 'bg-neon-pink text-white'
                : 'bg-surface-light text-white/50 hover:text-white hover:bg-surface-lighter'
            }`}
          >
            {isEditMode ? <Eye size={14} /> : <Edit size={14} />}
            {isEditMode ? '预览' : '编辑'}
          </button>
          <button
            onClick={resetZoneLayouts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-light text-white/50 hover:text-white hover:bg-surface-lighter text-xs font-medium transition-all"
            title="重置布局"
          >
            <RotateCcw size={14} />
            重置
          </button>
        </div>
      </div>

      {showColorPicker && selectedZone && isEditMode && (
        <div className="mb-4 p-3 rounded-lg bg-surface-light border border-white/[0.06] animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Palette size={14} className="text-white/40" />
              <span className="text-xs text-white/50">{selectedZone.name} - 选择颜色</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => handleDuplicateZone(e, selectedZone.id)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                title="复制区域"
              >
                <Copy size={12} />
                复制
              </button>
              <button
                onClick={(e) => handleDeleteZone(e, selectedZone.id)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={12} />
                删除
              </button>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className={`w-7 h-7 rounded-full transition-all hover:scale-110 ${
                  selectedZone.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-light' : ''
                }`}
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
              />
            ))}
          </div>
        </div>
      )}

      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="relative w-full overflow-auto bg-base-50 rounded-lg border border-white/[0.06]"
        style={{
          height: '500px',
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          cursor: isEditMode ? 'default' : 'pointer',
        }}
      >
        <div className="relative" style={{ width: '2000px', height: '1500px' }}>
          <div className="absolute top-4 left-4 px-3 py-1 rounded bg-surface-light/80 text-[10px] text-white/30 font-mono">
            舞台方向 ↑
          </div>

          {zones.map((zone) => {
            const stats = getZoneStats(zone)
            const isSelected = selectedZoneId === zone.id
            const isDragging = dragState.zoneId === zone.id && dragState.type === 'move'
            const isResizing = dragState.zoneId === zone.id && dragState.type === 'resize'

            return (
              <div
                key={zone.id}
                onClick={(e) => handleZoneClick(e, zone.id)}
                onMouseDown={(e) => handleMouseDown(e, zone, 'move')}
                className={`absolute rounded-lg border-2 transition-all select-none ${
                  isSelected ? 'border-white' : 'border-transparent'
                } ${isDragging || isResizing ? 'opacity-80' : ''} ${
                  isEditMode ? 'cursor-move' : 'cursor-pointer hover:scale-[1.02]'
                }`}
                style={{
                  left: zone.x,
                  top: zone.y,
                  width: zone.width,
                  height: zone.height,
                  backgroundColor: `${zone.color}20`,
                  borderColor: isSelected ? zone.color : `${zone.color}60`,
                  boxShadow: isSelected
                    ? `0 0 20px ${zone.color}40, inset 0 0 20px ${zone.color}20`
                    : `0 0 10px ${zone.color}20`,
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-md"
                  style={{ backgroundColor: zone.color, boxShadow: `0 0 8px ${zone.color}60` }}
                />

                <div className="p-2 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-xs font-bold text-white truncate flex-1">{zone.name}</h4>
                    {isEditMode && (
                      <Move size={12} className="text-white/30 ml-1 shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-white/40 font-mono mb-1">
                    <span>{zone.rows}×{zone.cols}</span>
                    <span>·</span>
                    <span>{stats.total}座</span>
                  </div>

                  <div className="flex items-center gap-1 mt-auto">
                    <Users size={10} className="text-white/20" />
                    <span className="text-[10px] font-mono text-white/40">
                      {stats.assigned}/{stats.total}
                    </span>
                    <div className="flex-1 h-1 bg-surface-lighter rounded-full overflow-hidden ml-1">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${stats.total > 0 ? (stats.assigned / stats.total) * 100 : 0}%`,
                          backgroundColor: zone.color,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {isEditMode && (
                  <div
                    onMouseDown={(e) => handleMouseDown(e, zone, 'resize')}
                    className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-center justify-center"
                    style={{ color: zone.color }}
                  >
                    <Maximize2 size={10} className="opacity-60" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-white/25">
        <span>
          {isEditMode
            ? '💡 拖拽移动区域 · 右下角拖拽调整尺寸 · 点击选择颜色'
            : '💡 点击区域进入座位规划'}
        </span>
        <span className="font-mono">{zones.length} 个区域</span>
      </div>
    </div>
  )
}
