'use client'

import { progresoNivel } from '@/lib/niveles'

type Props = {
  conseguidos: number
  pendientes: number
  puntos: number
  /**
   * La barra de nivel solo en el perfil propio. Cuánto le falta a otra persona
   * para subir no le sirve a nadie; a ti es la mitad del juego.
   */
  conProgreso: boolean
}

const etiqueta: React.CSSProperties = {
  fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#7A8A85', marginTop: 5,
}

/** Las tres cifras del perfil: conseguidos, pendientes y puntos. */
export default function TarjetaCifras({ conseguidos, pendientes, puntos, conProgreso }: Props) {
  const progreso = progresoNivel(puntos)

  const cifras: { valor: number; texto: string; color: string }[] = [
    { valor: conseguidos, texto: 'Conseguidos', color: '#FFFFFF' },
    { valor: pendientes, texto: 'Pendientes', color: '#FFFFFF' },
    { valor: puntos, texto: 'Puntos', color: '#00D1A7' },
  ]

  return (
    <div style={{ background: '#161817', borderRadius: 16, padding: 14 }}>
      <div style={{ display: 'flex' }}>
        {cifras.map(({ valor, texto, color }, i) => (
          <div key={texto} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'stretch' }}>
            {i > 0 && <div aria-hidden style={{ width: 1, background: '#2A2E2C', margin: '0 12px' }} />}
            <div style={{ minWidth: 0 }}>
              <p className="fuente-titular" style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>
                {valor}
              </p>
              <p style={etiqueta}>{texto}</p>
            </div>
          </div>
        ))}
      </div>

      {conProgreso && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginTop: 12 }}>
            {/* En verde de marca, como en la cabecera: los colores propios de
                cada nivel se confunden con los de las categorías. */}
            <p style={{ fontSize: 13, fontWeight: 600, color: '#00D1A7' }}>{progreso.actual.nombre}</p>
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
            {/* minWidth: recién estrenado un nivel el progreso es 0 y la barra
                se quedaba completamente vacía, que no se distingue de una rota.
                Un hilo mínimo dice "esto está vivo y empieza aquí". */}
            <div
              className="barra-nivel"
              style={{ height: '100%', width: `${progreso.porcentaje}%`, minWidth: 5, background: '#00D1A7', borderRadius: 999 }}
            />
          </div>
        </>
      )}
    </div>
  )
}
