import { useState, useRef, useMemo } from 'react'
import { X, Upload, FileText, AlertTriangle, CheckCircle, Users, MapPin, Ticket } from 'lucide-react'
import { useVenueStore, type MemberImportItem } from '@/store/venueStore'
import type { TicketStatus } from '@/types'

interface ImportPreview {
  items: MemberImportItem[]
  matched: number
  unmatchedZones: string[]
  unmatchedSeats: string[]
  duplicateMembers: string[]
  errors: string[]
}

const TICKET_STATUS_MAP: Record<string, TicketStatus> = {
  'none': 'none',
  '未持有': 'none',
  '无': 'none',
  'confirmed': 'confirmed',
  '已确认': 'confirmed',
  '确认': 'confirmed',
  'pending': 'pending',
  '待处理': 'pending',
  '待确认': 'pending',
  'exchanged': 'exchanged',
  '已换票': 'exchanged',
  '换票': 'exchanged',
}

function normalizeTicketStatus(status: string): TicketStatus {
  const key = status.trim().toLowerCase()
  return TICKET_STATUS_MAP[key] || TICKET_STATUS_MAP[status.trim()] || 'none'
}

function parseCSV(text: string): MemberImportItem[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length === 0) return []

  const headerLine = lines[0]
  const headers = headerLine.split(/[,，\t]/).map((h) => h.trim().toLowerCase())

  const nameIdx = headers.findIndex((h) => h.includes('姓名') || h.includes('名字') || h.includes('成员') || h === 'name' || h === 'membername')
  const zoneIdx = headers.findIndex((h) => h.includes('区域') || h.includes('区') || h === 'zone' || h === 'zonename' || h.includes('area'))
  const seatIdx = headers.findIndex((h) => h.includes('座位') || h.includes('座号') || h === 'seat' || h === 'seatnumber')
  const colorIdx = headers.findIndex((h) => h.includes('颜色') || h.includes('应援色') || h === 'color' || h === 'cheeringcolor')
  const statusIdx = headers.findIndex((h) => h.includes('状态') || h.includes('换票') || h === 'status' || h === 'ticketstatus')
  const suppliesIdx = headers.findIndex((h) => h.includes('物资') || h.includes('物品') || h === 'supplies' || h === 'items')

  if (nameIdx === -1 || zoneIdx === -1 || seatIdx === -1) {
    throw new Error('CSV 缺少必要列：成员姓名、区域名、座位号')
  }

  const items: MemberImportItem[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = line.split(/[,，\t]/).map((v) => v.trim())
    if (values.length < Math.max(nameIdx, zoneIdx, seatIdx) + 1) continue

    const memberName = values[nameIdx] || ''
    const zoneName = values[zoneIdx] || ''
    const seatNumber = values[seatIdx] || ''

    if (!memberName || !zoneName || !seatNumber) continue

    items.push({
      memberName,
      zoneName,
      seatNumber,
      cheeringColor: colorIdx >= 0 ? values[colorIdx] || '' : '',
      ticketStatus: statusIdx >= 0 ? normalizeTicketStatus(values[statusIdx] || '') : 'none',
      supplies: suppliesIdx >= 0 ? values[suppliesIdx] || '' : '',
    })
  }

  return items
}

export function MemberImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const zones = useVenueStore((s) => s.zones)
  const seats = useVenueStore((s) => s.seats)
  const batchImportMembers = useVenueStore((s) => s.batchImportMembers)

  const [inputText, setInputText] = useState('')
  const [step, setStep] = useState<'input' | 'preview' | 'result'>('input')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importResult, setImportResult] = useState<{ matched: number; unmatchedZones: string[]; unmatchedSeats: string[]; duplicateMembers: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const zoneNames = useMemo(() => zones.map((z) => z.name), [zones])

  const previewMatch = (items: MemberImportItem[]): ImportPreview => {
    const zoneNameMap = new Map(zones.map((z) => [z.name.trim().toLowerCase(), z]))
    const unmatchedZones = new Set<string>()
    const unmatchedSeats: string[] = []
    const duplicateMembers: string[] = []
    const seenMembers = new Set<string>()
    const errors: string[] = []
    let matched = 0

    for (const item of items) {
      const memberKey = item.memberName.trim()
      if (memberKey && seenMembers.has(memberKey)) {
        if (!duplicateMembers.includes(memberKey)) {
          duplicateMembers.push(memberKey)
        }
      }
      if (memberKey) seenMembers.add(memberKey)

      const zoneKey = item.zoneName.trim().toLowerCase()
      const zone = zoneNameMap.get(zoneKey)
      if (!zone) {
        unmatchedZones.add(item.zoneName)
        continue
      }

      const zoneSeats = seats[zone.id] || []
      const seat = zoneSeats.find((s) => s.seatNumber === item.seatNumber.trim())
      if (!seat) {
        unmatchedSeats.push(`${item.zoneName} ${item.seatNumber}`)
        continue
      }

      matched++
    }

    if (items.length === 0) {
      errors.push('未解析到有效数据行')
    }

    return { items, matched, unmatchedZones: Array.from(unmatchedZones), unmatchedSeats, duplicateMembers, errors }
  }

  const handleParse = () => {
    try {
      const items = parseCSV(inputText)
      const previewData = previewMatch(items)
      setPreview(previewData)
      setStep('preview')
    } catch (e) {
      const message = e instanceof Error ? e.message : '解析失败'
      setPreview({ items: [], matched: 0, unmatchedZones: [], unmatchedSeats: [], duplicateMembers: [], errors: [message] })
      setStep('preview')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setInputText(reader.result as string)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleConfirm = () => {
    if (!preview) return
    const result = batchImportMembers(preview.items)
    setImportResult(result)
    setStep('result')
  }

  const handleReset = () => {
    setInputText('')
    setStep('input')
    setPreview(null)
    setImportResult(null)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  if (!open) return null

  const sampleCSV = `成员姓名,区域名,座位号,应援色,换票状态,物资
张三,A区,1-1,#FF2E97,已确认,手灯×1
李四,A区,1-2,#00F5FF,待处理,手灯×1 毛巾×1
王五,B区,2-3,#FFE600,已换票,`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div className="glass-panel p-6 w-full max-w-3xl max-h-[85vh] flex flex-col animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center" style={{ boxShadow: '0 0 15px rgba(191,90,242,0.2)' }}>
              <Users size={20} className="text-neon-purple" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">成员名单导入</h2>
              <p className="text-xs text-white/30">批量导入成员座位分配数据</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 mb-5 flex-shrink-0">
          <StepBadge active={step === 'input'} done={step !== 'input'} label="输入数据" num={1} />
          <StepBadge active={step === 'preview'} done={step === 'result'} label="确认预览" num={2} />
          <StepBadge active={step === 'result'} label="导入完成" num={3} />
        </div>

        {step === 'input' && (
          <>
            <div className="flex-1 overflow-auto space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">现有区域</label>
                <div className="flex flex-wrap gap-2">
                  {zoneNames.length === 0 ? (
                    <span className="text-xs text-white/30">暂无区域，请先创建区域</span>
                  ) : (
                    zoneNames.map((name) => (
                      <span key={name} className="px-2 py-1 rounded-md bg-surface-light text-xs text-white/60">
                        {name}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">
                  选择方式
                </label>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-white/20 text-white/60 hover:border-neon-purple/50 hover:text-neon-purple transition-all"
                  >
                    <Upload size={16} /> 上传 CSV 文件
                  </button>
                  <button
                    onClick={() => setInputText(sampleCSV)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-white/20 text-white/60 hover:border-neon-cyan/50 hover:text-neon-cyan transition-all"
                  >
                    <FileText size={16} /> 填入示例
                  </button>
                </div>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">
                  粘贴 CSV 文本
                </label>
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`成员姓名,区域名,座位号,应援色,换票状态,物资
张三,A区,1-1,#FF2E97,已确认,手灯×1
李四,A区,1-2,#00F5FF,待处理,手灯×1 毛巾×1
王五,B区,2-3,#FFE600,已换票,

支持的列名：
• 成员姓名：姓名/名字/成员/name
• 区域名：区域/区/zone/area
• 座位号：座位/座号/seat/seatNumber
• 应援色（可选）：颜色/应援色/color
• 换票状态（可选）：状态/换票/ticketStatus
  支持的值：未持有/已确认/待处理/已换票
• 物资（可选）：物资/物品/supplies

支持逗号、中文逗号、制表符分隔`}
                  className="w-full h-48 bg-surface-light border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-neon-purple/50 transition-colors font-mono text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5 flex-shrink-0">
              <button onClick={handleClose} className="flex-1 px-4 py-2.5 rounded-lg bg-surface-light text-white/60 hover:text-white transition-colors">
                取消
              </button>
              <button
                onClick={handleParse}
                disabled={!inputText.trim() || zoneNames.length === 0}
                className="flex-1 px-4 py-2.5 rounded-lg bg-neon-purple text-white font-medium hover:bg-neon-purple/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ boxShadow: inputText.trim() && zoneNames.length > 0 ? '0 0 20px rgba(191,90,242,0.3)' : 'none' }}
              >
                解析并预览
              </button>
            </div>
          </>
        )}

        {step === 'preview' && preview && (
          <>
            <div className="flex-1 overflow-auto space-y-4">
              {preview.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
                    <AlertTriangle size={16} /> 解析错误
                  </div>
                  {preview.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-400/80">{err}</p>
                  ))}
                </div>
              )}

              {preview.items.length > 0 && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatCard label="解析成功" value={preview.items.length} color="text-neon-cyan" />
                    <StatCard label="匹配成功" value={preview.matched} color="text-neon-green" />
                    <StatCard label="未匹配区域" value={preview.unmatchedZones.length} color={preview.unmatchedZones.length > 0 ? 'text-yellow-400' : 'text-white/40'} />
                    <StatCard label="未匹配座位" value={preview.unmatchedSeats.length} color={preview.unmatchedSeats.length > 0 ? 'text-yellow-400' : 'text-white/40'} />
                  </div>

                  {preview.duplicateMembers.length > 0 && (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <div className="flex items-center gap-2 text-yellow-400 text-sm mb-2">
                        <AlertTriangle size={16} /> 检测到重复成员（共 {preview.duplicateMembers.length} 个）
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {preview.duplicateMembers.map((name) => (
                          <span key={name} className="px-2 py-0.5 rounded bg-yellow-500/20 text-xs text-yellow-400">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {preview.unmatchedZones.length > 0 && (
                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                      <div className="flex items-center gap-2 text-orange-400 text-sm mb-2">
                        <MapPin size={16} /> 未匹配的区域
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {preview.unmatchedZones.map((name) => (
                          <span key={name} className="px-2 py-0.5 rounded bg-orange-500/20 text-xs text-orange-400">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {preview.unmatchedSeats.length > 0 && (
                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                      <div className="flex items-center gap-2 text-orange-400 text-sm mb-2">
                        <Ticket size={16} /> 未匹配的座位（共 {preview.unmatchedSeats.length} 个）
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-auto">
                        {preview.unmatchedSeats.slice(0, 20).map((seat) => (
                          <span key={seat} className="px-2 py-0.5 rounded bg-orange-500/20 text-xs text-orange-400">
                            {seat}
                          </span>
                        ))}
                        {preview.unmatchedSeats.length > 20 && (
                          <span className="px-2 py-0.5 text-xs text-orange-400/60">
                            +{preview.unmatchedSeats.length - 20} 更多
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-surface-light rounded-lg overflow-hidden">
                    <div className="px-3 py-2 border-b border-white/5">
                      <span className="text-sm text-white/60">数据预览（前 10 条）</span>
                    </div>
                    <div className="overflow-auto max-h-48">
                      <table className="w-full text-sm">
                        <thead className="bg-surface-lighter sticky top-0">
                          <tr className="text-white/40 text-xs">
                            <th className="px-3 py-2 text-left font-medium">成员</th>
                            <th className="px-3 py-2 text-left font-medium">区域</th>
                            <th className="px-3 py-2 text-left font-medium">座位</th>
                            <th className="px-3 py-2 text-left font-medium">应援色</th>
                            <th className="px-3 py-2 text-left font-medium">状态</th>
                            <th className="px-3 py-2 text-left font-medium">物资</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.items.slice(0, 10).map((item, i) => (
                            <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02]">
                              <td className="px-3 py-1.5 text-white/80 font-mono">{item.memberName}</td>
                              <td className="px-3 py-1.5 text-white/60">{item.zoneName}</td>
                              <td className="px-3 py-1.5 text-white/60 font-mono">{item.seatNumber}</td>
                              <td className="px-3 py-1.5">
                                {item.cheeringColor ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: item.cheeringColor }} />
                                    <span className="text-white/40 font-mono text-xs">{item.cheeringColor}</span>
                                  </div>
                                ) : (
                                  <span className="text-white/20">-</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5">
                                <TicketStatusBadge status={item.ticketStatus} />
                              </td>
                              <td className="px-3 py-1.5 text-white/60 text-xs max-w-[120px] truncate" title={item.supplies}>
                                {item.supplies || <span className="text-white/20">-</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-5 flex-shrink-0">
              <button onClick={() => setStep('input')} className="flex-1 px-4 py-2.5 rounded-lg bg-surface-light text-white/60 hover:text-white transition-colors">
                返回修改
              </button>
              <button
                onClick={handleConfirm}
                disabled={preview.errors.length > 0 || preview.matched === 0}
                className="flex-1 px-4 py-2.5 rounded-lg bg-neon-green text-white font-medium hover:bg-neon-green/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                style={{ boxShadow: preview.errors.length === 0 && preview.matched > 0 ? '0 0 20px rgba(57,255,20,0.3)' : 'none' }}
              >
                确认导入 {preview.matched} 条
              </button>
            </div>
          </>
        )}

        {step === 'result' && importResult && (
          <>
            <div className="flex-1 overflow-auto flex items-center justify-center">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-neon-green/10 flex items-center justify-center" style={{ boxShadow: '0 0 30px rgba(57,255,20,0.2)' }}>
                  <CheckCircle size={40} className="text-neon-green" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">导入完成</h3>
                  <p className="text-white/40 text-sm">成功导入 {importResult.matched} 条成员座位数据</p>
                </div>
                {(importResult.unmatchedZones.length > 0 || importResult.unmatchedSeats.length > 0 || importResult.duplicateMembers.length > 0) && (
                  <div className="text-left space-y-3 max-w-md mx-auto">
                    {importResult.duplicateMembers.length > 0 && (
                      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <div className="flex items-center gap-2 text-yellow-400 text-sm mb-1">
                          <AlertTriangle size={14} /> 重复成员（{importResult.duplicateMembers.length} 个）
                        </div>
                        <p className="text-xs text-yellow-400/70">{importResult.duplicateMembers.join('、')}</p>
                      </div>
                    )}
                    {importResult.unmatchedZones.length > 0 && (
                      <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                        <div className="flex items-center gap-2 text-orange-400 text-sm mb-1">
                          <MapPin size={14} /> 未匹配区域（{importResult.unmatchedZones.length} 个）
                        </div>
                        <p className="text-xs text-orange-400/70">{importResult.unmatchedZones.join('、')}</p>
                      </div>
                    )}
                    {importResult.unmatchedSeats.length > 0 && (
                      <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                        <div className="flex items-center gap-2 text-orange-400 text-sm mb-1">
                          <Ticket size={14} /> 未匹配座位（{importResult.unmatchedSeats.length} 个）
                        </div>
                        <p className="text-xs text-orange-400/70">{importResult.unmatchedSeats.slice(0, 5).join('、')}{importResult.unmatchedSeats.length > 5 ? '...' : ''}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-5 flex-shrink-0">
              <button onClick={handleReset} className="flex-1 px-4 py-2.5 rounded-lg bg-surface-light text-white/60 hover:text-white transition-colors">
                继续导入
              </button>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-lg bg-neon-pink text-white font-medium hover:bg-neon-pink/80 transition-colors"
                style={{ boxShadow: '0 0 20px rgba(255,46,151,0.3)' }}
              >
                完成
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StepBadge({ active, done, label, num }: { active: boolean; done?: boolean; label: string; num: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all" style={{
      backgroundColor: active ? 'rgba(191,90,242,0.15)' : done ? 'rgba(57,255,20,0.1)' : 'rgba(255,255,255,0.03)',
      borderWidth: '1px',
      borderColor: active ? 'rgba(191,90,242,0.3)' : done ? 'rgba(57,255,20,0.3)' : 'rgba(255,255,255,0.05)',
    }}>
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors" style={{
        backgroundColor: active ? '#BF5AF2' : done ? '#39FF14' : 'rgba(255,255,255,0.1)',
        color: active || done ? '#000' : 'rgba(255,255,255,0.4)',
      }}>
        {done ? '✓' : num}
      </span>
      <span style={{ color: active ? '#BF5AF2' : done ? '#39FF14' : 'rgba(255,255,255,0.4)' }}>{label}</span>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface-light/50 rounded-lg p-3">
      <div className="text-xs text-white/30 mb-1">{label}</div>
      <div className={`font-mono font-bold text-xl ${color}`}>{value}</div>
    </div>
  )
}

function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const config = {
    none: { label: '未持有', color: 'bg-white/10 text-white/40' },
    confirmed: { label: '已确认', color: 'bg-neon-green/20 text-neon-green' },
    pending: { label: '待处理', color: 'bg-yellow-500/20 text-yellow-400' },
    exchanged: { label: '已换票', color: 'bg-neon-cyan/20 text-neon-cyan' },
  }
  const { label, color } = config[status]
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs ${color}`}>
      {label}
    </span>
  )
}
