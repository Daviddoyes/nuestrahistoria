'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getGooalsOnboarding, anadirGooal } from '@/lib/actions'
import { CATEGORIA_GRADIENTE, DIFICULTAD_META } from '@/lib/gooals'
import CompletarGooalModal, { type ResultadoCompletado } from '@/components/CompletarGooalModal'
import type { GooalV2 } from '@/types/gooals'

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

// Las categorías del catálogo v2 que cubre cada interés del onboarding.
const CATEGORIAS_POR_INTERES: Record<InterId, string[]> = {
  viajes: ['viajes', 'aventura'],
  gastronomia: ['gastronomia'],
  musica: ['musica'],
  deporte: ['deporte'],
  cultura: ['cultura'],
}

function categoriasDe(intereses: InterId[]): string[] {
  return [...new Set(intereses.flatMap(i => CATEGORIAS_POR_INTERES[i]))]
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

  // Screen 4 — "¿Ya has hecho alguno de estos?"
  const [sugeridos, setSugeridos] = useState<GooalV2[] | null>(null)
  const [estados, setEstados] = useState<Record<string, 'hecho' | 'quiero'>>({})
  const [anadiendo, setAnadiendo] = useState<string | null>(null)
  const [puntosIniciales, setPuntosIniciales] = useState(0)
  const [completando, setCompletando] = useState<GooalV2 | null>(null)
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
      if (profile.onboarding_completado === true) { router.push('/muro'); return }

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
    // Los gooals sugeridos dependen de los intereses, así que se piden al
    // entrar en la pantalla, no antes.
    if (next === 4 && sugeridos === null) {
      getGooalsOnboarding(categoriasDe(intereses))
        .then(setSugeridos)
        .catch(e => { console.error('[Onboarding] gooals:', e); setSugeridos([]) })
    }
    setScreen(next)
  }

  const toggleConQuien = (id: CompaniaId) => {
    setConQuien(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  const handleQuiero = async (gooal: GooalV2) => {
    setAnadiendo(gooal.id)
    const res = await anadirGooal(gooal.id)
    if (res.success) setEstados(prev => ({ ...prev, [gooal.id]: 'quiero' }))
    else setFinishError(res.error ?? 'No se pudo añadir el gooal.')
    setAnadiendo(null)
  }

  const handleHecho = (resultado: ResultadoCompletado) => {
    if (completando) setEstados(prev => ({ ...prev, [completando.id]: 'hecho' }))
    setPuntosIniciales(resultado.puntosTotales)
    setCompletando(null)
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
      router.push('/muro')
    } catch (err) {
      console.error('[Onboarding] error:', err)
      setFinishError(err instanceof Error ? err.message : JSON.stringify(err))
      setFinishing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#2A2A2A] border-t-[#1DE9B6] rounded-full animate-spin" />
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
            background: i <= screen ? '#1DE9B6' : '#2A2A2A',
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
              <div className="w-10 h-10 rounded-full bg-[#1DE9B6] flex items-center justify-center mb-6">
                <span className="text-[#0A0A0A] font-bold text-sm tracking-wide">G</span>
              </div>
              <h1 className=" text-3xl font-bold text-[#F0F0F0] leading-tight mb-2">
                ¿Cómo te llaman?
              </h1>
              <p className="text-sm text-[#666666]">Elige tu nombre y usuario en GooALS</p>
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
                  className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#1DE9B6] text-base"
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
                        : 'border-[#2A2A2A] focus:border-[#1DE9B6]'
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
            className="w-full bg-[#1DE9B6] active:bg-[#00BFA5] disabled:opacity-40 text-[#0A0A0A] font-semibold py-3.5 rounded-xl text-base mt-4"
          >
            Continuar
          </button>
        </div>

        {/* Screen 1 — Bienvenida */}
        <div style={screenStyle}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32 }}>
            <div>
              <h1 className=" text-3xl font-bold text-[#F0F0F0] leading-tight mb-5">
                Hola, {nombre}.
              </h1>
              <p style={{ fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif', color: '#999999', fontSize: 16, lineHeight: 1.7, textAlign: 'center' }}>
                Las redes están llenas de vidas perfectas.<br />
                GooALS es para los que prefieren vivirlas.
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
                className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#1DE9B6] text-base"
              />
            </div>
          </div>
          <button onClick={() => advance(2)} className="w-full bg-[#1DE9B6] active:bg-[#00BFA5] text-[#0A0A0A] font-semibold py-3.5 rounded-xl text-base mt-4">
            Continuar
          </button>
        </div>

        {/* Screen 2 — Intereses */}
        <div style={screenStyle}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
            <div>
              <h2 className=" text-2xl font-bold text-[#F0F0F0] leading-tight mb-1">
                ¿Qué quieres vivir?
              </h2>
              <p className="text-sm text-[#666666]">Elige lo que te mueve.</p>
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
                      border: `2px solid ${sel ? '#1DE9B6' : '#2A2A2A'}`,
                      background: sel ? 'rgba(29,233,182,0.1)' : '#1A1A1A',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      transition: 'border-color 0.15s, background 0.15s', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{item.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: sel ? '#1DE9B6' : '#A0A0A0', textAlign: 'center', lineHeight: 1.2 }}>
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
            className="w-full bg-[#1DE9B6] active:bg-[#00BFA5] disabled:opacity-40 text-[#0A0A0A] font-semibold py-3.5 rounded-xl text-base mt-4"
          >
            Continuar
          </button>
        </div>

        {/* Screen 3 — Con quién */}
        <div style={screenStyle}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
            <div>
              <h2 className=" text-2xl font-bold text-[#F0F0F0] leading-tight mb-1">
                ¿Con quién mejor?
              </h2>
              <p className="text-sm text-[#666666]">Tus mejores momentos siempre tienen compañía.</p>
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
                      border: `2px solid ${sel ? '#1DE9B6' : '#2A2A2A'}`,
                      background: sel ? 'rgba(29,233,182,0.1)' : '#1A1A1A',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                      transition: 'border-color 0.15s, background 0.15s', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 32 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: sel ? '#1DE9B6' : '#A0A0A0', textAlign: 'center' }}>
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
            className="w-full bg-[#1DE9B6] active:bg-[#00BFA5] disabled:opacity-40 text-[#0A0A0A] font-semibold py-3.5 rounded-xl text-base mt-4"
          >
            Continuar
          </button>
        </div>

        {/* Screen 4 — ¿Ya has hecho alguno de estos? */}
        <div style={screenStyle}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', paddingTop: '1rem', minHeight: 0 }}>
            <div style={{ flexShrink: 0 }}>
              <h2 className="text-2xl font-bold text-[#F0F0F0] leading-tight mb-1">
                ¿Ya has hecho alguno de estos?
              </h2>
              <p className="text-sm text-[#666666]">Marca lo vivido y elige lo que viene.</p>
            </div>

            {sugeridos === null ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ height: 84, borderRadius: 16, background: '#141414' }} className="animate-pulse" />
                ))}
              </div>
            ) : sugeridos.length === 0 ? (
              <p style={{ fontSize: 13, color: '#444444', textAlign: 'center', padding: '24px 0' }}>
                Todavía no hay gooals en el catálogo. Podrás explorarlos en cuanto los haya.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sugeridos.map(g => {
                  const estado = estados[g.id]
                  const dificultad = DIFICULTAD_META[g.dificultad]
                  return (
                    <div
                      key={g.id}
                      style={{
                        background: '#141414',
                        border: `1px solid ${estado ? '#3A3A3A' : '#2A2A2A'}`,
                        borderRadius: 16, padding: 10,
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}
                    >
                      <div style={{
                        width: 54, height: 54, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
                        background: g.imagen_url ? '#1A1A1A' : CATEGORIA_GRADIENTE[g.categoria],
                      }}>
                        {g.imagen_url && (
                          <img src={g.imagen_url} alt="" loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 14, fontWeight: 600, color: estado ? '#888888' : '#F0F0F0',
                          lineHeight: 1.3, margin: 0,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        } as React.CSSProperties}>
                          {g.titulo}
                        </p>
                        <p style={{ fontSize: 11, color: '#666666', marginTop: 3 }}>
                          {dificultad.emoji} <span style={{ color: '#1DE9B6', fontWeight: 600 }}>+{g.puntos} pts</span>
                        </p>
                      </div>

                      {estado ? (
                        <span style={{
                          flexShrink: 0, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                          color: estado === 'hecho' ? '#4CAF50' : '#1DE9B6',
                          padding: '8px 10px',
                        }}>
                          {estado === 'hecho' ? '✓ Conseguido' : '✓ En tu lista'}
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => setCompletando(g)}
                            aria-label={`Ya hice: ${g.titulo}`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '9px 11px', borderRadius: 10, border: '1px solid #2A2A2A',
                              background: 'transparent', color: '#F0F0F0', fontSize: 11, fontWeight: 600,
                              whiteSpace: 'nowrap', cursor: 'pointer',
                            }}
                          >
                            <Camera style={{ width: 12, height: 12 }} /> Lo hice
                          </button>
                          <button
                            onClick={() => handleQuiero(g)}
                            disabled={anadiendo === g.id}
                            aria-label={`Quiero hacer: ${g.titulo}`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '9px 11px', borderRadius: 10, border: 'none',
                              background: '#1DE9B6', color: '#0A0A0A', fontSize: 11, fontWeight: 600,
                              whiteSpace: 'nowrap', cursor: 'pointer',
                              opacity: anadiendo === g.id ? 0.6 : 1,
                            }}
                          >
                            <Check style={{ width: 12, height: 12 }} /> Lo quiero
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <p style={{
            fontSize: 15, fontWeight: 600, textAlign: 'center', marginTop: 12,
            color: puntosIniciales > 0 ? '#1DE9B6' : '#444444', flexShrink: 0,
          }}>
            {puntosIniciales > 0
              ? `¡Empiezas con ${puntosIniciales} puntos!`
              : 'Sube una prueba de algo que ya hiciste y empiezas con puntos.'}
          </p>

          {finishError && (
            <p style={{ fontSize: 12, color: '#C97B7B', textAlign: 'center', marginTop: 8, flexShrink: 0, padding: '0 4px' }}>
              {finishError}
            </p>
          )}

          <button
            onClick={handleFinish}
            disabled={finishing}
            className="w-full bg-[#1DE9B6] active:bg-[#00BFA5] disabled:opacity-40 text-[#0A0A0A] font-semibold py-3.5 rounded-xl text-base mt-3"
            style={{ flexShrink: 0 }}
          >
            {finishing ? 'Guardando...' : 'Empezar a vivir →'}
          </button>
        </div>

      </div>

      {completando && (
        <CompletarGooalModal
          gooal={completando}
          modo="directo"
          onClose={() => setCompletando(null)}
          onCompletado={handleHecho}
        />
      )}
    </div>
  )
}
