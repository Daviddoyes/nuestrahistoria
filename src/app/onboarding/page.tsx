'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getMyProfile, completeOnboarding, addPlan } from '@/lib/actions'
import type { ConQuien } from '@/types/planes'

type InterId = 'viajes' | 'gastronomia' | 'musica' | 'deporte' | 'cultura'

const INTERESES: { id: InterId; icon: string; label: string }[] = [
  { id: 'viajes', icon: '✈️', label: 'Viajes y aventura' },
  { id: 'gastronomia', icon: '🍜', label: 'Gastronomía' },
  { id: 'musica', icon: '🎵', label: 'Música y eventos' },
  { id: 'deporte', icon: '🏃', label: 'Deporte y retos' },
  { id: 'cultura', icon: '🎨', label: 'Cultura y arte' },
]

const CON_QUIEN_OPTIONS: { id: string; icon: string; label: string }[] = [
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

function getSugeridos(intereses: InterId[]) {
  const pool: { titulo: string; descripcion: string }[] = []
  for (const id of intereses) pool.push(...PLANES_SUGERIDOS[id])
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const seen = new Set<string>()
  const result: { titulo: string; descripcion: string }[] = []
  for (const p of pool) {
    if (!seen.has(p.titulo) && result.length < 3) {
      seen.add(p.titulo)
      result.push(p)
    }
  }
  return result
}

const TOTAL = 4

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState('')
  const [screen, setScreen] = useState(0)
  const [edad, setEdad] = useState('')
  const [intereses, setIntereses] = useState<InterId[]>([])
  const [conQuien, setConQuien] = useState('')
  const [sugeridos, setSugeridos] = useState<{ titulo: string; descripcion: string }[]>([])
  const [addedPlans, setAddedPlans] = useState<Set<number>>(new Set())
  const [addingPlan, setAddingPlan] = useState<number | null>(null)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    getMyProfile().then(p => {
      if (!p) { router.push('/'); return }
      if (p.onboarding_completado === true) { router.push('/planes'); return }
      setNombre(p.nombre || '')
      setLoading(false)
    })
  }, [router])

  const advance = (next: number) => {
    if (next === 3) setSugeridos(getSugeridos(intereses))
    setScreen(next)
  }

  const handleAddPlan = async (plan: { titulo: string; descripcion: string }, idx: number) => {
    setAddingPlan(idx)
    const cq: ConQuien =
      conQuien === 'pareja' ? 'pareja'
      : conQuien === 'amigos' ? 'amigos'
      : conQuien === 'solo' ? 'solo'
      : 'todos'
    await addPlan(plan.titulo, plan.descripcion, cq)
    setAddedPlans(prev => new Set([...prev, idx]))
    setAddingPlan(null)
  }

  const handleFinish = async () => {
    setFinishing(true)
    try {
      await completeOnboarding({ intereses, con_quien_vive: conQuien })
      router.push('/planes')
    } catch {
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

  return (
    <div style={{ height: '100dvh', width: '100vw', overflow: 'hidden', background: '#0A0A0A', display: 'flex', flexDirection: 'column' }}>

      {/* Progress dots */}
      <div style={{
        paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
        paddingBottom: '0.5rem',
        display: 'flex',
        justifyContent: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div key={i} style={{
            width: i === screen ? 24 : 8,
            height: 8,
            borderRadius: 4,
            background: i <= screen ? '#E8692A' : '#2A2A2A',
            transition: 'width 0.3s ease, background 0.3s ease',
          }} />
        ))}
      </div>

      {/* Sliding container */}
      <div style={{
        flex: 1,
        display: 'flex',
        width: `${TOTAL * 100}vw`,
        transform: `translateX(-${screen * 100}vw)`,
        transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
      }}>

        {/* Screen 0 — Bienvenida */}
        <div style={{ width: '100vw', minWidth: '100vw', height: '100%', display: 'flex', flexDirection: 'column', padding: '0 1.5rem', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32 }}>
            <div>
              <div className="w-10 h-10 rounded-full bg-[#E8692A] flex items-center justify-center mb-6">
                <span className="text-white font-bold text-sm tracking-wide">LS</span>
              </div>
              <h1 className="font-serif text-3xl font-bold text-[#F0F0F0] leading-tight mb-3">
                Hola, {nombre} 👋
              </h1>
              <p className="text-base text-[#666666] leading-relaxed">
                Livestory es tu espacio para planear, vivir y recordar los mejores momentos.
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
                min={1}
                max={120}
                className="w-full px-4 py-3.5 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#E8692A] text-base"
              />
            </div>
          </div>
          <button onClick={() => advance(1)} className="w-full bg-[#E8692A] active:bg-[#D4581A] text-white font-semibold py-3.5 rounded-xl text-base mt-4">
            Continuar
          </button>
        </div>

        {/* Screen 1 — Intereses */}
        <div style={{ width: '100vw', minWidth: '100vw', height: '100%', display: 'flex', flexDirection: 'column', padding: '0 1.5rem', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box' }}>
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
                      padding: '16px 12px',
                      borderRadius: 16,
                      border: `2px solid ${sel ? '#E8692A' : '#2A2A2A'}`,
                      background: sel ? 'rgba(232,105,42,0.1)' : '#1A1A1A',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'border-color 0.15s, background 0.15s',
                      cursor: 'pointer',
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
          <button onClick={() => advance(2)} disabled={intereses.length === 0} className="w-full bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl text-base mt-4">
            Continuar
          </button>
        </div>

        {/* Screen 2 — Con quién */}
        <div style={{ width: '100vw', minWidth: '100vw', height: '100%', display: 'flex', flexDirection: 'column', padding: '0 1.5rem', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
            <h2 className="font-serif text-2xl font-bold text-[#F0F0F0] leading-tight">
              ¿Con quién vives tus mejores momentos?
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {CON_QUIEN_OPTIONS.map(item => {
                const sel = conQuien === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setConQuien(item.id)}
                    style={{
                      padding: '20px 12px',
                      borderRadius: 16,
                      border: `2px solid ${sel ? '#E8692A' : '#2A2A2A'}`,
                      background: sel ? 'rgba(232,105,42,0.1)' : '#1A1A1A',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                      transition: 'border-color 0.15s, background 0.15s',
                      cursor: 'pointer',
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
          <button onClick={() => advance(3)} disabled={!conQuien} className="w-full bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl text-base mt-4">
            Continuar
          </button>
        </div>

        {/* Screen 3 — Planes sugeridos */}
        <div style={{ width: '100vw', minWidth: '100vw', height: '100%', display: 'flex', flexDirection: 'column', padding: '0 1.5rem', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#F0F0F0] leading-tight mb-1">
                Planes para ti
              </h2>
              <p className="text-sm text-[#666666]">Basados en tus intereses</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sugeridos.map((plan, idx) => {
                const added = addedPlans.has(idx)
                const adding = addingPlan === idx
                return (
                  <div key={idx} style={{
                    background: '#1A1A1A',
                    border: '1px solid #2A2A2A',
                    borderRadius: 16,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0', lineHeight: 1.3, margin: 0 }}>
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
                        flexShrink: 0,
                        padding: '8px 14px',
                        borderRadius: 10,
                        background: added ? '#2A2A2A' : '#E8692A',
                        color: added ? '#666666' : '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 600,
                        border: 'none',
                        opacity: adding ? 0.6 : 1,
                        whiteSpace: 'nowrap',
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
          <button onClick={handleFinish} disabled={finishing} className="w-full bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl text-base mt-4">
            {finishing ? 'Guardando...' : 'Empezar →'}
          </button>
        </div>

      </div>
    </div>
  )
}
