import type { Zone, Seat, TicketStatus } from '@/types'
import { defaultTicketStats } from './utils'

export function calculateZoneStats(seats: Seat[]): {
  total: number
  assigned: number
  obstructed: number
  ticketStats: Record<TicketStatus, number>
} {
  const ticketStats = { ...defaultTicketStats }
  let assigned = 0
  let obstructed = 0
  for (const s of seats) {
    if (s.memberName) assigned++
    if (s.isObstructed) obstructed++
    ticketStats[s.ticketStatus]++
  }
  return { total: seats.length, assigned, obstructed, ticketStats }
}

export function calculateGlobalStats(
  zones: Zone[],
  seats: Record<string, Seat[]>
): {
  totalZones: number
  totalSeats: number
  totalAssigned: number
  totalObstructed: number
  ticketStats: Record<TicketStatus, number>
} {
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
}
