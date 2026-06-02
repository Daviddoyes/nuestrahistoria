'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ConQuien } from '@/types/planes'

type InterId = 'viajes' | 'gastronomia' | 'musica' | 'deporte' | 'cultura'
type CompaniaId = 'pareja' | 'amigos' | 'familia' | 'solo'

const INTERESES: { id: InterId; icon: string; label: string }[] = [
  { id: 'viajes', icon: '✈️', label: 'Viajes y aventura' },
  { id: 'gastronomia', icon: '🍜', label: 'Gastronomía' },
  { id: 'musica', icon: '🎵', label: 'Música y eventos' },
  { id: 'deporte', icon: '🏃', label: 'Deporte y retos' },
  { id: 'cultura', icon: '🎨', label: 'Cultura y arte' },
]

const CON_QUIEN_OPTIONS: { id: CompaniaId; icon: string; label: string }[] = [
  { id: 'pareja', icon: '👫', label: 'En pareja' },
  { id: 'amigos', icon: '👥', label: 'Con amigos' },
  { id: 'familia', icon: '👨‍👩‍👧', label: 'En familia' },
  { id: 'solo', icon: '🙋', label: 'Solo/a' },
]

const PLANES_SUGERIDOS: Record<InterId, { titulo: string; descripcion: string }[]> = {
  viajes: [
    { titulo: 'Ver el amanecer en Santorini', descripcion: 'El más famoso del mundo' },
    { titulo: 'Road trip por la costa de Croacia', descripcion: 'Mar cristalino y pueblos medievales' },
    { titulo: 'Ver la Aurora Boreal en Noruega', descripcion: 'Un espectáculo natural único' },
    { titulo: 'Perderse por los mercados de Marrakech', descripcion: 'Colores, especias y cultura' },
    { titulo: 'Visitar Kioto en primavera', descripcion: 'Los cerezos en flor' },
  ],
  gastronomia: [
    { titulo: 'Comer en un restaurante con estrella Michelin', descripcion: 'Alta cocina' },
    { titulo: 'Probar cocina Thai auténtica en Bangkok', descripcion: 'Los sabores originales' },
    { titulo: 'Aprender a hacer pasta fresca en Italia', descripcion: 'Un taller en Bolonia' },
    { titulo: 'Hacer una ruta de pintxos en San Sebastián', descripcion: 'La mejor ciudad gastronómica' },
    { titulo: 'Catar vinos en La Rioja', descripcion: 'Entre viñedos' },
  ],
  musica: [
    { titulo: 'Asistir a Tomorrowland', descripcion: 'El festival más grande del mundo' },
    { titulo: 'Ver un concierto en el Madison Square Garden', descripcion: 'Icónico' },
    { titulo: 'Bailar en el Carnaval de Río', descripcion: 'La fiesta más grande del planeta' },
    { titulo: 'Asistir a la ópera en el Teatro alla Scala', descripcion: 'Milán' },
    { titulo: 'Ver un show de Jazz en Nueva Orleans', descripcion: 'En su ciudad natal' },
  ],
  deporte: [
    { titulo: 'Correr una maratón', descripcion: '42km de puro logro personal' },
    { titulo: 'Hacer surf en Nazaré', descripcion: 'Las olas más grandes del mundo' },
    { titulo: 'Escalar el Mont Blanc', descripcion: 'El techo de Europa occidental' },
    { titulo: 'Completar un Ironman', descripcion: 'El reto definitivo' },
    { titulo: 'Hacer un Hyrox', descripcion: 'El fitness race más popular' },
  ],
  cultura: [
    { titulo: 'Ver la Capilla Sixtina', descripcion: 'Roma, la obra maestra de Miguel Ángel' },
    { titulo: 'Visitar el Museo del Louvre', descripcion: 'París, el museo más visitado' },
    { titulo: 'Ver un espectáculo en Broadway', descripcion: 'Nueva York' },
    { titulo: 'Visitar Machu Picchu', descripcion: 'La ciudad perdida de los Incas' },
    { titulo: 'Ver el Taj Mahal al amanecer', descripcion: 'India' },
  ],
}

const PLANES_POR_COMPANIA: Record<CompaniaId, { titulo: string; descripcion: string }[]> = {
  pareja: [
    { titulo: 'Escapada romántica a París', descripcion: 'La ciudad del amor' },
    { titulo: 'Cena con estrellas Michelin', descripcion: 'Una noche especial' },
    { titulo: 'Ver un atardecer en Santorini', descripcion: 'Inolvidable' },
  ],
  amigos: [
    { titulo: 'Road trip sin destino fijo', descripcion: 'Solo vosotros y la carretera' },
    { titulo: 'Festival de música', descripcion: 'Vivir la música en directo' },
    { titulo: 'Viaje a Tailandia', descripcion: 'Aventura en grupo' },
  ],
  familia: [
    { titulo: 'Viaje a Disneyland', descripcion: 'La magia para todos' },
    { titulo: 'Reunión familiar en la playa', descripcion: 'Un verano juntos' },
    { titulo: 'Ruta por los pueblos de España', descripcion: 'Descubrir los orígenes' },
  ],
  solo: [
    { titulo: 'Viaje solo a Japón', descripcion: 'Descubrirte a ti mismo' },
    { titulo: 'Retiro de meditación', descripcion: 'Conectar contigo' },
    { titulo: 'Hacer el Camino de Santiago solo', descripcion: 'Un reto personal' },
  ],
}

function getSugeridos(intereses: InterId[], compania: CompaniaId[]) {
  const pool: { titulo: string; descripcion: string }[] = []
  for (const id of intereses) pool.push(...PLANES_SUGERIDOS[id])
  for (const c of compania) pool.push(...PLANES_POR_COMPANIA[c])
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const seen = new Set<string>()
  const result: { titulo: string; descripcion: string }[] = []
  for (const p of pool) {
    if (!seen.has(p.titulo) && result.length < 4) { seen.add(p.titulo); result.push(p) }
  }
  return result
}

function genUsername(nombre: string) {
  const base = nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'user'
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}_${suffix}`
}

const TOTAL = 5

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [codigoInvitacion, setCodigoInvitacion] = useState('')
  const [screen, setScreen] = useState(0)

  // Screen 0 — username
  const [nombre, setNombre] = useState('')
  const [username, setUsername] = useState('')
  const [usernameValido, setUsernameValido] = useState(true)
  const [checkingUsername, setCheckingUsername] = useState(false)

  // Screen 1 — welcome/age
  const [edad, setEdad] = useState('')

  // Screen 2 — intereses
  const [intereses, setIntereses] = useState<InterId[]>([])

  // Screen 3 — con quién
  const [conQuien, setConQuien] = useState<CompaniaId[]>([])

  // Screen 4 — planes sugeridos
  const [sugeridos, setSugeridos] = useState<{ titulo: string; descripcion: string }[]>([])
  const [addedPlans, setAddedPlans] = useState<Set<number>>(new Set())
  const [addingPlan, setAddingPlan] = useState<number | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [finishError, setFinishError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, codigo_invitacion, onboarding_completado, username')
        .eq('id', user.id)
        .single()

      if (!profile) { router.push('/'); return }
      if (profile.onboarding_completado === true) { router.push('/planes'); return }

      const n = profile.nombre || ''
      setNombre(n)
      setUserId(user.id)
      setCodigoInvitacion((profile as { codigo_invitacion?: string }).codigo_invitacion || user.id)
      // Pre-fill username from existing or generate new
      setUsername((profile as { username?: string }).username || genUsername(n))
      setLoading(false)
    }
    load()
  }, [supabase, router])

  // Auto-update username when nombre changes (only if username hasn't been manually edited)
  const [usernameManual, setUsernameManual] = useState(false)
  useEffect(() => {
    if (!usernameManual && nombre) setUsername(genUsername(nombre))
  }, [nombre, usernameManual])

  // Debounced username uniqueness check
  const checkUsername = useCallback(async (u: string) => {
    if (u.length < 3) { setUsernameValido(false); return }
    setCheckingUsername(true)
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('username', u)
      .neq('id', userId)
    setUsernameValido((count ?? 0) === 0)
    setCheckingUsername(false)
  }, [supabase, userId])

  useEffect(() => {
    if (!username) return
    const t = setTimeout(() => checkUsername(username), 400)
    return () => clearTimeout(t)
  }, [username, checkUsername])

  const advance = (next: number) => {
    if (next === 4) setSugeridos(getSugeridos(intereses, conQuien))
    setScreen(next)
  }

  const toggleConQuien = (id: CompaniaId) => {
    setConQuien(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  const handleAddPlan = async (plan: { titulo: string; descripcion: string }, idx: number) => {
    setAddingPlan(idx)
    let cq: ConQuien = 'todos'
    if (conQuien.length === 1) {
      const c = conQuien[0]
      if (c === 'pareja') cq = 'pareja'
      else if (c === 'amigos') cq = 'amigos'
      else if (c === 'solo') cq = 'solo'
    }
    const code = codigoInvitacion || userId
    const { error } = await supabase.from('planes').insert({
      titulo: plan.titulo,
      descripcion: plan.descripcion,
      creado_por: nombre || 'Yo',
      pareja_codigo: code,
      estado: 'pendiente',
      con_quien: cq,
      orden: 0,
    })
    if (!error) setAddedPlans(prev => new Set([...prev, idx]))
    setAddingPlan(null)
  }

  const handleFinish = async () => {
    setFinishing(true)
    setFinishError(null)
    console.log('[Onboarding] handleFinish', { username, nombre, intereses, conQuien })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión activa')

      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completado: true,
          nombre,
          username,
          intereses,
          con_quien_vive: conQuien,
        })
        .eq('id', user.id)

      if (error) throw error
      console.log('[Onboarding] OK → /planes')
      router.push('/planes')
    } catch (err) {
      console.error('[Onboarding] error:', err)
      setFinishError(err instanceof Error ? err.message : JSON.stringify(err))
      setFinishing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#2A2A2A] border-t-[#E8692A] rounded-full animate-spin" />
      </div>
    )
  }

  const screenStyle: React.CSSProperties = {
    width: '100vw', minWidth: '100vw', height: '100%',
    display: 'flex', flexDirection: 'column',
    padding: '0 1.5rem',
    paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ height: '100dvh', width: '100vw', overflow: 'hidden', background: '#0A0A0A', display: 'flex', flexDirection: 'column' }}>

      {/* Progress dots */}
      <div style={{
        paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))',
        paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingBottom: '0.5rem',
        display: 'flex', justifyContent: 'center', gap: 8, flexShrink: 0,
      }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div key={i} style={{
            width: i === screen ? 24 : 8, height: 8, borderRadius: 4,
            background: i <= screen ? '#E8692A' : '#2A2A2A',
            transition: 'width 0.3s ease, background 0.3s ease',
          }} />
        ))}
      </div>

      {/* Sliding container */}
      <div style={{
        flex: 1, display: 'flex',
        width: `${TOTAL * 100}vw`,
        transform: `translateX(-${screen * 100}vw)`,
        transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        minHeight: 0,
      }}>

        {/* Screen 0 — Username */}
        <div style={screenStyle}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28 }}>
            <div>
              <div className="w-10 h-10 rounded-full bg-[#E8692A] flex items-center justify-center mb-6">
                <span className="text-white font-bold text-sm tracking-wide">LS</span>
              </div>
              <h1 className="font-serif text-3xl font-bold text-[#F0F0F0] leading-tight mb-2">
                ¿Cómo te llaman?
              </h1>
              <p className="text-sm text-[#666666]">Elige tu nombre y usuario en Livestory</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5">
                  Tu nombre
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Escribe tu nombre"
                  className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] text-base"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-1.5">
                  Tu @usuario
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#444444] text-base select-none">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => {
                      const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                      setUsername(v)
                      setUsernameManual(true)
                    }}
                    placeholder="tu_usuario"
                    maxLength={24}
                    className={`w-full pl-8 pr-4 py-3.5 rounded-xl border bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none text-base ${
                      username.length >= 3
                        ? usernameValido ? 'border-[#3A7A3A] focus:border-[#4CAF50]' : 'border-[#8B3A3A] focus:border-[#C97B7B]'
                        : 'border-[#2A2A2A] focus:border-[#E8692A]'
                    }`}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  {username.length >= 3 && (
                    <p className={`text-xs ${usernameValido ? 'text-[#4CAF50]' : 'text-[#C97B7B]'}`}>
                      {checkingUsername ? 'Verificando...' : usernameValido ? `@${username} está disponible` : 'Ese usuario ya está en uso'}
                    </p>
                  )}
                  {username.length < 3 && (
                    <p className="text-xs text-[#444444]">Mínimo 3 caracteres</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => advance(1)}
            disabled={!nombre.trim() || !usernameValido || username.length < 3 || checkingUsername}
            className="w-full bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl text-base mt-4"
          >
            Continuar
          </button>
        </div>

        {/* Screen 1 — Bienvenida */}
        <div style={screenStyle}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32 }}>
            <div>
              <h1 className="font-serif text-3xl font-bold text-[#F0F0F0] leading-tight mb-5">
                Hola, {nombre} 👋
              </h1>
              <p style={{ fontFamily: 'Georgia, serif', color: '#999999', fontSize: 16, lineHeight: 1.7, textAlign: 'center' }}>
                Las redes están llenas de vidas perfectas.<br />
                Livestory es para los que prefieren vivirlas.
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#666666] mb-2">
                ¿Cuántos años tienes?
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={edad}
                onChange={e => setEdad(e.target.value)}
                placeholder="Tu edad"
                min={1} max={120}
                className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] text-base"
              />
            </div>
          </div>
          <button onClick={() => advance(2)} className="w-full bg-[#E8692A] active:bg-[#D4581A] text-white font-semibold py-3.5 rounded-xl text-base mt-4">
            Continuar
          </button>
        </div>

        {/* Screen 2 — Intereses */}
        <div style={screenStyle}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#F0F0F0] leading-tight mb-1">
                ¿Qué experiencias te emocionan?
              </h2>
              <p className="text-sm text-[#666666]">Elige todas las que quieras</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {INTERESES.map(item => {
                const sel = intereses.includes(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => setIntereses(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id])}
                    style={{
                      padding: '16px 12px', borderRadius: 16,
                      border: `2px solid ${sel ? '#E8692A' : '#2A2A2A'}`,
                      background: sel ? 'rgba(232,105,42,0.1)' : '#1A1A1A',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      transition: 'border-color 0.15s, background 0.15s', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{item.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: sel ? '#E8692A' : '#A0A0A0', textAlign: 'center', lineHeight: 1.2 }}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <button
            onClick={() => advance(3)}
            disabled={intereses.length === 0}
            className="w-full bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl text-base mt-4"
          >
            Continuar
          </button>
        </div>

        {/* Screen 3 — Con quién */}
        <div style={screenStyle}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#F0F0F0] leading-tight mb-1">
                ¿Con quién vives tus mejores momentos?
              </h2>
              <p className="text-sm text-[#666666]">Elige todas las que quieras</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {CON_QUIEN_OPTIONS.map(item => {
                const sel = conQuien.includes(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleConQuien(item.id)}
                    style={{
                      padding: '20px 12px', borderRadius: 16,
                      border: `2px solid ${sel ? '#E8692A' : '#2A2A2A'}`,
                      background: sel ? 'rgba(232,105,42,0.1)' : '#1A1A1A',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                      transition: 'border-color 0.15s, background 0.15s', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 32 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: sel ? '#E8692A' : '#A0A0A0', textAlign: 'center' }}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <button
            onClick={() => advance(4)}
            disabled={conQuien.length === 0}
            className="w-full bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl text-base mt-4"
          >
            Continuar
          </button>
        </div>

        {/* Screen 4 — Planes sugeridos */}
        <div style={screenStyle}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, overflowY: 'auto', paddingTop: '1rem' }}>
            <div style={{ flexShrink: 0 }}>
              <h2 className="font-serif text-2xl font-bold text-[#F0F0F0] leading-tight mb-1">Planes para ti</h2>
              <p className="text-sm text-[#666666]">Basados en tus intereses y compañía</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
              {sugeridos.map((plan, idx) => {
                const added = addedPlans.has(idx)
                const adding = addingPlan === idx
                return (
                  <div key={idx} style={{
                    background: '#1A1A1A',
                    border: `1px solid ${added ? '#3A3A3A' : '#2A2A2A'}`,
                    borderRadius: 16, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: added ? '#888888' : '#F0F0F0', lineHeight: 1.3, margin: 0 }}>
                        {plan.titulo}
                      </p>
                      <p style={{ fontSize: 12, color: '#666666', marginTop: 3, marginBottom: 0 }}>
                        {plan.descripcion}
                      </p>
                    </div>
                    <button
                      onClick={() => !added && !adding && handleAddPlan(plan, idx)}
                      disabled={added || adding}
                      style={{
                        flexShrink: 0, padding: '8px 14px', borderRadius: 10,
                        background: added ? 'transparent' : '#E8692A',
                        color: added ? '#555555' : '#FFFFFF',
                        fontSize: 12, fontWeight: 600,
                        border: added ? '1px solid #3A3A3A' : 'none',
                        opacity: adding ? 0.6 : 1, whiteSpace: 'nowrap',
                        cursor: added || adding ? 'default' : 'pointer',
                      }}
                    >
                      {added ? '✓ Añadido' : adding ? '...' : 'Añadir'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
          {finishError && (
            <p style={{ fontSize: 12, color: '#E8692A', textAlign: 'center', marginTop: 8, flexShrink: 0, padding: '0 4px' }}>
              Error: {finishError}
            </p>
          )}
          <button
            onClick={handleFinish}
            disabled={finishing}
            className="w-full bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl text-base mt-4"
            style={{ flexShrink: 0 }}
          >
            {finishing ? 'Guardando...' : 'Empezar →'}
          </button>
        </div>

      </div>
    </div>
  )
}
