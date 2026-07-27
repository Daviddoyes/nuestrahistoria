'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { X, Search, UserPlus, Check, Copy, Users, Globe, User as UserIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { actualizarConfigPlan, inviteUserToPlan } from '@/lib/actions'

type Props = {
  planId: string
  planTitulo: string
  onClose: () => void
}

type PerfilResult = { id: string; nombre: string; username: string; foto_perfil_url: string | null }

const PLAZOS: { label: string; valor: string | null }[] = [
  { label: 'Este mes', valor: 'corto' },
  { label: 'Este año', valor: 'medio' },
  { label: 'Algún día', valor: 'largo' },
  { label: 'Sin fecha', valor: null },
]

function Avatar({ item }: { item: PerfilResult }) {
  if (item.foto_perfil_url) {
    return <img src={item.foto_perfil_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div className="w-7 h-7 rounded-full bg-[#1DE9B6] flex items-center justify-center text-[#0A0A0A] text-xs font-bold flex-shrink-0">
      {item.nombre?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

export default function PlanWizard({ planId, planTitulo, onClose }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [paso, setPaso] = useState<1 | 2>(1)
  const [fechaPlazo, setFechaPlazo] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Paso 2
  const [modo, setModo] = useState<null | 'invitar' | 'publico'>(null)
  const [linkCopiado, setLinkCopiado] = useState(false)

  // Búsqueda de invitados (igual que NuevoPlanModal)
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<PerfilResult[]>([])
  const [buscando, setBuscando] = useState(false)
  const [invitados, setInvitados] = useState<PerfilResult[]>([])
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const planUrl = `https://gooals.app/plan/${planId}`

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResultados([]); return }
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setBuscando(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, nombre, username, foto_perfil_url')
        .or(`username.ilike.%${q}%,nombre.ilike.%${q}%`)
        .limit(5)
      setResultados((data ?? []) as PerfilResult[])
      setBuscando(false)
    }, 300)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [query, supabase])

  const elegirPlazo = async (valor: string | null) => {
    setGuardando(true)
    setError('')
    const result = await actualizarConfigPlan(planId, valor, false)
    setGuardando(false)
    if (!result.success) { setError(result.error || 'No se pudo guardar'); return }
    setFechaPlazo(valor)
    setPaso(2)
  }

  const hacerPublico = async () => {
    setGuardando(true)
    setError('')
    const result = await actualizarConfigPlan(planId, fechaPlazo, true)
    setGuardando(false)
    if (!result.success) { setError(result.error || 'No se pudo hacer público'); return }
    setModo('publico')
  }

  const invitar = async (item: PerfilResult) => {
    if (invitados.find(i => i.id === item.id)) return
    setQuery('')
    setResultados([])
    setInvitados(prev => [...prev, item])
    const result = await inviteUserToPlan(planId, item.id)
    if (!result.success) {
      setInvitados(prev => prev.filter(i => i.id !== item.id))
      setError(result.error || 'No se pudo invitar')
    }
  }

  const copiarLink = () => {
    navigator.clipboard.writeText(planUrl).then(() => {
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 2000)
    })
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full modal-slide-up"
        style={{ background: '#141414', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88dvh', overflowY: 'auto' }}
      >
        {/* Header: dots + X */}
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <div className="flex items-center gap-1.5">
            {[1, 2].map(n => (
              <span key={n} style={{ width: 7, height: 7, borderRadius: '50%', background: paso === n ? '#1DE9B6' : '#2A2A2A', transition: 'background 0.2s' }} />
            ))}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-[#444444] active:text-[#F0F0F0] w-9 h-9 flex items-center justify-center rounded-lg active:bg-[#1A1A1A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))' }}>
          {/* ── PASO 1 — ¿Cuándo? ── */}
          {paso === 1 && (
            <div>
              <h3 className="font-serif text-xl font-bold text-[#F0F0F0] leading-snug">¿Cuándo quieres hacerlo?</h3>
              <p className="text-[13px] text-[#666666] mt-1.5 mb-5 leading-snug">
                Los planes con fecha tienen 3 veces más probabilidades de cumplirse
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {PLAZOS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => elegirPlazo(p.valor)}
                    disabled={guardando}
                    className="py-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] text-sm font-medium active:bg-[#222222] active:border-[#1DE9B6] disabled:opacity-50 transition-colors min-h-[44px]"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── PASO 2 — ¿Con quién? ── */}
          {paso === 2 && (
            <div>
              <h3 className="font-serif text-xl font-bold text-[#F0F0F0] leading-snug mb-5">¿Lo haces solo o con alguien?</h3>

              {modo === null && (
                <>
                  <div className="space-y-3">
                    <button
                      onClick={onClose}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] active:bg-[#222222] transition-colors text-left min-h-[44px]"
                    >
                      <UserIcon className="w-5 h-5 text-[#1DE9B6] flex-shrink-0" />
                      <span className="text-sm font-medium text-[#F0F0F0]">Solo</span>
                    </button>
                    <button
                      onClick={() => setModo('invitar')}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] active:bg-[#222222] transition-colors text-left min-h-[44px]"
                    >
                      <Users className="w-5 h-5 text-[#1DE9B6] flex-shrink-0" />
                      <span className="text-sm font-medium text-[#F0F0F0]">Invitar a alguien</span>
                    </button>
                    <button
                      onClick={hacerPublico}
                      disabled={guardando}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] active:bg-[#222222] disabled:opacity-50 transition-colors text-left min-h-[44px]"
                    >
                      <Globe className="w-5 h-5 text-[#1DE9B6] flex-shrink-0" />
                      <span className="text-sm font-medium text-[#F0F0F0]">{guardando ? 'Guardando...' : 'Hacerlo público'}</span>
                    </button>
                  </div>

                  <button onClick={onClose} className="w-full text-center text-[13px] text-[#666666] active:text-[#888888] mt-5 min-h-[44px]">
                    Ahora no
                  </button>
                </>
              )}

              {/* Invitar */}
              {modo === 'invitar' && (
                <div>
                  {invitados.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {invitados.map(item => (
                        <div key={item.id} className="flex items-center gap-1.5 bg-[#1A1A1A] border border-[#1DE9B6] rounded-full pl-1 pr-2.5 py-1">
                          <Avatar item={item} />
                          <span className="text-xs text-[#F0F0F0]">{item.nombre}</span>
                          <Check className="w-3 h-3 text-[#1DE9B6]" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ position: 'relative' }}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444444]" />
                    <input
                      type="text"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Busca por @usuario"
                      autoFocus
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#1DE9B6] text-sm"
                    />

                    {(buscando || resultados.length > 0) && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 12, marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                        {buscando && <div className="px-4 py-3 text-xs text-[#666666]">Buscando...</div>}
                        {!buscando && resultados.map(item => {
                          const ya = !!invitados.find(i => i.id === item.id)
                          return (
                            <div
                              key={item.id}
                              onPointerDown={e => { e.preventDefault(); invitar(item) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', minHeight: 44, borderBottom: '1px solid #222222', cursor: 'pointer', opacity: ya ? 0.4 : 1, pointerEvents: ya ? 'none' : 'auto' }}
                            >
                              <Avatar item={item} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#F0F0F0] truncate">{item.nombre}</p>
                                <p className="text-xs text-[#666666]">@{item.username}</p>
                              </div>
                              <UserPlus className="w-4 h-4 text-[#1DE9B6] flex-shrink-0" />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={onClose}
                    className="w-full mt-5 py-3.5 rounded-xl bg-[#1DE9B6] active:bg-[#00BFA5] text-[#0A0A0A] text-sm font-semibold min-h-[44px]"
                  >
                    Listo
                  </button>
                </div>
              )}

              {/* Público */}
              {modo === 'publico' && (
                <div>
                  <p className="text-[13px] text-[#666666] leading-relaxed mb-3">
                    Tu plan es público. Comparte el link para que cualquiera pueda solicitar unirse.
                  </p>
                  <button
                    onClick={copiarLink}
                    className="w-full py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] text-sm font-medium min-h-[44px] flex items-center justify-center gap-2 active:bg-[#222222] transition-colors"
                  >
                    {linkCopiado ? <Check className="w-4 h-4 text-[#1DE9B6]" /> : <Copy className="w-4 h-4" />}
                    {linkCopiado ? '¡Link copiado!' : 'Copiar link del plan'}
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full mt-3 py-3.5 rounded-xl bg-[#1DE9B6] active:bg-[#00BFA5] text-[#0A0A0A] text-sm font-semibold min-h-[44px]"
                  >
                    Listo
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-[#C97B7B] mt-4">{error}</p>}
        </div>
      </div>
    </div>
  )
}
