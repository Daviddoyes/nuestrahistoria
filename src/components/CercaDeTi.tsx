'use client'

import { useState, useEffect, useMemo } from 'react'
import { MapPin, Plus, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { crearPlanDesdeSugerencia } from '@/lib/actions'
import { distanciaKm, CAT_COLOR } from '@/lib/geo'
import GooalDetailModal from './GooalDetailModal'
import type { Gooal, LugarConGooal } from '@/types/planes'

type Props = {
  onPlanAnadido: () => void
}

const RADIO_KM = 200

export default function CercaDeTi({ onPlanAnadido }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null)
  const [cercanos, setCercanos] = useState<LugarConGooal[]>([])
  const [anadiendo, setAnadiendo] = useState<string | null>(null)
  const [anadidos, setAnadidos] = useState<string[]>([])
  const [detalle, setDetalle] = useState<Gooal | null>(null)

  // Pide ubicación al montar. Denegada → null y no se muestra nada.
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
      const { data } = await supabase
        .from('gooal_lugares')
        .select('*, gooals(*)')
        .not('latitud', 'is', null)
        .not('longitud', 'is', null)

      const conDistancia = ((data ?? []) as LugarConGooal[])
        .filter(l => l.gooals && l.latitud != null && l.longitud != null)
        .map(l => ({
          ...l,
          distancia: distanciaKm(ubicacion.lat, ubicacion.lng, Number(l.latitud), Number(l.longitud)),
        }))
        .filter(l => (l.distancia ?? Infinity) < RADIO_KM)
        .sort((a, b) => (a.distancia ?? 0) - (b.distancia ?? 0))

      // Un gooal puede tener varios lugares cerca: nos quedamos con el más próximo.
      const vistos = new Set<string>()
      const unicos: LugarConGooal[] = []
      for (const l of conDistancia) {
        if (vistos.has(l.gooal_id)) continue
        vistos.add(l.gooal_id)
        unicos.push(l)
      }
      setCercanos(unicos.slice(0, 10))
    }
    cargar()
  }, [ubicacion, supabase])

  const handleAnadir = async (gooal: Gooal) => {
    setAnadiendo(gooal.id)
    const result = await crearPlanDesdeSugerencia(gooal.titulo, gooal.categoria)
    setAnadiendo(null)
    if (!result.success) return
    setAnadidos(prev => [...prev, gooal.id])
    onPlanAnadido()
  }

  if (!ubicacion || cercanos.length === 0) return null

  return (
    <div className="pt-3">
      <p className="px-3 mb-2.5 text-[10px] uppercase tracking-[0.15em] text-[#E8692A]">
        📍 Cerca de ti
      </p>

      <div className="flex gap-2.5 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: 'none' }}>
        {cercanos.map(lugar => {
          const gooal = lugar.gooals!
          const yaAnadido = anadidos.includes(gooal.id)
          const color = CAT_COLOR[gooal.categoria] ?? '#666666'
          return (
            <div
              key={lugar.id}
              onClick={() => setDetalle(gooal)}
              className="flex-shrink-0 flex flex-col active:opacity-80 transition-opacity"
              style={{
                width: 176, minHeight: 158, cursor: 'pointer',
                background: '#141414', border: '1px solid #2A2A2A',
                borderRadius: 16, padding: 16,
              }}
            >
              <span style={{
                alignSelf: 'flex-start', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
                color, background: `${color}22`, borderRadius: 6, padding: '3px 8px',
              }}>
                {gooal.categoria}
              </span>

              <p
                className="font-serif"
                style={{
                  fontSize: 15, color: '#F0F0F0', lineHeight: 1.3, marginTop: 10,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                } as React.CSSProperties}
              >
                {gooal.titulo}
              </p>

              <div className="flex items-start gap-1 mt-2 min-w-0">
                <MapPin className="w-3 h-3 text-[#666666] flex-shrink-0 mt-0.5" />
                <span className="text-[11px] text-[#666666] leading-tight">
                  <span className="text-[#888888]">{lugar.nombre_lugar}</span>
                  {lugar.distancia != null && ` — a ${Math.round(lugar.distancia)} km`}
                </span>
              </div>

              <div className="flex items-end justify-end mt-auto pt-3">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); if (!yaAnadido) handleAnadir(gooal) }}
                  disabled={anadiendo === gooal.id || yaAnadido}
                  aria-label={yaAnadido ? 'Añadido a tus planes' : 'Añadir a mis planes'}
                  style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: yaAnadido ? '#2A2A2A' : '#E8692A',
                    color: yaAnadido ? '#E8692A' : '#FFFFFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  className="active:scale-90 transition-transform disabled:opacity-70"
                >
                  {anadiendo === gooal.id
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

      {detalle && (
        <GooalDetailModal
          gooal={detalle}
          userLocation={ubicacion}
          onClose={() => setDetalle(null)}
          onAdded={onPlanAnadido}
        />
      )}
    </div>
  )
}
