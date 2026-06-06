import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PrintOptions } from '@/pages/PrintView'

export interface PrintPreset {
  id: string
  name: string
  options: PrintOptions
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const defaultPresets: PrintPreset[] = [
  {
    id: 'preset-exchange',
    name: '现场换票版',
    options: {
      showMemberName: true,
      showCheeringColor: false,
      showTicketStatus: true,
      showObstruction: false,
      showSupplies: false,
      layout: 'overview',
    },
  },
  {
    id: 'preset-supplies',
    name: '物资核对版',
    options: {
      showMemberName: true,
      showCheeringColor: false,
      showTicketStatus: false,
      showObstruction: false,
      showSupplies: true,
      layout: 'overview',
    },
  },
  {
    id: 'preset-seatmap',
    name: '纯座位图',
    options: {
      showMemberName: false,
      showCheeringColor: true,
      showTicketStatus: false,
      showObstruction: false,
      showSupplies: false,
      layout: 'overview',
    },
  },
]

interface PrintPresetStore {
  presets: PrintPreset[]
  activePresetId: string | null
  savePreset: (name: string, options: PrintOptions) => PrintPreset
  updatePreset: (id: string, options: PrintOptions) => void
  deletePreset: (id: string) => void
  setActivePreset: (id: string | null) => void
}

export const usePrintPresetStore = create<PrintPresetStore>()(
  persist(
    (set) => ({
      presets: defaultPresets,
      activePresetId: null,

      savePreset: (name, options) => {
        const preset: PrintPreset = {
          id: generateId(),
          name,
          options: { ...options },
        }
        set((state) => ({
          presets: [...state.presets, preset],
          activePresetId: preset.id,
        }))
        return preset
      },

      updatePreset: (id, options) => {
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, options: { ...options } } : p
          ),
        }))
      },

      deletePreset: (id) => {
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
          activePresetId: state.activePresetId === id ? null : state.activePresetId,
        }))
      },

      setActivePreset: (id) => {
        set({ activePresetId: id })
      },
    }),
    {
      name: 'print-presets',
    }
  )
)
