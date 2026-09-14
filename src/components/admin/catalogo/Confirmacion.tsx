'use client'

type Props = {
  titulo: string
  texto: string
  confirmar: string
  /** Rojo en vez de turquesa: para borrar o descartar. */
  peligro?: boolean
  ocupado?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

/** Confirmación antes de una acción que no conviene hacer sin querer. */
export default function Confirmacion({ titulo, texto, confirmar, peligro, ocupado, onConfirmar, onCancelar }: Props) {
  const color = peligro ? '#FF5252' : '#00D1A7'
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmacion-titulo"
      style={{
        position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && !ocupado && onCancelar()}
    >
      <div style={{
        width: '100%', maxWidth: 380, background: '#1E2120', border: '1px solid #2A2E2C',
        borderRadius: 16, padding: 20,
      }}>
        <p id="confirmacion-titulo" className="fuente-titular" style={{ fontSize: 17, fontWeight: 700, color: '#FFFFFF' }}>
          {titulo}
        </p>
        <p style={{ fontSize: 14, color: '#A3B1AC', marginTop: 8, lineHeight: 1.5 }}>{texto}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button
            onClick={onCancelar}
            disabled={ocupado}
            style={{
              flex: 1, minHeight: 44, borderRadius: 10, border: '1px solid #2A2E2C',
              color: '#A3B1AC', fontSize: 14, fontWeight: 500, opacity: ocupado ? 0.5 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={ocupado}
            autoFocus
            style={{
              flex: 1, minHeight: 44, borderRadius: 10, border: 'none', background: color,
              color: '#0B0B0B', fontSize: 14, fontWeight: 600, opacity: ocupado ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {ocupado && <span className="w-4 h-4 border-2 border-[#0B0B0B] border-t-transparent rounded-full animate-spin" />}
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
