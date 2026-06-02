'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { X, Search, UserPlus, Check, Trash2, LogOut } from 'lucide-react'
import { inviteUserToPlan, leavePlan } from '@/lib/actions'
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

type SearchResult = { id: string; nombre: string; username: string; foto_perfil_url: string | null }

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

function SearchAvatar({ item }: { item: SearchResult }) {
  if (item.foto_perfil_url) {
    return <img src={item.foto_perfil_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div className="w-8 h-8 rounded-full bg-[#E8692A] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
      {item.nombre?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

export default function PlanDetailModal({ plan, currentUserId, onClose, onCompletar, onDeleted, onUpdate }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [confirming, setConfirming] = useState(false)
  const [deletingLoading, setDeletingLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase
      .from('plan_participantes' as never)
      .select('id, user_id, nombre_usuario, foto_url, estado')
      .eq('plan_id', plan.id)
      .then(({ data }) => { if (data) setParticipantes(data as Participante[]) })
  }, [plan.id, supabase])

  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      const existingIds = participantes.map(p => p.user_id)
      const allExclude = [currentUserId, ...existingIds]
      let query = supabase
        .from('profiles')
        .select('id, nombre, username, foto_perfil_url')
        .ilike('username', `%${searchQuery.trim()}%`)
      if (allExclude.length > 0) {
        query = query.not('id', 'in', `(${allExclude.join(',')})`)
      }
      const { data } = await query.limit(5)
      setSearchResults((data ?? []) as SearchResult[])
      setSearching(false)
    }, 300)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [searchQuery, supabase, participantes, currentUserId])

  const handleInvite = async (user: SearchResult) => {
    setInviting(user.id)
    await inviteUserToPlan(plan.id, user.id)
    setParticipantes(prev => [
      ...prev,
      { id: '', user_id: user.id, nombre_usuario: user.nombre, foto_url: user.foto_perfil_url, estado: 'invitado' },
    ])
    setSearchQuery('')
    setSearchResults([])
    setInviting(null)
    onUpdate()
  }

  const handleLeave = async () => {
    await leavePlan(plan.id)
    onDeleted()
  }

  const myRole = participantes.find(p => p.user_id === currentUserId)?.estado
  const isOwner = myRole === 'owner'
  const isParticipant = myRole === 'aceptado'

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

          {/* Invite search */}
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#666666] mb-2">Invitar</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444444]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por @username"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] text-sm"
              />
            </div>
            {(searching || searchResults.length > 0) && (
              <div className="mt-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
                {searching && <div className="px-4 py-3 text-xs text-[#666666]">Buscando...</div>}
                {!searching && searchResults.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleInvite(item)}
                    disabled={inviting === item.id}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#2A2A2A] disabled:opacity-40 border-b border-[#222222] last:border-0 min-h-[44px]"
                  >
                    <SearchAvatar item={item} />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-[#F0F0F0] truncate">{item.nombre}</p>
                      <p className="text-xs text-[#666666]">@{item.username}</p>
                    </div>
                    {inviting === item.id
                      ? <div className="w-4 h-4 border border-[#E8692A] border-t-transparent rounded-full animate-spin" />
                      : <UserPlus className="w-4 h-4 text-[#E8692A] flex-shrink-0" />
                    }
                  </button>
                ))}
              </div>
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
                    onClick={async () => {
                      setDeletingLoading(true)
                      onDeleted()
                    }}
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
