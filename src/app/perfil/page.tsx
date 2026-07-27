'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, LogOut, Plus, Copy, Check, X, ListTodo, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  getMyData,
  addPlan,
  completarPlan,
  deletePlan,
  acceptInvitation,
  rejectInvitation,
  getSolicitudes,
  resolverSolicitud,
} from '@/lib/actions'
import NuevoPlanModal from '@/components/NuevoPlanModal'
import PlanDetailModal from '@/components/PlanDetailModal'
import HistoriaDetailModal from '@/components/HistoriaDetailModal'
import CompletarPlanModal from '@/components/CompletarPlanModal'
import ShareBucketList from '@/components/ShareBucketList'
import BottomNav from '@/components/BottomNav'
import ExplorarFeed from '@/components/ExplorarFeed'
import type { Plan, Profile, InvitacionPendiente, SolicitudPendiente, Notificacion } from '@/types/planes'

type Tab = 'planes' | 'historias' | 'explorar' | 'perfil'

const PLAZO_BADGE: Record<string, { label: string; color: string }> = {
  corto: { label: 'Este mes', color: '#1DE9B6' },
  medio: { label: 'Este año', color: '#888888' },
  largo: { label: 'Algún día', color: '#555555' },
}

// Fondo por categoría cuando el plan no tiene foto.
const CAT_GRADIENT: Record<string, string> = {
  aventura: 'linear-gradient(135deg, #1a0a00, #3d1f00)',
  deporte: 'linear-gradient(135deg, #001a0f, #003d1f)',
  musica: 'linear-gradient(135deg, #0d001a, #220040)',
  cultura: 'linear-gradient(135deg, #00101a, #002a40)',
  gastronomia: 'linear-gradient(135deg, #1a1000, #3d2800)',
}
const GRADIENT_DEFAULT = 'linear-gradient(135deg, #0a0a0a, #1a1a1a)'

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
      width: size, height: size, borderRadius: '50%', background: '#1DE9B6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: '#0A0A0A', flexShrink: 0,
    }}>
      {initial}
    </div>
  )
}

export default function PerfilPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<Tab>('planes')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [planes, setPlanes] = useState<Plan[]>([])
  const [invitaciones, setInvitaciones] = useState<InvitacionPendiente[]>([])
  const [solicitudes, setSolicitudes] = useState<SolicitudPendiente[]>([])
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [processingSol, setProcessingSol] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [copied, setCopied] = useState(false)
  const [processingInv, setProcessingInv] = useState<string | null>(null)

  const [participantesPorPlan, setParticipantesPorPlan] = useState<Record<string, string[]>>({})

  const [showNuevoPlan, setShowNuevoPlan] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [planToComplete, setPlanToComplete] = useState<Plan | null>(null)
  const [selectedHistoria, setSelectedHistoria] = useState<Plan | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const { planes: pl, profile: prof } = await getMyData()
      if (!prof) { router.push('/'); return }
      setProfile(prof)
      setPlanes(pl)

      // Load accepted/owner participants for all plans
      if (pl.length > 0) {
        const planIds = pl.filter(p => p.estado === 'pendiente').map(p => p.id)
        if (planIds.length > 0) {
          const { data: parts } = await supabase
            .from('plan_participantes' as never)
            .select('plan_id, nombre_usuario')
            .in('plan_id', planIds)
            .in('estado', ['owner', 'aceptado'])

          const map: Record<string, string[]> = {}
          for (const p of (parts ?? []) as { plan_id: string; nombre_usuario: string | null }[]) {
            if (!map[p.plan_id]) map[p.plan_id] = []
            if (p.nombre_usuario) map[p.plan_id].push(p.nombre_usuario)
          }
          setParticipantesPorPlan(map)
        }
      }

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

      // Join requests for plans owned by the current user
      const sols = await getSolicitudes()
      setSolicitudes(sols)

      // Unread notifications (new momentos on shared plans)
      const { data: notifs } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('user_id', prof.id)
        .eq('leida', false)
        .order('created_at', { ascending: false })
        .limit(10)
      setNotificaciones((notifs ?? []) as Notificacion[])
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
    if (fileInputRef.current) fileInputRef.current.value = ''
    try {
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
          canvas.width = width; canvas.height = height
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', 0.85)
        }
        img.onerror = reject
        img.src = url
      })
      const path = `avatar-${profile.id}.jpg`
      const { error: upError } = await supabase.storage.from('avatars').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })
      if (upError) throw upError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const urlWithBust = `${publicUrl}?t=${Date.now()}`
      const { error: updateError } = await supabase.from('profiles').update({ foto_perfil_url: urlWithBust }).eq('id', profile.id)
      if (updateError) throw updateError
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

  const handleAddPlan = async (titulo: string, descripcion: string, invitadoIds: string[]): Promise<string | null> => {
    const result = await addPlan(titulo, descripcion.trim() || null, 'todos', invitadoIds)
    if (!result.success) throw new Error(result.error ?? 'Error al añadir el plan')
    await fetchData()
    // El plan queda creado; NuevoPlanModal muestra el wizard y cierra al terminar.
    return result.planId ?? null
  }

  const handleCompletarPlan = async (id: string, descripcion: string, fotoUrl: string | null, fechaMomento: string | null) => {
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

  const handleResolverSolicitud = async (participanteId: string, aceptar: boolean) => {
    setProcessingSol(participanteId)
    await resolverSolicitud(participanteId, aceptar)
    setSolicitudes(prev => prev.filter(s => s.participante_id !== participanteId))
    setProcessingSol(null)
    if (aceptar) await fetchData()
  }

  const marcarNotifLeida = async (id: string) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id))
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
  }

  const abrirNotificacion = async (notif: Notificacion) => {
    const plan = planes.find(p => p.id === notif.plan_id)
    await marcarNotifLeida(notif.id)
    if (!plan) return
    if (plan.estado === 'hecho') setSelectedHistoria(plan)
    else setSelectedPlan(plan)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#2A2A2A] border-t-[#1DE9B6] rounded-full animate-spin" />
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
        // Reserva para el bottom nav fijo; la barra de perfil (último hijo del
        // flex) queda justo encima de esa reserva.
        paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* ── Brand bar ─────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-center border-b border-[#1A1A1A]" style={{ height: 32 }}>
        <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.2em', color: '#1DE9B6', textTransform: 'uppercase' }}>
          GooALS
        </span>
      </div>

      {/* ── Invitation banners ────────────────────────────── */}
      {invitaciones.length > 0 && (
        <div className="flex-shrink-0 flex gap-2 overflow-x-auto px-3 py-2" style={{ scrollbarWidth: 'none' }}>
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
                className="px-3 h-8 rounded-lg bg-[#1DE9B6] text-[#0A0A0A] text-xs font-semibold active:bg-[#00BFA5] disabled:opacity-40 flex-shrink-0 whitespace-nowrap"
              >
                Aceptar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Join request banner (one at a time) ───────────── */}
      {solicitudes.length > 0 && (() => {
        const sol = solicitudes[0]
        return (
          <div className="flex-shrink-0 px-3 py-2">
            <div
              className="bg-[#1A1A1A] rounded-xl px-3.5 py-3"
              style={{ borderLeft: '3px solid #1DE9B6' }}
            >
              {solicitudes.length > 1 && (
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#666666] mb-2">
                  1 de {solicitudes.length} solicitudes pendientes
                </p>
              )}
              <div className="flex items-center gap-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#666666] leading-snug">
                    <span className="text-[#F0F0F0] font-medium">{sol.nombre_usuario}</span> quiere unirse a:
                  </p>
                  <p className="text-sm font-medium text-[#F0F0F0] truncate mt-0.5">{sol.plan_titulo}</p>
                </div>
                <button
                  onClick={() => handleResolverSolicitud(sol.participante_id, false)}
                  disabled={processingSol === sol.participante_id}
                  className="w-9 h-9 rounded-lg border border-[#2A2A2A] flex items-center justify-center text-[#555555] active:text-[#C97B7B] active:bg-[#8B3A3A]/10 disabled:opacity-40 flex-shrink-0"
                  aria-label="Rechazar"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleResolverSolicitud(sol.participante_id, true)}
                  disabled={processingSol === sol.participante_id}
                  className="px-3.5 h-9 rounded-lg bg-[#1DE9B6] text-[#0A0A0A] text-xs font-semibold active:bg-[#00BFA5] disabled:opacity-40 flex-shrink-0 whitespace-nowrap"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Nuevos momentos ───────────────────────────────── */}
      {notificaciones.length > 0 && (
        <div className="flex-shrink-0 flex gap-2 overflow-x-auto px-3 py-2" style={{ scrollbarWidth: 'none' }}>
          {notificaciones.map(notif => (
            <div
              key={notif.id}
              className="flex-shrink-0 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3 py-2.5 flex items-center gap-2.5"
              style={{ minWidth: 260, maxWidth: 300 }}
            >
              <Camera className="w-4 h-4 text-[#1DE9B6] flex-shrink-0" />
              <button
                onClick={() => abrirNotificacion(notif)}
                className="flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
              >
                <p className="text-xs text-[#F0F0F0] leading-snug line-clamp-2">{notif.mensaje}</p>
              </button>
              <button
                onClick={() => marcarNotifLeida(notif.id)}
                aria-label="Descartar"
                className="w-8 h-8 rounded-lg border border-[#2A2A2A] flex items-center justify-center text-[#555555] active:text-[#F0F0F0] flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab content ───────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">

        {/* PLANES tab */}
        {activeTab === 'planes' && (
          <div
            className="h-full overflow-y-auto"
            style={{
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '84px', // hueco para el FAB (nav y barra de perfil ya están fuera del scroll)
            } as React.CSSProperties}
          >
            {pendientes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 px-8">
                <ListTodo style={{ width: 48, height: 48, color: '#2A2A2A' }} strokeWidth={1} />
                <p style={{ fontSize: 15, color: '#444444', textAlign: 'center' }}>Aún no tienes planes.</p>
                <p style={{ fontSize: 13, color: '#333333', textAlign: 'center' }}>¿A qué esperas?</p>
              </div>
            ) : (
              <div style={{ paddingTop: 10 }}>
                {/* Header de sección */}
                <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#444444', padding: '0 18px', marginBottom: 8 }}>
                  Planes
                </p>

                {pendientes.map(plan => {
                  const participantes = participantesPorPlan[plan.id] ?? []
                  const showParticipants = participantes.length > 1
                  const plazo = plan.fecha_plazo ? PLAZO_BADGE[plan.fecha_plazo] : null
                  const fotoCard = plan.momentos_urls?.[0] || plan.foto_url || null
                  const gradiente = (plan.categoria && CAT_GRADIENT[plan.categoria]) || GRADIENT_DEFAULT
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className="group block w-full text-left"
                      style={{
                        position: 'relative',
                        height: 110,
                        margin: '0 12px 8px',
                        width: 'calc(100% - 24px)',
                        borderRadius: 12,
                        overflow: 'hidden',
                        background: fotoCard ? '#0A0A0A' : gradiente,
                      }}
                    >
                      {/* Fondo: foto + overlay, o gradiente por categoría */}
                      {fotoCard && (
                        <>
                          <img
                            src={fotoCard}
                            alt=""
                            loading="lazy"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div className="absolute inset-0 bg-black/[0.65] group-active:bg-black/80 transition-colors" />
                        </>
                      )}

                      {/* Contenido */}
                      <div style={{ position: 'absolute', inset: 0, zIndex: 1, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        {/* Fila superior: categoría + globo público */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          {plan.categoria ? (
                            <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#1DE9B6' }}>
                              {plan.categoria}
                            </span>
                          ) : <span />}
                          {plan.publico && (
                            <Globe size={12} color="rgba(29,233,182,0.6)" aria-label="Plan público" style={{ flexShrink: 0 }} />
                          )}
                        </div>

                        {/* Título + fecha */}
                        <div style={{ minWidth: 0 }}>
                          <p style={{
                            fontFamily: 'var(--font-playfair), Georgia, serif',
                            fontSize: 16, fontWeight: 400, color: '#FFFFFF', lineHeight: 1.25,
                            textShadow: '0 1px 6px rgba(0,0,0,0.5)',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          } as React.CSSProperties}>
                            {plan.titulo}
                          </p>
                          {plazo && (
                            <span style={{ display: 'block', marginTop: 3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: plazo.color, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                              {plazo.label}
                            </span>
                          )}
                        </div>

                        {/* Fila inferior: avatares de participantes (abajo derecha) */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 20 }}>
                          {showParticipants && (
                            <div style={{ display: 'flex' }}>
                              {participantes.slice(0, 5).map((nombre, i) => (
                                <div
                                  key={i}
                                  style={{
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: '#2A2A2A', border: '1.5px solid rgba(10,10,10,0.6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 9, color: '#fff', fontWeight: 600,
                                    marginLeft: i === 0 ? 0 : -6,
                                    zIndex: participantes.length - i, position: 'relative', flexShrink: 0,
                                  }}
                                >
                                  {nombre[0]?.toUpperCase() ?? '?'}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* EXPLORAR tab */}
        {activeTab === 'explorar' && (
          <ExplorarFeed
            profile={profile}
            pendientes={pendientes}
            historias={historias}
            onPlanCopiado={fetchData}
          />
        )}

        {/* HISTORIAS tab */}
        {activeTab === 'historias' && (
          <div
            className="h-full overflow-y-auto"
            style={{
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '12px',
            } as React.CSSProperties}
          >
            {historias.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 px-8">
                <p style={{ fontSize: 15, color: '#444444', textAlign: 'center' }}>Aquí vivirán tus recuerdos.</p>
                <p style={{ fontSize: 13, color: '#333333', textAlign: 'center' }}>Completa un plan para crear tu primera historia.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, padding: 2 }}>
                {historias.map(h => (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHistoria(h)}
                    style={{
                      position: 'relative', aspectRatio: '3/4',
                      overflow: 'hidden', background: '#1A1A1A', display: 'block',
                    }}
                  >
                    {h.foto_url && (
                      <img
                        src={h.foto_url}
                        alt=""
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.75) 100%)',
                    }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 }}>
                      <p style={{
                        fontSize: 13, fontWeight: 600, color: 'white', lineHeight: 1.3,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      } as React.CSSProperties}>
                        {h.titulo}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PERFIL tab */}
        {activeTab === 'perfil' && (
          <div
            className="h-full overflow-y-auto"
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', paddingBottom: 24 } as React.CSSProperties}
          >
            <div className="flex flex-col items-center px-8 pt-10">
              {/* Avatar 80 + cambiar foto */}
              <div className="relative">
                <ProfileAvatar profile={profile} size={80} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFoto}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#1DE9B6] border-2 border-[#0A0A0A] flex items-center justify-center text-[#0A0A0A] active:scale-90 transition-transform disabled:opacity-60"
                  aria-label="Cambiar foto"
                >
                  {uploadingFoto
                    ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera className="w-3.5 h-3.5" />
                  }
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoChange} />
              </div>

              <p className="font-serif text-[22px] font-bold text-[#F0F0F0] mt-4 text-center leading-tight">
                {profile.nombre}
              </p>
              <button
                onClick={handleCopyUsername}
                className="flex items-center gap-1.5 text-[13px] font-light text-[#666666] active:text-[#1DE9B6] transition-colors mt-1"
              >
                {copied ? <Check className="w-3 h-3 text-[#1DE9B6]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? '¡Copiado!' : `@${profile.username ?? profile.nombre}`}</span>
              </button>

              {/* Stats */}
              <div className="flex items-stretch mt-8 w-full" style={{ maxWidth: 300 }}>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[26px] font-bold text-[#F0F0F0] leading-none">{pendientes.length}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#666666]">
                    {pendientes.length === 1 ? 'Plan' : 'Planes'}
                  </span>
                </div>
                <div className="w-px bg-[#1A1A1A]" />
                <div className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[26px] font-bold text-[#F0F0F0] leading-none">{historias.length}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#666666]">
                    {historias.length === 1 ? 'Historia' : 'Historias'}
                  </span>
                </div>
              </div>

              {/* Compartir mi lista */}
              <div className="mt-8 w-full flex justify-center" style={{ maxWidth: 300 }}>
                <ShareBucketList
                  planes={pendientes}
                  nombre={profile.nombre || ''}
                  username={profile.username}
                  fotoPerfil={profile.foto_perfil_url}
                />
              </div>

              {/* Logout discreto */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 mt-6 text-[13px] text-[#666666] active:text-[#C97B7B] transition-colors min-h-[44px]"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── FAB ───────────────────────────────────────────── */}
      {activeTab === 'planes' && (
        <button
          onClick={() => setShowNuevoPlan(true)}
          aria-label="Añadir plan"
          className="active:opacity-100 transition-opacity"
          style={{
            position: 'fixed',
            right: 20,
            bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 20px)',
            width: 48, height: 48,
            borderRadius: '50%',
            background: '#1DE9B6',
            color: '#0A0A0A',
            opacity: 0.9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(29,233,182,0.2)',
            zIndex: 10,
          }}
        >
          <Plus style={{ width: 22, height: 22 }} strokeWidth={2.5} />
        </button>
      )}

      {/* ── Bottom nav ────────────────────────────────────── */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} fotoPerfil={profile.foto_perfil_url} />

      {/* ── Modals ────────────────────────────────────────── */}
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
          isOwner={selectedHistoria.pareja_codigo === profile.id}
          onUpdate={fetchData}
        />
      )}
    </div>
  )
}
