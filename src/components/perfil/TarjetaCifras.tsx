'use client'

import { progresoNivel } from '@/lib/niveles'

type Props = {
  conquistados: number
  puntos: number
}

const etiqueta: React.CSSProperties = {
  fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7A8A85', marginTop: 6,
}

/**
 * Gooals conquistados en grande y puntos al lado, más pequeños. Mandan los
 * gooals y no los puntos: la app va de cuántas cosas distintas has vivido.
 */
export default function TarjetaCifras({ conquistados, puntos }: Props) {
  const progreso = progresoNivel(puntos)

  return (
    <div style={{ background: '#161817', borderRadius: 16, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="fuente-titular" style={{ fontSize: 32, fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
            {conquistados}
          </p>
          <p style={etiqueta}>Gooals conquistados</p>
        </div>

        <div style={{ width: 1, background: '#2A2E2C', margin: '0 18px' }} />

        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <p className="fuente-titular" style={{ fontSize: 22, fontWeight: 700, color: '#00D1A7', lineHeight: 1 }}>
            {puntos}
          </p>
          <p style={etiqueta}>Puntos</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginTop: 10 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: progreso.actual.color }}>{progreso.actual.nombre}</p>
        <p style={{ fontSize: 12, color: '#7A8A85', textAlign: 'right' }}>
          {progreso.siguiente ? `${progreso.faltan} para ${progreso.siguiente.nombre}` : 'Nivel máximo'}
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuenow={progreso.porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={progreso.siguiente ? `Progreso hacia ${progreso.siguiente.nombre}` : 'Nivel máximo alcanzado'}
        style={{ height: 4, background: '#2A2E2C', borderRadius: 999, overflow: 'hidden', marginTop: 5 }}
      >
        <div className="barra-nivel" style={{ height: '100%', width: `${progreso.porcentaje}%`, background: '#00D1A7', borderRadius: 999 }} />
      </div>
    </div>
  )
}
