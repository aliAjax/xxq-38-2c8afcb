import type { Zone, Seat, TicketStatus } from '@/types'

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function createSeatsForZone(zone: Zone): Seat[] {
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

export function cloneSeats(seats: Record<string, Seat[]>): Record<string, Seat[]> {
  const cloned: Record<string, Seat[]> = {}
  for (const [zoneId, zoneSeats] of Object.entries(seats)) {
    cloned[zoneId] = zoneSeats.map((s) => ({ ...s }))
  }
  return cloned
}

export const defaultTicketStats: Record<TicketStatus, number> = {
  none: 0,
  confirmed: 0,
  pending: 0,
  exchanged: 0,
}

export function getDefaultZoneLayout(index: number, cols: number, rows: number): { x: number; y: number; width: number; height: number } {
  return {
    x: 50 + (index % 4) * 180,
    y: 50 + Math.floor(index / 4) * 120,
    width: Math.max(120, cols * 30),
    height: Math.max(80, rows * 25),
  }
}
