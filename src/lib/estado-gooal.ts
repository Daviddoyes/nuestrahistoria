import type { EstadoUserGooal } from '@/types/gooals'

/**
 * Los dos estados de un gooal de alguien, y cómo se dicen y se pintan.
 *
 * Vive en un solo sitio porque la marca tiene que leerse IGUAL en los tres
 * lugares donde aparece: la tarjeta de Explorar, el pin del mapa y el perfil.
 * Antes el mapa y la tarjeta tenían cada uno sus colores a mano y ya no decían
 * lo mismo — el mapa llegó a usar el MISMO turquesa para pendiente y para
 * conseguido, así que los dos pines solo se distinguían por el ✓.
 *
 * ── Los nombres ───────────────────────────────────────────
 *
 * En la base el segundo se llama 'completado' y en la pantalla el usuario lee
 * "Conseguido". No es un despiste: renombrarlo obligaría a reescribir las filas
 * de todo el mundo por una palabra que nadie ve. `palabra` es lo único que se
 * lee en pantalla.
 *
 * ── La escalera ───────────────────────────────────────────
 *
 *   pendiente    ⏳ gris              lo quiero hacer
 *   completado   ✓ relleno, verde    lo conseguí
 *
 * Hubo un tercero en medio, 'vivido' (✓ hueco), para lo hecho sin foto. Duró dos
 * días: desde que los puntos los da el gooal conseguido lleve foto o no, lo
 * único que lo diferenciaba de 'completado' era si hay foto — y eso ya lo dice
 * la foto, que está en la misma fila. Ver supabase/fase3s.sql.
 */

export const ESTADOS_USER_GOOAL: EstadoUserGooal[] = ['pendiente', 'completado']

const VERDE = '#00D1A7'
const GRIS = '#7A8A85'

export type MarcaEstado = {
  /** Lo que lee el usuario. */
  palabra: string
  /** Para el pin del mapa, que es HTML suelto y no puede traer iconos de React. */
  glifo: string
  /** Color del símbolo y del contorno. */
  color: string
  /** Fondo de la marca. null = hueca, solo contorno. */
  relleno: string | null
  /** Velo sobre la foto de la tarjeta de Explorar. */
  tinte: string
}

export const MARCA_ESTADO: Record<EstadoUserGooal, MarcaEstado> = {
  pendiente: {
    palabra: 'Pendiente',
    glifo: '⏳',
    color: GRIS,
    relleno: null,
    tinte: 'rgba(11,11,11,0.55)',
  },
  completado: {
    palabra: 'Conseguido',
    glifo: '✓',
    color: VERDE,
    relleno: VERDE,
    tinte: 'rgba(0,209,167,0.55)',
  },
}
