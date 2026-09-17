'use client'

import Logotipo from './Logotipo'

type Props = {
  /** Para el fundido de salida del splash. Por defecto, visible del todo. */
  opacidad?: number
}

/**
 * Fondo de la app con el logotipo en el centro, a pantalla completa.
 *
 * La usan el splash de la app instalada y la raíz mientras comprueba la sesión:
 * así las dos esperas se ven igual y no asoma el formulario de login un instante.
 */
export default function PantallaMarca({ opacidad = 1 }: Props) {
  return (
    <div
      aria-busy="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0B0B0B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.3s ease',
        opacity: opacidad,
        pointerEvents: 'none',
      }}
    >
      <Logotipo alto={32} />
    </div>
  )
}
