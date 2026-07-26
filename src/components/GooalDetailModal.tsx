'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, ArrowLeft, MapPin, Plus, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { crearPlanDesdeSugerencia } from '@/lib/actions'
import { distanciaKm, CAT_COLOR } from '@/lib/geo'
import PlanWizard from './PlanWizard'
import type { Gooal, GooalLugar } from '@/types/planes'

type Props = {
  gooal: Gooal
  userLocation: { lat: number; lng: number } | null
  onClose: () => void
  onAdded?: () => void
}

export default function GooalDetailModal({ gooal, userLocation, onClose, onAdded }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [lugares, setLugares] = useState<GooalLugar[]>([])
  const [anadiendo, setAnadiendo] = useState(false)
  const [anadido, setAnadido] = useState(false)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)
  const [planCreado, setPlanCreado] = useState<{ id: string; titulo: string } | null>(null)

  // Cierre con animación slide-down antes de desmontar (0.28s de la clase).
  const close = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 260)
  }

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase
        .from('gooal_lugares')
        .select('*')
        .eq('gooal_id', gooal.id)

      const filas = (data ?? []) as GooalLugar[]
      if (userLocation) {
        const dist = (l: GooalLugar) => l.latitud != null && l.longitud != null
          ? distanciaKm(userLocation.lat, userLocation.lng, Number(l.latitud), Number(l.longitud))
          : Infinity
        filas.sort((a, b) => dist(a) - dist(b))
      }
      setLugares(filas)
    }
    cargar()
  }, [gooal.id, supabase, userLocation])

  const handleAnadir = async () => {
    setAnadiendo(true)
    setError('')
    try {
      const result = await crearPlanDesdeSugerencia(gooal.titulo, gooal.categoria)
      if (result.success) {
        setAnadido(true)
        onAdded?.()
        if (result.planId) setPlanCreado({ id: result.planId, titulo: gooal.titulo })
      } else {
        setError(result.error || 'Error al añadir el plan')
      }
    } catch (e) {
      console.error('[añadir plan]', e)
      setError('Error al añadir el plan')
    } finally {
      setAnadiendo(false)
    }
  }

  const color = CAT_COLOR[gooal.categoria] ?? '#666666'

  const distanciaDe = (l: GooalLugar): number | null => {
    if (!userLocation || l.latitud == null || l.longitud == null) return null
    return distanciaKm(userLocation.lat, userLocation.lng, Number(l.latitud), Number(l.longitud))
  }

  return (
    <>
      {/* Volver — arriba a la izquierda */}
      <button
        onClick={close}
        aria-label="Volver"
        className="fixed left-4 z-[70] w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/60 active:bg-black/70 active:text-white transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 52px)' }}
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Cerrar — arriba a la derecha */}
      <button
        onClick={close}
        aria-label="Cerrar"
        className="fixed right-4 z-[70] w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/60 active:bg-black/70 active:text-white transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 52px)' }}
      >
        <X className="w-4 h-4" />
      </button>

      <div className={`fixed inset-0 z-50 bg-[#0A0A0A] overflow-y-auto ${closing ? 'modal-slide-down' : 'modal-slide-up'}`}>
        <div className="px-6" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 100px)', paddingBottom: 'max(3rem, env(safe-area-inset-bottom, 0px))' }}>
          <span
            style={{
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
              color, background: `${color}22`, borderRadius: 6, padding: '3px 8px',
            }}
          >
            {gooal.categoria}
          </span>

          <h2 className="font-serif text-3xl font-bold text-[#F0F0F0] leading-tight mt-4 mb-6">
            {gooal.titulo}
          </h2>

          <button
            onClick={handleAnadir}
            disabled={anadiendo || anadido}
            className="w-full py-4 bg-[#E8692A] active:bg-[#D4581A] disabled:opacity-60 text-white rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 transition-colors"
          >
            {anadido ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {anadido ? 'Añadido a tu lista' : anadiendo ? 'Añadiendo...' : 'Añadir a mi lista'}
          </button>

          {error && (
            <p style={{ color: '#C97B7B', fontSize: 13 }} className="mt-3">{error}</p>
          )}

          <div className="mb-8" />

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

      {planCreado && (
        <PlanWizard
          planId={planCreado.id}
          planTitulo={planCreado.titulo}
          onClose={() => { setPlanCreado(null); onClose() }}
        />
      )}
    </>
  )
}
