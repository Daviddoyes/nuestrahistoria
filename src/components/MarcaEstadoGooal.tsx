'use client'

import { Check, Hourglass } from 'lucide-react'
import { MARCA_ESTADO } from '@/lib/estado-gooal'
import type { EstadoUserGooal } from '@/types/gooals'

type Props = {
  estado: EstadoUserGooal
  /** Lado del círculo en píxeles. */
  tamano?: number
}

/**
 * La marca del estado: un círculo con ⏳ o ✓ dentro.
 *
 * Es la misma en la tarjeta de Explorar y en el perfil, y el pin del mapa se
 * dibuja con los mismos colores de MARCA_ESTADO (ahí no se puede usar este
 * componente: Leaflet pinta HTML en texto, fuera de React).
 *
 * Lleva su propia etiqueta para quien no ve la pantalla: un ✓ hueco y uno
 * relleno se distinguen mirando, pero no escuchando.
 */
export default function MarcaEstadoGooal({ estado, tamano = 34 }: Props) {
  const marca = MARCA_ESTADO[estado]
  const Icono = estado === 'pendiente' ? Hourglass : Check
  const lado = Math.round(tamano * 0.52)

  return (
    <span
      role="img"
      aria-label={marca.palabra}
      style={{
        width: tamano, height: tamano, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: marca.relleno ?? 'rgba(11,11,11,0.45)',
        border: `2px solid ${marca.color}`,
      }}
    >
      <Icono
        aria-hidden
        strokeWidth={2.5}
        style={{
          width: lado, height: lado,
          // Sobre el relleno verde el símbolo va oscuro; hueco, del color del borde.
          color: marca.relleno ? '#0B0B0B' : marca.color,
        }}
      />
    </span>
  )
}
