import type { Seat, ActivityLogEntry } from '@/types'
import type { VenueStore, VenueSet, VenueGet } from './storeTypes'
import { createSeatsForZone } from './utils'
import { pushHistory } from './history'
import { generateActivityLogs, generateBatchUpdateLabel, createActivityLogEntry } from './activityLog'

type SeatUpdates = Partial<Omit<Seat, 'id' | 'zoneId' | 'row' | 'col' | 'seatNumber' | 'activityLog'>>

function applyUpdatesWithLogs(
  seats: Seat[],
  seatId: string,
  updates: SeatUpdates,
  author: string
): Seat[] {
  return seats.map((s) => {
    if (s.id !== seatId) return s
    const logs = generateActivityLogs(s, updates, author)
    const currentActivityLog = s.activityLog || []
    return { ...s, ...updates, activityLog: [...currentActivityLog, ...logs] }
  })
}

function applyBatchUpdatesWithLogs(
  seats: Seat[],
  seatIds: Set<string>,
  updates: SeatUpdates,
  author: string
): Seat[] {
  return seats.map((s) => {
    if (!seatIds.has(s.id)) return s
    const logs = generateActivityLogs(s, updates, author)
    const currentActivityLog = s.activityLog || []
    return { ...s, ...updates, activityLog: [...currentActivityLog, ...logs] }
  })
}

export function createSeatsSlice(set: VenueSet, get: VenueGet): Pick<
  VenueStore,
  | 'updateSeat'
  | 'batchUpdateSeats'
  | 'clearZoneSeats'
  | 'addSeatNote'
  | 'removeSeatNote'
  | 'ensureActivityLogMigration'
> {
  return {
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

      const author = '我'

      if (recordHistory) {
        const before: Record<string, Seat[]> = {
          [zoneId]: [{ ...seat }],
        }
        pushHistory(set, state, {
          type: 'updateSeat',
          before,
          label: '编辑座位',
        })
      }

      set((s) => ({
        seats: {
          ...s.seats,
          [zoneId]: applyUpdatesWithLogs(s.seats[zoneId] || [], seatId, updates, author),
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

      const label = historyLabel || generateBatchUpdateLabel(updates)
      const author = '我'

      if (recordHistory) {
        const before: Record<string, Seat[]> = {
          [zoneId]: affectedSeats.map((s) => ({ ...s })),
        }
        pushHistory(set, state, {
          type: 'batchUpdateSeats',
          before,
          label,
        })
      }

      set((s) => ({
        seats: {
          ...s.seats,
          [zoneId]: applyBatchUpdatesWithLogs(s.seats[zoneId] || [], idSet, updates, author),
        },
      }))
    },

    clearZoneSeats: (zoneId, recordHistory = true) => {
      const state = get()
      const zone = state.zones.find((z) => z.id === zoneId)
      if (!zone) return

      if (recordHistory) {
        const before: Record<string, Seat[]> = {
          [zoneId]: state.seats[zoneId]?.map((s) => ({ ...s })) || [],
        }
        pushHistory(set, state, {
          type: 'clearZoneSeats',
          before,
          label: `清空区域「${zone.name}」`,
        })
      }

      set((s) => ({
        seats: {
          ...s.seats,
          [zoneId]: createSeatsForZone(zone),
        },
      }))
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
              return { ...seat, activityLog: [] as ActivityLogEntry[] }
            }
            return seat
          })
        }

        if (!needsUpdate) return state
        return { seats: newSeats }
      })
    },
  }
}
