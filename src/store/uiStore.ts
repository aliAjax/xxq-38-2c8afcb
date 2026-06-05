import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewMode = 'list' | 'floorplan'

interface UIState {
  viewMode: ViewMode
  floorPlanEditMode: boolean
  selectedZoneId: string | null
  showColorPicker: boolean
  expandedTodoZones: string[]
  setViewMode: (mode: ViewMode) => void
  setFloorPlanEditMode: (isEdit: boolean) => void
  setSelectedZoneId: (zoneId: string | null) => void
  setShowColorPicker: (show: boolean) => void
  toggleExpandedTodoZone: (zoneId: string) => void
  resetFloorPlanState: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      viewMode: 'list',
      floorPlanEditMode: false,
      selectedZoneId: null,
      showColorPicker: false,
      expandedTodoZones: [],

      setViewMode: (mode) => set({ viewMode: mode }),

      setFloorPlanEditMode: (isEdit) => set({ floorPlanEditMode: isEdit }),

      setSelectedZoneId: (zoneId) => set({ selectedZoneId: zoneId }),

      setShowColorPicker: (show) => set({ showColorPicker: show }),

      toggleExpandedTodoZone: (zoneId) => {
        const current = get().expandedTodoZones
        const next = current.includes(zoneId)
          ? current.filter((id) => id !== zoneId)
          : [...current, zoneId]
        set({ expandedTodoZones: next })
      },

      resetFloorPlanState: () => set({
        floorPlanEditMode: false,
        selectedZoneId: null,
        showColorPicker: false,
      }),
    }),
    {
      name: 'live-cheering-ui-state',
      partialize: (state) => ({
        viewMode: state.viewMode,
        floorPlanEditMode: state.floorPlanEditMode,
        selectedZoneId: state.selectedZoneId,
        showColorPicker: state.showColorPicker,
        expandedTodoZones: state.expandedTodoZones,
      }),
    }
  )
)
