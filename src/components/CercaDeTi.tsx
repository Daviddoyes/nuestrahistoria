'use client'

import { useState, useEffect, useMemo } from 'react'
import { MapPin, Plus, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { crearPlanDesdeSugerencia } from '@/lib/actions'
import { distanciaKm, acortarLugar } from '@/lib/geo'
import GooalDetailModal from './GooalDetailModal'
import PlanWizard from './PlanWizard'
import type { Gooal, LugarConGooal } from '@/types/planes'

type Props = {
  onPlanAdded: () => void
}

// Misma paleta que las cards de planes / sugerencias.
const colorCategoria: Record<string, string> = {
  aventura: '#FF6B35',
  deporte: '#4CAF50',
  musica: '#9C27B0',
  cultura: '#2196F3',
  gastronomia: '#FF9800',
  viajes: '#E91E63',
}
const colorCat = (c: string) => colorCategoria[c] ?? '#1DE9B6'

// Chips de filtro: etiqueta visible + clave que guarda la BD (null = Todos).
const CATEGORIAS: { label: string; key: string | null }[] = [
  { label: 'Todos', key: null },
  { label: 'Aventura', key: 'aventura' },
  { label: 'Deporte', key: 'deporte' },
  { label: 'Cultura', key: 'cultura' },
  { label: 'Música', key: 'musica' },
  { label: 'Gastronomía', key: 'gastronomia' },
  { label: 'Viajes', key: 'viajes' },
]

const RADIO_KM = 2000
const MAX_GOOALS = 100

export default function CercaDeTi({ onPlanAdded }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null)
  const [cargandoUbic, setCargandoUbic] = useState(false)
  const [cercanos, setCercanos] = useState<LugarConGooal[]>([])
  const [categoria, setCategoria] = useState<string | null>(null)
  const [anadiendo, setAnadiendo] = useState<string | null>(null)
  const [anadidos, setAnadidos] = useState<string[]>([])
  const [addError, setAddError] = useState('')
  const [detalle, setDetalle] = useState<Gooal | null>(null)
  const [planWizard, setPlanWizard] = useState<{ id: string; titulo: string } | null>(null)

  const pedirUbicacion = () => {
    if (!navigator.geolocation) return
    setCargandoUbic(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setCargandoUbic(false) },
      () => { setUbicacion(null); setCargandoUbic(false) }
    )
  }

  // Intento automático al montar; si se deniega, queda el botón manual.
  useEffect(() => { pedirUbicacion() }, [])

  useEffect(() => {
    if (!ubicacion) return
    const cargar = async () => {
      const { data } = await supabase
        .from('gooal_lugares')
        .select('*, gooals(*)')
        .not('latitud', 'is', null)
        .not('longitud', 'is', null)
        .limit(2000)

      const conDistancia = ((data ?? []) as LugarConGooal[])
        .filter(l => l.gooals && l.latitud != null && l.longitud != null)
        .map(l => ({
          ...l,
          distancia: distanciaKm(ubicacion.lat, ubicacion.lng, Number(l.latitud), Number(l.longitud)),
        }))
        .filter(l => (l.distancia ?? Infinity) < RADIO_KM)
        .sort((a, b) => (a.distancia ?? 0) - (b.distancia ?? 0))

      // Un gooal aparece una sola vez, por su lugar más cercano.
      const vistos = new Set<string>()
      const unicos: LugarConGooal[] = []
      for (const l of conDistancia) {
        if (vistos.has(l.gooal_id)) continue
        vistos.add(l.gooal_id)
        unicos.push(l)
      }
      setCercanos(unicos)
    }
    cargar()
  }, [ubicacion, supabase])

  const handleAnadir = async (gooal: Gooal) => {
    setAnadiendo(gooal.id)
    setAddError('')
    try {
      const result = await crearPlanDesdeSugerencia(gooal.titulo, gooal.categoria)
      if (!result.success) throw new Error(result.error || 'No se pudo añadir')
      setAnadidos(prev => [...prev, gooal.id])
      onPlanAdded()
      setTimeout(() => setAnadidos(prev => prev.filter(id => id !== gooal.id)), 2000)
      if (result.planId) setPlanWizard({ id: result.planId, titulo: gooal.titulo })
    } catch (err) {
      console.error('[añadir plan]', err)
      setAddError('No se pudo añadir. Inténtalo otra vez.')
      setTimeout(() => setAddError(''), 3000)
    } finally {
      setAnadiendo(null)
    }
  }

  const visibles = cercanos
    .filter(l => !categoria || l.gooals?.categoria === categoria)
    .slice(0, MAX_GOOALS)

  return (
    <div>
      {/* Filtros de categoría */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIAS.map(cat => {
          const activo = categoria === cat.key
          return (
            <button
              key={cat.label}
              onClick={() => setCategoria(cat.key)}
              className="flex-shrink-0 transition-colors"
              style={{
                fontSize: 12, fontWeight: activo ? 600 : 400,
                padding: '6px 14px', borderRadius: 20, whiteSpace: 'nowrap',
                background: activo ? '#1DE9B6' : '#1A1A1A',
                color: activo ? '#0A0A0A' : '#666666',
                border: activo ? '1px solid #1DE9B6' : '1px solid #2A2A2A',
              }}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Estado sin ubicación */}
      {!ubicacion ? (
        <div className="px-4 pt-6 pb-2 flex flex-col items-center text-center">
          <MapPin className="w-6 h-6 text-[#444444] mb-3" />
          <p className="text-[13px] text-[#666666] mb-4 leading-relaxed">
            Activa tu ubicación para descubrir planes cerca de ti.
          </p>
          <button
            onClick={pedirUbicacion}
            disabled={cargandoUbic}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1DE9B6] active:bg-[#00BFA5] disabled:opacity-60 text-[#0A0A0A] text-sm font-semibold min-h-[44px]"
          >
            <MapPin className="w-4 h-4" />
            {cargandoUbic ? 'Buscando...' : 'Activar ubicación'}
          </button>
        </div>
      ) : visibles.length === 0 ? (
        <p className="px-4 pt-6 text-[13px] text-[#444444] text-center">
          No hay planes cerca en esta categoría.
        </p>
      ) : (
        <div className="pt-3">
          {visibles.map(lugar => {
            const gooal = lugar.gooals!
            const yaAnadido = anadidos.includes(gooal.id)
            const color = colorCat(gooal.categoria)
            return (
              <div
                key={lugar.id}
                onClick={() => setDetalle(gooal)}
                className="active:opacity-80 transition-opacity"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  minHeight: 72, margin: '0 12px 8px', background: '#111111',
                  borderRadius: 12, padding: 16,
                }}
              >
                {/* Punto de categoría */}
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />

                {/* Nombre + lugar más cercano */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 15, fontWeight: 500, color: '#F0F0F0', lineHeight: 1.3,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  } as React.CSSProperties}>
                    {gooal.titulo}
                  </p>
                  <p style={{
                    fontSize: 12, color: '#666666', marginTop: 4,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    📍 {acortarLugar(lugar.nombre_lugar)}
                    {lugar.distancia != null && ` — a ${Math.round(lugar.distancia)} km`}
                  </p>
                </div>

                {/* Badge + añadir */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em',
                    color, background: color + '20', borderRadius: 6, padding: '3px 7px', whiteSpace: 'nowrap',
                  }}>
                    {gooal.categoria}
                  </span>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); if (!yaAnadido) handleAnadir(gooal) }}
                    disabled={anadiendo === gooal.id || yaAnadido}
                    aria-label={yaAnadido ? 'Añadido a tus planes' : 'Añadir a mis planes'}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: yaAnadido ? '#2A2A2A' : '#1DE9B6',
                      color: yaAnadido ? '#1DE9B6' : '#0A0A0A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    className="active:scale-90 transition-transform disabled:opacity-70"
                  >
                    {anadiendo === gooal.id
                      ? <span className="w-3.5 h-3.5 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
                      : yaAnadido
                        ? <Check style={{ width: 16, height: 16 }} strokeWidth={2.5} />
                        : <Plus style={{ width: 17, height: 17 }} strokeWidth={2.5} />
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {addError && (
        <p className="px-4 mt-2 text-xs text-[#C97B7B]">{addError}</p>
      )}

      {detalle && (
        <GooalDetailModal
          gooal={detalle}
          userLocation={ubicacion}
          onClose={() => setDetalle(null)}
          onAdded={onPlanAdded}
        />
      )}

      {planWizard && (
        <PlanWizard
          planId={planWizard.id}
          planTitulo={planWizard.titulo}
          onClose={() => setPlanWizard(null)}
        />
      )}
    </div>
  )
}
