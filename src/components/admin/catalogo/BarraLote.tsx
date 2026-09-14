'use client'

type Props = {
  seleccionados: number
  enPagina: number
  onTodos: (seleccionar: boolean) => void
  onAplicar: (estado: 'verificado' | 'borrador') => void
}

/** Acciones sobre las filas seleccionadas de la página. Nunca más de una página. */
export default function BarraLote({ seleccionados, enPagina, onTodos, onAplicar }: Props) {
  const todos = enPagina > 0 && seleccionados === enPagina
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '8px 0' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#A3B1AC', minHeight: 40, cursor: 'pointer', paddingLeft: 7 }}>
        <input
          type="checkbox"
          checked={todos}
          ref={el => { if (el) el.indeterminate = seleccionados > 0 && !todos }}
          onChange={e => onTodos(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: '#00D1A7' }}
        />
        {seleccionados > 0 ? `${seleccionados} seleccionados` : 'Seleccionar la página'}
      </label>

      {seleccionados > 0 && (
        <span style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={() => onAplicar('verificado')}
            style={{ minHeight: 38, padding: '0 12px', borderRadius: 8, border: 'none', background: '#00D1A7', color: '#0B0B0B', fontSize: 13, fontWeight: 600 }}
          >
            Verificar los {seleccionados} seleccionados
          </button>
          <button
            type="button"
            onClick={() => onAplicar('borrador')}
            style={{ minHeight: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #2A2E2C', color: '#A3B1AC', fontSize: 13, fontWeight: 500 }}
          >
            Mandar {seleccionados} a borrador
          </button>
        </span>
      )}
    </div>
  )
}
