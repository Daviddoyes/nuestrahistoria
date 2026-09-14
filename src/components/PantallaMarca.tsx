'use client'

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
      {/* width/height con la proporción del SVG (3828×723) para que no salte. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marca/gooals-logotipo-oscuro.svg"
        alt="GooALS"
        width={169}
        height={32}
        style={{ height: 32, width: 'auto', display: 'block' }}
      />
    </div>
  )
}
