/**
 * El logotipo entero: "gooals" con la diana como tercera letra.
 *
 * Dos versiones, según el fondo. Nunca se deforma: se fija el alto y el ancho
 * sale solo, con la proporción del fichero.
 *
 * Es <img> y no next/image porque es un SVG vectorial fijo: no hay nada que
 * optimizar, y next/image exigiría activar dangerouslyAllowSVG.
 */
// La proporción del fichero (viewBox 3414×1015). Si el logotipo se rehace, se
// mira otra vez: con un número viejo, el hueco reservado no cuadra y la
// cabecera pega un salto al cargar.
const PROPORCION = 3414 / 1015

export default function Logotipo({ alto = 20, fondo = 'oscuro' }: { alto?: number; fondo?: 'oscuro' | 'claro' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/marca/gooals-logotipo-${fondo}.svg`}
      alt="gooals"
      width={Math.round(alto * PROPORCION)}
      height={alto}
      style={{ height: alto, width: 'auto', display: 'block' }}
    />
  )
}
