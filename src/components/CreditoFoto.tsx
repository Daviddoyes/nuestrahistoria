'use client'

type Props = {
  autor: string | null
  licencia: string | null
  /** La página del archivo en Wikimedia Commons. Sin ella, el crédito no enlaza. */
  origen: string | null
}

/**
 * Quién hizo la foto del catálogo y bajo qué licencia.
 *
 * NO es cortesía: de las 223 fotos del catálogo, 203 están bajo licencias de
 * Wikimedia Commons que EXIGEN citar al autor. Sin esta línea la app las estaba
 * usando fuera de su licencia. Por eso se pinta siempre que se vea la foto
 * grande, aunque estorbe un poco.
 *
 * Donde la foto sale pequeña (la rejilla de Explorar, el onboarding, el mapa)
 * no se pinta: ahí la foto es un icono de 54 px y el crédito ocuparía más que
 * ella. La ficha, que es donde la foto se ve de verdad, está a un toque.
 *
 * ── POR QUÉ UNA SOLA LÍNEA RECORTADA ──────────────────────
 *
 * El campo "autor" de Commons no siempre es un nombre. Hay 27 de más de 34
 * caracteres y uno de 631, que es el texto entero de una cesión de derechos.
 * Recortarlos con una regla propia ("quédate con lo de antes de la coma", "saca
 * el user:") sería inventarse quién firma, y eso es justo lo que no se puede
 * hacer con una atribución. Así que se enseña lo que cabe, con puntos
 * suspensivos, y el texto completo está donde manda: en la página de Commons, a
 * un toque, y en el `title` para quien pase el ratón.
 */
export default function CreditoFoto({ autor, licencia, origen }: Props) {
  const texto = [autor, licencia].filter(Boolean).join(' · ')
  if (!texto) return null

  const estilo: React.CSSProperties = {
    display: 'block', maxWidth: '100%',
    fontSize: 10, lineHeight: 1.3, color: 'rgba(255,255,255,0.72)',
    // Sombra porque va encima de una foto: el velo de la cabecera la oscurece,
    // pero una foto clara puede dejar el texto ilegible justo ahí.
    textShadow: '0 1px 4px rgba(0,0,0,0.75)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    // Holgura para el dedo sin que la línea engorde la cabecera.
    padding: '8px 2px',
  }

  const etiqueta = `Foto: ${texto}${origen ? '. Abre la página del archivo en Wikimedia Commons' : ''}`

  if (!origen) {
    return <span style={estilo} title={texto}>Foto: {texto}</span>
  }

  return (
    <a
      href={origen}
      target="_blank"
      rel="noopener noreferrer"
      title={texto}
      aria-label={etiqueta}
      onClick={e => e.stopPropagation()}
      className="active:opacity-60 transition-opacity"
      style={{ ...estilo, textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.3)', textUnderlineOffset: 2 }}
    >
      Foto: {texto}
    </a>
  )
}
