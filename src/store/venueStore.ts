import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Zone, Seat, VenueData, TicketStatus, ImportPreviewResult, ImportStrategy, ZoneConflictInfo, SeatConflictInfo, SeatConflictChoice, InvalidSeatInfo, ActivityLogType, ActivityLogEntry } from '@/types'

export type { MemberImportItem }

type HistoryActionType =
  | 'updateSeat'
  | 'batchUpdateSeats'
  | 'batchImportMembers'
  | 'clearZoneSeats'
  | 'importData'
  | 'clearAll'
  | 'addZone'
  | 'removeZone'
  | 'duplicateZone'
  | 'updateZoneLayout'
  | 'batchUpdateZoneLayouts'
  | 'resetZoneLayouts'

const ZONE_LAYOUT_ONLY_ACTIONS: HistoryActionType[] = [
  'updateZoneLayout',
  'batchUpdateZoneLayouts',
  'resetZoneLayouts',
]

interface HistoryEntry {
  type: HistoryActionType
  before: Record<string, Seat[]>
  beforeZones?: Zone[]
  label: string
}

export interface SeatSearchResult {
  seat: Seat
  zoneName: string
  zoneId: string
  matchedFields: string[]
}

export interface SearchOptions {
  memberName?: string
  seatNumber?: string
  supplies?: string
  ticketStatus?: TicketStatus
  obstructionNote?: string
  isObstructed?: boolean
}

export interface GlobalSearchGroup {
  zoneId: string
  zoneName: string
  zoneColor: string
  results: SeatSearchResult[]
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function createActivityLogEntry(type: ActivityLogType, author: string, data: Partial<ActivityLogEntry> = {}): ActivityLogEntry {
  return {
    id: generateId(),
    timestamp: Date.now(),
    type,
    author,
    ...data,
  }
}

function createSeatsForZone(zone: Zone): Seat[] {
  const seats: Seat[] = []
  for (let r = 0; r < zone.rows; r++) {
    for (let c = 0; c < zone.cols; c++) {
      seats.push({
        id: `${zone.id}-${r}-${c}`,
        zoneId: zone.id,
        row: r,
        col: c,
        seatNumber: `${r + 1}-${c + 1}`,
        memberName: '',
        cheeringColor: '',
        isObstructed: false,
        obstructionNote: '',
        ticketStatus: 'none',
        supplies: '',
        activityLog: [],
      })
    }
  }
  return seats
}

interface MemberImportItem {
  memberName: string
  zoneName: string
  seatNumber: string
  cheeringColor: string
  ticketStatus: TicketStatus
  supplies: string
}

interface VenueStore extends VenueData {
  past: HistoryEntry[]
  future: HistoryEntry[]
  canUndo: boolean
  canRedo: boolean
  addZone: (name: string, rows: number, cols: number, color: string, recordHistory?: boolean) => string
  removeZone: (zoneId: string, recordHistory?: boolean) => void
  duplicateZone: (zoneId: string, recordHistory?: boolean) => string | null
  updateZone: (zoneId: string, updates: Partial<Pick<Zone, 'name' | 'color'>>) => void
  updateZoneLayout: (zoneId: string, updates: Partial<Pick<Zone, 'x' | 'y' | 'width' | 'height' | 'color'>>, recordHistory?: boolean, historyLabel?: string) => void
  updateSeat: (zoneId: string, seatId: string, updates: Partial<Omit<Seat, 'id' | 'zoneId' | 'row' | 'col' | 'seatNumber' | 'activityLog'>>, recordHistory?: boolean) => void
  batchUpdateSeats: (zoneId: string, seatIds: string[], updates: Partial<Omit<Seat, 'id' | 'zoneId' | 'row' | 'col' | 'seatNumber' | 'activityLog'>>, recordHistory?: boolean, historyLabel?: string) => void
  batchImportMembers: (items: MemberImportItem[], recordHistory?: boolean) => { matched: number; unmatchedZones: string[]; unmatchedSeats: string[]; duplicateMembers: string[] }
  clearZoneSeats: (zoneId: string, recordHistory?: boolean) => void
  exportData: () => string
  importData: (json: string, recordHistory?: boolean) => boolean
  previewImportData: (json: string, strategy: ImportStrategy) => ImportPreviewResult
  executeConfirmedImport: (preview: ImportPreviewResult, strategy: ImportStrategy, selectedZoneIds: string[], seatConflictChoices?: Record<string, SeatConflictChoice>, recordHistory?: boolean) => { success: boolean; message: string }
  clearAll: (recordHistory?: boolean) => void
  getZoneSeats: (zoneId: string) => Seat[]
  getZoneStats: (zoneId: string) => { total: number; assigned: number; obstructed: number; ticketStats: Record<TicketStatus, number> }
  getGlobalStats: () => { totalZones: number; totalSeats: number; totalAssigned: number; totalObstructed: number; ticketStats: Record<TicketStatus, number> }
  searchSeats: (zoneId: string, options: SearchOptions) => SeatSearchResult[]
  searchAllSeats: (options: SearchOptions) => GlobalSearchGroup[]
  resetZoneLayouts: (recordHistory?: boolean) => void
  ensureZoneLayouts: () => void
  undo: () => void
  redo: () => void
  addSeatNote: (zoneId: string, seatId: string, note: string, author?: string) => void
  removeSeatNote: (zoneId: string, seatId: string, entryId: string) => void
  ensureActivityLogMigration: () => void
}

const defaultTicketStats: Record<TicketStatus, number> = {
  none: 0,
  confirmed: 0,
  pending: 0,
  exchanged: 0,
}

function cloneSeats(seats: Record<string, Seat[]>): Record<string, Seat[]> {
  const cloned: Record<string, Seat[]> = {}
  for (const [zoneId, zoneSeats] of Object.entries(seats)) {
    cloned[zoneId] = zoneSeats.map((s) => ({ ...s }))
  }
  return cloned
}

export const useVenueStore = create<VenueStore>()(
  persist(
    (set, get) => ({
      zones: [],
      seats: {},
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,

      addZone: (name, rows, cols, color, recordHistory = true) => {
        const id = generateId()
        const existingZones = get().zones
        const defaultWidth = Math.max(120, cols * 30)
        const defaultHeight = Math.max(80, rows * 25)
        const defaultX = 50 + (existingZones.length % 4) * 180
        const defaultY = 50 + Math.floor(existingZones.length / 4) * 120
        const zone: Zone = { id, name, rows, cols, color, x: defaultX, y: defaultY, width: defaultWidth, height: defaultHeight }
        const newSeats = createSeatsForZone(zone)

        if (recordHistory) {
          const before = cloneSeats(get().seats)
          const beforeZones = get().zones.map((z) => ({ ...z }))
          set((s) => ({
            past: [...s.past, { type: 'addZone', before, beforeZones, label: `创建区域「${name}」` }],
            future: [],
            canUndo: true,
            canRedo: false,
          }))
        }

        set((state) => ({
          zones: [...state.zones, zone],
          seats: { ...state.seats, [id]: newSeats },
        }))
        return id
      },

      removeZone: (zoneId, recordHistory = true) => {
        const state = get()
        const zone = state.zones.find((z) => z.id === zoneId)
        if (!zone) return

        if (recordHistory) {
          const before = cloneSeats(state.seats)
          const beforeZones = state.zones.map((z) => ({ ...z }))
          set((s) => ({
            past: [...s.past, { type: 'removeZone', before, beforeZones, label: `删除区域「${zone.name}」` }],
            future: [],
            canUndo: true,
            canRedo: false,
          }))
        }

        set((state) => {
          const newSeats = { ...state.seats }
          delete newSeats[zoneId]
          return {
            zones: state.zones.filter((z) => z.id !== zoneId),
            seats: newSeats,
          }
        })
      },

      duplicateZone: (zoneId, recordHistory = true) => {
        const state = get()
        const sourceZone = state.zones.find((z) => z.id === zoneId)
        if (!sourceZone) return null

        const existingZones = state.zones
        const baseName = sourceZone.name
        let newName = `${baseName} 副本`
        let counter = 2
        const nameSet = new Set(existingZones.map((z) => z.name))
        while (nameSet.has(newName)) {
          newName = `${baseName} 副本${counter}`
          counter++
        }

        const newId = generateId()
        const offsetX = 30
        const offsetY = 30
        const newZone: Zone = {
          id: newId,
          name: newName,
          rows: sourceZone.rows,
          cols: sourceZone.cols,
          color: sourceZone.color,
          x: sourceZone.x + offsetX,
          y: sourceZone.y + offsetY,
          width: sourceZone.width,
          height: sourceZone.height,
        }
        const newSeats = createSeatsForZone(newZone)

        if (recordHistory) {
          const before = cloneSeats(state.seats)
          const beforeZones = state.zones.map((z) => ({ ...z }))
          set((s) => ({
            past: [...s.past, { type: 'duplicateZone', before, beforeZones, label: `复制区域「${sourceZone.name}」` }],
            future: [],
            canUndo: true,
            canRedo: false,
          }))
        }

        set((s) => ({
          zones: [...s.zones, newZone],
          seats: { ...s.seats, [newId]: newSeats },
        }))

        return newId
      },

      updateZone: (zoneId, updates) => {
        set((state) => ({
          zones: state.zones.map((z) => (z.id === zoneId ? { ...z, ...updates } : z)),
        }))
      },

      updateZoneLayout: (zoneId, updates, recordHistory = false, historyLabel) => {
        const state = get()
        const zone = state.zones.find((z) => z.id === zoneId)
        if (!zone) return

        const changed = Object.entries(updates).some(
          ([key, value]) => zone[key as keyof Zone] !== value
        )
        if (!changed) return

        if (recordHistory) {
          const beforeZones = state.zones.map((z) => ({ ...z }))
          set((s) => ({
            past: [...s.past, {
              type: 'updateZoneLayout',
              before: {},
              beforeZones,
              label: historyLabel || `调整「${zone.name}」布局`
            }],
            future: [],
            canUndo: true,
            canRedo: false,
          }))
        }

        set((state) => ({
          zones: state.zones.map((z) => (z.id === zoneId ? { ...z, ...updates } : z)),
        }))
      },

      resetZoneLayouts: (recordHistory = false) => {
        const state = get()
        if (state.zones.length === 0) return

        if (recordHistory) {
          const beforeZones = state.zones.map((z) => ({ ...z }))
          set((s) => ({
            past: [...s.past, {
              type: 'resetZoneLayouts',
              before: {},
              beforeZones,
              label: '重置区域布局'
            }],
            future: [],
            canUndo: true,
            canRedo: false,
          }))
        }

        set((state) => ({
          zones: state.zones.map((zone, index) => ({
            ...zone,
            x: 50 + (index % 4) * 180,
            y: 50 + Math.floor(index / 4) * 120,
            width: Math.max(120, zone.cols * 30),
            height: Math.max(80, zone.rows * 25),
          })),
        }))
      },

      ensureZoneLayouts: () => {
        set((state) => ({
          zones: state.zones.map((zone, index) => {
            const hasLayout = zone.x !== undefined && zone.y !== undefined && zone.width !== undefined && zone.height !== undefined
            if (hasLayout) return zone
            return {
              ...zone,
              x: 50 + (index % 4) * 180,
              y: 50 + Math.floor(index / 4) * 120,
              width: Math.max(120, zone.cols * 30),
              height: Math.max(80, zone.rows * 25),
            }
          }),
        }))
      },

      updateSeat: (zoneId, seatId, updates, recordHistory = true) => {
        const state = get()
        const zoneSeats = state.seats[zoneId]
        if (!zoneSeats) return

        const seat = zoneSeats.find((s) => s.id === seatId)
        if (!seat) return

        const changed = Object.entries(updates).some(
          ([key, value]) => seat[key as keyof Seat] !== value
        )
        if (!changed) return

        const activityLogs: ActivityLogEntry[] = []
        const author = '我'

        if ('memberName' in updates && seat.memberName !== updates.memberName) {
          if (updates.memberName) {
            activityLogs.push(createActivityLogEntry('assignMember', author, {
              oldValue: seat.memberName || undefined,
              newValue: updates.memberName,
              fieldName: 'memberName',
            }))
          }
        }

        if ('ticketStatus' in updates && seat.ticketStatus !== updates.ticketStatus) {
          activityLogs.push(createActivityLogEntry('changeTicketStatus', author, {
            oldValue: seat.ticketStatus,
            newValue: updates.ticketStatus,
            fieldName: 'ticketStatus',
          }))
        }

        if ('isObstructed' in updates && seat.isObstructed !== updates.isObstructed) {
          activityLogs.push(createActivityLogEntry('toggleObstruction', author, {
            oldValue: seat.isObstructed,
            newValue: updates.isObstructed,
            fieldName: 'isObstructed',
            note: updates.isObstructed ? (updates.obstructionNote || seat.obstructionNote) : undefined,
          }))
        }

        if ('obstructionNote' in updates && seat.obstructionNote !== updates.obstructionNote && seat.isObstructed) {
          activityLogs.push(createActivityLogEntry('toggleObstruction', author, {
            oldValue: seat.obstructionNote || undefined,
            newValue: updates.obstructionNote || undefined,
            fieldName: 'obstructionNote',
          }))
        }

        if ('cheeringColor' in updates && seat.cheeringColor !== updates.cheeringColor) {
          activityLogs.push(createActivityLogEntry('updateCheeringColor', author, {
            oldValue: seat.cheeringColor || undefined,
            newValue: updates.cheeringColor || undefined,
            fieldName: 'cheeringColor',
          }))
        }

        if ('supplies' in updates && seat.supplies !== updates.supplies) {
          activityLogs.push(createActivityLogEntry('updateSupplies', author, {
            oldValue: seat.supplies || undefined,
            newValue: updates.supplies || undefined,
            fieldName: 'supplies',
          }))
        }

        const isClear = Object.keys(updates).length >= 5
        if (isClear) {
          activityLogs.push(createActivityLogEntry('clearSeat', author, {
            note: '清空座位信息',
          }))
        }

        const currentActivityLog = seat.activityLog || []
        const newActivityLog = [...currentActivityLog, ...activityLogs]

        if (recordHistory) {
          const before: Record<string, Seat[]> = {
            [zoneId]: [{ ...seat }],
          }
          set((s) => ({
            past: [...s.past, { type: 'updateSeat', before, label: '编辑座位' }],
            future: [],
            canUndo: true,
            canRedo: false,
          }))
        }

        set((s) => ({
          seats: {
            ...s.seats,
            [zoneId]: s.seats[zoneId]!.map((s) => (s.id === seatId ? { ...s, ...updates, activityLog: newActivityLog } : s)),
          },
        }))
      },

      batchUpdateSeats: (zoneId, seatIds, updates, recordHistory = true, historyLabel) => {
        const state = get()
        const zoneSeats = state.seats[zoneId]
        if (!zoneSeats) return

        const idSet = new Set(seatIds)
        const affectedSeats = zoneSeats.filter((s) => idSet.has(s.id))
        if (affectedSeats.length === 0) return

        let label = historyLabel || '批量更新'
        if ('cheeringColor' in updates) label = '批量上色'
        else if ('ticketStatus' in updates) label = '批量换票状态'
        else if ('isObstructed' in updates) label = '批量遮挡标记'
        else if (Object.keys(updates).length >= 5) label = '清空座位'

        const author = '我'
        const isClear = Object.keys(updates).length >= 5

        const updatedSeats = zoneSeats.map((s) => {
          if (!idSet.has(s.id)) return s

          const activityLogs: ActivityLogEntry[] = []

          if ('memberName' in updates && s.memberName !== updates.memberName) {
            if (updates.memberName) {
              activityLogs.push(createActivityLogEntry('assignMember', author, {
                oldValue: s.memberName || undefined,
                newValue: updates.memberName,
                fieldName: 'memberName',
              }))
            }
          }

          if ('ticketStatus' in updates && s.ticketStatus !== updates.ticketStatus) {
            activityLogs.push(createActivityLogEntry('changeTicketStatus', author, {
              oldValue: s.ticketStatus,
              newValue: updates.ticketStatus,
              fieldName: 'ticketStatus',
            }))
          }

          if ('isObstructed' in updates && s.isObstructed !== updates.isObstructed) {
            activityLogs.push(createActivityLogEntry('toggleObstruction', author, {
              oldValue: s.isObstructed,
              newValue: updates.isObstructed,
              fieldName: 'isObstructed',
              note: updates.isObstructed ? (updates.obstructionNote || s.obstructionNote) : undefined,
            }))
          }

          if ('obstructionNote' in updates && s.obstructionNote !== updates.obstructionNote && s.isObstructed) {
            activityLogs.push(createActivityLogEntry('toggleObstruction', author, {
              oldValue: s.obstructionNote || undefined,
              newValue: updates.obstructionNote || undefined,
              fieldName: 'obstructionNote',
            }))
          }

          if ('cheeringColor' in updates && s.cheeringColor !== updates.cheeringColor) {
            activityLogs.push(createActivityLogEntry('updateCheeringColor', author, {
              oldValue: s.cheeringColor || undefined,
              newValue: updates.cheeringColor || undefined,
              fieldName: 'cheeringColor',
            }))
          }

          if ('supplies' in updates && s.supplies !== updates.supplies) {
            activityLogs.push(createActivityLogEntry('updateSupplies', author, {
              oldValue: s.supplies || undefined,
              newValue: updates.supplies || undefined,
              fieldName: 'supplies',
            }))
          }

          if (isClear) {
            activityLogs.push(createActivityLogEntry('clearSeat', author, {
              note: '清空座位信息',
            }))
          }

          const currentActivityLog = s.activityLog || []
          const newActivityLog = [...currentActivityLog, ...activityLogs]

          return { ...s, ...updates, activityLog: newActivityLog }
        })

        if (recordHistory) {
          const before: Record<string, Seat[]> = {
            [zoneId]: affectedSeats.map((s) => ({ ...s })),
          }
          set((s) => ({
            past: [...s.past, { type: 'batchUpdateSeats', before, label }],
            future: [],
            canUndo: true,
            canRedo: false,
          }))
        }

        set((s) => ({
          seats: {
            ...s.seats,
            [zoneId]: updatedSeats,
          },
        }))
      },

      batchImportMembers: (items, recordHistory = true) => {
        const { zones, seats } = get()
        const zoneNameMap = new Map(zones.map((z) => [z.name.trim().toLowerCase(), z]))
        const unmatchedZones = new Set<string>()
        const unmatchedSeats: string[] = []
        const duplicateMembers: string[] = []
        const seenMembers = new Set<string>()
        const updatesMap = new Map<string, Map<string, Partial<Seat>>>()

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

          if (!updatesMap.has(zone.id)) {
            updatesMap.set(zone.id, new Map())
          }
          updatesMap.get(zone.id)!.set(seat.id, {
            memberName: item.memberName.trim(),
            cheeringColor: item.cheeringColor.trim(),
            ticketStatus: item.ticketStatus,
            supplies: item.supplies.trim(),
          })
        }

        const matchedCount = Array.from(updatesMap.values()).reduce((sum, m) => sum + m.size, 0)

        if (recordHistory && matchedCount > 0) {
          const before: Record<string, Seat[]> = {}
          for (const [zoneId, seatUpdates] of updatesMap) {
            const zoneSeats = seats[zoneId] || []
            before[zoneId] = zoneSeats
              .filter((s) => seatUpdates.has(s.id))
              .map((s) => ({ ...s }))
          }
          set((s) => ({
            past: [...s.past, { type: 'batchImportMembers', before, label: '导入成员名单' }],
            future: [],
            canUndo: true,
            canRedo: false,
          }))
        }

        set((state) => {
          const newSeats = { ...state.seats }
          const author = '我'
          for (const [zoneId, seatUpdates] of updatesMap) {
            const zoneSeats = newSeats[zoneId] || []
            newSeats[zoneId] = zoneSeats.map((s) => {
              const updates = seatUpdates.get(s.id)
              if (!updates) return s

              const activityLogs: ActivityLogEntry[] = []

              if (updates.memberName && s.memberName !== updates.memberName) {
                activityLogs.push(createActivityLogEntry('assignMember', author, {
                  oldValue: s.memberName || undefined,
                  newValue: updates.memberName,
                  fieldName: 'memberName',
                  note: '通过导入分配',
                }))
              }

              if (updates.ticketStatus && s.ticketStatus !== updates.ticketStatus) {
                activityLogs.push(createActivityLogEntry('changeTicketStatus', author, {
                  oldValue: s.ticketStatus,
                  newValue: updates.ticketStatus,
                  fieldName: 'ticketStatus',
                  note: '通过导入更新',
                }))
              }

              if (updates.cheeringColor && s.cheeringColor !== updates.cheeringColor) {
                activityLogs.push(createActivityLogEntry('updateCheeringColor', author, {
                  oldValue: s.cheeringColor || undefined,
                  newValue: updates.cheeringColor || undefined,
                  fieldName: 'cheeringColor',
                  note: '通过导入更新',
                }))
              }

              if (updates.supplies && s.supplies !== updates.supplies) {
                activityLogs.push(createActivityLogEntry('updateSupplies', author, {
                  oldValue: s.supplies || undefined,
                  newValue: updates.supplies || undefined,
                  fieldName: 'supplies',
                  note: '通过导入更新',
                }))
              }

              const currentActivityLog = s.activityLog || []
              const newActivityLog = [...currentActivityLog, ...activityLogs]

              return { ...s, ...updates, activityLog: newActivityLog }
            })
          }
          return { seats: newSeats }
        })

        return {
          matched: matchedCount,
          unmatchedZones: Array.from(unmatchedZones),
          unmatchedSeats,
          duplicateMembers,
        }
      },

      clearZoneSeats: (zoneId, recordHistory = true) => {
        const state = get()
        const zone = state.zones.find((z) => z.id === zoneId)
        if (!zone) return

        if (recordHistory) {
          const before: Record<string, Seat[]> = {
            [zoneId]: state.seats[zoneId]?.map((s) => ({ ...s })) || [],
          }
          set((s) => ({
            past: [...s.past, { type: 'clearZoneSeats', before, label: `清空区域「${zone.name}」` }],
            future: [],
            canUndo: true,
            canRedo: false,
          }))
        }

        set((s) => ({
          seats: {
            ...s.seats,
            [zoneId]: createSeatsForZone(zone),
          },
        }))
      },

      exportData: () => {
        const { zones, seats } = get()
        return JSON.stringify({ zones, seats }, null, 2)
      },

      importData: (json, recordHistory = true) => {
        try {
          const data = JSON.parse(json) as VenueData
          if (!data.zones || !data.seats) return false
          const zonesWithLayout = data.zones.map((zone, index) => {
            const hasLayout = zone.x !== undefined && zone.y !== undefined && zone.width !== undefined && zone.height !== undefined
            if (hasLayout) return zone
            return {
              ...zone,
              x: 50 + (index % 4) * 180,
              y: 50 + Math.floor(index / 4) * 120,
              width: Math.max(120, zone.cols * 30),
              height: Math.max(80, zone.rows * 25),
            }
          })

          if (recordHistory) {
            const before = cloneSeats(get().seats)
            const beforeZones = get().zones.map((z) => ({ ...z }))
            set((s) => ({
              past: [...s.past, { type: 'importData', before, beforeZones, label: '导入数据' }],
              future: [],
              canUndo: true,
              canRedo: false,
            }))
          }

          const migratedSeats: Record<string, Seat[]> = {}
          for (const [zoneId, zoneSeats] of Object.entries(data.seats)) {
            migratedSeats[zoneId] = zoneSeats.map((seat) => ({
              ...seat,
              activityLog: seat.activityLog || [],
            }))
          }
          set({ zones: zonesWithLayout, seats: migratedSeats })
          return true
        } catch {
          return false
        }
      },

      previewImportData: (json, strategy) => {
        const formatErrors: string[] = []
        let parsedData: VenueData | null = null

        try {
          parsedData = JSON.parse(json) as VenueData
        } catch (e) {
          formatErrors.push('JSON 格式解析失败：' + (e instanceof Error ? e.message : '未知错误'))
          return {
            isValid: false,
            formatErrors,
            newZones: [],
            overwriteZones: [],
            mergeZones: [],
            invalidSeats: [],
            duplicateMembers: [],
            totalNew: 0,
            totalOverwrite: 0,
            totalMerge: 0,
            totalInvalid: 0,
            parsedData: null,
          }
        }

        if (!parsedData.zones || !Array.isArray(parsedData.zones)) {
          formatErrors.push('数据格式错误：缺少 zones 字段或格式不正确')
        }
        if (!parsedData.seats || typeof parsedData.seats !== 'object') {
          formatErrors.push('数据格式错误：缺少 seats 字段或格式不正确')
        }

        if (formatErrors.length > 0) {
          return {
            isValid: false,
            formatErrors,
            newZones: [],
            overwriteZones: [],
            mergeZones: [],
            invalidSeats: [],
            duplicateMembers: [],
            totalNew: 0,
            totalOverwrite: 0,
            totalMerge: 0,
            totalInvalid: 0,
            parsedData: null,
          }
        }

        const { zones: currentZones, seats: currentSeats } = get()
        const currentZoneNameMap = new Map(currentZones.map((z) => [z.name.trim().toLowerCase(), z]))
        const newZones: ZoneConflictInfo[] = []
        const overwriteZones: ZoneConflictInfo[] = []
        const mergeZones: ZoneConflictInfo[] = []
        const invalidSeats: InvalidSeatInfo[] = []
        const allMembers = new Set<string>()
        const duplicateMembers = new Set<string>()

        for (const zone of parsedData.zones) {
          if (!zone.id || !zone.name || zone.rows <= 0 || zone.cols <= 0) {
            formatErrors.push(`区域数据无效：${JSON.stringify(zone)}`)
            continue
          }

          const zoneKey = zone.name.trim().toLowerCase()
          const existingZone = currentZoneNameMap.get(zoneKey)
          const zoneSeats = parsedData.seats[zone.id] || []

          let assignedCount = 0
          const conflictSeats: SeatConflictInfo[] = []

          for (const seat of zoneSeats) {
            if (seat.memberName) {
              assignedCount++
              const memberKey = seat.memberName.trim()
              if (memberKey) {
                if (allMembers.has(memberKey)) {
                  duplicateMembers.add(memberKey)
                }
                allMembers.add(memberKey)
              }
            }

            if (existingZone) {
              const existingSeats = currentSeats[existingZone.id] || []
              const existingSeat = existingSeats.find((s) => s.seatNumber === seat.seatNumber)

              if (!existingSeat) {
                invalidSeats.push({
                  zoneName: zone.name,
                  seatNumber: seat.seatNumber,
                  reason: '座位号不存在于当前区域',
                })
                continue
              }

              if (existingSeat.memberName && seat.memberName && existingSeat.memberName !== seat.memberName) {
                const effectiveStrategy: 'overwrite' | 'mergeEmpty' = strategy === 'mergeEmpty' ? 'mergeEmpty' : 'overwrite'
                conflictSeats.push({
                  seatId: existingSeat.id,
                  seatNumber: seat.seatNumber,
                  existingMember: existingSeat.memberName,
                  newMember: seat.memberName,
                  willBeOverwritten: effectiveStrategy === 'overwrite',
                  choice: effectiveStrategy === 'overwrite' ? 'overwrite' : 'keep',
                  existingTicketStatus: existingSeat.ticketStatus,
                  newTicketStatus: seat.ticketStatus,
                  existingCheeringColor: existingSeat.cheeringColor,
                  newCheeringColor: seat.cheeringColor,
                  existingSupplies: existingSeat.supplies,
                  newSupplies: seat.supplies,
                })
              }
            }
          }

          const hasConflicts = conflictSeats.length > 0
          const zoneInfo: ZoneConflictInfo = {
            zone,
            status: existingZone ? (hasConflicts ? 'overwrite' : 'merge') : 'new',
            totalSeats: zoneSeats.length,
            assignedSeats: assignedCount,
            conflictSeats,
            selected: true,
          }

          if (!existingZone) {
            newZones.push(zoneInfo)
          } else if (hasConflicts) {
            overwriteZones.push(zoneInfo)
          } else {
            mergeZones.push(zoneInfo)
          }
        }

        for (const [zoneId, seats] of Object.entries(parsedData.seats)) {
          const zone = parsedData.zones.find((z) => z.id === zoneId)
          if (!zone) {
            for (const seat of seats) {
              invalidSeats.push({
                zoneName: `未知区域(${zoneId})`,
                seatNumber: seat.seatNumber,
                reason: '所属区域不存在',
              })
            }
          }
        }

        const totalNew = newZones.reduce((sum, z) => sum + z.assignedSeats, 0)
        const totalOverwrite = overwriteZones.reduce((sum, z) => sum + z.conflictSeats.length, 0)
        const totalMerge = mergeZones.reduce((sum, z) => sum + z.assignedSeats - z.conflictSeats.length, 0)
        const totalInvalid = invalidSeats.length

        return {
          isValid: formatErrors.length === 0,
          formatErrors,
          newZones,
          overwriteZones,
          mergeZones,
          invalidSeats,
          duplicateMembers: Array.from(duplicateMembers),
          totalNew,
          totalOverwrite,
          totalMerge,
          totalInvalid,
          parsedData,
        }
      },

      executeConfirmedImport: (preview, strategy, selectedZoneIds, seatConflictChoices, recordHistory = true) => {
        if (!preview.parsedData) {
          return { success: false, message: '没有有效的解析数据' }
        }

        if (!preview.isValid) {
          return { success: false, message: '数据格式有错误，无法导入' }
        }

        const currentState = get()
        const backupSeats = cloneSeats(currentState.seats)
        const backupZones = currentState.zones.map((z) => ({ ...z }))

        try {
          const { zones: parsedZones, seats: parsedSeats } = preview.parsedData
          const selectedZoneIdSet = new Set(selectedZoneIds)

          const currentZoneNameMap = new Map(currentState.zones.map((z) => [z.name.trim().toLowerCase(), z]))
          const updatedZones = currentState.zones.map((z) => ({ ...z }))
          const updatedSeats = cloneSeats(currentState.seats)

          const effectiveStrategy: 'overwrite' | 'mergeEmpty' = strategy === 'mergeEmpty' ? 'mergeEmpty' : 'overwrite'
          const author = '我'

          for (const zone of parsedZones) {
            if (!selectedZoneIdSet.has(zone.id)) continue

            const zoneKey = zone.name.trim().toLowerCase()
            const existingZone = currentZoneNameMap.get(zoneKey)
            const zoneSeats = parsedSeats[zone.id] || []

            if (!existingZone) {
              const layout = {
                x: zone.x ?? 50 + (updatedZones.length % 4) * 180,
                y: zone.y ?? 50 + Math.floor(updatedZones.length / 4) * 120,
                width: zone.width ?? Math.max(120, zone.cols * 30),
                height: zone.height ?? Math.max(80, zone.rows * 25),
              }
              const newZone = { ...zone, ...layout }
              updatedZones.push(newZone)
              updatedSeats[zone.id] = zoneSeats.map((s) => ({
                ...s,
                activityLog: s.activityLog || [],
              }))
            } else {
              const targetSeats = updatedSeats[existingZone.id]
              if (!targetSeats) continue

              const seatNumberMap = new Map(targetSeats.map((s) => [s.seatNumber, s]))

              for (const newSeat of zoneSeats) {
                const existingSeat = seatNumberMap.get(newSeat.seatNumber)
                if (!existingSeat) continue

                const activityLogs: ActivityLogEntry[] = []
                let shouldUpdate = false

                const hasConflict = existingSeat.memberName && newSeat.memberName && existingSeat.memberName !== newSeat.memberName
                const conflictChoice = seatConflictChoices?.[existingSeat.id]

                let seatAction: 'overwrite' | 'keep' | 'mergeEmpty'
                if (hasConflict && conflictChoice) {
                  seatAction = conflictChoice === 'overwrite' ? 'overwrite' : 'keep'
                } else if (hasConflict) {
                  seatAction = effectiveStrategy === 'overwrite' ? 'overwrite' : 'keep'
                } else {
                  seatAction = effectiveStrategy === 'overwrite' ? 'overwrite' : 'mergeEmpty'
                }

                if (seatAction === 'overwrite') {
                  if (existingSeat.memberName !== newSeat.memberName && newSeat.memberName) {
                    activityLogs.push(createActivityLogEntry('assignMember', author, {
                      oldValue: existingSeat.memberName || undefined,
                      newValue: newSeat.memberName,
                      fieldName: 'memberName',
                      note: hasConflict ? '通过导入覆盖（冲突处理）' : '通过导入覆盖',
                    }))
                  }
                  if (existingSeat.ticketStatus !== newSeat.ticketStatus) {
                    activityLogs.push(createActivityLogEntry('changeTicketStatus', author, {
                      oldValue: existingSeat.ticketStatus,
                      newValue: newSeat.ticketStatus,
                      fieldName: 'ticketStatus',
                      note: hasConflict ? '通过导入覆盖（冲突处理）' : '通过导入覆盖',
                    }))
                  }
                  if (existingSeat.cheeringColor !== newSeat.cheeringColor) {
                    activityLogs.push(createActivityLogEntry('updateCheeringColor', author, {
                      oldValue: existingSeat.cheeringColor || undefined,
                      newValue: newSeat.cheeringColor || undefined,
                      fieldName: 'cheeringColor',
                      note: hasConflict ? '通过导入覆盖（冲突处理）' : '通过导入覆盖',
                    }))
                  }
                  if (existingSeat.supplies !== newSeat.supplies) {
                    activityLogs.push(createActivityLogEntry('updateSupplies', author, {
                      oldValue: existingSeat.supplies || undefined,
                      newValue: newSeat.supplies || undefined,
                      fieldName: 'supplies',
                      note: hasConflict ? '通过导入覆盖（冲突处理）' : '通过导入覆盖',
                    }))
                  }
                  existingSeat.memberName = newSeat.memberName
                  existingSeat.cheeringColor = newSeat.cheeringColor
                  existingSeat.ticketStatus = newSeat.ticketStatus
                  existingSeat.supplies = newSeat.supplies
                  shouldUpdate = true
                } else if (seatAction === 'mergeEmpty') {
                  if (!existingSeat.memberName && newSeat.memberName) {
                    activityLogs.push(createActivityLogEntry('assignMember', author, {
                      oldValue: undefined,
                      newValue: newSeat.memberName,
                      fieldName: 'memberName',
                      note: '通过导入合并',
                    }))
                    existingSeat.memberName = newSeat.memberName
                    existingSeat.cheeringColor = newSeat.cheeringColor
                    existingSeat.ticketStatus = newSeat.ticketStatus
                    existingSeat.supplies = newSeat.supplies
                    shouldUpdate = true
                  }
                }

                if (shouldUpdate) {
                  const currentActivityLog = existingSeat.activityLog || []
                  existingSeat.activityLog = [...currentActivityLog, ...activityLogs]
                }
              }
            }
          }

          const updatePayload: Partial<VenueStore> = {
            zones: updatedZones,
            seats: updatedSeats,
          }

          if (recordHistory) {
            updatePayload.past = [...currentState.past, {
              type: 'importData' as const,
              before: backupSeats,
              beforeZones: backupZones,
              label: '导入数据'
            }]
            updatePayload.future = []
            updatePayload.canUndo = true
            updatePayload.canRedo = false
          }

          set(updatePayload)

          const importedZones = selectedZoneIds.length
          const importedSeats = [...preview.newZones, ...preview.overwriteZones, ...preview.mergeZones]
            .filter((z) => selectedZoneIdSet.has(z.zone.id))
            .reduce((sum, z) => sum + z.assignedSeats, 0)

          return {
            success: true,
            message: `成功导入 ${importedZones} 个区域，${importedSeats} 条座位数据`
          }
        } catch (e) {
          set({ zones: backupZones, seats: backupSeats })
          return {
            success: false,
            message: '导入失败：' + (e instanceof Error ? e.message : '未知错误')
          }
        }
      },

      clearAll: (recordHistory = true) => {
        if (recordHistory) {
          const before = cloneSeats(get().seats)
          const beforeZones = get().zones.map((z) => ({ ...z }))
          set((s) => ({
            past: [...s.past, { type: 'clearAll', before, beforeZones, label: '清空全部数据' }],
            future: [],
            canUndo: true,
            canRedo: false,
          }))
        }
        set({ zones: [], seats: {} })
      },

      getZoneSeats: (zoneId) => {
        return get().seats[zoneId] || []
      },

      getZoneStats: (zoneId) => {
        const seats = get().seats[zoneId] || []
        const ticketStats = { ...defaultTicketStats }
        let assigned = 0
        let obstructed = 0
        for (const s of seats) {
          if (s.memberName) assigned++
          if (s.isObstructed) obstructed++
          ticketStats[s.ticketStatus]++
        }
        return { total: seats.length, assigned, obstructed, ticketStats }
      },

      getGlobalStats: () => {
        const { zones, seats } = get()
        const ticketStats = { ...defaultTicketStats }
        let totalSeats = 0
        let totalAssigned = 0
        let totalObstructed = 0
        for (const zone of zones) {
          const zoneSeats = seats[zone.id] || []
          totalSeats += zoneSeats.length
          for (const s of zoneSeats) {
            if (s.memberName) totalAssigned++
            if (s.isObstructed) totalObstructed++
            ticketStats[s.ticketStatus]++
          }
        }
        return { totalZones: zones.length, totalSeats, totalAssigned, totalObstructed, ticketStats }
      },

      searchSeats: (zoneId, options) => {
        const { zones, seats } = get()
        const zone = zones.find((z) => z.id === zoneId)
        if (!zone) return []

        const zoneSeats = seats[zoneId] || []
        const results: SeatSearchResult[] = []

        for (const seat of zoneSeats) {
          const matchedFields: string[] = []

          if (options.memberName && options.memberName.trim()) {
            const searchTerm = options.memberName.trim().toLowerCase()
            if (seat.memberName.toLowerCase().includes(searchTerm)) {
              matchedFields.push('memberName')
            }
          }

          if (options.seatNumber && options.seatNumber.trim()) {
            const searchTerm = options.seatNumber.trim().toLowerCase()
            if (seat.seatNumber.toLowerCase().includes(searchTerm)) {
              matchedFields.push('seatNumber')
            }
          }

          if (options.supplies && options.supplies.trim()) {
            const searchTerm = options.supplies.trim().toLowerCase()
            if (seat.supplies.toLowerCase().includes(searchTerm)) {
              matchedFields.push('supplies')
            }
          }

          if (options.ticketStatus) {
            if (seat.ticketStatus === options.ticketStatus) {
              matchedFields.push('ticketStatus')
            }
          }

          if (options.obstructionNote && options.obstructionNote.trim()) {
            const searchTerm = options.obstructionNote.trim().toLowerCase()
            if (seat.obstructionNote.toLowerCase().includes(searchTerm)) {
              matchedFields.push('obstructionNote')
            }
          }

          if (options.isObstructed !== undefined) {
            if (seat.isObstructed === options.isObstructed) {
              matchedFields.push('isObstructed')
            }
          }

          if (matchedFields.length > 0) {
            results.push({
              seat,
              zoneName: zone.name,
              zoneId: zone.id,
              matchedFields,
            })
          }
        }

        return results
      },

      searchAllSeats: (options) => {
        const { zones } = get()
        const groups: GlobalSearchGroup[] = []

        for (const zone of zones) {
          const results = get().searchSeats(zone.id, options)
          if (results.length > 0) {
            groups.push({
              zoneId: zone.id,
              zoneName: zone.name,
              zoneColor: zone.color,
              results,
            })
          }
        }

        return groups
      },

      undo: () => {
        const state = get()
        if (state.past.length === 0) return

        const entry = state.past[state.past.length - 1]
        const newPast = state.past.slice(0, -1)

        const currentSeats = cloneSeats(state.seats)
        const currentZones = state.zones.map((z) => ({ ...z }))

        const futureEntry: HistoryEntry = {
          type: entry.type,
          before: currentSeats,
          beforeZones: entry.beforeZones ? currentZones : undefined,
          label: entry.label,
        }

        if (entry.beforeZones) {
          const isLayoutOnly = ZONE_LAYOUT_ONLY_ACTIONS.includes(entry.type)
          set({
            zones: entry.beforeZones,
            seats: isLayoutOnly ? state.seats : entry.before,
            past: newPast,
            future: [...state.future, futureEntry],
            canUndo: newPast.length > 0,
            canRedo: true,
          })
        } else {
          const restoredSeats = cloneSeats(state.seats)
          for (const [zoneId, beforeSeats] of Object.entries(entry.before)) {
            const zoneSeats = restoredSeats[zoneId]
            if (!zoneSeats) continue
            const beforeMap = new Map(beforeSeats.map((s) => [s.id, s]))
            restoredSeats[zoneId] = zoneSeats.map((s) =>
              beforeMap.has(s.id) ? { ...beforeMap.get(s.id)! } : s
            )
          }
          set({
            seats: restoredSeats,
            past: newPast,
            future: [...state.future, futureEntry],
            canUndo: newPast.length > 0,
            canRedo: true,
          })
        }
      },

      redo: () => {
        const state = get()
        if (state.future.length === 0) return

        const entry = state.future[state.future.length - 1]
        const newFuture = state.future.slice(0, -1)

        const currentSeats = cloneSeats(state.seats)
        const currentZones = state.zones.map((z) => ({ ...z }))

        const pastEntry: HistoryEntry = {
          type: entry.type,
          before: currentSeats,
          beforeZones: entry.beforeZones ? currentZones : undefined,
          label: entry.label,
        }

        if (entry.beforeZones) {
          const isLayoutOnly = ZONE_LAYOUT_ONLY_ACTIONS.includes(entry.type)
          set({
            zones: entry.beforeZones,
            seats: isLayoutOnly ? state.seats : entry.before,
            past: [...state.past, pastEntry],
            future: newFuture,
            canUndo: true,
            canRedo: newFuture.length > 0,
          })
        } else {
          const restoredSeats = cloneSeats(state.seats)
          for (const [zoneId, beforeSeats] of Object.entries(entry.before)) {
            const zoneSeats = restoredSeats[zoneId]
            if (!zoneSeats) continue
            const beforeMap = new Map(beforeSeats.map((s) => [s.id, s]))
            restoredSeats[zoneId] = zoneSeats.map((s) =>
              beforeMap.has(s.id) ? { ...beforeMap.get(s.id)! } : s
            )
          }
          set({
            seats: restoredSeats,
            past: [...state.past, pastEntry],
            future: newFuture,
            canUndo: true,
            canRedo: newFuture.length > 0,
          })
        }
      },

      addSeatNote: (zoneId, seatId, note, author = '我') => {
        const state = get()
        const zoneSeats = state.seats[zoneId]
        if (!zoneSeats) return

        const seat = zoneSeats.find((s) => s.id === seatId)
        if (!seat) return

        const newEntry = createActivityLogEntry('addNote', author, {
          note,
        })

        const currentActivityLog = seat.activityLog || []
        const newActivityLog = [...currentActivityLog, newEntry]

        set((s) => ({
          seats: {
            ...s.seats,
            [zoneId]: s.seats[zoneId]!.map((s) => (s.id === seatId ? { ...s, activityLog: newActivityLog } : s)),
          },
        }))
      },

      removeSeatNote: (zoneId, seatId, entryId) => {
        const state = get()
        const zoneSeats = state.seats[zoneId]
        if (!zoneSeats) return

        const seat = zoneSeats.find((s) => s.id === seatId)
        if (!seat) return

        const currentActivityLog = seat.activityLog || []
        const entryToRemove = currentActivityLog.find((e) => e.id === entryId)
        if (!entryToRemove || entryToRemove.type !== 'addNote') return

        const newActivityLog = currentActivityLog.filter((e) => e.id !== entryId)

        set((s) => ({
          seats: {
            ...s.seats,
            [zoneId]: s.seats[zoneId]!.map((s) => (s.id === seatId ? { ...s, activityLog: newActivityLog } : s)),
          },
        }))
      },

      ensureActivityLogMigration: () => {
        set((state) => {
          const newSeats: Record<string, Seat[]> = {}
          let needsUpdate = false

          for (const [zoneId, zoneSeats] of Object.entries(state.seats)) {
            newSeats[zoneId] = zoneSeats.map((seat) => {
              if (!seat.activityLog) {
                needsUpdate = true
                return { ...seat, activityLog: [] }
              }
              return seat
            })
          }

          if (!needsUpdate) return state
          return { seats: newSeats }
        })
      },
    }),
    {
      name: 'live-cheering-venue-data',
      partialize: (state) => ({ zones: state.zones, seats: state.seats }),
    }
  )
)
