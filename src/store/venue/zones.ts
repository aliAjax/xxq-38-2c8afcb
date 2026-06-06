import type { Zone } from '@/types'
import type { VenueStore, VenueSet, VenueGet } from './storeTypes'
import { generateId, createSeatsForZone, getDefaultZoneLayout } from './utils'
import { pushHistory } from './history'

export function createZonesSlice(set: VenueSet, get: VenueGet): Pick<
  VenueStore,
  | 'addZone'
  | 'removeZone'
  | 'duplicateZone'
  | 'updateZone'
  | 'updateZoneLayout'
  | 'resetZoneLayouts'
  | 'ensureZoneLayouts'
> {
  return {
    addZone: (name, rows, cols, color, recordHistory = true) => {
      const id = generateId()
      const existingZones = get().zones
      const layout = getDefaultZoneLayout(existingZones.length, cols, rows)
      const zone: Zone = { id, name, rows, cols, color, ...layout }
      const newSeats = createSeatsForZone(zone)

      if (recordHistory) {
        pushHistory(set, get(), {
          type: 'addZone',
          beforeZones: get().zones.map((z) => ({ ...z })),
          label: `创建区域「${name}」`,
        })
      }

      set((state) => ({
        zones: [...state.zones, zone],
        seats: { ...state.seats, [id]: newSeats },
      }))
      return id
    },

    removeZone: (zoneId, recordHistory = true) => {
      const state = get()
      const zone = state.zones.find((z) => z.id === zoneId)
      if (!zone) return

      if (recordHistory) {
        pushHistory(set, state, {
          type: 'removeZone',
          beforeZones: state.zones.map((z) => ({ ...z })),
          label: `删除区域「${zone.name}」`,
        })
      }

      set((state) => {
        const newSeats = { ...state.seats }
        delete newSeats[zoneId]
        return {
          zones: state.zones.filter((z) => z.id !== zoneId),
          seats: newSeats,
        }
      })
    },

    duplicateZone: (zoneId, recordHistory = true) => {
      const state = get()
      const sourceZone = state.zones.find((z) => z.id === zoneId)
      if (!sourceZone) return null

      const existingZones = state.zones
      const baseName = sourceZone.name
      let newName = `${baseName} 副本`
      let counter = 2
      const nameSet = new Set(existingZones.map((z) => z.name))
      while (nameSet.has(newName)) {
        newName = `${baseName} 副本${counter}`
        counter++
      }

      const newId = generateId()
      const offsetX = 30
      const offsetY = 30
      const newZone: Zone = {
        id: newId,
        name: newName,
        rows: sourceZone.rows,
        cols: sourceZone.cols,
        color: sourceZone.color,
        x: sourceZone.x + offsetX,
        y: sourceZone.y + offsetY,
        width: sourceZone.width,
        height: sourceZone.height,
      }
      const newSeats = createSeatsForZone(newZone)

      if (recordHistory) {
        pushHistory(set, state, {
          type: 'duplicateZone',
          beforeZones: state.zones.map((z) => ({ ...z })),
          label: `复制区域「${sourceZone.name}」`,
        })
      }

      set((s) => ({
        zones: [...s.zones, newZone],
        seats: { ...s.seats, [newId]: newSeats },
      }))

      return newId
    },

    updateZone: (zoneId, updates) => {
      set((state) => ({
        zones: state.zones.map((z) => (z.id === zoneId ? { ...z, ...updates } : z)),
      }))
    },

    updateZoneLayout: (zoneId, updates, recordHistory = false, historyLabel) => {
      const state = get()
      const zone = state.zones.find((z) => z.id === zoneId)
      if (!zone) return

      const changed = Object.entries(updates).some(
        ([key, value]) => zone[key as keyof Zone] !== value
      )
      if (!changed) return

      if (recordHistory) {
        pushHistory(set, state, {
          type: 'updateZoneLayout',
          before: {},
          beforeZones: state.zones.map((z) => ({ ...z })),
          label: historyLabel || `调整「${zone.name}」布局`,
        })
      }

      set((state) => ({
        zones: state.zones.map((z) => (z.id === zoneId ? { ...z, ...updates } : z)),
      }))
    },

    resetZoneLayouts: (recordHistory = false) => {
      const state = get()
      if (state.zones.length === 0) return

      if (recordHistory) {
        pushHistory(set, state, {
          type: 'resetZoneLayouts',
          before: {},
          beforeZones: state.zones.map((z) => ({ ...z })),
          label: '重置区域布局',
        })
      }

      set((state) => ({
        zones: state.zones.map((zone, index) => ({
          ...zone,
          ...getDefaultZoneLayout(index, zone.cols, zone.rows),
        })),
      }))
    },

    ensureZoneLayouts: () => {
      set((state) => ({
        zones: state.zones.map((zone, index) => {
          const hasLayout = zone.x !== undefined && zone.y !== undefined && zone.width !== undefined && zone.height !== undefined
          if (hasLayout) return zone
          return {
            ...zone,
            ...getDefaultZoneLayout(index, zone.cols, zone.rows),
          }
        }),
      }))
    },
  }
}
