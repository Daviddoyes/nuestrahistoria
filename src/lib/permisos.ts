import { createServiceRoleClient } from '@/lib/supabase/service'
import type { VisibilidadFoto } from '@/types/gooals'

/**
 * Quién puede ver la foto de quién. TODO ESTO VIVE AQUÍ Y EN NINGÚN OTRO SITIO.
 *
 * Son dos preguntas distintas y conviene no mezclarlas:
 *
 *   1. ¿Estas dos personas son amigas?  -> amigosDe() / sonAmigos()
 *   2. Con eso, ¿puede ver esta foto?   -> puedeVerLaFoto()
 *
 * ── POR QUÉ EN UN SOLO SITIO ──────────────────────────────
 *
 * Hoy "amigo" quiere decir que os seguís los dos, leído de `follows`. No hay
 * solicitudes, ni tabla de amistades, ni pantalla de aceptar: eso vendrá
 * después. Cuando venga, **lo único que cambia es la función de aquí abajo**, y
 * ninguna pantalla ni ninguna consulta se entera.
 *
 * Por eso ningún otro fichero consulta `follows` para decidir un permiso. Si
 * alguna vez hace falta, se añade aquí.
 *
 * Es server-only: usa el service role y se salta la RLS a propósito, porque la
 * decisión la toma este código, no la base.
 */

/**
 * Los tres valores que acepta la columna. Mismo orden que el CHECK de la base.
 *
 * Vive aquí y no en fotos-privadas.ts porque aquel fichero es 'use server' y
 * esos SOLO pueden exportar funciones async. Una constante exportada desde allí
 * no la para ni TypeScript ni `npm run build`: la página revienta al abrirla.
 */
export const VISIBILIDADES: VisibilidadFoto[] = ['privada', 'amigos', 'publica']

/** Las personas con las que alguien se sigue mutuamente. Hoy, sus amigas. */
export async function amigosDe(userId: string | null | undefined): Promise<Set<string>> {
  if (!userId) return new Set()
  const service = createServiceRoleClient()

  // Las dos direcciones, en dos consultas y cruzadas aquí. Se podría pedir a la
  // base con un join, pero así no hay SQL suelto repartido y se ve la regla.
  const [sigo, meSiguen] = await Promise.all([
    service.from('follows').select('following_id').eq('follower_id', userId),
    service.from('follows').select('follower_id').eq('following_id', userId),
  ])

  const losQueSigo = new Set(((sigo.data ?? []) as { following_id: string }[]).map(f => f.following_id))
  const amigos = new Set<string>()
  for (const f of (meSiguen.data ?? []) as { follower_id: string }[]) {
    if (losQueSigo.has(f.follower_id)) amigos.add(f.follower_id)
  }
  return amigos
}

/** Lo mismo para dos personas sueltas. Para listas, usa `amigosDe` una vez. */
export async function sonAmigos(a: string | null | undefined, b: string | null | undefined): Promise<boolean> {
  if (!a || !b) return false
  if (a === b) return true
  return (await amigosDe(a)).has(b)
}

/**
 * ¿Puede `quienMira` ver la foto de `duenio`?
 *
 * Pura a propósito: recibe el conjunto de amigos ya resuelto en vez de ir a la
 * base. Así una lista de cuarenta posts se decide con UNA consulta y no con
 * cuarenta, y esta función se puede probar sin base de datos.
 *
 * Lo de "quien no ha iniciado sesión no ve nada salvo lo público" no es un caso
 * raro: es la mitad del problema que esto viene a arreglar.
 */
export function puedeVerLaFoto({
  quienMira, duenio, visibilidad, amigos,
}: {
  quienMira: string | null | undefined
  duenio: string
  visibilidad: VisibilidadFoto
  amigos: Set<string>
}): boolean {
  // Lo tuyo siempre lo ves, sea cual sea la visibilidad que le pusiste.
  if (quienMira && quienMira === duenio) return true
  if (visibilidad === 'publica') return true
  if (visibilidad === 'privada') return false
  // 'amigos'
  return Boolean(quienMira) && amigos.has(duenio)
}
