import { useState } from 'react'
import { Sparkles, Plus } from 'lucide-react'
import { useVenueStore } from '@/store/venueStore'
import { ZoneCard, GlobalStats } from '@/components/ZoneCard'
import { CreateZoneModal, DataActions } from '@/components/Modals'

export default function Overview() {
  const zones = useVenueStore((s) => s.zones)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-base bg-grid-pattern">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles size={24} className="text-neon-pink" />
            <h1 className="text-2xl font-black text-white text-glow-pink">Live应援座位规划</h1>
          </div>
          <p className="text-sm text-white/30">场馆座位分配 · 应援色标记 · 物资统筹 · 换票管理</p>
        </header>

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-neon-pink text-white font-medium text-sm hover:bg-neon-pink/80 transition-colors"
            style={{ boxShadow: '0 0 20px rgba(255,46,151,0.3)' }}
          >
            <Plus size={16} /> 新增区域
          </button>
          <DataActions />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            {zones.length === 0 ? (
              <div className="glass-panel p-12 text-center">
                <div className="text-4xl mb-3">🏟️</div>
                <p className="text-white/30 text-sm mb-4">还没有场馆区域</p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-light border border-white/[0.06] text-white/50 hover:text-white hover:border-white/15 transition-all text-sm"
                >
                  <Plus size={14} /> 创建第一个区域
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {zones.map((zone) => (
                  <ZoneCard key={zone.id} zoneId={zone.id} />
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <GlobalStats />
          </div>
        </div>
      </div>

      <CreateZoneModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
