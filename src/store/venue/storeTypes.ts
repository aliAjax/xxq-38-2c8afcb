import type { Zone, Seat, VenueData, ImportPreviewResult, ImportStrategy, SeatConflictChoice } from '@/types'
import type { HistoryEntry, SeatSearchResult, SearchOptions, GlobalSearchGroup, MemberImportItem } from './types'

export interface VenueStore extends VenueData {
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
  getZoneStats: (zoneId: string) => { total: number; assigned: number; obstructed: number; ticketStats: Record<string, number> }
  getGlobalStats: () => { totalZones: number; totalSeats: number; totalAssigned: number; totalObstructed: number; ticketStats: Record<string, number> }
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

export type VenueSet = (
  partial: Partial<VenueStore> | ((state: VenueStore) => Partial<VenueStore>),
  replace?: boolean | undefined
) => void

export type VenueGet = () => VenueStore
