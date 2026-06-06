import type { Zone, Seat } from '@/types'
import type { SearchOptions, SeatSearchResult, GlobalSearchGroup } from './types'

export function searchSeatsInZone(
  zone: Zone,
  zoneSeats: Seat[],
  options: SearchOptions
): SeatSearchResult[] {
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
}

export function searchAllZones(
  zones: Zone[],
  seats: Record<string, Seat[]>,
  options: SearchOptions
): GlobalSearchGroup[] {
  const groups: GlobalSearchGroup[] = []

  for (const zone of zones) {
    const zoneSeats = seats[zone.id] || []
    const results = searchSeatsInZone(zone, zoneSeats, options)
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
}
