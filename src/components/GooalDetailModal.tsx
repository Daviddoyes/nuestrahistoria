'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, MapPin, Plus, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { crearPlanDesdeSugerencia } from '@/lib/actions'
import { distanciaKm, CAT_COLOR } from '@/lib/geo'
import type { Gooal, GooalLugar } from '@/types/planes'

type Props = {
  gooal: Gooal
  userLocation: { lat: number; lng: number } | null
  onClose: () => void
  onAdded: () => void
}

export default function GooalDetailModal({ gooal, userLocation, onClose, onAdded }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [lugares, setLugares] = useState<GooalLugar[]>([])
  const [anadiendo, setAnadiendo] = useState(false)
  const [anadido, setAnadido] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase
        .from('gooal_lugares')
        .select('*')
        .eq('gooal_id', gooal.id)

      let filas = (data ?? []) as GooalLugar[]
      if (userLocation) {
        filas = filas
          .map(l => ({
            ...l,
            _d: l.latitud != null && l.longitud != null
              ? distanciaKm(userLocation.lat, userLocation.lng, Number(l.latitud), Number(l.longitud))
              : Infinity,
          }))
          .sort((a, b) => a._d - b._d)
      }
      setLugares(filas)
    }
    cargar()
  }, [gooal.id, supabase, userLocation])

  const handleAnadir = async () => {
    setAnadiendo(true)
    const result = await crearPlanDesdeSugerencia(gooal.titulo, gooal.categoria)
    setAnadiendo(false)
    if (!result.success) return
    setAnadido(true)
    onAdded()
  }

  const color = CAT_COLOR[gooal.categoria] ?? '#666666'

  const distanciaDe = (l: GooalLugar): number | null => {
    if (!userLocation || l.latitud == null || l.longitud == null) return null
    return distanciaKm(userLocation.lat, userLocation.lng, Number(l.latitud), Number(l.longitud))
  }

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

      <div className="fixed inset-0 z-50 bg-[#0A0A0A] modal-slide-up overflow-y-auto">
        <div className="px-6 pt-16" style={{ paddingBottom: 'max(3rem, env(safe-area-inset-bottom, 0px))' }}>
          <span
            style={{
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
              color, background: `${color}22`, borderRadius: 6, padding: '3px 8px',
            }}
          >
            {gooal.categoria}
          </span>

          <h2 className="font-serif text-3xl font-bold text-[#F0F0F0] leading-tight mt-4 mb-4">
            {gooal.titulo}
          </h2>

          {gooal.descripcion && (
            <p style={{ color: '#999999', fontSize: 15, lineHeight: 1.6 }} className="mb-6">
              {gooal.descripcion}
            </p>
          )}

          <button
            onClick={handleAnadir}
            disabled={anadiendo || anadido}
            className="w-full py-4 bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-60 text-white rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 transition-colors mb-8"
          >
            {anadido ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {anadido ? 'Añadido a tu lista' : anadiendo ? 'Añadiendo...' : 'Añadir a mi lista'}
          </button>

          <p className="text-[10px] uppercase tracking-[0.15em] text-[#666666] mb-4">
            Dónde conseguirlo
          </p>

          {lugares.length === 0 ? (
            <p className="text-sm text-[#444444]">Sin lugares registrados todavía.</p>
          ) : (
            <div className="space-y-3">
              {lugares.map(l => {
                const dist = distanciaDe(l)
                return (
                  <div
                    key={l.id}
                    className="flex items-start gap-3 p-4 rounded-xl"
                    style={{ background: '#141414', border: '1px solid #2A2A2A' }}
                  >
                    <MapPin className="w-4 h-4 text-[#E8692A] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#F0F0F0] font-medium">{l.nombre_lugar}</p>
                      <p className="text-xs text-[#666666] mt-0.5">
                        {[l.ciudad, l.pais].filter(Boolean).join(', ') || '—'}
                      </p>
                    </div>
                    {dist != null && (
                      <span className="text-xs text-[#E8692A] font-semibold flex-shrink-0 whitespace-nowrap">
                        a {Math.round(dist)} km
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
