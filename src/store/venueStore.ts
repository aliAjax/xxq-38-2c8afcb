import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Zone, Seat, VenueData, TicketStatus } from '@/types'

export type { MemberImportItem }

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
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
  addZone: (name: string, rows: number, cols: number, color: string) => string
  removeZone: (zoneId: string) => void
  updateZone: (zoneId: string, updates: Partial<Pick<Zone, 'name' | 'color'>>) => void
  updateSeat: (zoneId: string, seatId: string, updates: Partial<Omit<Seat, 'id' | 'zoneId' | 'row' | 'col' | 'seatNumber'>>) => void
  batchUpdateSeats: (zoneId: string, seatIds: string[], updates: Partial<Omit<Seat, 'id' | 'zoneId' | 'row' | 'col' | 'seatNumber'>>) => void
  batchImportMembers: (items: MemberImportItem[]) => { matched: number; unmatchedZones: string[]; unmatchedSeats: string[]; duplicateMembers: string[] }
  clearZoneSeats: (zoneId: string) => void
  exportData: () => string
  importData: (json: string) => boolean
  clearAll: () => void
  getZoneSeats: (zoneId: string) => Seat[]
  getZoneStats: (zoneId: string) => { total: number; assigned: number; obstructed: number; ticketStats: Record<TicketStatus, number> }
  getGlobalStats: () => { totalZones: number; totalSeats: number; totalAssigned: number; totalObstructed: number; ticketStats: Record<TicketStatus, number> }
}

const defaultTicketStats: Record<TicketStatus, number> = {
  none: 0,
  confirmed: 0,
  pending: 0,
  exchanged: 0,
}

export const useVenueStore = create<VenueStore>()(
  persist(
    (set, get) => ({
      zones: [],
      seats: {},

      addZone: (name, rows, cols, color) => {
        const id = generateId()
        const zone: Zone = { id, name, rows, cols, color }
        const newSeats = createSeatsForZone(zone)
        set((state) => ({
          zones: [...state.zones, zone],
          seats: { ...state.seats, [id]: newSeats },
        }))
        return id
      },

      removeZone: (zoneId) => {
        set((state) => {
          const newSeats = { ...state.seats }
          delete newSeats[zoneId]
          return {
            zones: state.zones.filter((z) => z.id !== zoneId),
            seats: newSeats,
          }
        })
      },

      updateZone: (zoneId, updates) => {
        set((state) => ({
          zones: state.zones.map((z) => (z.id === zoneId ? { ...z, ...updates } : z)),
        }))
      },

      updateSeat: (zoneId, seatId, updates) => {
        set((state) => {
          const zoneSeats = state.seats[zoneId]
          if (!zoneSeats) return state
          return {
            seats: {
              ...state.seats,
              [zoneId]: zoneSeats.map((s) => (s.id === seatId ? { ...s, ...updates } : s)),
            },
          }
        })
      },

      batchUpdateSeats: (zoneId, seatIds, updates) => {
        set((state) => {
          const zoneSeats = state.seats[zoneId]
          if (!zoneSeats) return state
          const idSet = new Set(seatIds)
          return {
            seats: {
              ...state.seats,
              [zoneId]: zoneSeats.map((s) => (idSet.has(s.id) ? { ...s, ...updates } : s)),
            },
          }
        })
      },

      batchImportMembers: (items) => {
        const { zones, seats } = get()
        const zoneNameMap = new Map(zones.map((z) => [z.name.trim().toLowerCase(), z]))
        const unmatchedZones = new Set<string>()
        const unmatchedSeats: string[] = []
        const duplicateMembers: string[] = []
        const seenMembers = new Set<string>()
        const updatesMap = new Map<string, Map<string, Partial<Seat>>>()

        for (const item of items) {
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

          const memberKey = item.memberName.trim()
          if (seenMembers.has(memberKey)) {
            if (!duplicateMembers.includes(memberKey)) {
              duplicateMembers.push(memberKey)
            }
          }
          seenMembers.add(memberKey)

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

        set((state) => {
          const newSeats = { ...state.seats }
          for (const [zoneId, seatUpdates] of updatesMap) {
            const zoneSeats = newSeats[zoneId] || []
            newSeats[zoneId] = zoneSeats.map((s) => {
              const updates = seatUpdates.get(s.id)
              return updates ? { ...s, ...updates } : s
            })
          }
          return { seats: newSeats }
        })

        return {
          matched: Array.from(updatesMap.values()).reduce((sum, m) => sum + m.size, 0),
          unmatchedZones: Array.from(unmatchedZones),
          unmatchedSeats,
          duplicateMembers,
        }
      },

      clearZoneSeats: (zoneId) => {
        set((state) => {
          const zone = state.zones.find((z) => z.id === zoneId)
          if (!zone) return state
          return {
            seats: {
              ...state.seats,
              [zoneId]: createSeatsForZone(zone),
            },
          }
        })
      },

      exportData: () => {
        const { zones, seats } = get()
        return JSON.stringify({ zones, seats }, null, 2)
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json) as VenueData
          if (!data.zones || !data.seats) return false
          set({ zones: data.zones, seats: data.seats })
          return true
        } catch {
          return false
        }
      },

      clearAll: () => {
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
    }),
    {
      name: 'live-cheering-venue-data',
    }
  )
)
