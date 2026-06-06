import { useState, useMemo, useEffect } from 'react'
import { X, AlertTriangle, CheckCircle, Plus, ArrowRightLeft, Merge, MapPin, Users, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { useVenueStore } from '@/store/venueStore'
import type { ImportPreviewResult, ImportStrategy, ZoneConflictInfo, SeatConflictChoice } from '@/types'

interface ImportPreviewModalProps {
  open: boolean
  jsonContent: string
  fileName: string
  onClose: () => void
  onSuccess: () => void
}

export function ImportPreviewModal({ open, jsonContent, fileName, onClose, onSuccess }: ImportPreviewModalProps) {
  const previewImportData = useVenueStore((s) => s.previewImportData)
  const executeConfirmedImport = useVenueStore((s) => s.executeConfirmedImport)

  const [strategy, setStrategy] = useState<ImportStrategy>('overwrite')
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [seatConflictChoices, setSeatConflictChoices] = useState<Record<string, SeatConflictChoice>>({})

  const preview = useMemo<ImportPreviewResult>(() => {
    return previewImportData(jsonContent, strategy)
  }, [jsonContent, strategy, previewImportData])

  useEffect(() => {
    const choices: Record<string, SeatConflictChoice> = {}
    for (const zone of [...preview.overwriteZones, ...preview.mergeZones]) {
      for (const conflict of zone.conflictSeats) {
        choices[conflict.seatId] = conflict.choice
      }
    }
    setSeatConflictChoices(choices)
  }, [preview])

  const allZones = useMemo(() => {
    return [...preview.newZones, ...preview.overwriteZones, ...preview.mergeZones]
  }, [preview])

  const [selectedZoneIds, setSelectedZoneIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setSelectedZoneIds(new Set(allZones.filter((z) => z.selected).map((z) => z.zone.id)))
  }, [allZones])

  const conflictStats = useMemo(() => {
    let keep = 0
    let overwrite = 0
    let skip = 0
    for (const seatId in seatConflictChoices) {
      const choice = seatConflictChoices[seatId]
      if (choice === 'keep') keep++
      else if (choice === 'overwrite') overwrite++
      else if (choice === 'skip') skip++
    }
    return { keep, overwrite, skip, total: keep + overwrite + skip }
  }, [seatConflictChoices])

  const handleSeatChoiceChange = (seatId: string, choice: SeatConflictChoice) => {
    setSeatConflictChoices((prev) => ({
      ...prev,
      [seatId]: choice,
    }))
  }

  const handleBulkChoice = (zoneId: string | 'all', choice: SeatConflictChoice) => {
    setSeatConflictChoices((prev) => {
      const next = { ...prev }
      const zones = zoneId === 'all'
        ? [...preview.overwriteZones, ...preview.mergeZones]
        : [...preview.overwriteZones, ...preview.mergeZones].filter((z) => z.zone.id === zoneId)
      for (const zone of zones) {
        for (const conflict of zone.conflictSeats) {
        next[conflict.seatId] = choice
        }
      }
      return next
    })
  }

  const toggleZoneSelection = (zoneId: string) => {
    setSelectedZoneIds((prev) => {
      const next = new Set(prev)
      if (next.has(zoneId)) {
        next.delete(zoneId)
      } else {
        next.add(zoneId)
      }
      return next
    })
  }

  const toggleExpand = (zoneId: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev)
      if (next.has(zoneId)) {
        next.delete(zoneId)
      } else {
        next.add(zoneId)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedZoneIds(new Set(allZones.map((z) => z.zone.id)))
  }

  const deselectAll = () => {
    setSelectedZoneIds(new Set())
  }

  const handleConfirm = async () => {
    setImporting(true)
    setResult(null)
    try {
      const selectedIds = strategy === 'selective'
        ? Array.from(selectedZoneIds)
        : allZones.map((z) => z.zone.id)
      const res = executeConfirmedImport(preview, strategy, selectedIds, seatConflictChoices)
      setResult(res)
      if (res.success) {
        setTimeout(() => {
          onSuccess()
        }, 1500)
      }
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    setImporting(false)
    onClose()
  }

  if (!open) return null

  const hasConflicts = preview.overwriteZones.some((z) => z.conflictSeats.length > 0) ||
    preview.mergeZones.some((z) => z.conflictSeats.length > 0)

  const canImport = preview.isValid && (
    strategy === 'selective' ? selectedZoneIds.size > 0 : allZones.length > 0
  )

  const renderZoneCard = (zoneInfo: ZoneConflictInfo, type: 'new' | 'overwrite' | 'merge') => {
    const isExpanded = expandedZones.has(zoneInfo.zone.id)
    const isSelected = selectedZoneIds.has(zoneInfo.zone.id)
    const typeConfig = {
      new: { icon: Plus, color: 'neon-green', borderColor: 'border-neon-green/30', bgColor: 'bg-neon-green/10', label: '新增区域' },
      overwrite: { icon: ArrowRightLeft, color: 'neon-pink', borderColor: 'border-neon-pink/30', bgColor: 'bg-neon-pink/10', label: '覆盖区域' },
      merge: { icon: Merge, color: 'neon-cyan', borderColor: 'border-neon-cyan/30', bgColor: 'bg-neon-cyan/10', label: '合并区域' },
    }
    const config = typeConfig[type]
    const Icon = config.icon

    const zoneConflictCount = zoneInfo.conflictSeats.length
    const zoneOverwriteCount = zoneInfo.conflictSeats.filter((c) => seatConflictChoices[c.seatId] === 'overwrite').length
    const zoneKeepCount = zoneInfo.conflictSeats.filter((c) => seatConflictChoices[c.seatId] === 'keep').length
    const zoneSkipCount = zoneInfo.conflictSeats.filter((c) => seatConflictChoices[c.seatId] === 'skip').length

    return (
      <div key={zoneInfo.zone.id} className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}>
        <div className="px-3 py-2 flex items-center gap-2">
          {strategy === 'selective' && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleZoneSelection(zoneInfo.zone.id)}
              className="w-4 h-4 rounded border-white/30 bg-surface-light text-neon-purple focus:ring-neon-purple/50"
            />
          )}
          <button
            onClick={() => toggleExpand(zoneInfo.zone.id)}
            className="text-white/40 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <Icon size={16} className={`text-${config.color}`} />
          <span className={`text-xs px-1.5 py-0.5 rounded bg-${config.color}/20 text-${config.color}`}>
            {config.label}
          </span>
          <span className="font-medium text-white text-sm flex-1">{zoneInfo.zone.name}</span>
          <span className="text-xs text-white/40">
            {zoneInfo.assignedSeats}/{zoneInfo.totalSeats} 个已分配
          </span>
          {zoneInfo.conflictSeats.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
              {zoneConflictCount} 个冲突
            </span>
          )}
        </div>

        {isExpanded && zoneInfo.conflictSeats.length > 0 && (
          <div className="border-t border-white/5 px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-white/40">冲突座位详情：</div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-white/30">批量：</span>
                <button
                  onClick={() => handleBulkChoice(zoneInfo.zone.id, 'keep')}
                  className="px-2 py-0.5 text-[10px] rounded bg-white/10 text-white/50 hover:bg-white/20 hover:text-white transition-colors"
                >
                  全部保留
                </button>
                <button
                  onClick={() => handleBulkChoice(zoneInfo.zone.id, 'overwrite')}
                  className="px-2 py-0.5 text-[10px] rounded bg-neon-pink/20 text-neon-pink/70 hover:bg-neon-pink/30 hover:text-neon-pink transition-colors"
                >
                  全部覆盖
                </button>
                <button
                  onClick={() => handleBulkChoice(zoneInfo.zone.id, 'skip')}
                  className="px-2 py-0.5 text-[10px] rounded bg-yellow-500/20 text-yellow-400/70 hover:bg-yellow-500/30 hover:text-yellow-400 transition-colors"
                >
                  全部跳过
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-2 text-[10px]">
              <span className="text-white/30">本区域：</span>
              <span className="text-neon-green">{zoneKeepCount} 保留</span>
              <span className="text-neon-pink">{zoneOverwriteCount} 覆盖</span>
              <span className="text-yellow-400">{zoneSkipCount} 跳过</span>
            </div>
            <div className="overflow-auto max-h-48 space-y-1">
              {zoneInfo.conflictSeats.map((conflict) => {
                const choice = seatConflictChoices[conflict.seatId] || 'keep'
                return (
                  <div key={conflict.seatId} className="bg-surface-light/50 rounded px-2 py-1.5">
                    <div className="flex items-center gap-2 text-xs mb-1">
                      <span className="font-mono text-white/60 w-14">{conflict.seatNumber}</span>
                      <span className="text-white/80 flex-1 truncate">{conflict.existingMember}</span>
                      <ArrowRightLeft size={12} className="text-neon-pink flex-shrink-0" />
                      <span className="text-neon-pink flex-1 truncate">{conflict.newMember}</span>
                    </div>
                    <div className="flex items-center gap-1 ml-14">
                      <button
                        onClick={() => handleSeatChoiceChange(conflict.seatId, 'keep')}
                        className={`flex-1 px-2 py-1 text-[10px] rounded transition-all ${
                          choice === 'keep'
                            ? 'bg-neon-green/20 text-neon-green border border-neon-green/40'
                            : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
                        }`}
                      >
                        保留原数据
                      </button>
                      <button
                        onClick={() => handleSeatChoiceChange(conflict.seatId, 'overwrite')}
                        className={`flex-1 px-2 py-1 text-[10px] rounded transition-all ${
                          choice === 'overwrite'
                            ? 'bg-neon-pink/20 text-neon-pink border border-neon-pink/40'
                            : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
                        }`}
                      >
                        覆盖为导入
                      </button>
                      <button
                        onClick={() => handleSeatChoiceChange(conflict.seatId, 'skip')}
                        className={`flex-1 px-2 py-1 text-[10px] rounded transition-all ${
                          choice === 'skip'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                            : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
                        }`}
                      >
                        跳过
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div className="glass-panel p-6 w-full max-w-4xl max-h-[85vh] flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center" style={{ boxShadow: '0 0 15px rgba(191,90,242,0.2)' }}>
              <MapPin size={20} className="text-neon-purple" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">导入数据预览</h2>
              <p className="text-xs text-white/30">{fileName}</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto space-y-4">
          {preview.formatErrors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
                <AlertCircle size={16} /> 格式错误
              </div>
              {preview.formatErrors.map((err, i) => (
                <p key={i} className="text-xs text-red-400/80">{err}</p>
              ))}
            </div>
          )}

          {preview.isValid && (
            <>
              <div className="p-3 rounded-lg bg-surface-light border border-white/10">
                <div className="flex items-center gap-2 text-white/60 text-sm mb-3">
                  <AlertTriangle size={16} className="text-yellow-400" /> 导入策略
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => setStrategy('overwrite')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      strategy === 'overwrite'
                        ? 'border-neon-pink/50 bg-neon-pink/10'
                        : 'border-white/10 bg-surface-lighter hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowRightLeft size={14} className={strategy === 'overwrite' ? 'text-neon-pink' : 'text-white/40'} />
                      <span className={`text-sm font-medium ${strategy === 'overwrite' ? 'text-neon-pink' : 'text-white/60'}`}>
                        全部覆盖
                      </span>
                    </div>
                    <p className="text-xs text-white/30">用导入数据覆盖现有数据</p>
                  </button>
                  <button
                    onClick={() => setStrategy('mergeEmpty')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      strategy === 'mergeEmpty'
                        ? 'border-neon-cyan/50 bg-neon-cyan/10'
                        : 'border-white/10 bg-surface-lighter hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Merge size={14} className={strategy === 'mergeEmpty' ? 'text-neon-cyan' : 'text-white/40'} />
                      <span className={`text-sm font-medium ${strategy === 'mergeEmpty' ? 'text-neon-cyan' : 'text-white/60'}`}>
                        只合并空座位
                      </span>
                    </div>
                    <p className="text-xs text-white/30">仅导入现有空座位的数据</p>
                  </button>
                  <button
                    onClick={() => setStrategy('selective')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      strategy === 'selective'
                        ? 'border-neon-purple/50 bg-neon-purple/10'
                        : 'border-white/10 bg-surface-lighter hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin size={14} className={strategy === 'selective' ? 'text-neon-purple' : 'text-white/40'} />
                      <span className={`text-sm font-medium ${strategy === 'selective' ? 'text-neon-purple' : 'text-white/60'}`}>
                        按区域选择
                      </span>
                    </div>
                    <p className="text-xs text-white/30">手动选择要导入的区域</p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="新增区域" value={preview.newZones.length} subValue={`${preview.totalNew} 人`} color="text-neon-green" />
                <StatCard label="被覆盖" value={preview.overwriteZones.length} subValue={`${preview.totalOverwrite} 个冲突`} color={hasConflicts ? 'text-neon-pink' : 'text-white/40'} />
                <StatCard label="合并区域" value={preview.mergeZones.length} subValue={`${preview.totalMerge} 个空座位`} color="text-neon-cyan" />
                <StatCard label="无效座位" value={preview.totalInvalid} color={preview.totalInvalid > 0 ? 'text-yellow-400' : 'text-white/40'} />
              </div>

              {hasConflicts && (
                <div className="p-3 rounded-lg bg-surface-light border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <AlertTriangle size={16} className="text-neon-pink" /> 冲突座位处理
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-white/30">全部：</span>
                      <button
                        onClick={() => handleBulkChoice('all', 'keep')}
                        className="px-2 py-0.5 text-xs rounded bg-neon-green/10 text-neon-green/70 hover:bg-neon-green/20 transition-colors"
                      >
                        全部保留
                      </button>
                      <button
                        onClick={() => handleBulkChoice('all', 'overwrite')}
                        className="px-2 py-0.5 text-xs rounded bg-neon-pink/10 text-neon-pink/70 hover:bg-neon-pink/20 transition-colors"
                      >
                        全部覆盖
                      </button>
                      <button
                        onClick={() => handleBulkChoice('all', 'skip')}
                        className="px-2 py-0.5 text-xs rounded bg-yellow-500/10 text-yellow-400/70 hover:bg-yellow-500/20 transition-colors"
                      >
                        全部跳过
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-neon-green/10 rounded-lg p-2 text-center">
                      <div className="font-mono font-bold text-lg text-neon-green">{conflictStats.keep}</div>
                      <div className="text-xs text-neon-green/60">保留原数据</div>
                    </div>
                    <div className="bg-neon-pink/10 rounded-lg p-2 text-center">
                      <div className="font-mono font-bold text-lg text-neon-pink">{conflictStats.overwrite}</div>
                      <div className="text-xs text-neon-pink/60">覆盖为导入</div>
                    </div>
                    <div className="bg-yellow-500/10 rounded-lg p-2 text-center">
                      <div className="font-mono font-bold text-lg text-yellow-400">{conflictStats.skip}</div>
                      <div className="text-xs text-yellow-400/60">跳过</div>
                    </div>
                  </div>
                </div>
              )}

              {preview.duplicateMembers.length > 0 && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-center gap-2 text-yellow-400 text-sm mb-2">
                    <Users size={16} /> 重复成员（共 {preview.duplicateMembers.length} 个）
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.duplicateMembers.slice(0, 10).map((name) => (
                      <span key={name} className="px-2 py-0.5 rounded bg-yellow-500/20 text-xs text-yellow-400">
                        {name}
                      </span>
                    ))}
                    {preview.duplicateMembers.length > 10 && (
                      <span className="px-2 py-0.5 text-xs text-yellow-400/60">
                        +{preview.duplicateMembers.length - 10} 更多
                      </span>
                    )}
                  </div>
                </div>
              )}

              {preview.invalidSeats.length > 0 && (
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                  <div className="flex items-center gap-2 text-orange-400 text-sm mb-2">
                    <AlertCircle size={16} /> 无效座位（共 {preview.invalidSeats.length} 个）
                  </div>
                  <div className="overflow-auto max-h-24 space-y-1">
                    {preview.invalidSeats.slice(0, 10).map((seat, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-orange-400/80">{seat.zoneName} {seat.seatNumber}</span>
                        <span className="text-orange-400/50">- {seat.reason}</span>
                      </div>
                    ))}
                    {preview.invalidSeats.length > 10 && (
                      <p className="text-xs text-orange-400/60">...还有 {preview.invalidSeats.length - 10} 条</p>
                    )}
                  </div>
                </div>
              )}

              {strategy === 'selective' && allZones.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAll}
                    className="px-3 py-1 text-xs rounded bg-surface-light text-white/60 hover:text-white transition-colors"
                  >
                    全选
                  </button>
                  <button
                    onClick={deselectAll}
                    className="px-3 py-1 text-xs rounded bg-surface-light text-white/60 hover:text-white transition-colors"
                  >
                    取消全选
                  </button>
                  <span className="text-xs text-white/40 ml-auto">
                    已选择 {selectedZoneIds.size} / {allZones.length} 个区域
                  </span>
                </div>
              )}

              {allZones.length > 0 && (
                <div className="space-y-2">
                  {preview.newZones.map((z) => renderZoneCard(z, 'new'))}
                  {preview.overwriteZones.map((z) => renderZoneCard(z, 'overwrite'))}
                  {preview.mergeZones.map((z) => renderZoneCard(z, 'merge'))}
                </div>
              )}
            </>
          )}

          {result && (
            <div className={`p-4 rounded-lg border ${result.success ? 'bg-neon-green/10 border-neon-green/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle size={20} className="text-neon-green" />
                ) : (
                  <AlertCircle size={20} className="text-red-400" />
                )}
                <span className={result.success ? 'text-neon-green' : 'text-red-400'}>{result.message}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-5 flex-shrink-0">
          <button onClick={handleClose} className="flex-1 px-4 py-2.5 rounded-lg bg-surface-light text-white/60 hover:text-white transition-colors">
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canImport || importing || result?.success}
            className="flex-1 px-4 py-2.5 rounded-lg bg-neon-purple text-white font-medium hover:bg-neon-purple/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ boxShadow: canImport && !importing && !result?.success ? '0 0 20px rgba(191,90,242,0.3)' : 'none' }}
          >
            {importing
              ? '导入中...'
              : result?.success
              ? '导入成功'
              : hasConflicts
              ? `确认导入 (覆盖 ${conflictStats.overwrite} / 保留 ${conflictStats.keep} / 跳过 ${conflictStats.skip})`
              : `确认导入 (${selectedZoneIds.size} 个区域)`}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, subValue, color }: { label: string; value: number; subValue?: string; color: string }) {
  return (
    <div className="bg-surface-light/50 rounded-lg p-3">
      <div className="text-xs text-white/30 mb-1">{label}</div>
      <div className={`font-mono font-bold text-xl ${color}`}>{value}</div>
      {subValue && <div className="text-xs text-white/30 mt-0.5">{subValue}</div>}
    </div>
  )
}
