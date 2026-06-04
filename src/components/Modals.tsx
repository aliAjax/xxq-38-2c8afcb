import { useState, useRef } from 'react'
import { Download, Upload, Trash2, X } from 'lucide-react'
import { useVenueStore } from '@/store/venueStore'
import { ImportPreviewModal } from './ImportPreviewModal'

const PRESET_COLORS = [
  '#FF2E97', '#00F5FF', '#FFE600', '#39FF14',
  '#FF6B35', '#BF5AF2', '#5AC8FA', '#FF3B30',
  '#FF69B4', '#7B68EE', '#00CED1', '#FFD700',
]

interface ZoneTemplate {
  key: string
  label: string
  emoji: string
  name: string
  rows: number
  cols: number
  color: string
  desc: string
}

const ZONE_TEMPLATES: ZoneTemplate[] = [
  { key: 'theater', label: '小剧场', emoji: '🎭', name: '小剧场', rows: 5, cols: 8, color: '#BF5AF2', desc: '5×8 紧凑布局' },
  { key: 'stand', label: '体育馆看台', emoji: '🏟️', name: '看台', rows: 20, cols: 30, color: '#00F5FF', desc: '20×30 大型看台' },
  { key: 'vip', label: 'VIP方阵', emoji: '👑', name: 'VIP区', rows: 3, cols: 10, color: '#FFE600', desc: '3×10 尊享席位' },
  { key: 'custom', label: '自定义', emoji: '✏️', name: '', rows: 10, cols: 10, color: PRESET_COLORS[0], desc: '自由设定参数' },
]

export function CreateZoneModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom')
  const [name, setName] = useState('')
  const [rows, setRows] = useState(10)
  const [cols, setCols] = useState(10)
  const [color, setColor] = useState(PRESET_COLORS[0])
  const addZone = useVenueStore((s) => s.addZone)

  if (!open) return null

  const applyTemplate = (key: string) => {
    setSelectedTemplate(key)
    const tpl = ZONE_TEMPLATES.find((t) => t.key === key)
    if (tpl) {
      setName(tpl.name)
      setRows(tpl.rows)
      setCols(tpl.cols)
      setColor(tpl.color)
    }
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    addZone(name.trim(), rows, cols, color)
    setSelectedTemplate('custom')
    setName('')
    setRows(10)
    setCols(10)
    setColor(PRESET_COLORS[0])
    onClose()
  }

  const handleClose = () => {
    setSelectedTemplate('custom')
    setName('')
    setRows(10)
    setCols(10)
    setColor(PRESET_COLORS[0])
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div className="glass-panel p-6 w-full max-w-md animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">新增场馆区域</h2>
          <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="mb-5">
          <label className="block text-sm text-white/60 mb-2">区域模板</label>
          <div className="grid grid-cols-2 gap-2">
            {ZONE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.key}
                onClick={() => applyTemplate(tpl.key)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all"
                style={{
                  borderColor: selectedTemplate === tpl.key ? `${tpl.color}80` : 'rgba(255,255,255,0.06)',
                  backgroundColor: selectedTemplate === tpl.key ? `${tpl.color}15` : 'rgba(255,255,255,0.03)',
                  boxShadow: selectedTemplate === tpl.key ? `0 0 12px ${tpl.color}30` : 'none',
                }}
              >
                <span className="text-xl flex-shrink-0">{tpl.emoji}</span>
                <div className="min-w-0">
                  <div className={`text-sm font-medium truncate ${selectedTemplate === tpl.key ? 'text-white' : 'text-white/70'}`}>
                    {tpl.label}
                  </div>
                  <div className="text-xs text-white/30 truncate">{tpl.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">区域名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：A区、VIP区"
              className="w-full bg-surface-light border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-neon-pink/50 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">行数</label>
              <input
                type="number"
                min={1}
                max={50}
                value={rows}
                onChange={(e) => setRows(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                className="w-full bg-surface-light border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-neon-pink/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">列数</label>
              <input
                type="number"
                min={1}
                max={50}
                value={cols}
                onChange={(e) => setCols(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                className="w-full bg-surface-light border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-neon-pink/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1.5">区域标识色</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? '#fff' : 'transparent',
                    boxShadow: color === c ? `0 0 10px ${c}60` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={handleClose} className="flex-1 px-4 py-2.5 rounded-lg bg-surface-light text-white/60 hover:text-white transition-colors">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2.5 rounded-lg bg-neon-pink text-white font-medium hover:bg-neon-pink/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ boxShadow: name.trim() ? '0 0 20px rgba(255,46,151,0.3)' : 'none' }}
          >
            创建区域
          </button>
        </div>
      </div>
    </div>
  )
}

export function DataActions() {
  const exportData = useVenueStore((s) => s.exportData)
  const clearAll = useVenueStore((s) => s.clearAll)
  const [showConfirm, setShowConfirm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [importPreviewOpen, setImportPreviewOpen] = useState(false)
  const [importJsonContent, setImportJsonContent] = useState('')
  const [importFileName, setImportFileName] = useState('')

  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `live-cheering-plan-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    fileRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImportJsonContent(reader.result as string)
      setImportFileName(file.name)
      setImportPreviewOpen(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImportSuccess = () => {
    setImportPreviewOpen(false)
    setImportJsonContent('')
    setImportFileName('')
  }

  const handleImportClose = () => {
    setImportPreviewOpen(false)
    setImportJsonContent('')
    setImportFileName('')
  }

  return (
    <>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-light border border-white/[0.06] text-white/60 hover:text-white hover:border-white/15 transition-all text-sm"
        >
          <Download size={14} /> 导出
        </button>
        <button
          onClick={handleImport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-light border border-white/[0.06] text-white/60 hover:text-white hover:border-white/15 transition-all text-sm"
        >
          <Upload size={14} /> 导入
        </button>
        {showConfirm ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-red-400">确认清空？</span>
            <button onClick={() => { clearAll(); setShowConfirm(false) }} className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-colors">确认</button>
            <button onClick={() => setShowConfirm(false)} className="px-2 py-1 rounded bg-surface-light text-white/40 text-xs hover:text-white/60 transition-colors">取消</button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-light border border-white/[0.06] text-white/40 hover:text-red-400 hover:border-red-400/30 transition-all text-sm"
          >
            <Trash2 size={14} /> 清空
          </button>
        )}
      </div>

      <ImportPreviewModal
        open={importPreviewOpen}
        jsonContent={importJsonContent}
        fileName={importFileName}
        onClose={handleImportClose}
        onSuccess={handleImportSuccess}
      />
    </>
  )
}
