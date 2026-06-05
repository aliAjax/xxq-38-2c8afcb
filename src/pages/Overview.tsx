import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Plus, Users, Package, LayoutGrid, Map, Printer } from 'lucide-react'
import { useVenueStore } from '@/store/venueStore'
import { useUIStore } from '@/store/uiStore'
import { ZoneCard, GlobalStats } from '@/components/ZoneCard'
import { CreateZoneModal, DataActions } from '@/components/Modals'
import { MemberImportModal } from '@/components/MemberImportModal'
import { ExchangeTodoPanel } from '@/components/ExchangeTodoPanel'
import { FloorPlanEditor } from '@/components/FloorPlanEditor'
import { UndoRedoButtons } from '@/components/UndoRedoButtons'

export default function Overview() {
  const navigate = useNavigate()
  const zones = useVenueStore((s) => s.zones)
  const viewMode = useUIStore((s) => s.viewMode)
  const setViewMode = useUIStore((s) => s.setViewMode)
  const [modalOpen, setModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)

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

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-neon-pink text-white font-medium text-sm hover:bg-neon-pink/80 transition-colors"
            style={{ boxShadow: '0 0 20px rgba(255,46,151,0.3)' }}
          >
            <Plus size={16} /> 新增区域
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-neon-purple text-white font-medium text-sm hover:bg-neon-purple/80 transition-colors"
            style={{ boxShadow: '0 0 20px rgba(191,90,242,0.3)' }}
          >
            <Users size={16} /> 成员名单导入
          </button>
          <button
            onClick={() => navigate('/supplies')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-neon-cyan text-white font-medium text-sm hover:bg-neon-cyan/80 transition-colors"
            style={{ boxShadow: '0 0 20px rgba(0,245,255,0.3)' }}
          >
            <Package size={16} /> 物资汇总
          </button>

          <button
            onClick={() => navigate('/print')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-surface-light border border-white/[0.06] text-white/60 font-medium text-sm hover:bg-surface-lighter hover:text-white transition-all"
          >
            <Printer size={16} /> 打印视图
          </button>

          <div className="ml-auto flex items-center gap-1 bg-surface-light rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-neon-cyan text-white'
                  : 'text-white/50 hover:text-white hover:bg-surface-lighter'
              }`}
            >
              <LayoutGrid size={14} />
              列表视图
            </button>
            <button
              onClick={() => setViewMode('floorplan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'floorplan'
                  ? 'bg-neon-cyan text-white'
                  : 'text-white/50 hover:text-white hover:bg-surface-lighter'
              }`}
            >
              <Map size={14} />
              平面图
            </button>
          </div>

          <UndoRedoButtons />

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
            ) : viewMode === 'list' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {zones.map((zone) => (
                  <ZoneCard key={zone.id} zoneId={zone.id} />
                ))}
              </div>
            ) : (
              <FloorPlanEditor />
            )}
          </div>

          <div className="lg:col-span-1 space-y-4">
            <GlobalStats />
            <ExchangeTodoPanel />
          </div>
        </div>
      </div>

      <CreateZoneModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <MemberImportModal open={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </div>
  )
}
