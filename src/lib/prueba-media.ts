// Reglas de la prueba de un gooal completado (una foto o un vídeo).
//
// Viven aquí y no en el modal porque las aplican los dos lados: el navegador
// para avisar ANTES de subir, y el servidor porque lo que diga el navegador se
// puede saltar llamando a la Server Action a mano.

export const BUCKET_PRUEBAS = 'gooals-media'

export const MAX_BYTES_FOTO = 10 * 1024 * 1024
export const MAX_BYTES_VIDEO = 50 * 1024 * 1024
export const MAX_SEGUNDOS_VIDEO = 9

export const TIPOS_FOTO: readonly string[] = ['image/jpeg', 'image/png', 'image/webp']
export const TIPOS_VIDEO: readonly string[] = ['video/mp4', 'video/quicktime']

/** Para el `accept` del input: el selector del móvil ya filtra por tipo. */
export const ACCEPT_PRUEBA = [...TIPOS_FOTO, ...TIPOS_VIDEO].join(',')

export type TipoPrueba = 'foto' | 'video'

export function tipoDePrueba(mime: string): TipoPrueba | null {
  if (TIPOS_FOTO.includes(mime)) return 'foto'
  if (TIPOS_VIDEO.includes(mime)) return 'video'
  return null
}

function megas(bytes: number): string {
  return `${Math.ceil(bytes / (1024 * 1024))} MB`
}

/** Mensaje para el usuario si el archivo no vale; null si vale. */
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
 * Ruta dentro del bucket a la que apunta la URL de una prueba, o null si la URL
 * no es una prueba legítima de este usuario para este gooal.
 *
 * Solo se acepta la URL pública de NUESTRO proyecto de Supabase, en el bucket de
 * pruebas y en la carpeta `<userId>/<gooalId>/`. Sin esto la Server Action se
 * tragaba cualquier enlace de internet como prueba, y una misma subida servía
 * para completar todos los gooals del catálogo.
 */
export function rutaDePrueba(url: string, userId: string, gooalId: string): string | null {
  const proyecto = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!proyecto) return null

  let recibida: URL
  try {
    recibida = new URL(url)
  } catch {
    return null
  }
  if (recibida.origin !== new URL(proyecto).origin) return null
  if (recibida.search || recibida.hash) return null

  const prefijo = `/storage/v1/object/public/${BUCKET_PRUEBAS}/`
  if (!recibida.pathname.startsWith(prefijo)) return null

  let ruta: string
  try {
    ruta = decodeURIComponent(recibida.pathname.slice(prefijo.length))
  } catch {
    return null
  }

  const partes = ruta.split('/')
  if (partes.length !== 3) return null
  if (partes.some(p => p === '' || p === '.' || p === '..')) return null
  if (partes[0] !== userId || partes[1] !== gooalId) return null

  return ruta
}
