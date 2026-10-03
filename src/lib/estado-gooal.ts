import type { EstadoUserGooal } from '@/types/gooals'

/**
 * Los tres estados de un gooal de alguien, y cómo se dicen y se pintan.
 *
 * Vive en un solo sitio porque la marca tiene que leerse IGUAL en los tres
 * lugares donde aparece: la tarjeta de Explorar, el pin del mapa y el perfil.
 * Antes el mapa y la tarjeta tenían cada uno sus colores a mano y ya no decían
 * lo mismo.
 *
 * ── Los nombres ───────────────────────────────────────────
 *
 * En la base el tercero se llama 'completado' y en la pantalla se lee
 * "Conquistado". No es un despiste: renombrarlo en la base obligaría a
 * reescribir las filas de todo el mundo y a recalcular sus puntos, y eso por
 * una palabra que nadie ve. `palabra` es lo único que lee el usuario.
 *
 * ── La escalera ───────────────────────────────────────────
 *
 *   pendiente    ⏳ gris              lo quiero hacer
 *   vivido       ✓ hueco, verde      lo hice, sin foto que lo demuestre
 *   completado   ✓ relleno, verde    lo hice y lo demuestro
 *
 * Se lee de un vistazo: gris → contorno → lleno.
 */

export const ESTADOS_USER_GOOAL: EstadoUserGooal[] = ['pendiente', 'vivido', 'completado']

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
  vivido: {
    palabra: 'Vivido',
    glifo: '✓',
    color: VERDE,
    relleno: null,
    tinte: 'rgba(0,209,167,0.22)',
  },
  completado: {
    palabra: 'Conquistado',
    glifo: '✓',
    color: VERDE,
    relleno: VERDE,
    tinte: 'rgba(0,209,167,0.55)',
  },
}

/**
 * ¿Esto cuenta como "ya lo ha hecho"?
 *
 * Vivido y conquistado son el mismo recuerdo; lo que cambia es si hay foto. Lo
 * usan los gooals en común y el recuento por categorías del perfil, que van de
 * lo vivido, no de quién tiene la prueba.
 *
 * Los PUNTOS no usan esto a propósito: los da la foto, siempre. Quien suma
 * puntos es sincronizarPuntos(), que mira solo 'completado'.
 */
export function yaLoHizo(estado: EstadoUserGooal | null | undefined): boolean {
  return estado === 'vivido' || estado === 'completado'
}
