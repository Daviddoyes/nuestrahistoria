'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getMyData, addPlan, completarPlan, deletePlan, updateOrden } from '@/lib/actions'
import type { ConQuien, TipoAcceso } from '@/types/planes'
import PlanCard from '@/components/PlanCard'
import HistoriaCard from '@/components/HistoriaCard'
import BottomNav from '@/components/BottomNav'
import NuevoPlanModal from '@/components/NuevoPlanModal'
import CompletarPlanModal from '@/components/CompletarPlanModal'
import UserMenu from '@/components/UserMenu'
import type { Plan, Profile } from '@/types/planes'

type Tab = 'pendientes' | 'historias'

function SortablePlanCard({
  plan,
  onCompletar,
  onDelete,
}: {
  plan: Plan
  onCompletar: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: plan.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="flex items-center gap-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none shrink-0 text-[#333333] active:text-[#E8692A] p-1.5 -ml-1"
        aria-label="Mover plan"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <PlanCard plan={plan} onCompletar={onCompletar} onDelete={onDelete} />
      </div>
    </div>
  )
}

export default function PlanesPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('pendientes')
  const [planes, setPlanes] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showNuevoPlan, setShowNuevoPlan] = useState(false)
  const [planToComplete, setPlanToComplete] = useState<Plan | null>(null)
  const [upgraded, setUpgraded] = useState(false)
  const [tipoAcceso, setTipoAcceso] = useState<TipoAcceso>('owner')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  const fetchData = useCallback(async (tipo: TipoAcceso = 'owner') => {
    try {
      const { planes: planesData, profile: profileData } = await getMyData(tipo)
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
    const tipo = (localStorage.getItem('tipo_acceso') as TipoAcceso) || 'owner'
    setTipoAcceso(tipo)
    fetchData(tipo)
  }, [fetchData])

  const pendientes = planes
    .filter(p => p.estado === 'pendiente')
    .sort((a, b) => a.orden - b.orden || a.created_at.localeCompare(b.created_at))

  const historias = planes
    .filter(p => p.estado === 'hecho')
    .sort((a, b) => {
      const da = a.fecha_momento ?? a.created_at
      const db = b.fecha_momento ?? b.created_at
      return db.localeCompare(da)
    })

  const isAtLimit = profile?.plan === 'free' && pendientes.length >= 5

  const handleAddPlan = async (titulo: string, descripcion: string | null, conQuien: ConQuien) => {
    await addPlan(titulo, descripcion, conQuien)
    setShowNuevoPlan(false)
    await fetchData(tipoAcceso)
  }

  const handleDeletePlan = async (id: string) => {
    await deletePlan(id)
    await fetchData(tipoAcceso)
  }

  const handleCompletarPlan = async (
    id: string,
    descripcion: string,
    fotoUrl: string | null,
    fechaMomento: string | null
  ) => {
    await completarPlan(id, descripcion, fotoUrl, fechaMomento)
    setPlanToComplete(null)
    await fetchData(tipoAcceso)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = pendientes.findIndex(p => p.id === active.id)
    const newIndex = pendientes.findIndex(p => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(pendientes, oldIndex, newIndex)
    setPlanes(prev => [...reordered, ...prev.filter(p => p.estado !== 'pendiente')])
    await updateOrden(reordered.map((p, i) => ({ id: p.id, orden: i })))
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pendientes.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div key="pendientes" className="tab-fade-in space-y-3">
                {pendientes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center pt-24 gap-2 text-center">
                    <p className="text-base font-medium text-[#F0F0F0]">Sin planes pendientes</p>
                    <p className="text-sm text-[#666666]">Toca + para añadir el primer plan</p>
                  </div>
                ) : (
                  pendientes.map(plan => (
                    <SortablePlanCard
                      key={plan.id}
                      plan={plan}
                      onCompletar={() => setPlanToComplete(plan)}
                      onDelete={() => handleDeletePlan(plan.id)}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
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
                    isOwner={tipoAcceso === 'owner'}
                    onUpdate={() => fetchData(tipoAcceso)}
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
