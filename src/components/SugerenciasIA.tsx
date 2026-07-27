'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Sparkles, Plus, Check, X, ArrowLeft } from 'lucide-react'
import { crearPlanDesdeSugerencia } from '@/lib/actions'
import type { Profile, Plan } from '@/types/planes'

type Sugerencia = { titulo: string; categoria: string; emoji: string; descripcion?: string }

// Modal de detalle de una idea (al tocar la card, no el +).
function SugerenciaDetalle({
  sug, adding, added, onAdd, onClose,
}: { sug: Sugerencia; adding: boolean; added: boolean; onAdd: () => void; onClose: () => void }) {
  return (
    <>
      <button
        onClick={onClose}
        aria-label="Volver"
        className="fixed left-4 z-[70] w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/60 active:bg-black/70 active:text-white transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 52px)' }}
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="fixed right-4 z-[70] w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white/60 active:bg-black/70 active:text-white transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 52px)' }}
      >
        <X className="w-4 h-4" />
      </button>

      <div className="fixed inset-0 z-50 bg-[#0A0A0A] modal-slide-up overflow-y-auto">
        <div
          className="px-6 flex flex-col items-center text-center"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 120px)', paddingBottom: 'max(3rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <span style={{ fontSize: 72, lineHeight: 1 }}>{sug.emoji}</span>
          <h2 className="font-serif text-3xl font-bold text-[#F0F0F0] leading-tight mt-6">{sug.titulo}</h2>
          <span
            className="mt-4"
            style={{
              fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: '#1DE9B6', background: 'rgba(29,233,182,0.2)', borderRadius: 6, padding: '4px 10px',
            }}
          >
            {sug.categoria}
          </span>
          {sug.descripcion && (
            <p style={{ color: '#999999', fontSize: 15, lineHeight: 1.6 }} className="mt-6">{sug.descripcion}</p>
          )}

          <button
            onClick={onAdd}
            disabled={adding || added}
            className="w-full max-w-sm mt-10 py-4 bg-[#1DE9B6] active:bg-[#00BFA5] disabled:opacity-60 text-[#0A0A0A] rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 transition-colors"
          >
            {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {added ? 'Añadido a tu lista' : adding ? 'Añadiendo...' : 'Añadir a mi lista'}
          </button>
        </div>
      </div>
    </>
  )
}

type Props = {
  profile: Profile
  pendientes: Plan[]
  historias: Plan[]
  onPlanAnadido: () => void
}

// El tab de Explorar se desmonta al cambiar de pestaña. Sin esta caché
// volveríamos a llamar a la IA —y a pagarla— en cada visita.
const CACHE_KEY = 'gooals:sugerencias'

// Límite de regeneraciones manuales: 3 cada 30 días. La generación automática
// del primer render NO cuenta (si contara, visitar en 3 sesiones distintas
// agotaría el cupo sin pulsar nada).
const LIMITE_GEN = 3
const VENTANA_MS = 30 * 24 * 60 * 60 * 1000
const KEY_GEN = 'ia_generaciones'

function generacionesRecientes(): number[] {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY_GEN) || '[]') as number[]
    const desde = Date.now() - VENTANA_MS
    return arr.filter(t => t > desde)
  } catch {
    return []
  }
}

function registrarGeneracion(): number[] {
  const recientes = [...generacionesRecientes(), Date.now()]
  try {
    localStorage.setItem(KEY_GEN, JSON.stringify(recientes))
  } catch {
    // localStorage bloqueado: el límite no se persiste, pero no rompemos nada.
  }
  return recientes
}

function leerCache(): Sugerencia[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Sugerencia[]) : null
  } catch {
    return null
  }
}

function guardarCache(sugerencias: Sugerencia[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(sugerencias))
  } catch {
    // sessionStorage lleno o bloqueado: seguimos sin caché.
  }
}

export default function SugerenciasIA({ profile, pendientes, historias, onPlanAnadido }: Props) {
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([])
  const [loadingIA, setLoadingIA] = useState(false)
  const [error, setError] = useState('')
  const [anadiendo, setAnadiendo] = useState<string | null>(null)
  const [anadidos, setAnadidos] = useState<string[]>([])
  const [addError, setAddError] = useState('')
  const [detalle, setDetalle] = useState<Sugerencia | null>(null)
  const [usadas, setUsadas] = useState(0)

  useEffect(() => { setUsadas(generacionesRecientes().length) }, [])

  // Los planes cambian al añadir uno; sin la ref el efecto se relanzaría.
  const contexto = useRef({ profile, pendientes, historias })
  contexto.current = { profile, pendientes, historias }

  // manual = pulsó "Generar nuevas" (cuenta para el límite). Sin argumento es
  // la carga automática, que ni comprueba ni consume cupo.
  const generarSugerencias = useCallback(async (manual = false) => {
    if (manual && generacionesRecientes().length >= LIMITE_GEN) return
    const { profile: p, pendientes: pl, historias: h } = contexto.current
    setLoadingIA(true)
    setError('')
    try {
      const res = await fetch('/api/sugerir-planes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: p.nombre,
          intereses: p.intereses,
          conQuien: p.con_quien_vive,
          planesActuales: pl.map(x => x.titulo),
          historiasCompletadas: h.map(x => x.titulo),
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { planes } = (await res.json()) as { planes: Sugerencia[] }
      setSugerencias(planes ?? [])
      guardarCache(planes ?? [])
      if (manual) setUsadas(registrarGeneracion().length)
    } catch (err) {
      console.error('[sugerencias]', err)
      setError('No se pudieron generar ideas ahora mismo.')
    } finally {
      setLoadingIA(false)
    }
  }, [])

  useEffect(() => {
    const cacheadas = leerCache()
    if (cacheadas && cacheadas.length > 0) {
      setSugerencias(cacheadas)
      return
    }
    generarSugerencias()
  }, [generarSugerencias])

  const handleAnadir = async (sug: Sugerencia) => {
    setAnadiendo(sug.titulo)
    setAddError('')
    try {
      const result = await crearPlanDesdeSugerencia(sug.titulo, sug.categoria)
      if (!result.success) throw new Error(result.error || 'No se pudo añadir')
      setAnadidos(prev => [...prev, sug.titulo])
      onPlanAnadido()
      // ✓ durante 2 s y vuelve al estado normal.
      setTimeout(() => setAnadidos(prev => prev.filter(t => t !== sug.titulo)), 2000)
    } catch (err) {
      console.error('[añadir plan]', err)
      setAddError('No se pudo añadir. Inténtalo otra vez.')
      setTimeout(() => setAddError(''), 3000)
    } finally {
      setAnadiendo(null)
    }
  }

  const mostrarCargando = loadingIA && sugerencias.length === 0

  return (
    <div className="pt-3">
      <div className="flex items-center justify-between px-3 mb-2.5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#666666]">Ideas para ti</p>
        {sugerencias.length > 0 && (
          usadas >= LIMITE_GEN ? (
            <span className="text-[11px] text-[#666666]">{LIMITE_GEN}/{LIMITE_GEN} generaciones usadas este mes</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#666666]">{usadas}/{LIMITE_GEN}</span>
              <button
                type="button"
                onClick={() => generarSugerencias(true)}
                disabled={loadingIA}
                className="flex items-center gap-1.5 text-[12px] text-[#1DE9B6] active:text-[#00BFA5] disabled:opacity-40 min-h-[44px]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loadingIA ? 'Generando...' : 'Generar nuevas'}
              </button>
            </div>
          )
        )}
      </div>

      {mostrarCargando ? (
        <>
          <p className="px-3 text-xs text-[#666666] mb-2">Pensando en planes para ti...</p>
          <div className="flex gap-2.5 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: 'none' }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="animate-pulse flex-shrink-0"
                style={{
                  width: 160, height: 150,
                  background: '#141414', border: '1px solid #2A2A2A',
                  borderRadius: 16,
                }}
              />
            ))}
          </div>
        </>
      ) : error && sugerencias.length === 0 ? (
        <div className="px-3">
          <p className="text-xs text-[#666666] mb-2">{error}</p>
          <button
            type="button"
            onClick={() => generarSugerencias(false)}
            className="flex items-center gap-1.5 text-[13px] text-[#1DE9B6] active:text-[#00BFA5] min-h-[44px]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Reintentar
          </button>
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto px-3 pb-1" style={{ scrollbarWidth: 'none' }}>
          {sugerencias.map(sug => {
            const yaAnadido = anadidos.includes(sug.titulo)
            return (
              <div
                key={sug.titulo}
                onClick={() => setDetalle(sug)}
                className="flex-shrink-0 flex flex-col active:opacity-80 transition-opacity"
                style={{
                  width: 160, minHeight: 150, cursor: 'pointer',
                  background: '#141414', border: '1px solid #2A2A2A',
                  borderRadius: 16, padding: 16,
                }}
              >
                <span style={{ fontSize: 40, lineHeight: 1.1 }}>{sug.emoji}</span>

                <p
                  className="font-serif"
                  style={{
                    fontSize: 14, color: '#F0F0F0', lineHeight: 1.35, marginTop: 8,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  } as React.CSSProperties}
                >
                  {sug.titulo}
                </p>

                <div className="flex items-end justify-between mt-auto pt-3">
                  <span
                    style={{
                      fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
                      color: '#1DE9B6', background: 'rgba(29,233,182,0.2)',
                      borderRadius: 6, padding: '3px 7px',
                    }}
                  >
                    {sug.categoria}
                  </span>

                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); if (!yaAnadido) handleAnadir(sug) }}
                    disabled={anadiendo === sug.titulo || yaAnadido}
                    aria-label={yaAnadido ? 'Añadido a tus planes' : 'Añadir a mis planes'}
                    style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: yaAnadido ? '#2A2A2A' : '#1DE9B6',
                      color: yaAnadido ? '#1DE9B6' : '#FFFFFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    className="active:scale-90 transition-transform disabled:opacity-70"
                  >
                    {anadiendo === sug.titulo
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
      )}

      {addError && (
        <p className="px-3 mt-2 text-xs text-[#C97B7B]">{addError}</p>
      )}

      {detalle && (
        <SugerenciaDetalle
          sug={detalle}
          adding={anadiendo === detalle.titulo}
          added={anadidos.includes(detalle.titulo)}
          onAdd={() => handleAnadir(detalle)}
          onClose={() => setDetalle(null)}
        />
      )}
    </div>
  )
}
