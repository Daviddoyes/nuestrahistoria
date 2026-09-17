/**
 * La diana: la tercera letra del logotipo, suelta.
 *
 * Es la marca para los sitios pequeños (avatar, insignia de una pantalla, el
 * icono de la app). Cuando cabe el logotipo entero, va el logotipo.
 *
 * El dibujo va aquí dentro y no como <img> a propósito: son dos círculos, pesa
 * menos que la petición del fichero y no parpadea al cargar. Si cambia el
 * dibujo, cambia también public/marca/gooals-icono.svg, que es de donde salen
 * los iconos de la app (scripts/generar-iconos.mjs).
 */
export default function Diana({ tamano = 40, color = '#00D1A7' }: { tamano?: number; color?: string }) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      width={tamano}
      height={tamano}
      role="img"
      aria-label="gooals"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path
        fill={color}
        fillRule="evenodd"
        d="M0.0 500A500.0 500.0 0 1 1 1000.0 500A500.0 500.0 0 1 1 0.0 500ZM217.0 500A283.0 283.0 0 1 0 783.0 500A283.0 283.0 0 1 0 217.0 500Z"
      />
      <path fill={color} d="M362.5 500A137.5 137.5 0 1 1 637.5 500A137.5 137.5 0 1 1 362.5 500Z" />
    </svg>
  )
}
