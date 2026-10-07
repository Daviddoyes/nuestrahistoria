'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { getCatalogoGooals } from '@/lib/actions'
import { CATEGORIA_GRADIENTE, DIFICULTAD_META } from '@/lib/gooals'
import type { Filtros } from './explorar/FiltrosCatalogo'
import { hayFiltros as tieneFiltros } from './explorar/FiltrosCatalogo'
import type { GooalV2, EstadoUserGooal } from '@/types/gooals'
import { MARCA_ESTADO } from '@/lib/estado-gooal'
import MarcaEstadoGooal from './MarcaEstadoGooal'

type Props = {
  /** Ya aplicados: la búsqueda llega con su espera hecha desde la pantalla. */
  filtros: Filtros
  estados: Record<string, EstadoUserGooal>
  onAbrir: (gooal: GooalV2) => void
  onSugerir: () => void
  onLimpiar: () => void
}

/**
 * La rejilla del catálogo, con scroll infinito.
 *
 * Los filtros ya NO viven aquí: son de la pantalla, porque los comparte con el
 * mapa. Esto solo pide páginas y las pinta.
 */
export default function ExplorarFeed({ filtros, estados, onAbrir, onSugerir, onLimpiar }: Props) {
  const [gooals, setGooals] = useState<GooalV2[]>([])
  const [pagina, setPagina] = useState(0)
  const [hayMas, setHayMas] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [error, setError] = useState('')

  const { busqueda, categoria, dificultad } = filtros

  // Cada búsqueda o filtro dispara una consulta; si el usuario cambia de
  // opinión mientras vuela, la respuesta vieja no debe pisar a la nueva.
  const peticion = useRef(0)

  // ── Primera página cada vez que cambian los filtros ───────
  useEffect(() => {
    const mia = ++peticion.current
    setCargando(true)
    setError('')
    getCatalogoGooals({ categoria, dificultad, busqueda, pagina: 0 })
      .then(res => {
        if (mia !== peticion.current) return
        setGooals(res.gooals)
        setHayMas(res.hayMas)
        setPagina(0)
      })
      .catch(e => {
        if (mia !== peticion.current) return
        console.error('[explorar]', e)
        setError('No hemos podido cargar los gooals. Inténtalo de nuevo.')
      })
      .finally(() => { if (mia === peticion.current) setCargando(false) })
  }, [categoria, dificultad, busqueda])

  const cargarMas = useCallback(() => {
    if (cargandoMas || !hayMas) return
    setCargandoMas(true)
    const siguiente = pagina + 1
    getCatalogoGooals({ categoria, dificultad, busqueda, pagina: siguiente })
      .then(res => {
        setGooals(prev => [...prev, ...res.gooals])
        setHayMas(res.hayMas)
        setPagina(siguiente)
      })
      .catch(e => console.error('[explorar:mas]', e))
      .finally(() => setCargandoMas(false))
  }, [cargandoMas, hayMas, pagina, categoria, dificultad, busqueda])

  // Centinela al final del grid: cuando entra en pantalla, pide más.
  const centinela = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const nodo = centinela.current
    if (!nodo || !hayMas) return
    const observador = new IntersectionObserver(
      entradas => { if (entradas[0]?.isIntersecting) cargarMas() },
      { rootMargin: '400px' },
    )
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [hayMas, cargarMas])

  if (cargando) {
    return (
      <div style={gridEstilo}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ aspectRatio: '1/1', borderRadius: 14, background: '#1E2120' }} className="animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] mx-3 px-3 py-2 rounded-lg">{error}</p>
  }

  if (gooals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-8 py-16 text-center">
        <p style={{ fontSize: 15, color: '#7A8A85' }}>Ningún gooal coincide.</p>
        <p style={{ fontSize: 13, color: '#7A8A85' }}>Prueba con otra categoría o dificultad.</p>
        <button
          onClick={onSugerir}
          className="mt-4 flex items-center gap-2 rounded-xl active:opacity-80 transition-opacity"
          style={{ padding: '11px 18px', fontSize: 14, fontWeight: 600, color: '#0B0B0B', background: '#00D1A7' }}
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} /> Sugerir este gooal
        </button>
        {tieneFiltros(filtros) && (
          <button
            onClick={onLimpiar}
            className="mt-1 text-[13px] text-[#7A8A85] active:text-[#A3B1AC] transition-colors min-h-[44px]"
          >
            Quitar filtros
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <div style={gridEstilo}>
        {gooals.map(g => (
          <CardGooal key={g.id} gooal={g} estado={estados[g.id]} onClick={() => onAbrir(g)} />
        ))}
      </div>

      {hayMas && (
        <div ref={centinela} style={{ padding: '4px 12px 28px' }}>
          <div style={gridEstiloSuelto}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} style={{ aspectRatio: '1/1', borderRadius: 14, background: '#1E2120' }} className="animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {!hayMas && (
        <div className="flex flex-col items-center gap-2 px-8 pb-8 text-center">
          <p style={{ fontSize: 13, color: '#7A8A85' }}>¿Echas algo en falta?</p>
          <button
            onClick={onSugerir}
            className="flex items-center gap-2 rounded-xl active:opacity-80 transition-opacity"
            style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, color: '#00D1A7', border: '1px solid #2A2E2C' }}
          >
            <Plus className="w-4 h-4" /> Sugerir un gooal
          </button>
        </div>
      )}
    </>
  )
}

const gridEstilo: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 12px 24px',
}

const gridEstiloSuelto: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
}

/** Una card del catálogo: foto o degradado, dificultad, y el velo de tu estado. */
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
        background: gooal.imagen_url ? '#1E2120' : CATEGORIA_GRADIENTE[gooal.categoria],
        display: 'block', width: '100%',
      }}
    >
      {gooal.imagen_url && (
        <img
          src={gooal.imagen_url}
          alt=""
          loading="lazy"
          decoding="async"
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

      {/* Una sola rama para todos los estados, y no un `&&` por cada uno: así, si
          algún día hay un estado más, la tarjeta no se queda sin marca en
          silencio. El velo y la marca vienen de MARCA_ESTADO, igual que el pin. */}
      {estado && (
        <div style={overlayEstado(MARCA_ESTADO[estado].tinte)}>
          <MarcaEstadoGooal estado={estado} tamano={46} />
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
