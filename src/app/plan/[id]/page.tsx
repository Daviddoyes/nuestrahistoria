'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getPublicPlan, requestJoinPlan } from '@/lib/actions'
import type { PublicPlan } from '@/types/planes'

function Avatar({ nombre, foto, size = 36 }: { nombre: string; foto: string | null; size?: number }) {
  const initial = nombre?.[0]?.toUpperCase() ?? '?'
  if (foto) {
    return <img src={foto} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#2A2A2A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: '#888888', flexShrink: 0,
    }}>
      {initial}
    </div>
  )
}

export default function PublicPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<PublicPlan | null>(null)
  const [estado, setEstado] = useState<PublicPlan['viewerEstado']>('ninguno')
  const [joining, setJoining] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getPublicPlan(id)
      .then(data => {
        if (!active) return
        setPlan(data)
        if (data) setEstado(data.viewerEstado)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  const handleUnete = () => {
    // Not logged in → remember where to return after login
    localStorage.setItem('post_login_redirect', `/plan/${id}`)
    router.push('/')
  }

  const handleSolicitar = async () => {
    setJoining(true)
    setJoinError(null)
    const result = await requestJoinPlan(id)
    setJoining(false)
    if (result.needsLogin) { handleUnete(); return }
    if (!result.success) {
      setJoinError(result.error ?? 'No se pudo enviar la solicitud. Inténtalo de nuevo.')
      return
    }
    if (result.success && result.estado) {
      setEstado(result.estado)
      if (result.estado === 'solicitado') setJustSubmitted(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#2A2A2A] border-t-[#E8692A] rounded-full animate-spin" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-8">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#E8692A', textTransform: 'uppercase' }}>
          LIVESTORY
        </span>
        <p className="mt-6 text-[15px] text-[#666666] text-center">Este plan no está disponible.</p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Brand bar */}
      <div className="flex-shrink-0 flex items-center justify-center border-b border-[#1A1A1A]" style={{ height: 40 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.22em', color: '#E8692A', textTransform: 'uppercase' }}>
          LIVESTORY
        </span>
      </div>

      <div
        className="flex-1 w-full max-w-md mx-auto px-6 pt-8"
        style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Creator */}
        <div className="flex items-center gap-3 mb-8">
          <Avatar nombre={plan.creador_nombre} foto={plan.creador_foto} size={44} />
          <div className="min-w-0">
            <p className="text-[15px] text-[#F0F0F0] font-medium leading-tight truncate">{plan.creador_nombre}</p>
            {plan.creador_username && (
              <p className="text-[12px] text-[#555555] mt-0.5 truncate">@{plan.creador_username}</p>
            )}
          </div>
        </div>

        {/* Title */}
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#E8692A] mb-3">Plan</p>
        <h1 className="font-serif text-3xl font-bold text-[#F0F0F0] leading-snug mb-4">{plan.titulo}</h1>

        {(plan.descripcion || plan.descripcion_publica) && (
          <p className="text-[15px] text-[#999999] leading-relaxed mb-6">{plan.descripcion || plan.descripcion_publica}</p>
        )}

        <div className="h-px bg-[#2A2A2A] my-6" />

        {/* Participant count */}
        <p className="text-[13px] text-[#888888] mb-4">
          {plan.participantes.length === 1
            ? '1 persona se ha unido'
            : `${plan.participantes.length} personas se han unido`}
        </p>

        {/* Participants list */}
        {plan.participantes.length > 0 && (
          <div className="space-y-3 mb-8">
            {plan.participantes.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <Avatar nombre={p.nombre} foto={p.foto} size={32} />
                <p className="text-sm text-[#F0F0F0] truncate">{p.nombre}</p>
              </div>
            ))}
          </div>
        )}

        {/* Action */}
        <div className="mt-2">
          {!plan.loggedIn && (
            <button
              onClick={handleUnete}
              className="w-full py-4 bg-[#E8692A] active:bg-[#D4581A] text-white rounded-xl text-sm font-semibold min-h-[44px] transition-colors"
            >
              Únete al plan
            </button>
          )}

          {plan.loggedIn && estado === 'participante' && (
            <div className="w-full py-4 rounded-xl border border-[#2A4A2A] bg-[#1A2A1A] text-center text-sm text-[#6BBF6B]">
              Ya formas parte de este plan ✓
            </div>
          )}

          {plan.loggedIn && estado === 'solicitado' && (
            <div className="w-full py-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-center text-sm text-[#999999]">
              {justSubmitted ? 'Solicitud enviada. El creador te confirmará.' : 'Solicitud pendiente...'}
            </div>
          )}

          {plan.loggedIn && estado === 'ninguno' && (
            <>
              <button
                onClick={handleSolicitar}
                disabled={joining}
                className="w-full py-4 bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold min-h-[44px] transition-colors"
              >
                {joining ? 'Enviando...' : 'Solicitar unirme'}
              </button>
              {joinError && (
                <p className="mt-3 text-sm text-[#C97B7B] bg-[#8B3A3A]/20 px-3 py-2 rounded-lg text-center">
                  {joinError}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
