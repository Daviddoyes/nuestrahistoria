'use client'

import { Search, X } from 'lucide-react'
import {
  CATEGORIAS, CATEGORIA_LABEL, DIFICULTADES, DIFICULTAD_META,
  type CategoriaGooal, type DificultadGooal,
} from '@/lib/gooals'
import ChipCategoria from '@/components/ChipCategoria'

export type Filtros = {
  busqueda: string
  categoria: CategoriaGooal | 'todos'
  dificultad: DificultadGooal | null
}

export const SIN_FILTROS: Filtros = { busqueda: '', categoria: 'todos', dificultad: null }

export function hayFiltros(f: Filtros): boolean {
  return Boolean(f.busqueda || f.categoria !== 'todos' || f.dificultad)
}

type Props = {
  filtros: Filtros
  onCambiar: (filtros: Filtros) => void
}

/**
 * Buscador, categorías y dificultad. UNA SOLA BARRA PARA LAS DOS VISTAS.
 *
 * Antes esto vivía dentro de la lista, y el mapa tenía sus propias pastillas de
 * categoría y ni buscador ni dificultad —aunque la consulta del mapa sí los
 * aceptaba desde el principio: la pantalla le pasaba `dificultad: null` y
 * `busqueda: ''` a pelo—. Dos juegos de filtros en dos pestañas de la misma
 * pantalla significa que buscas algo, cambias de vista y se te ha perdido.
 *
 * Así que los filtros son de la pantalla, no de la vista, y las dos miran los
 * mismos.
 */
export default function FiltrosCatalogo({ filtros, onCambiar }: Props) {
  const { busqueda, categoria, dificultad } = filtros

  return (
    <div style={{ padding: '4px 12px 10px', background: '#0B0B0B' }}>
      <div style={{ position: 'relative' }}>
        <Search
          className="w-4 h-4"
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#7A8A85' }}
        />
        <input
          type="search"
          value={busqueda}
          onChange={e => onCambiar({ ...filtros, busqueda: e.target.value })}
          placeholder="Buscar un gooal..."
          aria-label="Buscar un gooal"
          className="w-full rounded-xl border border-[#2A2E2C] bg-[#1E2120] text-[#FFFFFF] placeholder-[#7A8A85] focus:outline-none focus:border-[#00D1A7] text-base"
          style={{ padding: '11px 40px 11px 40px' }}
        />
        {busqueda && (
          <button
            onClick={() => onCambiar({ ...filtros, busqueda: '' })}
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
        <ChipCategoria activo={categoria === 'todos'} onClick={() => onCambiar({ ...filtros, categoria: 'todos' })}>
          Todos
        </ChipCategoria>
        {CATEGORIAS.map(c => (
          <ChipCategoria key={c} activo={categoria === c} onClick={() => onCambiar({ ...filtros, categoria: c })}>
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
              onClick={() => onCambiar({ ...filtros, dificultad: activo ? null : d })}
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
  )
}
