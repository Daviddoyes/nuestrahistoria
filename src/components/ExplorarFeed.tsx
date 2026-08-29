'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Search, X, Check, Hourglass } from 'lucide-react'
import { getCatalogoGooals } from '@/lib/actions'
import {
  CATEGORIAS, CATEGORIA_LABEL, CATEGORIA_GRADIENTE, DIFICULTADES, DIFICULTAD_META,
  type CategoriaGooal, type DificultadGooal,
} from '@/lib/gooals'
import GooalV2DetailModal from './GooalV2DetailModal'
import type { ResultadoCompletado } from './CompletarGooalModal'
import type { GooalV2, EstadoUserGooal } from '@/types/gooals'

type Props = {
  onCompletado: (resultado: ResultadoCompletado) => void
}

/** Quita acentos y mayúsculas para que "musica" encuentre "Música". */
function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export default function ExplorarFeed({ onCompletado }: Props) {
  const [gooals, setGooals] = useState<GooalV2[]>([])
  const [misEstados, setMisEstados] = useState<Record<string, EstadoUserGooal>>({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState<CategoriaGooal | 'todos'>('todos')
  const [dificultad, setDificultad] = useState<DificultadGooal | null>(null)
  const [seleccionado, setSeleccionado] = useState<GooalV2 | null>(null)

  const cargar = useCallback(async () => {
    try {
      const { gooals: filas, misEstados: estados } = await getCatalogoGooals()
      setGooals(filas)
      setMisEstados(estados)
      setError('')
    } catch (e) {
      console.error('[explorar]', e)
      setError('No hemos podido cargar el catálogo. Inténtalo de nuevo.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim())
    return gooals.filter(g => {
      if (categoria !== 'todos' && g.categoria !== categoria) return false
      if (dificultad && g.dificultad !== dificultad) return false
      if (q && !normalizar(g.titulo).includes(q)) return false
      return true
    })
  }, [gooals, busqueda, categoria, dificultad])

  return (
    <>
      {/* ── Cabecera: buscador y filtros ─────────────────── */}
      <div style={{ padding: '4px 12px 10px', background: '#0A0A0A' }}>
        <div style={{ position: 'relative' }}>
          <Search
            className="w-4 h-4"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#444444' }}
          />
          <input
            type="search"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar un gooal..."
            aria-label="Buscar un gooal"
            className="w-full rounded-xl border border-[#2A2A2A] bg-[#141414] text-[#F0F0F0] placeholder-[#444444] focus:outline-none focus:border-[#1DE9B6] text-base"
            style={{ padding: '11px 40px 11px 40px' }}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              aria-label="Borrar búsqueda"
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: 8, color: '#444444' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div
          className="flex gap-2 overflow-x-auto"
          style={{ scrollbarWidth: 'none', marginTop: 10, paddingBottom: 2 }}
        >
          <ChipCategoria activo={categoria === 'todos'} onClick={() => setCategoria('todos')}>
            Todos
          </ChipCategoria>
          {CATEGORIAS.map(c => (
            <ChipCategoria key={c} activo={categoria === c} onClick={() => setCategoria(c)}>
              {CATEGORIA_LABEL[c]}
            </ChipCategoria>
          ))}
        </div>

        <div className="flex gap-2" style={{ marginTop: 8 }}>
          {DIFICULTADES.map(d => {
            const meta = DIFICULTAD_META[d]
            const activo = dificultad === d
            return (
              <button
                key={d}
                onClick={() => setDificultad(activo ? null : d)}
                aria-pressed={activo}
                aria-label={meta.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                  border: `1px solid ${activo ? meta.color : '#2A2A2A'}`,
                  background: activo ? `${meta.color}1F` : 'transparent',
                  color: activo ? meta.color : '#666666',
                  transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
              >
                <span>{meta.emoji}</span> {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────── */}
      {cargando ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 12px 24px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: '1/1', borderRadius: 14, background: '#141414' }} className="animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-[#C97B7B] bg-[#8B3A3A]/20 mx-3 px-3 py-2 rounded-lg">{error}</p>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-8 py-16 text-center">
          <p style={{ fontSize: 15, color: '#666666' }}>Ningún gooal coincide.</p>
          <p style={{ fontSize: 13, color: '#444444' }}>Prueba con otra categoría o dificultad.</p>
          {(busqueda || categoria !== 'todos' || dificultad) && (
            <button
              onClick={() => { setBusqueda(''); setCategoria('todos'); setDificultad(null) }}
              className="mt-3 text-[13px] text-[#1DE9B6] active:text-[#00BFA5] transition-colors min-h-[44px]"
            >
              Quitar filtros
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 12px 24px' }}>
          {filtrados.map(g => (
            <CardGooal
              key={g.id}
              gooal={g}
              estado={misEstados[g.id]}
              onClick={() => setSeleccionado(g)}
            />
          ))}
        </div>
      )}

      {seleccionado && (
        <GooalV2DetailModal
          gooal={seleccionado}
          estado={misEstados[seleccionado.id]}
          onClose={() => setSeleccionado(null)}
          onCambio={cargar}
          onCompletado={onCompletado}
        />
      )}
    </>
  )
}

function ChipCategoria({
  activo, onClick, children,
}: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={activo}
      style={{
        flexShrink: 0, padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
        border: `1px solid ${activo ? '#1DE9B6' : '#2A2A2A'}`,
        background: activo ? 'rgba(29,233,182,0.12)' : 'transparent',
        color: activo ? '#1DE9B6' : '#888888',
        transition: 'all 0.2s', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function CardGooal({
  gooal, estado, onClick,
}: { gooal: GooalV2; estado?: EstadoUserGooal; onClick: () => void }) {
  const dificultad = DIFICULTAD_META[gooal.dificultad]

  return (
    <button
      onClick={onClick}
      className="text-left active:opacity-80 transition-opacity"
      style={{
        position: 'relative', aspectRatio: '1/1', borderRadius: 14, overflow: 'hidden',
        background: gooal.imagen_url ? '#141414' : CATEGORIA_GRADIENTE[gooal.categoria],
        display: 'block', width: '100%',
      }}
    >
      {gooal.imagen_url && (
        <img
          src={gooal.imagen_url}
          alt=""
          loading="lazy"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 45%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      <span
        style={{
          position: 'absolute', top: 8, right: 8,
          fontSize: 10, fontWeight: 600, color: dificultad.color,
          background: 'rgba(0,0,0,0.55)', borderRadius: 999, padding: '3px 8px',
        }}
      >
        {dificultad.emoji} {dificultad.label}
      </span>

      <p
        style={{
          position: 'absolute', left: 10, right: 10, bottom: 10,
          fontSize: 14, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.25,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}
      >
        {gooal.titulo}
      </p>

      {estado === 'completado' && (
        <div style={overlayEstado('rgba(76,175,80,0.55)')}>
          <Check className="w-8 h-8" style={{ color: '#FFFFFF' }} strokeWidth={2.5} />
        </div>
      )}
      {estado === 'pendiente' && (
        <div style={overlayEstado('rgba(29,233,182,0.42)')}>
          <Hourglass className="w-7 h-7" style={{ color: '#0A0A0A' }} strokeWidth={2} />
        </div>
      )}
    </button>
  )
}

function overlayEstado(background: string): React.CSSProperties {
  return {
    position: 'absolute', inset: 0, background,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
