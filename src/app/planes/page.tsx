'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, LogOut } from 'lucide-react'
import { getPlanes, addPlan, completarPlan, deletePlan } from '@/lib/actions'
import PlanCard from '@/components/PlanCard'
import HistoriaCard from '@/components/HistoriaCard'
import BottomNav from '@/components/BottomNav'
import NuevoPlanModal from '@/components/NuevoPlanModal'
import CompletarPlanModal from '@/components/CompletarPlanModal'
import type { Plan } from '@/types/planes'

type Tab = 'pendientes' | 'historias'

export default function PlanesPage() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('pendientes')
  const [planes, setPlanes] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showNuevoPlan, setShowNuevoPlan] = useState(false)
  const [planToComplete, setPlanToComplete] = useState<Plan | null>(null)

  const fetchPlanes = useCallback(async () => {
    try {
      const data = await getPlanes()
      setPlanes(data as Plan[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
      router.push('/')
      return
    }
    setUserName(localStorage.getItem('userName') || '')
    fetchPlanes()
  }, [router, fetchPlanes])

  const pendientes = planes.filter(p => p.estado === 'pendiente')
  const historias = planes.filter(p => p.estado === 'hecho')

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userName')
    router.push('/')
  }

  const handleAddPlan = async (titulo: string, descripcion: string | null) => {
    // throws on error — NuevoPlanModal catches and shows the message
    await addPlan(titulo, descripcion, userName)
    setShowNuevoPlan(false)
    await fetchPlanes()
  }

  const handleDeletePlan = async (id: string) => {
    await deletePlan(id)
    await fetchPlanes()
  }

  const handleCompletarPlan = async (
    id: string,
    descripcion: string,
    fotoUrl: string | null
  ) => {
    await completarPlan(id, descripcion, fotoUrl)
    setPlanToComplete(null)
    await fetchPlanes()
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header
        className="bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#2A2A2A] sticky top-0 z-10"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between px-5 h-12">
          <span className="font-serif font-semibold text-[#F0F0F0] tracking-tight">Nuestros Planes</span>
          <button
            onClick={handleLogout}
            className="text-[#444444] active:text-[#C9B99A] transition-colors p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-end"
            aria-label="Salir"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <div
        className="px-4 py-4"
        style={{
          paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 5.5rem)',
        }}
      >
        {loading ? (
          <div className="flex justify-center pt-24">
            <div className="w-5 h-5 border-2 border-[#2A2A2A] border-t-[#C9B99A] rounded-full animate-spin" />
          </div>
        ) : activeTab === 'pendientes' ? (
          <div key="pendientes" className="tab-fade-in space-y-3">
            {pendientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-24 gap-2 text-center">
                <p className="text-base font-medium text-[#F0F0F0]">Sin planes pendientes</p>
                <p className="text-sm text-[#666666]">Toca + para añadir el primer plan</p>
              </div>
            ) : (
              pendientes.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onCompletar={() => setPlanToComplete(plan)}
                  onDelete={() => handleDeletePlan(plan.id)}
                />
              ))
            )}
          </div>
        ) : (
          <div key="historias" className="tab-fade-in">
            {historias.length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-24 gap-2 text-center">
                <p className="text-base font-medium text-[#F0F0F0]">Sin historias aun</p>
                <p className="text-sm text-[#666666]">Completa un plan para crear una historia</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {historias.map(plan => (
                  <HistoriaCard
                    key={plan.id}
                    plan={plan}
                    onDelete={() => handleDeletePlan(plan.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB — visible only on pendientes tab */}
      {activeTab === 'pendientes' && (
        <button
          onClick={() => setShowNuevoPlan(true)}
          className="fixed right-5 z-20 w-14 h-14 bg-[#C9B99A] text-[#0A0A0A] rounded-full shadow-lg shadow-[#C9B99A]/20 flex items-center justify-center active:scale-95 transition-transform"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
          aria-label="Añadir plan"
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </button>
      )}

      {/* Bottom navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendientesCount={pendientes.length}
        historiasCount={historias.length}
      />

      {showNuevoPlan && (
        <NuevoPlanModal
          onClose={() => setShowNuevoPlan(false)}
          onSubmit={handleAddPlan}
        />
      )}

      {planToComplete && (
        <CompletarPlanModal
          plan={planToComplete}
          onClose={() => setPlanToComplete(null)}
          onSubmit={handleCompletarPlan}
        />
      )}
    </div>
  )
}
