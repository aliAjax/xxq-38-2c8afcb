import type { Zone, Seat, TicketStatus, ActivityLogType, ActivityLogEntry } from '@/types'

export type HistoryActionType =
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

export const ZONE_LAYOUT_ONLY_ACTIONS: HistoryActionType[] = [
  'updateZoneLayout',
  'batchUpdateZoneLayouts',
  'resetZoneLayouts',
]

export interface HistoryEntry {
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

export interface MemberImportItem {
  memberName: string
  zoneName: string
  seatNumber: string
  cheeringColor: string
  ticketStatus: TicketStatus
  supplies: string
}

export type { ActivityLogType, ActivityLogEntry }
