'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, LogOut, Plus, Copy, Check, X, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  getMyData,
  addPlan,
  completarPlan,
  deletePlan,
  acceptInvitation,
  rejectInvitation,
} from '@/lib/actions'
import NuevoPlanModal from '@/components/NuevoPlanModal'
import PlanDetailModal from '@/components/PlanDetailModal'
import HistoriaDetailModal from '@/components/HistoriaDetailModal'
import CompletarPlanModal from '@/components/CompletarPlanModal'
import ShareBucketList from '@/components/ShareBucketList'
import ShareStoryImage from '@/components/ShareStoryImage'
import type { Plan, Profile, InvitacionPendiente } from '@/types/planes'

function ProfileAvatar({ profile, size = 48 }: { profile: Profile; size?: number }) {
  const initial = profile.nombre?.[0]?.toUpperCase() ?? '?'
  if (profile.foto_perfil_url) {
    return (
      <img
        src={profile.foto_perfil_url}
        alt={profile.nombre}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#E8692A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {initial}
    </div>
  )
}

export default function PerfilPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [planes, setPlanes] = useState<Plan[]>([])
  const [invitaciones, setInvitaciones] = useState<InvitacionPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [copied, setCopied] = useState(false)
  const [processingInv, setProcessingInv] = useState<string | null>(null)

  const [showNuevoPlan, setShowNuevoPlan] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [planToComplete, setPlanToComplete] = useState<Plan | null>(null)
  const [selectedHistoria, setSelectedHistoria] = useState<Plan | null>(null)

  const [showHistoriaShare, setShowHistoriaShare] = useState(false)
  const [historiaToShare, setHistoriaToShare] = useState<Plan | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const { planes: pl, profile: prof } = await getMyData()
      if (!prof) { router.push('/'); return }
      setProfile(prof)
      setPlanes(pl)

      // Load invitations client-side for reliability
      const { data: invParts } = await supabase
        .from('plan_participantes' as never)
        .select('id, plan_id')
        .eq('user_id', prof.id)
        .eq('estado', 'invitado')

      if (invParts && (invParts as { id: string; plan_id: string }[]).length > 0) {
        const planIds = (invParts as { id: string; plan_id: string }[]).map(p => p.plan_id)
        const { data: planData } = await supabase
          .from('planes')
          .select('id, titulo, creado_por')
          .in('id', planIds)

        const invs: InvitacionPendiente[] = (invParts as { id: string; plan_id: string }[]).map(p => {
          const plan = (planData ?? []).find((pl: { id: string; titulo: string; creado_por: string }) => pl.id === p.plan_id)
          return {
            participante_id: p.id,
            plan_id: p.plan_id,
            plan_titulo: plan?.titulo ?? 'Plan',
            invitado_por: plan?.creado_por ?? 'Alguien',
          }
        })
        setInvitaciones(invs)
      } else {
        setInvitaciones([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [router, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const pendientes = planes
    .filter(p => p.estado === 'pendiente')
    .sort((a, b) => a.orden - b.orden || a.created_at.localeCompare(b.created_at))

  const historias = planes
    .filter(p => p.estado === 'hecho')
    .sort((a, b) => (b.fecha_momento ?? b.created_at).localeCompare(a.fecha_momento ?? a.created_at))

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploadingFoto(true)
    // Reset so the same file can be re-selected after an error
    if (fileInputRef.current) fileInputRef.current.value = ''
    try {
      // Compress to JPEG at 800px max, 85% quality
      const compressed = await new Promise<Blob>((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          URL.revokeObjectURL(url)
          const MAX = 800
          let { width, height } = img
          if (width > MAX) { height = Math.round(height * MAX / width); width = MAX }
          if (height > MAX) { width = Math.round(width * MAX / height); height = MAX }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', 0.85)
        }
        img.onerror = reject
        img.src = url
      })

      const path = `avatar-${profile.id}.jpg`
      console.log('[avatar] uploading', path, compressed.size, 'bytes')

      const { error: upError } = await supabase.storage
        .from('avatars')
        .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })

      if (upError) { console.error('[avatar] storage error:', upError); throw upError }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const urlWithBust = `${publicUrl}?t=${Date.now()}`
      console.log('[avatar] public URL:', urlWithBust)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ foto_perfil_url: urlWithBust })
        .eq('id', profile.id)

      if (updateError) { console.error('[avatar] profile update error:', updateError); throw updateError }

      setProfile(prev => prev ? { ...prev, foto_perfil_url: urlWithBust } : prev)
    } catch (err) {
      console.error('[avatar] upload failed:', err)
    } finally {
      setUploadingFoto(false)
    }
  }

  const handleCopyUsername = () => {
    if (!profile?.username) return
    navigator.clipboard.writeText(`@${profile.username}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleAddPlan = async (titulo: string, invitadoIds: string[]) => {
    const result = await addPlan(titulo, null, 'todos', invitadoIds)
    if (!result.success) throw new Error(result.error ?? 'Error al añadir el plan')
    setShowNuevoPlan(false)
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
    setSelectedPlan(null)
    await fetchData()
  }

  const handleDeletePlan = async (id: string) => {
    await deletePlan(id)
    setSelectedPlan(null)
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

  const openHistoriaShare = () => {
    setHistoriaToShare(historias[0] ?? null)
    setShowHistoriaShare(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#2A2A2A] border-t-[#E8692A] rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div
      className="flex flex-col bg-[#0A0A0A] overflow-hidden"
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      {/* ── Brand bar ──────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center justify-center border-b border-[#1A1A1A]"
        style={{ height: 32 }}
      >
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
          color: '#E8692A', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif',
        }}>
          LIVESTORY
        </span>
      </div>

      {/* ── Invitation banners ─────────────────────────────── */}
      {invitaciones.length > 0 && (
        <div
          className="flex-shrink-0 flex gap-2 overflow-x-auto px-3 py-2"
          style={{ scrollbarWidth: 'none' }}
        >
          {invitaciones.map(inv => (
            <div
              key={inv.participante_id}
              className="flex-shrink-0 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3 py-2.5 flex items-center gap-2.5"
              style={{ minWidth: 260, maxWidth: 300 }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#666666] leading-tight">
                  <span className="text-[#F0F0F0]">{inv.invitado_por}</span> te invitó
                </p>
                <p className="text-xs font-medium text-[#F0F0F0] truncate mt-0.5">{inv.plan_titulo}</p>
              </div>
              <button
                onClick={() => handleReject(inv.participante_id)}
                disabled={processingInv === inv.participante_id}
                className="w-8 h-8 rounded-lg border border-[#2A2A2A] flex items-center justify-center text-[#555555] active:text-[#C97B7B] active:bg-[#8B3A3A]/10 disabled:opacity-40 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleAccept(inv.participante_id)}
                disabled={processingInv === inv.participante_id}
                className="px-3 h-8 rounded-lg bg-[#E8692A] text-white text-xs font-semibold active:bg-[#D4581A] disabled:opacity-40 flex-shrink-0 whitespace-nowrap"
              >
                Aceptar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar + camera */}
          <div className="relative flex-shrink-0">
            <ProfileAvatar profile={profile} size={48} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFoto}
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#E8692A] border-[1.5px] border-[#0A0A0A] flex items-center justify-center text-white active:scale-90 transition-transform disabled:opacity-60"
              aria-label="Cambiar foto"
            >
              {uploadingFoto
                ? <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                : <Camera className="w-2.5 h-2.5" />
              }
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
          </div>

          {/* Name + username copy */}
          <div className="min-w-0">
            <p className="font-serif text-[20px] font-bold text-[#F0F0F0] leading-tight truncate">
              {profile.nombre}
            </p>
            <button
              onClick={handleCopyUsername}
              className="flex items-center gap-1.5 text-[13px] text-[#555555] active:text-[#E8692A] transition-colors mt-0.5"
            >
              {copied
                ? <Check className="w-3 h-3 text-[#E8692A]" />
                : <Copy className="w-3 h-3" />
              }
              <span>{copied ? '¡Copiado!' : `@${profile.username ?? profile.nombre}`}</span>
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="text-[#444444] active:text-[#E8692A] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
          aria-label="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* ── Stats bar ──────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-stretch border-b border-[#1A1A1A]">
        {/* Planes pill */}
        <div className="flex-1 flex items-center justify-between px-4 py-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-[#F0F0F0] leading-none">{pendientes.length}</span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#555555]">{pendientes.length === 1 ? 'Plan' : 'Planes'}</span>
          </div>
          <ShareBucketList
            planes={pendientes}
            nombre={profile.nombre || ''}
            username={profile.username}
            fotoPerfil={profile.foto_perfil_url}
            compact
          />
        </div>

        <div className="w-px bg-[#1A1A1A]" />

        {/* Historias pill */}
        <div className="flex-1 flex items-center justify-between px-4 py-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-bold text-[#F0F0F0] leading-none">{historias.length}</span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#555555]">{historias.length === 1 ? 'Historia' : 'Historias'}</span>
          </div>
          <button
            onClick={historias.length > 0 ? openHistoriaShare : undefined}
            disabled={historias.length === 0}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors ${
              historias.length > 0 ? 'text-[#E8692A] active:text-[#D4581A]' : 'text-[#2A2A2A]'
            }`}
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Two-column body ────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left column — Planes */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Column header */}
          <div className="flex-shrink-0 flex items-center justify-between px-3 pt-2.5 pb-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#444444]">Mis planes</span>
            <button
              onClick={() => setShowNuevoPlan(true)}
              className="w-7 h-7 rounded-lg bg-[#E8692A] flex items-center justify-center text-white active:bg-[#D4581A] transition-colors"
              style={{ minHeight: 44, minWidth: 44 }}
              aria-label="Añadir plan"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>

          {/* List */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'env(safe-area-inset-bottom, 16px)' } as React.CSSProperties}
          >
            {pendientes.length === 0 ? (
              <p className="text-[11px] text-[#333333] px-3 py-4 leading-relaxed">
                Aún no tienes planes. ¿A qué esperas?
              </p>
            ) : (
              pendientes.map(plan => {
                const isShared = plan.pareja_codigo !== profile.id
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className="w-full text-left px-3 py-[14px] border-b border-[#1A1A1A] active:bg-[#111111] transition-colors min-h-[44px]"
                  >
                    <p className="text-[13px] text-[#E0E0E0] leading-snug line-clamp-2 font-serif">{plan.titulo}</p>
                    {isShared && (
                      <p className="text-[9px] text-[#E8692A] uppercase tracking-[0.1em] mt-0.5">
                        {plan.creado_por}
                      </p>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Vertical divider */}
        <div className="w-px bg-[#1A1A1A] flex-shrink-0" />

        {/* Right column — Historias */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-3 pt-2.5 pb-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#444444]">Mis historias</span>
          </div>

          <div
            className="flex-1 overflow-y-auto"
            style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'env(safe-area-inset-bottom, 16px)' } as React.CSSProperties}
          >
            {historias.length === 0 ? (
              <p className="text-[11px] text-[#333333] px-3 py-4 leading-relaxed">
                Aquí vivirán tus recuerdos.
              </p>
            ) : (
              historias.map(h => (
                <button
                  key={h.id}
                  onClick={() => setSelectedHistoria(h)}
                  className="w-full text-left px-3 py-[14px] border-b border-[#1A1A1A] active:bg-[#111111] transition-colors min-h-[44px]"
                >
                  <p className="text-[13px] text-[#E0E0E0] leading-snug line-clamp-2 font-serif">{h.titulo}</p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      {showNuevoPlan && (
        <NuevoPlanModal
          currentUserId={profile.id}
          onClose={() => setShowNuevoPlan(false)}
          onSubmit={handleAddPlan}
        />
      )}

      {selectedPlan && (
        <PlanDetailModal
          plan={selectedPlan}
          currentUserId={profile.id}
          onClose={() => setSelectedPlan(null)}
          onCompletar={() => { setPlanToComplete(selectedPlan); setSelectedPlan(null) }}
          onDeleted={() => { handleDeletePlan(selectedPlan.id) }}
          onUpdate={fetchData}
        />
      )}

      {planToComplete && (
        <CompletarPlanModal
          plan={planToComplete}
          onClose={() => setPlanToComplete(null)}
          onSubmit={handleCompletarPlan}
        />
      )}

      {selectedHistoria && (
        <HistoriaDetailModal
          plan={selectedHistoria}
          onClose={() => setSelectedHistoria(null)}
          isOwner={true}
          onUpdate={fetchData}
        />
      )}

      {/* Historia share sheet */}
      {showHistoriaShare && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowHistoriaShare(false)}
        >
          <div
            className="w-full bg-[#141414] rounded-t-2xl shadow-2xl flex flex-col"
            style={{ maxHeight: '70dvh' }}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-9 h-1 bg-[#2A2A2A] rounded-full" />
            </div>
            <div className="px-5 py-3 flex items-center justify-between flex-shrink-0 border-b border-[#2A2A2A]">
              <h2 className="font-serif text-base font-semibold text-[#F0F0F0]">Compartir historia</h2>
              <button
                onClick={() => setShowHistoriaShare(false)}
                className="text-[#444444] active:text-[#F0F0F0] w-10 h-10 flex items-center justify-center rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {historias.map(h => (
                <button
                  key={h.id}
                  onClick={() => setHistoriaToShare(h)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 border-b border-[#1A1A1A] active:bg-[#1A1A1A] transition-colors min-h-[44px] ${
                    h.id === historiaToShare?.id ? 'bg-[#E8692A]/10' : ''
                  }`}
                >
                  {h.foto_url
                    ? <img src={h.foto_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                    : <div className="w-9 h-9 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] flex-shrink-0" />
                  }
                  <p className="flex-1 text-sm text-[#F0F0F0] text-left leading-snug">{h.titulo}</p>
                  {h.id === historiaToShare?.id && (
                    <div className="w-2 h-2 rounded-full bg-[#E8692A] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {historiaToShare && (
              <div
                className="px-5 py-4 border-t border-[#2A2A2A] flex-shrink-0"
                style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
              >
                <ShareStoryImage
                  plan={historiaToShare}
                  descripcion={historiaToShare.historia_descripcion ?? ''}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
