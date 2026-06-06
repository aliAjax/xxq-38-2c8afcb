export type TicketStatus = 'none' | 'confirmed' | 'pending' | 'exchanged'

export type ActivityLogType =
  | 'assignMember'
  | 'changeTicketStatus'
  | 'toggleObstruction'
  | 'updateSupplies'
  | 'updateCheeringColor'
  | 'addNote'
  | 'clearSeat'

export interface ActivityLogEntry {
  id: string
  timestamp: number
  type: ActivityLogType
  author: string
  oldValue?: string | boolean
  newValue?: string | boolean
  fieldName?: string
  note?: string
}

export interface Zone {
  id: string
  name: string
  rows: number
  cols: number
  color: string
  x: number
  y: number
  width: number
  height: number
}

export interface Seat {
  id: string
  zoneId: string
  row: number
  col: number
  seatNumber: string
  memberName: string
  cheeringColor: string
  isObstructed: boolean
  obstructionNote: string
  ticketStatus: TicketStatus
  supplies: string
  activityLog: ActivityLogEntry[]
}

export interface VenueData {
  zones: Zone[]
  seats: Record<string, Seat[]>
}

export type ImportStrategy = 'overwrite' | 'mergeEmpty' | 'selective'

export type SeatConflictChoice = 'keep' | 'overwrite' | 'skip'

export interface SeatConflictInfo {
  seatId: string
  seatNumber: string
  existingMember: string
  newMember: string
  willBeOverwritten: boolean
  choice: SeatConflictChoice
  existingTicketStatus?: string
  newTicketStatus?: string
  existingCheeringColor?: string
  newCheeringColor?: string
  existingSupplies?: string
  newSupplies?: string
}

export interface ZoneConflictInfo {
  zone: Zone
  status: 'new' | 'overwrite' | 'merge'
  totalSeats: number
  assignedSeats: number
  conflictSeats: SeatConflictInfo[]
  selected: boolean
}

export interface InvalidSeatInfo {
  zoneName: string
  seatNumber: string
  reason: string
}

export interface ImportPreviewResult {
  isValid: boolean
  formatErrors: string[]
  newZones: ZoneConflictInfo[]
  overwriteZones: ZoneConflictInfo[]
  mergeZones: ZoneConflictInfo[]
  invalidSeats: InvalidSeatInfo[]
  duplicateMembers: string[]
  totalNew: number
  totalOverwrite: number
  totalMerge: number
  totalInvalid: number
  parsedData: VenueData | null
}
