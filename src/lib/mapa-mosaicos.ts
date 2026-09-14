// Mosaicos del mapa, compartidos por el mapa de la app y el del panel de admin.

/**
 * Mosaicos de CARTO. La clave es OPCIONAL: sin ella el mapa funciona igual y
 * solo aparece la marca de agua. Así quien clone el repo sin configurarla no se
 * encuentra un mapa roto.
 *
 * Es pública a propósito (NEXT_PUBLIC_): viaja en cada petición de mosaico, así
 * que no es un secreto. La protege la restricción a gooals.app en CARTO.
 * encodeURIComponent: Leaflet trataría una llave "{" de la clave como una
 * variable de la plantilla.
 *
 * Se conserva {r}: pide mosaicos de doble resolución en pantallas retina.
 */
const CLAVE_CARTO = process.env.NEXT_PUBLIC_CARTO_KEY?.trim()
export const URL_MOSAICOS =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' +
  (CLAVE_CARTO ? `?key=${encodeURIComponent(CLAVE_CARTO)}` : '')

/** Obligatoria para usar la clave gratuita de CARTO. No se quita ni se oculta en ningún mapa. */
export const ATRIBUCION_MAPA =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
