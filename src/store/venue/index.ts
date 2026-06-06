import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VenueStore } from './storeTypes'
import { createHistorySlice } from './history'
import { createZonesSlice } from './zones'
import { createSeatsSlice } from './seats'
import { createImportSlice } from './import'
import { searchSeatsInZone, searchAllZones } from './search'
import { calculateZoneStats, calculateGlobalStats } from './stats'

export type {
  SeatSearchResult,
  SearchOptions,
  GlobalSearchGroup,
  MemberImportItem,
  HistoryEntry,
  HistoryActionType,
} from './types'

export type { VenueStore } from './storeTypes'

export const useVenueStore = create<VenueStore>()(
  persist(
    (set, get) => ({
      zones: [],
      seats: {},

      ...createHistorySlice(set, get),
      ...createZonesSlice(set, get),
      ...createSeatsSlice(set, get),
      ...createImportSlice(set, get),

      getZoneSeats: (zoneId) => {
        return get().seats[zoneId] || []
      },

      getZoneStats: (zoneId) => {
        const seats = get().seats[zoneId] || []
        return calculateZoneStats(seats)
      },

      getGlobalStats: () => {
        const { zones, seats } = get()
        return calculateGlobalStats(zones, seats)
      },

      searchSeats: (zoneId, options) => {
        const { zones, seats } = get()
        const zone = zones.find((z) => z.id === zoneId)
        if (!zone) return []
        const zoneSeats = seats[zoneId] || []
        return searchSeatsInZone(zone, zoneSeats, options)
      },

      searchAllSeats: (options) => {
        const { zones, seats } = get()
        return searchAllZones(zones, seats, options)
      },
    }),
    {
      name: 'live-cheering-venue-data',
      partialize: (state) => ({ zones: state.zones, seats: state.seats }),
    }
  )
)
