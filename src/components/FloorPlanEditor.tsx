import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Edit, Eye, RotateCcw, Move, Maximize2, Palette, Users,
  Trash2, Copy, ZoomIn, ZoomOut, Maximize, Undo2, Redo2,
  MousePointer2
} from 'lucide-react'
import { useVenueStore } from '@/store/venueStore'
import { useUIStore } from '@/store/uiStore'
import type { Zone } from '@/types'

const PRESET_COLORS = [
  '#FF2E97', '#00F5FF', '#BF5AF2', '#39FF14', '#FFE600',
  '#FF6B35', '#5AC8FA', '#FF3B30', '#FF8C00', '#00D4AA',
]

const GRID_SIZE = 20
const MIN_SCALE = 0.2
const MAX_SCALE = 2
const SCALE_STEP = 0.1

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

interface CanvasState {
  scale: number
  offsetX: number
  offsetY: number
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
  const undo = useVenueStore((s) => s.undo)
  const redo = useVenueStore((s) => s.redo)
  const canUndo = useVenueStore((s) => s.canUndo)
  const canRedo = useVenueStore((s) => s.canRedo)
  const past = useVenueStore((s) => s.past)
  const future = useVenueStore((s) => s.future)

  const isEditMode = useUIStore((s) => s.floorPlanEditMode)
  const selectedZoneId = useUIStore((s) => s.selectedZoneId)
  const showColorPicker = useUIStore((s) => s.showColorPicker)
  const setIsEditMode = useUIStore((s) => s.setFloorPlanEditMode)
  const setSelectedZoneId = useUIStore((s) => s.setSelectedZoneId)
  const setShowColorPicker = useUIStore((s) => s.setShowColorPicker)
  const resetFloorPlanState = useUIStore((s) => s.resetFloorPlanState)

  const [canvas, setCanvas] = useState<CanvasState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  })

  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [spacePressed, setSpacePressed] = useState(false)

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

  const [dragStarted, setDragStarted] = useState(false)
  const dragHistoryRef = useRef<{
    beforeZones: Zone[]
    type: 'move' | 'resize'
    zoneName: string
  } | null>(null)
  const hasInitViewRef = useRef(false)

  useEffect(() => {
    ensureZoneLayouts()
  }, [ensureZoneLayouts])

  useEffect(() => {
    if (zones.length > 0 && canvasRef.current && !hasInitViewRef.current) {
      hasInitViewRef.current = true
      const timer = setTimeout(() => {
        resetView()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [zones.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const snapToGrid = useCallback((value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE
  }, [])

  const getZoneStats = useCallback((zone: Zone) => {
    const seats = allSeats[zone.id] || []
    let assigned = 0
    for (const s of seats) {
      if (s.memberName) assigned++
    }
    return { total: seats.length, assigned }
  }, [allSeats])

  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (clientX - rect.left - canvas.offsetX) / canvas.scale,
      y: (clientY - rect.top - canvas.offsetY) / canvas.scale,
    }
  }, [canvas.scale, canvas.offsetX, canvas.offsetY])

  const handleZoom = useCallback((delta: number, centerX?: number, centerY?: number) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const cx = centerX ?? rect.width / 2
    const cy = centerY ?? rect.height / 2

    setCanvas((prev) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale + delta))
      if (newScale === prev.scale) return prev

      const scaleRatio = newScale / prev.scale
      const newOffsetX = cx - (cx - prev.offsetX) * scaleRatio
      const newOffsetY = cy - (cy - prev.offsetY) * scaleRatio

      return {
        scale: newScale,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      }
    })
  }, [])

  const resetView = useCallback(() => {
    if (zones.length === 0) {
      setCanvas({ scale: 1, offsetX: 0, offsetY: 0 })
      return
    }

    if (!canvasRef.current) return

    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity
    for (const zone of zones) {
      minX = Math.min(minX, zone.x)
      minY = Math.min(minY, zone.y)
      maxX = Math.max(maxX, zone.x + zone.width)
      maxY = Math.max(maxY, zone.y + zone.height)
    }

    const padding = 60
    const contentWidth = maxX - minX + padding * 2
    const contentHeight = maxY - minY + padding * 2

    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = rect.width / contentWidth
    const scaleY = rect.height / contentHeight
    const scale = Math.min(1, Math.min(scaleX, scaleY))

    const offsetX = (rect.width - contentWidth * scale) / 2 - minX * scale + padding * scale
    const offsetY = (rect.height - contentHeight * scale) / 2 - minY * scale + padding * scale

    setCanvas({ scale, offsetX, offsetY })
  }, [zones])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spacePressed) {
        e.preventDefault()
        setSpacePressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false)
        setIsPanning(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [spacePressed])

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!canvasRef.current) return
    e.preventDefault()

    const rect = canvasRef.current.getBoundingClientRect()
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
    handleZoom(delta, e.clientX - rect.left, e.clientY - rect.top)
  }, [handleZoom])

  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return

    canvasEl.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      canvasEl.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && spacePressed)) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX - canvas.offsetX, y: e.clientY - canvas.offsetY })
      return
    }

    if (isEditMode) {
      setSelectedZoneId(null)
      setShowColorPicker(false)
    }
  }

  const handleCanvasMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      setCanvas((prev) => ({
        ...prev,
        offsetX: e.clientX - panStart.x,
        offsetY: e.clientY - panStart.y,
      }))
      return
    }

    if (!dragState.type || !dragState.zoneId) return

    const canvasPos = screenToCanvas(e.clientX, e.clientY)
    const startCanvasPos = screenToCanvas(dragState.startX, dragState.startY)
    const deltaX = canvasPos.x - startCanvasPos.x
    const deltaY = canvasPos.y - startCanvasPos.y

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      setDragStarted(true)
    }

    if (dragState.type === 'move') {
      const newX = snapToGrid(Math.max(0, dragState.startZoneX + deltaX))
      const newY = snapToGrid(Math.max(0, dragState.startZoneY + deltaY))
      updateZoneLayout(dragState.zoneId, { x: newX, y: newY })
    } else if (dragState.type === 'resize') {
      const newWidth = snapToGrid(Math.max(80, dragState.startZoneWidth + deltaX))
      const newHeight = snapToGrid(Math.max(60, dragState.startZoneHeight + deltaY))
      updateZoneLayout(dragState.zoneId, { width: newWidth, height: newHeight })
    }
  }, [isPanning, panStart, dragState, screenToCanvas, snapToGrid, updateZoneLayout])

  const handleCanvasMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
      return
    }

    if (dragState.type && dragState.zoneId && dragStarted && dragHistoryRef.current) {
      const state = useVenueStore.getState()
      const { beforeZones, type, zoneName } = dragHistoryRef.current

      const hasChanged = beforeZones.some((beforeZone, index) => {
        const afterZone = state.zones[index]
        if (!afterZone) return true
        return beforeZone.x !== afterZone.x
          || beforeZone.y !== afterZone.y
          || beforeZone.width !== afterZone.width
          || beforeZone.height !== afterZone.height
      })

      if (hasChanged) {
        const label = type === 'move'
          ? `移动「${zoneName}」`
          : `调整「${zoneName}」尺寸`
        useVenueStore.setState((s) => ({
          past: [...s.past, {
            type: 'updateZoneLayout',
            before: {},
            beforeZones,
            label,
          }],
          future: [],
          canUndo: true,
          canRedo: false,
        }))
      }
    }

    dragHistoryRef.current = null
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
    setDragStarted(false)
  }, [isPanning, dragState, dragStarted])

  useEffect(() => {
    if (isPanning || dragState.type) {
      window.addEventListener('mousemove', handleCanvasMouseMove)
      window.addEventListener('mouseup', handleCanvasMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleCanvasMouseMove)
        window.removeEventListener('mouseup', handleCanvasMouseUp)
      }
    }
  }, [isPanning, dragState.type, handleCanvasMouseMove, handleCanvasMouseUp])

  const handleMouseDown = (e: React.MouseEvent, zone: Zone, type: 'move' | 'resize') => {
    if (!isEditMode) return
    if (isPanning) return
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
    setDragStarted(false)

    const state = useVenueStore.getState()
    dragHistoryRef.current = {
      beforeZones: state.zones.map((z) => ({ ...z })),
      type,
      zoneName: zone.name,
    }
  }

  const handleZoneClick = (e: React.MouseEvent, zoneId: string) => {
    e.stopPropagation()
    if (dragStarted) return

    if (isEditMode) {
      setSelectedZoneId(zoneId)
      setShowColorPicker(true)
    } else {
      navigate(`/zone/${zoneId}`)
    }
  }

  const handleColorChange = (color: string) => {
    if (selectedZoneId) {
      const zone = zones.find((z) => z.id === selectedZoneId)
      if (zone) {
        updateZoneLayout(selectedZoneId, { color }, true, `修改「${zone.name}」颜色`)
      }
    }
  }

  const handleDeleteZone = (e: React.MouseEvent, zoneId: string) => {
    e.stopPropagation()
    if (confirm('确定要删除这个区域吗？')) {
      removeZone(zoneId, true)
      setSelectedZoneId(null)
      setShowColorPicker(false)
    }
  }

  const handleDuplicateZone = (e: React.MouseEvent, zoneId: string) => {
    e.stopPropagation()
    const newId = duplicateZone(zoneId, true)
    if (newId) {
      setSelectedZoneId(newId)
    }
  }

  const handleResetLayouts = () => {
    if (confirm('确定要重置所有区域布局吗？')) {
      resetZoneLayouts(true)
    }
  }

  const handleToggleEditMode = () => {
    if (isEditMode) {
      resetFloorPlanState()
    } else {
      setIsEditMode(true)
    }
  }

  const selectedZone = zones.find((z) => z.id === selectedZoneId)

  const getCanvasCursor = () => {
    if (isPanning) return 'grabbing'
    if (spacePressed) return 'grab'
    if (isEditMode) return 'default'
    return 'default'
  }

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
          <div className="flex items-center gap-1 bg-surface-light/50 rounded-lg px-1.5 py-1">
            <button
              onClick={() => handleZoom(-SCALE_STEP)}
              className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-all"
              title="缩小 (滚轮)"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[10px] font-mono text-white/40 w-10 text-center">
              {Math.round(canvas.scale * 100)}%
            </span>
            <button
              onClick={() => handleZoom(SCALE_STEP)}
              className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-all"
              title="放大 (滚轮)"
            >
              <ZoomIn size={14} />
            </button>
            <div className="w-px h-4 bg-white/10" />
            <button
              onClick={resetView}
              className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-all"
              title="重置视角"
            >
              <Maximize size={14} />
            </button>
          </div>

          {isEditMode && (
            <div
              className="flex items-center gap-1 bg-surface-light/50 rounded-lg px-1.5 py-1"
              title={`撤销: ${past[past.length - 1]?.label || '无'} | 重做: ${future[future.length - 1]?.label || '无'}`}
            >
              <button
                onClick={() => { if (canUndo) undo() }}
                disabled={!canUndo}
                className={`p-1.5 rounded transition-all ${
                  canUndo
                    ? 'text-white/60 hover:text-white hover:bg-white/10 cursor-pointer'
                    : 'text-white/10 cursor-not-allowed'
                }`}
                title={past[past.length - 1]?.label ? `撤销: ${past[past.length - 1].label} (Ctrl+Z)` : '撤销 (Ctrl+Z)'}
              >
                <Undo2 size={14} />
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button
                onClick={() => { if (canRedo) redo() }}
                disabled={!canRedo}
                className={`p-1.5 rounded transition-all ${
                  canRedo
                    ? 'text-white/60 hover:text-white hover:bg-white/10 cursor-pointer'
                    : 'text-white/10 cursor-not-allowed'
                }`}
                title={future[future.length - 1]?.label ? `重做: ${future[future.length - 1].label} (Ctrl+Shift+Z)` : '重做 (Ctrl+Shift+Z)'}
              >
                <Redo2 size={14} />
              </button>
            </div>
          )}

          <button
            onClick={handleToggleEditMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isEditMode
                ? 'bg-neon-pink text-white'
                : 'bg-surface-light text-white/50 hover:text-white hover:bg-surface-lighter'
            }`}
          >
            {isEditMode ? <Eye size={14} /> : <Edit size={14} />}
            {isEditMode ? '预览' : '编辑'}
          </button>

          {isEditMode && (
            <button
              onClick={handleResetLayouts}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-light text-white/50 hover:text-white hover:bg-surface-lighter text-xs font-medium transition-all"
              title="重置布局"
            >
              <RotateCcw size={14} />
              重置
            </button>
          )}
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
        onMouseDown={handleCanvasMouseDown}
        className="relative w-full overflow-hidden bg-base-50 rounded-lg border border-white/[0.06]"
        style={{
          height: '500px',
          cursor: getCanvasCursor(),
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: `${GRID_SIZE * canvas.scale}px ${GRID_SIZE * canvas.scale}px`,
            backgroundPosition: `${canvas.offsetX}px ${canvas.offsetY}px`,
          }}
        />

        <div
          className="absolute"
          style={{
            transform: `translate(${canvas.offsetX}px, ${canvas.offsetY}px) scale(${canvas.scale})`,
            transformOrigin: '0 0',
          }}
        >
          <div className="absolute top-4 left-4 px-3 py-1 rounded bg-surface-light/80 text-[10px] text-white/30 font-mono whitespace-nowrap">
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
                className={`absolute rounded-lg border-2 transition-all select-none ${
                  isSelected ? 'border-white' : 'border-transparent'
                } ${isDragging || isResizing ? 'opacity-80' : ''} ${
                  isEditMode ? '' : 'cursor-pointer hover:scale-[1.02]'
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
                  transition: dragState.type ? 'none' : 'all 0.15s ease',
                }}
              >
                {isEditMode && (
                  <div
                    onMouseDown={(e) => handleMouseDown(e, zone, 'move')}
                    className="absolute inset-0 cursor-move"
                    style={{ cursor: 'move' }}
                  />
                )}

                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-md"
                  style={{ backgroundColor: zone.color, boxShadow: `0 0 8px ${zone.color}60` }}
                />

                <div className="p-2 h-full flex flex-col pointer-events-none">
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
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-center justify-center group"
                    style={{ color: zone.color }}
                  >
                    <Maximize2 size={12} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}

                {isEditMode && isSelected && (
                  <>
                    <div
                      className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-white border-2 cursor-nw-resize"
                      style={{ borderColor: zone.color }}
                      onMouseDown={(e) => handleMouseDown(e, zone, 'resize')}
                    />
                    <div
                      className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-white border-2 cursor-ne-resize"
                      style={{ borderColor: zone.color }}
                      onMouseDown={(e) => handleMouseDown(e, zone, 'resize')}
                    />
                    <div
                      className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-full bg-white border-2 cursor-sw-resize"
                      style={{ borderColor: zone.color }}
                      onMouseDown={(e) => handleMouseDown(e, zone, 'resize')}
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-white/25">
        <span>
          {isEditMode
            ? '💡 拖拽移动区域 · 角落/右下角调整尺寸 · 空格键拖动画布 · 滚轮缩放'
            : '💡 点击区域进入座位规划 · 滚轮缩放 · 空格键拖动画布'}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono">{zones.length} 个区域</span>
          {isEditMode && (
            <span className="flex items-center gap-1">
              <MousePointer2 size={10} />
              网格吸附 {GRID_SIZE}px
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
