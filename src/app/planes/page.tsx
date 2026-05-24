'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { getMyData, addPlan, completarPlan, deletePlan } from '@/lib/actions'
import PlanCard from '@/components/PlanCard'
import HistoriaCard from '@/components/HistoriaCard'
import BottomNav from '@/components/BottomNav'
import NuevoPlanModal from '@/components/NuevoPlanModal'
import CompletarPlanModal from '@/components/CompletarPlanModal'
import UserMenu from '@/components/UserMenu'
import type { Plan, Profile } from '@/types/planes'

type Tab = 'pendientes' | 'historias'

export default function PlanesPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('pendientes')
  const [planes, setPlanes] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showNuevoPlan, setShowNuevoPlan] = useState(false)
  const [planToComplete, setPlanToComplete] = useState<Plan | null>(null)
  const [upgraded, setUpgraded] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const { planes: planesData, profile: profileData } = await getMyData()
      if (!profileData) {
        router.push('/')
        return
      }
      setProfile(profileData)
      setPlanes(planesData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgraded') === 'true') {
      setUpgraded(true)
      window.history.replaceState({}, '', '/planes')
    }
    fetchData()
  }, [fetchData])

  const pendientes = planes.filter(p => p.estado === 'pendiente')
  const historias = planes.filter(p => p.estado === 'hecho')
  const isAtLimit = profile?.plan === 'free' && pendientes.length >= 5

  const handleAddPlan = async (titulo: string, descripcion: string | null) => {
    await addPlan(titulo, descripcion)
    setShowNuevoPlan(false)
    await fetchData()
  }

  const handleDeletePlan = async (id: string) => {
    await deletePlan(id)
    await fetchData()
  }

  const handleCompletarPlan = async (
    id: string,
    descripcion: string,
    fotoUrl: string | null
  ) => {
    await completarPlan(id, descripcion, fotoUrl)
    setPlanToComplete(null)
    await fetchData()
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <header
        className="bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#2A2A2A] sticky top-0 z-10"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between px-5 h-12">
          <span className="font-serif font-semibold text-[#F0F0F0] tracking-tight">
            Livestory
          </span>
          {profile && <UserMenu nombre={profile.nombre || ''} plan={profile.plan} />}
        </div>
      </header>

      {upgraded && (
        <div className="mx-4 mt-4 bg-[#4CAF50]/10 border border-[#4CAF50]/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-[#4CAF50] font-medium">¡Ya eres Premium! Planes ilimitados</p>
          <button
            onClick={() => setUpgraded(false)}
            className="text-[#4CAF50] text-lg leading-none ml-3"
          >
            ×
          </button>
        </div>
      )}

      {isAtLimit && (
        <div className="mx-4 mt-4 bg-[#E8692A]/10 border border-[#E8692A]/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-[#E8692A] font-medium">
            Has alcanzado el límite gratuito (5 planes)
          </p>
          <button
            onClick={() => router.push('/pricing')}
            className="shrink-0 text-xs font-semibold bg-[#E8692A] text-white px-3 py-1.5 rounded-lg"
          >
            Upgrade
          </button>
        </div>
      )}

      <div
        className="px-4 py-4"
        style={{
          paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 5.5rem)',
        }}
      >
        {loading ? (
          <div className="flex justify-center pt-24">
            <div className="w-5 h-5 border-2 border-[#2A2A2A] border-t-[#E8692A] rounded-full animate-spin" />
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
                <p className="text-base font-medium text-[#F0F0F0]">Sin historias aún</p>
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

      {activeTab === 'pendientes' && !isAtLimit && (
        <button
          onClick={() => setShowNuevoPlan(true)}
          className="fixed right-5 z-20 w-14 h-14 bg-[#E8692A] text-white rounded-full shadow-lg shadow-[#E8692A]/25 flex items-center justify-center active:scale-95 transition-transform"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
          aria-label="Añadir plan"
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </button>
      )}

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
