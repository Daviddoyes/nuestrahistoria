// Reglas de la prueba de un gooal completado (una foto o un vídeo).
//
// Viven aquí y no en el modal porque las aplican los dos lados: el navegador
// para avisar ANTES de subir, y el servidor porque lo que diga el navegador se
// puede saltar llamando a la Server Action a mano.

/**
 * El cubo donde viven las fotos y los vídeos de la gente. PRIVADO.
 *
 * No se sirve por dirección: la única forma de ver uno es una dirección FIRMADA
 * que da el servidor tras comprobar quién mira. Ver src/lib/fotos-privadas.ts.
 *
 * Fue 'gooals-media', que era público, y ahí está el agujero que esto cierra.
 */
export const BUCKET_PRUEBAS = 'logros-privados'

export const MAX_BYTES_FOTO = 10 * 1024 * 1024
export const MAX_BYTES_VIDEO = 50 * 1024 * 1024
export const MAX_SEGUNDOS_VIDEO = 9

export const TIPOS_FOTO: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']
export const TIPOS_VIDEO: readonly string[] = ['video/mp4', 'video/quicktime']

/**
 * `accept` del input: TODO el carrete, a propósito.
 *
 * Con la lista exacta de tipos, el selector de Android ocultaba o ponía en gris
 * las fotos HEIF y los vídeos en otros formatos, y el usuario tocaba sin que
 * pasara nada. El tipo se valida después de elegir, con un mensaje.
 */
export const ACCEPT_SELECTOR = 'image/*,video/*'

export type TipoPrueba = 'foto' | 'video'

const MIME_POR_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime',
}

/**
 * Tipo de un archivo elegido. Algunos gestores de archivos de Android lo
 * entregan con `type` vacío; entonces se deduce de la extensión en vez de
 * rechazar un MP4 perfectamente válido.
 */
export function mimeDeArchivo(archivo: { type: string; name: string }): string {
  if (archivo.type) return archivo.type.toLowerCase()
  const extension = archivo.name.split('.').pop()?.toLowerCase() ?? ''
  return MIME_POR_EXTENSION[extension] ?? ''
}

export function esHeic(mime: string, nombre: string): boolean {
  return /^image\/hei[cf]/.test(mime) || /\.hei[cf]$/i.test(nombre)
}

/** Mensaje si el vídeo elegido no vale por tipo o peso; null si vale. */
export function errorDeVideo(mime: string, bytes: number): string | null {
  if (!TIPOS_VIDEO.includes(mime)) {
    return 'Ese vídeo está en un formato que no admitimos. Súbelo en MP4 o MOV.'
  }
  if (bytes > MAX_BYTES_VIDEO) {
    return `El vídeo pesa ${megas(bytes)} y el máximo son ${megas(MAX_BYTES_VIDEO)}.`
  }
  return null
}

export function tipoDePrueba(mime: string): TipoPrueba | null {
  if (TIPOS_FOTO.includes(mime)) return 'foto'
  if (TIPOS_VIDEO.includes(mime)) return 'video'
  return null
}

function megas(bytes: number): string {
  return `${Math.ceil(bytes / (1024 * 1024))} MB`
}

/**
 * Mensaje si el archivo que se va a SUBIR no vale; null si vale.
 *
 * Se aplica a lo que llega a Storage, no a lo que eligió el usuario: las fotos se
 * convierten a JPG de 1.200 px antes de subir, así que una foto de 12 MB del
 * móvil acaba pesando unos cientos de KB y no tiene sentido rechazarla.
 */
export function errorDeArchivo(archivo: { type: string; size: number }): string | null {
  const tipo = tipoDePrueba(archivo.type)
  if (!tipo) {
    return 'Ese formato no vale. Sube una foto JPG, PNG o WEBP, o un vídeo MP4 o MOV.'
  }
  const maximo = tipo === 'foto' ? MAX_BYTES_FOTO : MAX_BYTES_VIDEO
  if (archivo.size > maximo) {
    const que = tipo === 'foto' ? 'La foto' : 'El vídeo'
    return `${que} pesa ${megas(archivo.size)} y el máximo son ${megas(maximo)}.`
  }
  return null
}

/**
 * Comprueba que la ruta que manda el navegador es la que debe ser, y la
 * devuelve; null si no vale.
 *
 * ANTES recibía una dirección pública entera y le quitaba el principio. Con el
 * cubo privado ya no hay direcciones públicas: lo que se guarda y lo que viaja
 * es la RUTA, `<usuario>/<gooal>/<fichero>`.
 *
 * Lo que de verdad hace falta comprobar sigue igual, y es esto: que la carpeta
 * sea la de QUIEN completa y la del GOOAL que completa. Sin eso, alguien podría
 * llamar a la Server Action a mano apuntando a la foto de otra persona y
 * colgársela de un gooal suyo.
 */
export function rutaDePrueba(ruta: string, userId: string, gooalId: string): string | null {
  if (!ruta || ruta.startsWith('http')) return null
  if (ruta.includes('?') || ruta.includes('#')) return null

  const partes = ruta.split('/')
  if (partes.length !== 3) return null
  if (partes.some(p => p === '' || p === '.' || p === '..')) return null
  if (partes[0] !== userId || partes[1] !== gooalId) return null

  return ruta
}

