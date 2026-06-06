import type { Zone, Seat } from '@/types'
import type { HistoryEntry } from './types'
import { ZONE_LAYOUT_ONLY_ACTIONS } from './types'
import { cloneSeats } from './utils'
import type { VenueStore, VenueSet, VenueGet } from './storeTypes'

export function pushHistory(
  set: VenueSet,
  state: VenueStore,
  entry: Omit<HistoryEntry, 'before' | 'beforeZones'> & {
    before?: Record<string, Seat[]>
    beforeZones?: Zone[]
  }
): void {
  const before = entry.before ?? cloneSeats(state.seats)

  const historyEntry: HistoryEntry = {
    type: entry.type,
    before,
    label: entry.label,
  }

  if (entry.beforeZones !== undefined) {
    historyEntry.beforeZones = entry.beforeZones
  }

  set((s) => ({
    past: [...s.past, historyEntry],
    future: [],
    canUndo: true,
    canRedo: false,
  }))
}

export function executeUndo(set: VenueSet, state: VenueStore): void {
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
}

export function executeRedo(set: VenueSet, state: VenueStore): void {
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
}

export function createHistorySlice(set: VenueSet, get: VenueGet): Pick<
  VenueStore,
  'past' | 'future' | 'canUndo' | 'canRedo' | 'undo' | 'redo'
> {
  return {
    past: [],
    future: [],
    canUndo: false,
    canRedo: false,

    undo: () => {
      executeUndo(set, get())
    },

    redo: () => {
      executeRedo(set, get())
    },
  }
}
