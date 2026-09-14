'use client'

import { Search, X } from 'lucide-react'
import { CATEGORIAS, CATEGORIA_LABEL } from '@/lib/gooals'
import type { FiltrosAdmin } from '@/types/gooals'

type Props = {
  filtros: FiltrosAdmin
  /** Lo que hay escrito en el buscador ahora mismo (se aplica con un respiro). */
  texto: string
  onTexto: (texto: string) => void
  onCambiar: (cambio: Partial<FiltrosAdmin>) => void
  total: number | null
  cargando: boolean
}

const select: React.CSSProperties = {
  padding: '9px 10px', borderRadius: 10, border: '1px solid #2A2E2C', background: '#1E2120',
  color: '#FFFFFF', fontSize: 13, minHeight: 40,
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      style={{
        padding: '8px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500, minHeight: 36,
        border: `1px solid ${activo ? '#00D1A7' : '#2A2E2C'}`,
        background: activo ? 'rgba(0,209,167,0.12)' : 'transparent',
        color: activo ? '#00D1A7' : '#A3B1AC', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

/** Buscador, estado, categoría, ámbito y "sin pin", con el número de resultados siempre a la vista. */
export default function BarraFiltros({ filtros, texto, onTexto, onCambiar, total, cargando }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ position: 'relative' }}>
        <Search
          aria-hidden
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#7A8A85' }}
        />
        <input
          type="search"
          value={texto}
          onChange={e => onTexto(e.target.value)}
          placeholder="Buscar por título..."
          aria-label="Buscar por título"
          style={{ ...select, width: '100%', padding: '10px 36px', fontSize: 14 }}
        />
        {texto && (
          <button
            type="button"
            onClick={() => onTexto('')}
            aria-label="Borrar búsqueda"
            style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, color: '#7A8A85', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {(['borrador', 'verificado', 'todos'] as const).map(e => (
          <Chip key={e} activo={filtros.estado === e} onClick={() => onCambiar({ estado: e })}>
            {e === 'borrador' ? 'Borrador' : e === 'verificado' ? 'Verificado' : 'Todos'}
          </Chip>
        ))}
        <span style={{ width: 1, height: 20, background: '#2A2E2C', margin: '0 4px' }} />
        <Chip activo={filtros.sinPin} onClick={() => onCambiar({ sinPin: !filtros.sinPin })}>
          Sin pin
        </Chip>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <select
          aria-label="Categoría"
          value={filtros.categoria}
          onChange={e => onCambiar({ categoria: e.target.value as FiltrosAdmin['categoria'] })}
          style={select}
        >
          <option value="todas">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
        </select>
        <select
          aria-label="Ámbito"
          value={filtros.sinPin ? 'lugar' : filtros.ambito}
          disabled={filtros.sinPin}
          title={filtros.sinPin ? '"Sin pin" ya enseña solo los de lugar' : undefined}
          onChange={e => onCambiar({ ambito: e.target.value as FiltrosAdmin['ambito'] })}
          style={{ ...select, opacity: filtros.sinPin ? 0.5 : 1 }}
        >
          <option value="todos">Lugar y personal</option>
          <option value="lugar">Lugar</option>
          <option value="personal">Personal</option>
        </select>

        <p aria-live="polite" style={{ marginLeft: 'auto', fontSize: 13, color: '#A3B1AC', display: 'flex', alignItems: 'center', gap: 6 }}>
          {cargando && <span className="w-3.5 h-3.5 border-2 border-[#2A2E2C] border-t-[#00D1A7] rounded-full animate-spin" />}
          {total === null ? 'Cargando...' : (
            <><span style={{ color: '#00D1A7', fontWeight: 700 }}>{total.toLocaleString('es-ES')}</span> {total === 1 ? 'resultado' : 'resultados'}</>
          )}
        </p>
      </div>
    </div>
  )
}
