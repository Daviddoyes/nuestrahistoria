'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Sparkles, Plus, Check } from 'lucide-react'
import { crearPlanDesdeSugerencia } from '@/lib/actions'
import type { Profile, Plan } from '@/types/planes'

type Sugerencia = { titulo: string; categoria: string; emoji: string }

type Props = {
  profile: Profile
  pendientes: Plan[]
  historias: Plan[]
  onPlanAnadido: () => void
}

// El tab de Explorar se desmonta al cambiar de pestaña. Sin esta caché
// volveríamos a llamar a la IA —y a pagarla— en cada visita.
const CACHE_KEY = 'gooals:sugerencias'

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

  // Los planes cambian al añadir uno; sin la ref el efecto se relanzaría.
  const contexto = useRef({ profile, pendientes, historias })
  contexto.current = { profile, pendientes, historias }

  const generarSugerencias = useCallback(async () => {
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
    const result = await crearPlanDesdeSugerencia(sug.titulo, sug.categoria)
    setAnadiendo(null)
    if (!result.success) return
    setAnadidos(prev => [...prev, sug.titulo])
    onPlanAnadido()
  }

  const mostrarCargando = loadingIA && sugerencias.length === 0

  return (
    <div className="pt-3">
      <div className="flex items-center justify-between px-3 mb-2.5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#666666]">Ideas para ti</p>
        {sugerencias.length > 0 && (
          <button
            type="button"
            onClick={generarSugerencias}
            disabled={loadingIA}
            className="flex items-center gap-1.5 text-[12px] text-[#E8692A] active:text-[#D4581A] disabled:opacity-40 min-h-[44px]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loadingIA ? 'Generando...' : 'Generar nuevas'}
          </button>
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
            onClick={generarSugerencias}
            className="flex items-center gap-1.5 text-[13px] text-[#E8692A] active:text-[#D4581A] min-h-[44px]"
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
                className="flex-shrink-0 flex flex-col"
                style={{
                  width: 160, minHeight: 150,
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
                      color: '#E8692A', background: 'rgba(232,105,42,0.2)',
                      borderRadius: 6, padding: '3px 7px',
                    }}
                  >
                    {sug.categoria}
                  </span>

                  <button
                    type="button"
                    onClick={() => { if (!yaAnadido) handleAnadir(sug) }}
                    disabled={anadiendo === sug.titulo || yaAnadido}
                    aria-label={yaAnadido ? 'Añadido a tus planes' : 'Añadir a mis planes'}
                    style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: yaAnadido ? '#2A2A2A' : '#E8692A',
                      color: yaAnadido ? '#E8692A' : '#FFFFFF',
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
    </div>
  )
}
