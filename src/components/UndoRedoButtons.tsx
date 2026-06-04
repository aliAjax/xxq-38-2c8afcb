import { useEffect, useCallback } from 'react'
import { Undo2, Redo2 } from 'lucide-react'
import { useVenueStore } from '@/store/venueStore'

export function UndoRedoButtons() {
  const canUndo = useVenueStore((s) => s.canUndo)
  const canRedo = useVenueStore((s) => s.canRedo)
  const undo = useVenueStore((s) => s.undo)
  const redo = useVenueStore((s) => s.redo)
  const past = useVenueStore((s) => s.past)
  const future = useVenueStore((s) => s.future)

  const handleUndo = useCallback(() => {
    if (canUndo) undo()
  }, [canUndo, undo])

  const handleRedo = useCallback(() => {
    if (canRedo) redo()
  }, [canRedo, redo])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        handleUndo()
      } else if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  return (
    <div
      className="flex items-center gap-1 bg-surface-light/50 rounded-lg px-1.5 py-1"
      title={`撤销: ${past[past.length - 1]?.label || '无'} | 重做: ${future[future.length - 1]?.label || '无'}`}
    >
      <button
        onClick={handleUndo}
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
        onClick={handleRedo}
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
  )
}
