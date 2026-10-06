'use server'

import { createServiceRoleClient } from '@/lib/supabase/service'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { amigosDe, puedeVerLaFoto, VISIBILIDADES } from '@/lib/permisos'
import { BUCKET_LOGROS } from '@/lib/recuerdo-media'
import type { VisibilidadFoto } from '@/types/gooals'

/**
 * La ÚNICA puerta por la que se ve una foto de alguien.
 *
 * El cubo 'logros-privados' es privado: Supabase no sirve sus ficheros por dirección a
 * secas. La única forma de ver uno es una dirección FIRMADA, y esas se piden
 * aquí, después de comprobar quién mira.
 *
 * Las pantallas NO deciden nada: piden por el id de la fila y reciben
 * direcciones solo para lo que pueden ver. Si una pantalla se equivoca y pide de
 * más, aquí se le dice que no.
 *
 * ══ LAS DOS REGLAS QUE SOSTIENEN ESTO ═════════════════════
 *
 * Si alguien va a tocar este fichero, que lea estas dos antes. Las dos se
 * rompen "por comodidad" y las dos duelen después.
 *
 * ── 1. SE PIDE POR EL ID DE LA FILA, NUNCA POR LA RUTA ────
 *
 * Si el navegador mandara la ruta del fichero, esto tendría que fiarse de ella,
 * y bastaría con inventarse la de otra persona para verle la foto. Mandando el
 * id de la fila, el servidor busca en la base quién es el dueño y qué
 * visibilidad tiene, y la ruta la saca él. **Lo que manda el navegador no
 * decide nada.**
 *
 * Es tentador añadir un atajo que acepte una ruta "porque aquí ya la tengo".
 * Ese atajo es el agujero.
 *
 * ── 2. LAS PETICIONES SE JUNTAN ───────────────────────────
 *
 * Una llamada con la lista entera, no una por foto. El muro enseña cuarenta
 * posts y el perfil una rejilla completa: separarlas serían cuarenta viajes al
 * servidor y cuarenta consultas de amistades, y la pantalla se arrastraría.
 *
 * Por eso puedeVerLaFoto() es pura y recibe los amigos ya resueltos: se
 * preguntan UNA vez para toda la lista. Si alguien mete la consulta de amigos
 * dentro del bucle, esto deja de escalar sin que ningún error lo avise.
 */

/** Cuánto vale una dirección firmada. */
const SEGUNDOS = 60 * 60

export type FotoFirmada = {
  /** Dirección firmada de la foto, o null si no puede verla (o no hay). */
  foto: string | null
  video: string | null
  /** Para que la pantalla sepa si enseñar un hueco explicado o nada. */
  puedeVer: boolean
}

type Fila = {
  id: string
  user_id: string
  visibilidad: VisibilidadFoto | null
  foto_url: string | null
  video_url: string | null
}

/**
 * La ruta dentro del cubo a partir de lo guardado en la fila.
 *
 * Durante un tiempo estas columnas guardaron una dirección pública entera; desde
 * la mudanza al cubo privado guardan la RUTA (`<usuario>/<gooal>/<fichero>`).
 * Se aceptan las dos para no depender de que la mudanza haya terminado, pero lo
 * que se escribe de ahora en adelante es la ruta.
 */
function rutaDe(valor: string | null): string | null {
  if (!valor) return null
  const marca = `/storage/v1/object/public/${BUCKET_LOGROS}/`
  const i = valor.indexOf(marca)
  if (i >= 0) return decodeURIComponent(valor.slice(i + marca.length))
  if (valor.startsWith('http')) return null
  return valor
}

/**
 * Direcciones firmadas para una lista de filas de user_gooals.
 *
 * Una sola consulta de amistades para toda la lista: con cuarenta posts en el
 * muro, preguntar de uno en uno serían cuarenta viajes a la base.
 */
export async function firmarFotos(userGooalIds: string[]): Promise<Record<string, FotoFirmada>> {
  const salida: Record<string, FotoFirmada> = {}
  const ids = [...new Set(userGooalIds.filter(Boolean))]
  if (ids.length === 0) return salida

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const quienMira = user?.id ?? null

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from('user_gooals')
    .select('id, user_id, visibilidad, foto_url, video_url')
    .in('id', ids)

  if (error) {
    console.error('[firmarFotos]', error)
    return salida
  }

  const filas = (data ?? []) as Fila[]
  const amigos = await amigosDe(quienMira)

  await Promise.all(filas.map(async fila => {
    const puede = puedeVerLaFoto({
      quienMira,
      duenio: fila.user_id,
      // Una fila sin visibilidad escrita se trata como 'amigos', que es el valor
      // por defecto de la columna: ante la duda, lo prudente.
      visibilidad: fila.visibilidad ?? 'amigos',
      amigos,
    })
    if (!puede) {
      salida[fila.id] = { foto: null, video: null, puedeVer: false }
      return
    }
    const [foto, video] = await Promise.all([
      firmarUna(service, rutaDe(fila.foto_url)),
      firmarUna(service, rutaDe(fila.video_url)),
    ])
    salida[fila.id] = { foto, video, puedeVer: true }
  }))

  return salida
}

async function firmarUna(
  service: ReturnType<typeof createServiceRoleClient>,
  ruta: string | null,
): Promise<string | null> {
  if (!ruta) return null
  const { data, error } = await service.storage.from(BUCKET_LOGROS).createSignedUrl(ruta, SEGUNDOS)
  if (error) {
    // Un fichero que no está es un dato roto, no un permiso denegado. Se deja
    // rastro porque si no, la pantalla enseñaría un hueco y nadie sabría por qué.
    console.error('[firmarFotos] no se pudo firmar', ruta, error.message)
    return null
  }
  return data?.signedUrl ?? null
}

/** Cambiar quién puede ver una foto. Solo su dueño. */
export async function cambiarVisibilidad(
  userGooalId: string,
  visibilidad: VisibilidadFoto,
): Promise<{ success: boolean; error?: string }> {
  // El tipo solo vale mientras el código es el que llama. Esto es una Server
  // Action: le puede llegar cualquier cosa desde fuera, y la base tiene un CHECK
  // que reventaría con un error feo en vez de decir que no.
  if (!VISIBILIDADES.includes(visibilidad)) return { success: false, error: 'Esa opción no existe.' }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const service = createServiceRoleClient()
  // El dueño va en la consulta y no en un `if`: así no hay forma de cambiar la
  // visibilidad de la foto de otra persona llamando a esto a mano.
  const { data, error } = await service
    .from('user_gooals')
    .update({ visibilidad })
    .eq('id', userGooalId)
    .eq('user_id', user.id)
    .select('id')

  if (error) {
    console.error('[cambiarVisibilidad]', error)
    return { success: false, error: 'No se pudo cambiar quién la ve.' }
  }
  if ((data ?? []).length === 0) return { success: false, error: 'Esa foto no es tuya.' }
  return { success: true }
}
