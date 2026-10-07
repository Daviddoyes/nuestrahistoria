'use client'

import { Search, X } from 'lucide-react'
import { CATEGORIAS, CATEGORIA_LABEL, type CategoriaGooal } from '@/lib/gooals'
import ChipCategoria from '@/components/ChipCategoria'

export type Filtros = {
  busqueda: string
  categoria: CategoriaGooal | 'todos'
}

export const SIN_FILTROS: Filtros = { busqueda: '', categoria: 'todos' }

export function hayFiltros(f: Filtros): boolean {
  return Boolean(f.busqueda || f.categoria !== 'todos')
}

type Props = {
  filtros: Filtros
  onCambiar: (filtros: Filtros) => void
}

/**
 * Buscador y categorías. UNA SOLA BARRA PARA LAS DOS VISTAS.
 *
 * Antes esto vivía dentro de la lista, y el mapa tenía sus propias pastillas de
 * categoría y ni buscador ni dificultad —aunque la consulta del mapa sí los
 * aceptaba desde el principio: la pantalla le pasaba `dificultad: null` y
 * `busqueda: ''` a pelo—. Dos juegos de filtros en dos pestañas de la misma
 * pantalla significa que buscas algo, cambias de vista y se te ha perdido.
 *
 * Así que los filtros son de la pantalla, no de la vista, y las dos miran los
 * mismos.
 *
 * ── Y NO HAY FILTRO DE DIFICULTAD ─────────────────────────
 *
 * Lo hubo hasta el 7-10-2026. La dificultad SE DEDUCE de los puntos (1-3 fácil,
 * 4-7 difícil, 8-10 épico), así que enseñarla al lado de los puntos era tener
 * dos palabras para una sola cosa, y de eso vienen la mitad de los líos de este
 * repo. La columna sigue en la base y el disparador que la calcula también: lo
 * que desaparece es de la pantalla. El día que haga falta "enséñame solo lo
 * gordo", será un filtro por PUNTOS, no una palabra nueva.
 */
export default function FiltrosCatalogo({ filtros, onCambiar }: Props) {
  const { busqueda, categoria } = filtros

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

    </div>
  )
}
