'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Check, Trash2, LogOut } from 'lucide-react'
import { leavePlan } from '@/lib/actions'
import { createClient } from '@/lib/supabase/client'
import SharePlanImage from './SharePlanImage'
import type { Plan } from '@/types/planes'

type Participante = {
  id: string
  user_id: string
  nombre_usuario: string | null
  foto_url: string | null
  estado: string
}

type Usuario = { id: string; nombre: string; username: string; foto_perfil_url: string | null }

type Props = {
  plan: Plan
  currentUserId: string
  onClose: () => void
  onCompletar: () => void
  onDeleted: () => void
  onUpdate: () => void
}

const ESTADO_LABEL: Record<string, string> = {
  owner: 'Creador',
  aceptado: 'Participante',
  invitado: 'Invitado',
  pendiente: 'Pendiente',
}

function ParticipantAvatar({ nombre, fotoUrl, size = 36 }: { nombre: string | null; fotoUrl: string | null; size?: number }) {
  const initial = nombre?.[0]?.toUpperCase() ?? '?'
  if (fotoUrl) {
    return <img src={fotoUrl} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#2A2A2A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 700, color: '#888888', flexShrink: 0,
    }}>
      {initial}
    </div>
  )
}

export default function PlanDetailModal({ plan, currentUserId, onClose, onCompletar, onDeleted, onUpdate }: Props) {
  const supabase = useMemo(() => createClient(), [])

  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [confirming, setConfirming] = useState(false)
  const [deletingLoading, setDeletingLoading] = useState(false)

  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<Usuario[]>([])
  const [invitadosPendientes, setInvitadosPendientes] = useState<Usuario[]>([])
  const [invitando, setInvitando] = useState(false)

  useEffect(() => {
    supabase
      .from('plan_participantes' as never)
      .select('id, user_id, nombre_usuario, foto_url, estado')
      .eq('plan_id', plan.id)
      .then(({ data }) => { if (data) setParticipantes(data as Participante[]) })
  }, [plan.id, supabase])

  useEffect(() => {
    const q = busqueda.replace('@', '').trim()
    if (q.length < 2) { setResultados([]); return }

    const buscar = async () => {
      const excluir = [
        currentUserId,
        ...participantes.map(p => p.user_id),
        ...invitadosPendientes.map(u => u.id),
      ]

      let query = supabase
        .from('profiles')
        .select('id, nombre, username, foto_perfil_url')
        .or(`username.ilike.%${q}%,nombre.ilike.%${q}%`)
        .neq('id', currentUserId)

      if (excluir.length > 1) {
        // exclude participantes and chips already selected
        const extraExcluir = excluir.slice(1)
        query = query.not('id', 'in', `(${extraExcluir.join(',')})`)
      }

      const { data, error } = await query.limit(5)
      if (!error) setResultados((data ?? []) as Usuario[])
    }

    buscar()
  }, [busqueda, supabase, currentUserId, participantes, invitadosPendientes])

  const handleInvitar = async () => {
    if (invitadosPendientes.length === 0) return
    setInvitando(true)
    for (const invitado of invitadosPendientes) {
      await supabase.from('plan_participantes' as never).insert({
        plan_id: plan.id,
        user_id: invitado.id,
        nombre_usuario: invitado.nombre,
        estado: 'invitado',
      })
      setParticipantes(prev => [
        ...prev,
        { id: '', user_id: invitado.id, nombre_usuario: invitado.nombre, foto_url: invitado.foto_perfil_url, estado: 'invitado' },
      ])
    }
    setInvitadosPendientes([])
    setBusqueda('')
    setResultados([])
    setInvitando(false)
    onUpdate()
  }

  const handleLeave = async () => {
    await leavePlan(plan.id)
    onDeleted()
  }

  const myRole = participantes.find(p => p.user_id === currentUserId)?.estado
  const isOwner = myRole === 'owner' || plan.pareja_codigo === currentUserId
  const isParticipant = myRole === 'aceptado' && plan.pareja_codigo !== currentUserId

  return (
    <>
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="fixed right-4 z-[60] w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/60 active:bg-black/70 active:text-white transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <X className="w-4 h-4" />
      </button>

      <div
        className="fixed inset-0 z-50 bg-[#0A0A0A] modal-slide-up overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        <div
          className="px-6 pt-16"
          style={{ paddingBottom: 'max(3rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#E8692A] mb-3">Plan pendiente</p>
          <h2 className="font-serif text-2xl font-bold text-[#F0F0F0] leading-snug mb-6">{plan.titulo}</h2>

          <div className="h-px bg-[#2A2A2A] mb-6" />

          {/* Participants */}
          {participantes.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#666666] mb-3">Participantes</p>
              <div className="space-y-3">
                {participantes.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 min-h-[44px]">
                    <ParticipantAvatar nombre={p.nombre_usuario} fotoUrl={p.foto_url} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#F0F0F0] truncate">{p.nombre_usuario ?? 'Usuario'}</p>
                      <p className="text-[10px] text-[#444444]">{ESTADO_LABEL[p.estado] ?? p.estado}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invite section */}
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#666666] mb-3">Invitar</p>

            {/* Selected chips */}
            {invitadosPendientes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {invitadosPendientes.map(u => (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#2A2A2A', border: '1px solid #E8692A',
                    borderRadius: 20, padding: '5px 10px 5px 12px',
                  }}>
                    <span style={{ fontSize: 13, color: '#F0F0F0' }}>{u.nombre}</span>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault()
                        setInvitadosPendientes(prev => prev.filter(i => i.id !== u.id))
                      }}
                      style={{ color: '#888888', lineHeight: 1, padding: 3, display: 'flex' }}
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search input + dropdown */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o @usuario"
                className="w-full px-4 py-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] text-sm"
              />

              {resultados.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#1A1A1A',
                  border: '1px solid #2A2A2A',
                  borderRadius: 8,
                  zIndex: 100,
                  maxHeight: 200,
                  overflowY: 'auto',
                  marginTop: 4,
                }}>
                  {resultados.map(usuario => (
                    <div
                      key={usuario.id}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        setInvitadosPendientes(prev => [...prev, usuario])
                        setBusqueda('')
                        setResultados([])
                      }}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        minHeight: 44,
                        cursor: 'pointer',
                        borderBottom: '1px solid #222222',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: '#E8692A', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 14, fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {usuario.nombre?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ color: '#F0F0F0', fontSize: 14 }}>{usuario.nombre}</div>
                        <div style={{ color: '#666666', fontSize: 12 }}>@{usuario.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invite button — only shown when chips exist */}
            {invitadosPendientes.length > 0 && (
              <button
                onClick={handleInvitar}
                disabled={invitando}
                className="w-full mt-3 py-3 bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold min-h-[44px] transition-colors"
              >
                {invitando ? 'Invitando...' : `Invitar ${invitadosPendientes.length === 1 ? 'a 1 persona' : `a ${invitadosPendientes.length} personas`}`}
              </button>
            )}
          </div>

          <div className="h-px bg-[#2A2A2A] mb-6" />

          {/* Share */}
          <div className="mb-6">
            <SharePlanImage plan={plan} />
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={onCompletar}
              className="w-full py-4 bg-[#E8692A] active:bg-[#D4581A] text-white rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              Marcar como hecho
            </button>

            {isOwner && !confirming && (
              <button
                onClick={() => setConfirming(true)}
                className="w-full py-3 flex items-center justify-center gap-2 text-xs text-[#666666] active:text-[#888888] transition-colors min-h-[44px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar plan
              </button>
            )}

            {isOwner && confirming && (
              <div className="border border-[#2A2A2A] rounded-xl p-4 space-y-3">
                <p className="text-sm text-[#666666] text-center">¿Eliminar este plan? Esta acción no se puede deshacer.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirming(false)}
                    className="flex-1 py-3 rounded-xl border border-[#2A2A2A] text-[#666666] active:bg-[#1A1A1A] text-sm min-h-[44px]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => { setDeletingLoading(true); onDeleted() }}
                    disabled={deletingLoading}
                    className="flex-1 py-3 rounded-xl bg-[#8B3A3A] active:bg-[#7A2A2A] text-white text-sm min-h-[44px] disabled:opacity-40"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}

            {isParticipant && (
              <button
                onClick={handleLeave}
                className="w-full py-4 border border-[#8B3A3A]/40 text-[#C97B7B] active:bg-[#8B3A3A]/10 rounded-xl text-sm font-medium min-h-[44px] flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Abandonar plan
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
