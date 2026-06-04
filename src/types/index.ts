export type TicketStatus = 'none' | 'confirmed' | 'pending' | 'exchanged'

export interface Zone {
  id: string
  name: string
  rows: number
  cols: number
  color: string
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
}

export interface VenueData {
  zones: Zone[]
  seats: Record<string, Seat[]>
}
