'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, GripVertical, X } from 'lucide-react'
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
import {
  getMyData,
  addPlan,
  completarPlan,
  deletePlan,
  updateOrden,
  acceptInvitation,
  rejectInvitation,
} from '@/lib/actions'
import type { InvitacionPendiente } from '@/types/planes'
import PlanCard from '@/components/PlanCard'
import BottomNav from '@/components/BottomNav'
import NuevoPlanModal from '@/components/NuevoPlanModal'
import CompletarPlanModal from '@/components/CompletarPlanModal'
import UserMenu from '@/components/UserMenu'
import type { Plan, Profile } from '@/types/planes'

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
        className="touch-none shrink-0 text-[#333333] active:text-[#E8692A] p-1.5 -ml-1 min-h-[44px] flex items-center"
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
  const [planes, setPlanes] = useState<Plan[]>([])
  const [invitaciones, setInvitaciones] = useState<InvitacionPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [showNuevoPlan, setShowNuevoPlan] = useState(false)
  const [planToComplete, setPlanToComplete] = useState<Plan | null>(null)
  const [upgraded, setUpgraded] = useState(false)
  const [processingInv, setProcessingInv] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  const fetchData = useCallback(async () => {
    try {
      const { planes: planesData, profile: profileData, invitaciones: invs } = await getMyData()
      if (!profileData) { router.push('/'); return }
      setProfile(profileData)
      setPlanes(planesData)
      setInvitaciones(invs)
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

  const pendientes = planes
    .filter(p => p.estado === 'pendiente')
    .sort((a, b) => a.orden - b.orden || a.created_at.localeCompare(b.created_at))

  const isAtLimit = profile?.plan === 'free' && pendientes.length >= 5

  const handleAddPlan = async (titulo: string, invitadoIds: string[]) => {
    const result = await addPlan(titulo, null, 'todos', invitadoIds)
    if (!result.success) throw new Error(result.error ?? 'Error al añadir el plan')
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
    fotoUrl: string | null,
    fechaMomento: string | null
  ) => {
    await completarPlan(id, descripcion, fotoUrl, fechaMomento)
    setPlanToComplete(null)
    await fetchData()
  }

  const handleAccept = async (participanteId: string) => {
    setProcessingInv(participanteId)
    await acceptInvitation(participanteId)
    await fetchData()
    setProcessingInv(null)
  }

  const handleReject = async (participanteId: string) => {
    setProcessingInv(participanteId)
    await rejectInvitation(participanteId)
    setInvitaciones(prev => prev.filter(i => i.participante_id !== participanteId))
    setProcessingInv(null)
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
          {profile && (
            <UserMenu
              nombre={profile.nombre || ''}
              plan={profile.plan}
              fotoPerfil={profile.foto_perfil_url}
            />
          )}
        </div>
      </header>

      {upgraded && (
        <div className="mx-4 mt-4 bg-[#4CAF50]/10 border border-[#4CAF50]/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-[#4CAF50] font-medium">¡Ya eres Premium! Planes ilimitados</p>
          <button onClick={() => setUpgraded(false)} className="text-[#4CAF50] text-lg leading-none ml-3 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">×</button>
        </div>
      )}

      {/* Invitation banners */}
      {invitaciones.map(inv => (
        <div
          key={inv.participante_id}
          className="mx-4 mt-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 flex items-center gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#666666] mb-0.5">{inv.invitado_por} te ha invitado</p>
            <p className="text-sm font-medium text-[#F0F0F0] truncate">{inv.plan_titulo}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => handleReject(inv.participante_id)}
              disabled={processingInv === inv.participante_id}
              className="w-10 h-10 rounded-lg border border-[#2A2A2A] flex items-center justify-center text-[#666666] active:bg-[#8B3A3A]/20 active:text-[#C97B7B] disabled:opacity-40 min-h-[44px]"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleAccept(inv.participante_id)}
              disabled={processingInv === inv.participante_id}
              className="px-3 h-10 rounded-lg bg-[#E8692A] text-white text-xs font-semibold active:bg-[#D4581A] disabled:opacity-40 min-h-[44px]"
            >
              Aceptar
            </button>
          </div>
        </div>
      ))}

      {isAtLimit && (
        <div className="mx-4 mt-4 bg-[#E8692A]/10 border border-[#E8692A]/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-[#E8692A] font-medium">Has alcanzado el límite gratuito (5 planes)</p>
          <button
            onClick={() => router.push('/pricing')}
            className="shrink-0 text-xs font-semibold bg-[#E8692A] text-white px-3 py-2 rounded-lg min-h-[44px]"
          >
            Upgrade
          </button>
        </div>
      )}

      <div
        className="px-4 py-4"
        style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 5rem)' }}
      >
        {loading ? (
          <div className="flex justify-center pt-24">
            <div className="w-5 h-5 border-2 border-[#2A2A2A] border-t-[#E8692A] rounded-full animate-spin" />
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pendientes.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
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
        )}
      </div>

      {/* FAB */}
      {!isAtLimit && (
        <div
          className="fixed right-5 z-20"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
        >
          <button
            onClick={() => setShowNuevoPlan(true)}
            className="w-14 h-14 bg-[#E8692A] text-white rounded-full shadow-lg shadow-[#E8692A]/25 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Añadir plan"
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>
      )}

      <BottomNav profile={profile} />

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
