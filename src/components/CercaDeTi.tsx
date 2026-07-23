'use client'

import { useState, useEffect, useMemo } from 'react'
import { MapPin, Plus, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { crearPlanDesdeSugerencia } from '@/lib/actions'
import type { Experiencia } from '@/types/planes'

type Props = {
  onPlanAnadido: () => void
}

const CAT_COLOR: Record<string, string> = {
  viajes: '#3B82F6',
  deporte: '#10B981',
  gastronomia: '#F59E0B',
  cultura: '#8B5CF6',
  aventura: '#E8692A',
  musica: '#EC4899',
}

// Distancia euclídea en grados (aprox.): dist < 2 ≈ 200 km. Es una
// aproximación grosera —un grado de longitud no mide igual que uno de
// latitud— pero suficiente para "lo que tienes cerca" en la península.
function distancia(a: { lat: number; lng: number }, exp: Experiencia) {
  return Math.sqrt(
    Math.pow((exp.latitud ?? 0) - a.lat, 2) + Math.pow((exp.longitud ?? 0) - a.lng, 2)
  )
}

export default function CercaDeTi({ onPlanAnadido }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null)
  const [cercanas, setCercanas] = useState<Experiencia[]>([])
  const [anadiendo, setAnadiendo] = useState<string | null>(null)
  const [anadidos, setAnadidos] = useState<string[]>([])

  // Pide la ubicación al montar. Si la deniega, ubicacion queda null y no se muestra nada.
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUbicacion(null)
    )
  }, [])

  useEffect(() => {
    if (!ubicacion) return
    const cargar = async () => {
      // Traemos todas las verificadas con coordenadas y filtramos en cliente.
      // (Ordenar por created_at y limitar antes de filtrar dejaría fuera lo
      // cercano si lo más reciente está lejos.)
      const { data } = await supabase
        .from('experiencias')
        .select('*')
        .eq('verificada', true)
        .not('latitud', 'is', null)
        .limit(500)

      const filtradas = ((data ?? []) as Experiencia[])
        .filter(exp => exp.latitud != null && exp.longitud != null && distancia(ubicacion, exp) < 2)
        .sort((a, b) => distancia(ubicacion, a) - distancia(ubicacion, b))
        .slice(0, 10)

      setCercanas(filtradas)
    }
    cargar()
  }, [ubicacion, supabase])

  const handleAnadir = async (exp: Experiencia) => {
    setAnadiendo(exp.id)
    const result = await crearPlanDesdeSugerencia(exp.titulo, exp.categoria)
    setAnadiendo(null)
    if (!result.success) return
    setAnadidos(prev => [...prev, exp.id])
    onPlanAnadido()
  }

  // Sin ubicación o sin nada cerca: la sección no existe, sin mensaje de error.
  if (!ubicacion || cercanas.length === 0) return null

  return (
    <div className="pt-3">
      <p className="px-3 mb-2.5 text-[10px] uppercase tracking-[0.15em] text-[#E8692A]">
        📍 Cerca de ti
      </p>

      <div className="flex gap-2.5 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: 'none' }}>
        {cercanas.map(exp => {
          const yaAnadido = anadidos.includes(exp.id)
          const color = CAT_COLOR[exp.categoria] ?? '#666666'
          return (
            <div
              key={exp.id}
              className="flex-shrink-0 flex flex-col"
              style={{
                width: 168, minHeight: 150,
                background: '#141414', border: '1px solid #2A2A2A',
                borderRadius: 16, padding: 16,
              }}
            >
              <span style={{
                alignSelf: 'flex-start', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
                color, background: `${color}22`, borderRadius: 6, padding: '3px 8px',
              }}>
                {exp.categoria}
              </span>

              <p
                className="font-serif"
                style={{
                  fontSize: 14, color: '#F0F0F0', lineHeight: 1.35, marginTop: 10,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                } as React.CSSProperties}
              >
                {exp.titulo}
              </p>

              <div className="flex items-end justify-between mt-auto pt-3">
                <span className="flex items-center gap-1 text-[11px] text-[#666666] min-w-0">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{exp.ciudad ?? exp.pais ?? ''}</span>
                </span>

                <button
                  type="button"
                  onClick={() => { if (!yaAnadido) handleAnadir(exp) }}
                  disabled={anadiendo === exp.id || yaAnadido}
                  aria-label={yaAnadido ? 'Añadido a tus planes' : 'Añadir a mis planes'}
                  style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: yaAnadido ? '#2A2A2A' : '#E8692A',
                    color: yaAnadido ? '#E8692A' : '#FFFFFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  className="active:scale-90 transition-transform disabled:opacity-70"
                >
                  {anadiendo === exp.id
                    ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : yaAnadido
                      ? <Check style={{ width: 15, height: 15 }} strokeWidth={2.5} />
                      : <Plus style={{ width: 16, height: 16 }} strokeWidth={2.5} />
                  }
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
