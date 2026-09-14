'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, X, Check, Hourglass, Plus } from 'lucide-react'
import { getCatalogoGooals, getMisEstadosGooals } from '@/lib/actions'
import {
  CATEGORIAS, CATEGORIA_LABEL, CATEGORIA_GRADIENTE, DIFICULTADES, DIFICULTAD_META,
  type CategoriaGooal, type DificultadGooal,
} from '@/lib/gooals'
import GooalV2DetailModal from './GooalV2DetailModal'
import ChipCategoria from './ChipCategoria'
import SugerirGooalSheet from './SugerirGooalSheet'
import type { ResultadoCompletado } from './CompletarGooalModal'
import type { GooalV2, EstadoUserGooal } from '@/types/gooals'

type Props = {
  onCompletado: (resultado: ResultadoCompletado) => void
}

/** Espera antes de mandar la búsqueda al servidor, para no lanzar una consulta por tecla. */
const ESPERA_BUSQUEDA = 300

export default function ExplorarFeed({ onCompletado }: Props) {
  const [gooals, setGooals] = useState<GooalV2[]>([])
  const [misEstados, setMisEstados] = useState<Record<string, EstadoUserGooal>>({})
  const [pagina, setPagina] = useState(0)
  const [hayMas, setHayMas] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [busquedaAplicada, setBusquedaAplicada] = useState('')
  const [categoria, setCategoria] = useState<CategoriaGooal | 'todos'>('todos')
  const [dificultad, setDificultad] = useState<DificultadGooal | null>(null)
  const [seleccionado, setSeleccionado] = useState<GooalV2 | null>(null)
  const [sugiriendo, setSugiriendo] = useState(false)

  // Cada búsqueda o filtro dispara una consulta; si el usuario cambia de
  // opinión mientras vuela, la respuesta vieja no debe pisar a la nueva.
  const peticion = useRef(0)

  // ── Debounce del buscador ─────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda.trim()), ESPERA_BUSQUEDA)
    return () => clearTimeout(t)
  }, [busqueda])

  // ── Primera página: al montar y cada vez que cambia un filtro ──
  useEffect(() => {
    const mia = ++peticion.current
    setCargando(true)
    getCatalogoGooals({ categoria, dificultad, busqueda: busquedaAplicada, pagina: 0 })
      .then(({ gooals: filas, hayMas: mas }) => {
        if (mia !== peticion.current) return
        setGooals(filas)
        setHayMas(mas)
        setPagina(0)
        setError('')
      })
      .catch(e => {
        if (mia !== peticion.current) return
        console.error('[explorar]', e)
        setError('No hemos podido cargar el catálogo. Inténtalo de nuevo.')
      })
      .finally(() => {
        if (mia === peticion.current) setCargando(false)
      })
  }, [categoria, dificultad, busquedaAplicada])

  // ── Estados propios: no dependen de los filtros, se piden una vez ──
  const cargarEstados = useCallback(() => {
    getMisEstadosGooals()
      .then(setMisEstados)
      .catch(e => console.error('[explorar:estados]', e))
  }, [])

  useEffect(() => { cargarEstados() }, [cargarEstados])

  // ── Página siguiente ──────────────────────────────────────
  const cargarMas = useCallback(async () => {
    if (cargandoMas || !hayMas) return
    setCargandoMas(true)
    const mia = peticion.current
    try {
      const siguiente = pagina + 1
      const { gooals: filas, hayMas: mas } = await getCatalogoGooals({
        categoria, dificultad, busqueda: busquedaAplicada, pagina: siguiente,
      })
      if (mia !== peticion.current) return
      setGooals(previos => [...previos, ...filas])
      setHayMas(mas)
      setPagina(siguiente)
    } catch (e) {
      console.error('[explorar:mas]', e)
    } finally {
      setCargandoMas(false)
    }
  }, [cargandoMas, hayMas, pagina, categoria, dificultad, busquedaAplicada])

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

  const hayFiltros = Boolean(busqueda || categoria !== 'todos' || dificultad)

  const limpiarFiltros = () => {
    setBusqueda('')
    setCategoria('todos')
    setDificultad(null)
  }

  /** Tras añadir o completar un gooal desde el modal. */
  const refrescar = useCallback(() => { cargarEstados() }, [cargarEstados])

  return (
    <>
      {/* ── Cabecera: buscador y filtros ─────────────────── */}
      <div style={{ padding: '4px 12px 10px', background: '#0B0B0B' }}>
        <div style={{ position: 'relative' }}>
          <Search
            className="w-4 h-4"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#7A8A85' }}
          />
          <input
            type="search"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar un gooal..."
            aria-label="Buscar un gooal"
            className="w-full rounded-xl border border-[#2A2E2C] bg-[#1E2120] text-[#FFFFFF] placeholder-[#7A8A85] focus:outline-none focus:border-[#00D1A7] text-base"
            style={{ padding: '11px 40px 11px 40px' }}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              aria-label="Borrar búsqueda"
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: 8, color: '#7A8A85' }}
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
                  border: `1px solid ${activo ? meta.color : '#2A2E2C'}`,
                  background: activo ? `${meta.color}1F` : 'transparent',
                  color: activo ? meta.color : '#7A8A85',
                  transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
              >
                <span>{meta.emoji}</span> {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      {cargando ? (
        <div style={gridEstilo}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: '1/1', borderRadius: 14, background: '#1E2120' }} className="animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-[#FF5252] bg-[rgba(255,82,82,0.14)] mx-3 px-3 py-2 rounded-lg">{error}</p>
      ) : gooals.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-8 py-16 text-center">
          <p style={{ fontSize: 15, color: '#7A8A85' }}>Ningún gooal coincide.</p>
          <p style={{ fontSize: 13, color: '#7A8A85' }}>Prueba con otra categoría o dificultad.</p>
          <button
            onClick={() => setSugiriendo(true)}
            className="mt-4 flex items-center gap-2 rounded-xl active:opacity-80 transition-opacity"
            style={{
              padding: '11px 18px', fontSize: 14, fontWeight: 600,
              color: '#0B0B0B', background: '#00D1A7',
            }}
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} /> Sugerir este gooal
          </button>
          {hayFiltros && (
            <button
              onClick={limpiarFiltros}
              className="mt-1 text-[13px] text-[#7A8A85] active:text-[#A3B1AC] transition-colors min-h-[44px]"
            >
              Quitar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={gridEstilo}>
            {gooals.map(g => (
              <CardGooal
                key={g.id}
                gooal={g}
                estado={misEstados[g.id]}
                onClick={() => setSeleccionado(g)}
              />
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
                onClick={() => setSugiriendo(true)}
                className="flex items-center gap-2 rounded-xl active:opacity-80 transition-opacity"
                style={{
                  padding: '10px 16px', fontSize: 13, fontWeight: 500,
                  color: '#00D1A7', border: '1px solid #2A2E2C',
                }}
              >
                <Plus className="w-4 h-4" /> Sugerir un gooal
              </button>
            </div>
          )}
        </>
      )}

      {seleccionado && (
        <GooalV2DetailModal
          gooal={seleccionado}
          estado={misEstados[seleccionado.id]}
          onClose={() => setSeleccionado(null)}
          onCambio={refrescar}
          onCompletado={onCompletado}
        />
      )}

      {sugiriendo && (
        <SugerirGooalSheet
          tituloInicial={busqueda.trim()}
          categoriaInicial={categoria === 'todos' ? null : categoria}
          onClose={() => setSugiriendo(false)}
        />
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

      {estado === 'completado' && (
        <div style={overlayEstado('rgba(0,209,167,0.55)')}>
          <Check className="w-8 h-8" style={{ color: '#FFFFFF' }} strokeWidth={2.5} />
        </div>
      )}
      {estado === 'pendiente' && (
        <div style={overlayEstado('rgba(0,209,167,0.42)')}>
          <Hourglass className="w-7 h-7" style={{ color: '#0B0B0B' }} strokeWidth={2} />
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
