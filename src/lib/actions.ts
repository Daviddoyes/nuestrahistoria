'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { calcularNivel } from '@/lib/niveles'
import { CATEGORIAS, normalizarCategoriaGooal } from '@/lib/gooals'
import {
  BUCKET_PRUEBAS, errorDeArchivo, rutaDePrueba, tipoDePrueba, type TipoPrueba,
} from '@/lib/prueba-media'
import type {
  GooalV2, UserGooal, UserGooalConGooal, MuroPostFeed, UsuarioMini,
  PerfilGamificado, StatCategoria, EstadoUserGooal, FiltrosCatalogo,
  FiltrosMapa, GooalMapa, FiltrosPines, PinMapa, Profile,
} from '@/types/gooals'

/** Tamaño de página de Explorar. */
const GOOALS_POR_PAGINA = 40

/**
 * Tope de pines por consulta del mapa.
 *
 * PostgREST corta en 1.000 filas EN SILENCIO cuando no hay límite explícito, y
 * eso ya rompió Explorar una vez: la lista se traía el catálogo entero, recibía
 * solo el último trozo insertado y filtrar por viajes no devolvía nada. Aquí el
 * límite es explícito y se avisa al cliente cuando se alcanza, en vez de
 * enseñar un mapa incompleto sin decirlo.
 */
const GOOALS_MAPA_MAX = 500

/**
 * Cuántos pines se piden por vuelta en getPinesMapa.
 *
 * Es el tope de PostgREST, no una elección: devuelve como mucho 1.000 filas y
 * no avisa de que hay más. Por eso la función pagina en vez de pedir y ya.
 */
const PINES_POR_VUELTA = 1000

/** Sugerencias que puede mandar un usuario en 24 h. */
const SUGERENCIAS_POR_DIA = 5

export async function getMyProfile(): Promise<Profile | null> {
  const serverSupa = await createServerClient()
  const { data: { user } } = await serverSupa.auth.getUser()
  if (!user) return null

  const service = createServiceRoleClient()
  const { data: profile } = await service
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    const nombre = (user.user_metadata?.nombre as string) || user.email?.split('@')[0] || ''
    const base = nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'user'
    const suffix = Math.random().toString(36).slice(2, 6)
    const { data: newProfile } = await service
      .from('profiles')
      .insert({ id: user.id, email: user.email || '', nombre, username: `${base}_${suffix}` })
      .select()
      .single()
    return newProfile as Profile | null
  }

  return profile as Profile
}

export async function searchUsers(
  query: string
): Promise<{ id: string; nombre: string; username: string; foto_perfil_url: string | null }[]> {
  if (query.trim().length < 2) return []
  const service = createServiceRoleClient()
  const { data } = await service
    .from('profiles')
    .select('id, nombre, username, foto_perfil_url')
    .ilike('username', `%${query.trim()}%`)
    .limit(5)
  return (data ?? []) as { id: string; nombre: string; username: string; foto_perfil_url: string | null }[]
}

// ─────────────────────────────────────────────────────────────
// FASE 3 — Gamificación: catálogo v2, puntos, muro y seguidores
//
// Todo pasa por el service role a propósito: las tablas de la fase 3 tienen
// RLS activada y sin políticas de escritura, así que la anon key (que es
// pública) no puede insertar likes, follows ni posts en nombre de nadie.
// Cada acción resuelve el usuario desde la cookie de sesión antes de escribir.
// ─────────────────────────────────────────────────────────────

const PERFIL_CAMPOS = 'id, nombre, username, foto_perfil_url, puntos_totales, nivel'

type PerfilRow = {
  id: string
  nombre: string | null
  username: string | null
  foto_perfil_url: string | null
  puntos_totales: number | null
  nivel: string | null
}

function aUsuarioMini(p: PerfilRow): UsuarioMini {
  return {
    id: p.id,
    nombre: p.nombre ?? 'Usuario',
    username: p.username,
    foto_perfil_url: p.foto_perfil_url,
    puntos_totales: p.puntos_totales ?? 0,
    nivel: p.nivel ?? 'Principiante',
  }
}

/**
 * Limpia el texto del buscador antes de meterlo en un ilike.
 *
 * Los comodines de LIKE y los caracteres con los que PostgREST delimita los
 * filtros se quitan: en un título no aportan nada y evitan que un "%" suelto
 * convierta la búsqueda en "trae cualquier cosa". La usan la lista y el mapa,
 * para que buscar lo mismo devuelva lo mismo en las dos vistas.
 */
function limpiarBusqueda(texto: string | undefined): string {
  return (texto ?? '').replace(/[%_\\,()"']/g, ' ').trim()
}

/** Usuario de la sesión actual. No se exporta: en 'use server' todo export debe ser async. */
async function getUserId(): Promise<string | null> {
  const serverSupa = await createServerClient()
  const { data: { user } } = await serverSupa.auth.getUser()
  return user?.id ?? null
}

/**
 * Recalcula puntos_totales y nivel desde user_gooals y los guarda en profiles.
 * Se recalcula en vez de incrementar para que dos completados simultáneos no se
 * pisen: la suma siempre sale de la tabla fuente.
 */
async function sincronizarPuntos(
  service: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<{ puntos: number; nivel: string }> {
  const { data } = await service
    .from('user_gooals')
    .select('puntos_ganados')
    .eq('user_id', userId)
    .eq('estado', 'completado')

  const puntos = ((data ?? []) as { puntos_ganados: number | null }[])
    .reduce((suma, fila) => suma + (fila.puntos_ganados ?? 0), 0)
  const nivel = calcularNivel(puntos).nombre

  await service.from('profiles').update({ puntos_totales: puntos, nivel }).eq('id', userId)
  return { puntos, nivel }
}

/** Recuenta seguidores/siguiendo desde follows. Mismo motivo que sincronizarPuntos. */
async function sincronizarContadoresSociales(
  service: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<void> {
  const [seguidoresRes, siguiendoRes] = await Promise.all([
    service.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
    service.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
  ])
  await service
    .from('profiles')
    .update({ seguidores: seguidoresRes.count ?? 0, siguiendo: siguiendoRes.count ?? 0 })
    .eq('id', userId)
}

// ── Muro ─────────────────────────────────────────────────────

/** Feed del muro: posts de la gente que sigues + los tuyos, más recientes primero. */
export async function getMuroFeed(limite = 40): Promise<MuroPostFeed[]> {
  const userId = await getUserId()
  if (!userId) return []

  const service = createServiceRoleClient()

  const { data: siguiendo } = await service
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  const autorIds = [
    ...new Set([
      userId,
      ...((siguiendo ?? []) as { following_id: string }[]).map(f => f.following_id),
    ]),
  ]

  const { data: posts } = await service
    .from('muro_posts')
    .select('*')
    .in('user_id', autorIds)
    .order('created_at', { ascending: false })
    .limit(limite)

  const filas = (posts ?? []) as {
    id: string; user_id: string; gooal_id: string | null; created_at: string
    foto_url: string | null; video_url: string | null; descripcion: string | null
    puntos: number | null; likes: number | null
  }[]
  if (filas.length === 0) return []

  const gooalIds = [...new Set(filas.map(p => p.gooal_id).filter((id): id is string => Boolean(id)))]

  const [perfilesRes, gooalsRes, misLikesRes] = await Promise.all([
    service.from('profiles').select(PERFIL_CAMPOS).in('id', autorIds),
    gooalIds.length > 0
      ? service.from('gooals_v2').select('*').in('id', gooalIds)
      : Promise.resolve({ data: [] }),
    service.from('muro_likes').select('post_id').eq('user_id', userId).in('post_id', filas.map(p => p.id)),
  ])

  const perfiles = new Map(
    ((perfilesRes.data ?? []) as PerfilRow[]).map(p => [p.id, aUsuarioMini(p)])
  )
  const gooals = new Map(((gooalsRes.data ?? []) as GooalV2[]).map(g => [g.id, g]))
  const misLikes = new Set(((misLikesRes.data ?? []) as { post_id: string }[]).map(l => l.post_id))

  const anonimo: UsuarioMini = { id: '', nombre: 'Usuario', username: null, foto_perfil_url: null }

  return filas.map(p => ({
    id: p.id,
    user_id: p.user_id,
    created_at: p.created_at,
    foto_url: p.foto_url,
    video_url: p.video_url,
    descripcion: p.descripcion,
    puntos: p.puntos ?? 0,
    likes: p.likes ?? 0,
    liked: misLikes.has(p.id),
    autor: perfiles.get(p.user_id) ?? anonimo,
    gooal: p.gooal_id ? gooals.get(p.gooal_id) ?? null : null,
  }))
}

/** Da o quita un like. Devuelve el estado final para que la UI cuadre con la BD. */
export async function toggleLike(postId: string): Promise<{ liked: boolean; likes: number }> {
  const userId = await getUserId()
  if (!userId) return { liked: false, likes: 0 }

  const service = createServiceRoleClient()

  const { data: existente } = await service
    .from('muro_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existente) {
    await service.from('muro_likes').delete().eq('id', (existente as { id: string }).id)
  } else {
    await service.from('muro_likes').insert({ post_id: postId, user_id: userId })
  }

  const { count } = await service
    .from('muro_likes')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId)

  const likes = count ?? 0
  await service.from('muro_posts').update({ likes }).eq('id', postId)

  return { liked: !existente, likes }
}

// ── Explorar: catálogo v2 ────────────────────────────────────

/** Catálogo activo + en qué estado tiene el usuario cada gooal (para los overlays). */
/**
 * Una página del catálogo, ya filtrada en la base de datos.
 *
 * Los filtros van en la query y no en el cliente a propósito: PostgREST corta
 * en 1.000 filas por defecto, así que traerse el catálogo entero (4.900 gooals)
 * y filtrar en memoria devolvía solo el último trozo insertado — Explorar se
 * quedaba sin viajes, sin deporte y sin aventura, y filtrar por esas categorías
 * no daba ningún resultado.
 */
export async function getCatalogoGooals(filtros: FiltrosCatalogo = {}): Promise<{
  gooals: GooalV2[]
  hayMas: boolean
}> {
  const service = createServiceRoleClient()
  const pagina = Math.max(0, filtros.pagina ?? 0)
  const desde = pagina * GOOALS_POR_PAGINA

  let query = service
    .from('gooals_v2')
    .select('*')
    .eq('activo', true)

  if (filtros.categoria && filtros.categoria !== 'todos') {
    query = query.eq('categoria', filtros.categoria)
  }
  if (filtros.dificultad) {
    query = query.eq('dificultad', filtros.dificultad)
  }
  const busqueda = limpiarBusqueda(filtros.busqueda)
  if (busqueda) {
    query = query.ilike('titulo', `%${busqueda}%`)
  }

  // `id` cierra el orden: sin un desempate estable, dos filas con los mismos
  // veces_completado y created_at pueden repetirse o saltarse entre páginas.
  const { data, error } = await query
    .order('veces_completado', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    // Pedimos uno de más para saber si hay página siguiente sin contar el total.
    .range(desde, desde + GOOALS_POR_PAGINA)

  if (error) {
    console.error('[getCatalogoGooals]', error)
    return { gooals: [], hayMas: false }
  }

  const filas = (data ?? []) as GooalV2[]
  return {
    gooals: filas.slice(0, GOOALS_POR_PAGINA),
    hayMas: filas.length > GOOALS_POR_PAGINA,
  }
}

/**
 * Todos los pines del mapa de una vez, sin recuadro.
 *
 * El catálogo entero son 3.232 filas con coordenadas — en el mundo, no por
 * pantalla — y un pin son cuatro campos: 325 KB sin comprimir, 111 KB con gzip
 * y 93 KB con brotli (medido, no estimado; salen 103 bytes por pin, la mitad
 * el uuid). Cabe de sobra en memoria, y con eso desaparecen el recuadro, el
 * debounce y el tope de 500: mover el mapa deja de consultar nada.
 *
 * El select es de cuatro columnas a propósito. El título, la ciudad y los
 * puntos no se pintan en un pin, solo en el popup del que se pulsa, y ese se
 * pide por id con getGooalV2. Traerlos para los 3.232 multiplicaría por diez
 * el peso de la respuesta para enseñar uno.
 */
export async function getPinesMapa(filtros: FiltrosPines = {}): Promise<PinMapa[]> {
  const service = createServiceRoleClient()

  const pines: PinMapa[] = []
  // Paginar no es opcional: PostgREST corta en 1.000 filas y no dice que haya
  // recortado. Sin este bucle faltarían 2.232 pines y el mapa parecería
  // correcto, solo que con medio mundo vacío.
  for (let desde = 0; ; desde += PINES_POR_VUELTA) {
    let query = service
      .from('gooals_v2')
      .select('id, lat, lng, categoria')
      .eq('activo', true)
      .not('lat', 'is', null)

    if (filtros.categoria && filtros.categoria !== 'todos') {
      query = query.eq('categoria', filtros.categoria)
    }
    if (filtros.dificultad) {
      query = query.eq('dificultad', filtros.dificultad)
    }
    const busqueda = limpiarBusqueda(filtros.busqueda)
    if (busqueda) {
      query = query.ilike('titulo', `%${busqueda}%`)
    }

    // Ordenar por id no es estético: sin un orden estable, dos vueltas pueden
    // devolver la misma fila o saltarse otra.
    const { data, error } = await query
      .order('id', { ascending: true })
      .range(desde, desde + PINES_POR_VUELTA - 1)

    if (error) {
      console.error('[getPinesMapa]', error)
      return []
    }

    const vuelta = (data ?? []) as PinMapa[]
    pines.push(...vuelta)
    if (vuelta.length < PINES_POR_VUELTA) return pines
  }
}

/**
 * Los gooals geocodificados que caen dentro del recuadro visible del mapa.
 *
 * HOY NO SE USA: el mapa se los trae todos de una con getPinesMapa, porque el
 * catálogo entero cabe en memoria. Se conserva para cuando deje de caber — a
 * partir de unas decenas de miles de pines, mandar el catálogo completo a cada
 * móvil se vuelve indefendible y hay que volver a pedir por recuadro. Entonces
 * vuelven con ella el debounce, el tope y el aviso de "acerca el zoom".
 *
 *
 * Se filtra por recuadro en la base y no en el cliente: hay 3.232 filas con
 * coordenadas y traérselas todas para descartar el 95% sería absurdo. El
 * índice gooals_v2_mapa_idx sobre (lat, lng) cubre esta consulta.
 *
 * El select es corto a propósito: en una consulta caben cientos de filas y en
 * un pin no se pinta ni la descripción ni la imagen.
 */
export async function getGooalsMapa(filtros: FiltrosMapa): Promise<{
  gooals: GooalMapa[]
  truncado: boolean
}> {
  const service = createServiceRoleClient()

  let query = service
    .from('gooals_v2')
    .select('id, titulo, categoria, dificultad, puntos, ciudad, pais, lat, lng')
    .eq('activo', true)
    .not('lat', 'is', null)
    .gte('lat', filtros.sur)
    .lte('lat', filtros.norte)
    .gte('lng', filtros.oeste)
    .lte('lng', filtros.este)

  if (filtros.categoria && filtros.categoria !== 'todos') {
    query = query.eq('categoria', filtros.categoria)
  }
  if (filtros.dificultad) {
    query = query.eq('dificultad', filtros.dificultad)
  }
  const busqueda = limpiarBusqueda(filtros.busqueda)
  if (busqueda) {
    query = query.ilike('titulo', `%${busqueda}%`)
  }

  // Uno de más que el tope, para distinguir "hay justo 500" de "hay más de 500"
  // sin pagar un count sobre miles de filas.
  const { data, error } = await query
    .order('puntos', { ascending: false })
    .order('id', { ascending: true })
    .limit(GOOALS_MAPA_MAX + 1)

  if (error) {
    console.error('[getGooalsMapa]', error)
    return { gooals: [], truncado: false }
  }

  const filas = (data ?? []) as GooalMapa[]
  return {
    gooals: filas.slice(0, GOOALS_MAPA_MAX),
    truncado: filas.length > GOOALS_MAPA_MAX,
  }
}

/**
 * Un gooal completo por id.
 *
 * El mapa solo trae nueve columnas por pin, y la ficha necesita la fila entera.
 * Se pide al pulsar, que es una vez, en vez de engordar la consulta del mapa
 * con descripciones e imágenes para cientos de pines que nadie va a abrir.
 */
export async function getGooalV2(id: string): Promise<GooalV2 | null> {
  const service = createServiceRoleClient()
  const { data } = await service
    .from('gooals_v2')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return (data as GooalV2 | null) ?? null
}

/**
 * Qué gooals tiene ya el usuario, para pintar los checks del grid.
 *
 * Va aparte del catálogo porque no depende de los filtros ni de la página: se
 * pide una vez al montar Explorar y vale para todas las páginas siguientes.
 */
export async function getMisEstadosGooals(): Promise<Record<string, EstadoUserGooal>> {
  const userId = await getUserId()
  if (!userId) return {}

  const service = createServiceRoleClient()
  const { data } = await service
    .from('user_gooals')
    .select('gooal_id, estado')
    .eq('user_id', userId)

  const misEstados: Record<string, EstadoUserGooal> = {}
  for (const fila of (data ?? []) as { gooal_id: string; estado: EstadoUserGooal }[]) {
    misEstados[fila.gooal_id] = fila.estado
  }
  return misEstados
}

/**
 * Propone un gooal que no está en el catálogo. Queda pendiente hasta que un
 * admin lo apruebe desde /admin; al aprobarse se publica sin acreditar a nadie.
 */
export async function sugerirGooal(
  titulo: string,
  categoria: string,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'Necesitas iniciar sesión.' }

  const limpio = titulo.trim().replace(/\s+/g, ' ')
  if (limpio.length < 6) return { ok: false, error: 'Escribe un poco más para entenderlo.' }
  if (limpio.length > 160) return { ok: false, error: 'Hazlo más corto, máximo 160 caracteres.' }

  const service = createServiceRoleClient()

  // Si ya está en el catálogo no es una sugerencia: es que no lo ha encontrado.
  const { data: yaExiste } = await service
    .from('gooals_v2')
    .select('id')
    .ilike('titulo', limpio)
    .limit(1)
  if (yaExiste && yaExiste.length > 0) {
    return { ok: false, error: 'Ese gooal ya está en el catálogo, búscalo por otro nombre.' }
  }

  // Tope diario: modera el spam sin necesidad de vigilar la cola a mano.
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await service
    .from('gooal_sugerencias')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', desde)
  if ((count ?? 0) >= SUGERENCIAS_POR_DIA) {
    return { ok: false, error: `Puedes sugerir ${SUGERENCIAS_POR_DIA} gooals al día. Vuelve mañana.` }
  }

  const { error } = await service.from('gooal_sugerencias').insert({
    user_id: userId,
    titulo: limpio,
    categoria: normalizarCategoriaGooal(categoria),
  })

  if (error) {
    // Choca con gooal_sugerencias_unica_idx: ya la mandó él mismo.
    if (error.code === '23505') {
      return { ok: false, error: 'Ya habías sugerido ese gooal. Lo estamos revisando.' }
    }
    console.error('[sugerirGooal]', error)
    return { ok: false, error: 'No hemos podido guardar tu sugerencia.' }
  }

  return { ok: true }
}

/** Detalle social de un gooal: cuánta gente lo ha logrado y quiénes fueron los últimos. */
export async function getDetalleGooal(gooalId: string): Promise<{
  vecesCompletado: number
  ultimos: UsuarioMini[]
}> {
  const service = createServiceRoleClient()

  const { data: completados, count } = await service
    .from('user_gooals')
    .select('user_id, completado_at', { count: 'exact' })
    .eq('gooal_id', gooalId)
    .eq('estado', 'completado')
    .order('completado_at', { ascending: false })
    .limit(8)

  const userIds = [...new Set(((completados ?? []) as { user_id: string }[]).map(c => c.user_id))]
  if (userIds.length === 0) return { vecesCompletado: count ?? 0, ultimos: [] }

  const { data: perfiles } = await service.from('profiles').select(PERFIL_CAMPOS).in('id', userIds)
  const porId = new Map(((perfiles ?? []) as PerfilRow[]).map(p => [p.id, aUsuarioMini(p)]))

  return {
    vecesCompletado: count ?? 0,
    ultimos: userIds.map(id => porId.get(id)).filter((u): u is UsuarioMini => Boolean(u)),
  }
}

/** Añade un gooal del catálogo a la lista del usuario. Idempotente. */
export async function anadirGooal(gooalId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUserId()
    if (!userId) return { success: false, error: 'No autenticado' }

    const service = createServiceRoleClient()

    const { data: gooal } = await service
      .from('gooals_v2')
      .select('id, activo')
      .eq('id', gooalId)
      .maybeSingle()

    if (!gooal || !(gooal as { activo: boolean }).activo) {
      return { success: false, error: 'Este gooal ya no está disponible.' }
    }

    // El índice único (user_id, gooal_id) hace que volver a añadirlo no cree un
    // duplicado ni pise un completado que ya existiera.
    const { error } = await service
      .from('user_gooals')
      .upsert(
        { user_id: userId, gooal_id: gooalId, estado: 'pendiente' },
        { onConflict: 'user_id,gooal_id', ignoreDuplicates: true }
      )

    if (error) {
      console.error('[anadirGooal]', error)
      return { success: false, error: 'No se pudo añadir el gooal.' }
    }

    revalidatePath('/mis-gooals')
    return { success: true }
  } catch (e) {
    console.error('[anadirGooal]', e)
    return { success: false, error: 'No se pudo añadir el gooal.' }
  }
}

/** Quita un gooal pendiente de la lista. No toca los ya completados. */
export async function quitarGooal(gooalId: string): Promise<{ success: boolean }> {
  const userId = await getUserId()
  if (!userId) return { success: false }

  const service = createServiceRoleClient()
  await service
    .from('user_gooals')
    .delete()
    .eq('user_id', userId)
    .eq('gooal_id', gooalId)
    .eq('estado', 'pendiente')

  revalidatePath('/mis-gooals')
  return { success: true }
}

// ── Mis gooals ───────────────────────────────────────────────

export async function getMisGooals(): Promise<{
  pendientes: UserGooalConGooal[]
  completados: UserGooalConGooal[]
}> {
  const userId = await getUserId()
  if (!userId) return { pendientes: [], completados: [] }

  const service = createServiceRoleClient()

  const { data: filas } = await service
    .from('user_gooals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const mios = (filas ?? []) as UserGooal[]
  if (mios.length === 0) return { pendientes: [], completados: [] }

  const { data: gooals } = await service
    .from('gooals_v2')
    .select('*')
    .in('id', [...new Set(mios.map(m => m.gooal_id))])

  const porId = new Map(((gooals ?? []) as GooalV2[]).map(g => [g.id, g]))

  // Un gooal borrado del catálogo dejaría la fila sin par: se descarta en vez
  // de romper la lista entera.
  const conGooal = mios
    .map(m => ({ ...m, gooal: porId.get(m.gooal_id) }))
    .filter((m): m is UserGooalConGooal => Boolean(m.gooal))

  return {
    pendientes: conGooal.filter(m => m.estado === 'pendiente'),
    completados: conGooal
      .filter(m => m.estado === 'completado')
      .sort((a, b) => (b.completado_at ?? b.created_at).localeCompare(a.completado_at ?? a.created_at)),
  }
}

const PRUEBA_NO_VALIDA = 'No hemos podido verificar tu prueba. Vuelve a subir la foto o el vídeo.'

/**
 * Comprueba que la prueba es de verdad una subida de este usuario para este
 * gooal. Devuelve el mensaje de error, o null si vale.
 *
 * Además de la URL se mira el fichero en Storage: que exista y que su peso y su
 * tipo cumplan los límites. Los límites del navegador los puede saltar
 * cualquiera que llame a la Server Action a mano.
 */
async function validarPrueba(
  service: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  gooalId: string,
  fotoUrl: string | null,
  videoUrl: string | null
): Promise<string | null> {
  if (Boolean(fotoUrl) === Boolean(videoUrl)) return 'Necesitas subir una foto o un vídeo.'

  const tipoEsperado: TipoPrueba = fotoUrl ? 'foto' : 'video'
  const ruta = rutaDePrueba((fotoUrl ?? videoUrl) as string, userId, gooalId)
  if (!ruta) return PRUEBA_NO_VALIDA

  const { data: fichero, error } = await service.storage.from(BUCKET_PRUEBAS).info(ruta)
  if (error || !fichero) return PRUEBA_NO_VALIDA

  if (tipoDePrueba(fichero.contentType ?? '') !== tipoEsperado) return PRUEBA_NO_VALIDA
  return errorDeArchivo({ type: fichero.contentType ?? '', size: fichero.size ?? 0 })
}

/**
 * Completa un gooal: guarda la prueba, recalcula puntos y nivel, publica en el
 * muro y actualiza el contador del catálogo. La foto/vídeo ya viene subida a
 * 'gooals-media' desde el cliente (el server action tiene límite de body).
 */
export async function completarGooal(
  gooalId: string,
  fotoUrl: string | null,
  videoUrl: string | null,
  descripcion: string | null
): Promise<{
  success: boolean
  error?: string
  puntosGanados?: number
  puntosTotales?: number
  nivel?: string
  subioDeNivel?: boolean
}> {
  try {
    const userId = await getUserId()
    if (!userId) return { success: false, error: 'No autenticado' }

    const service = createServiceRoleClient()

    const errorPrueba = await validarPrueba(service, userId, gooalId, fotoUrl, videoUrl)
    if (errorPrueba) return { success: false, error: errorPrueba }

    const { data: gooalRow } = await service
      .from('gooals_v2')
      .select('id, puntos')
      .eq('id', gooalId)
      .maybeSingle()

    if (!gooalRow) return { success: false, error: 'Este gooal ya no existe.' }
    const puntosGanados = (gooalRow as { puntos: number | null }).puntos ?? 1

    const { data: perfilAntes } = await service
      .from('profiles')
      .select('puntos_totales')
      .eq('id', userId)
      .maybeSingle()
    const nivelAntes = calcularNivel(
      (perfilAntes as { puntos_totales: number | null } | null)?.puntos_totales ?? 0
    ).nombre

    const { data: userGooal, error: upsertError } = await service
      .from('user_gooals')
      .upsert(
        {
          user_id: userId,
          gooal_id: gooalId,
          estado: 'completado',
          foto_url: fotoUrl,
          video_url: videoUrl,
          descripcion: descripcion?.trim() || null,
          puntos_ganados: puntosGanados,
          completado_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,gooal_id' }
      )
      .select('id')
      .single()

    if (upsertError || !userGooal) {
      console.error('[completarGooal] upsert:', upsertError)
      return { success: false, error: 'No se pudo guardar el gooal.' }
    }

    const { puntos, nivel } = await sincronizarPuntos(service, userId)

    // El post del muro es la cara pública del completado: una fila por gooal,
    // así que se reemplaza si el usuario vuelve a subir prueba del mismo.
    const userGooalId = (userGooal as { id: string }).id
    await service.from('muro_posts').delete().eq('user_gooal_id', userGooalId)
    const { error: postError } = await service.from('muro_posts').insert({
      user_id: userId,
      gooal_id: gooalId,
      user_gooal_id: userGooalId,
      foto_url: fotoUrl,
      video_url: videoUrl,
      descripcion: descripcion?.trim() || null,
      puntos: puntosGanados,
      likes: 0,
    })
    // No se aborta: el gooal y sus puntos ya están guardados, y deshacerlos por
    // un fallo del muro sería peor. Pero se deja rastro, porque un insert que
    // falla sin avisar es justo lo que tuvo el muro roto sin que nadie lo viera.
    if (postError) console.error('[completarGooal] muro_posts:', postError)

    const { count } = await service
      .from('user_gooals')
      .select('id', { count: 'exact', head: true })
      .eq('gooal_id', gooalId)
      .eq('estado', 'completado')
    await service.from('gooals_v2').update({ veces_completado: count ?? 0 }).eq('id', gooalId)

    revalidatePath('/mis-gooals')
    revalidatePath('/muro')
    revalidatePath('/perfil')

    return {
      success: true,
      puntosGanados,
      puntosTotales: puntos,
      nivel,
      subioDeNivel: nivel !== nivelAntes,
    }
  } catch (e) {
    console.error('[completarGooal]', e)
    return { success: false, error: 'No se pudo completar el gooal.' }
  }
}

/** "Ya lo hice": añade el gooal a la lista y lo completa en un solo paso. */
export async function anadirYCompletarGooal(
  gooalId: string,
  fotoUrl: string | null,
  videoUrl: string | null,
  descripcion: string | null
) {
  const anadido = await anadirGooal(gooalId)
  if (!anadido.success) return { success: false as const, error: anadido.error }
  return completarGooal(gooalId, fotoUrl, videoUrl, descripcion)
}

// ── Seguidores ───────────────────────────────────────────────

export async function seguirUsuario(followingId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUserId()
    if (!userId) return { success: false, error: 'No autenticado' }
    if (userId === followingId) return { success: false, error: 'No puedes seguirte a ti mismo.' }

    const service = createServiceRoleClient()
    const { error } = await service
      .from('follows')
      .upsert(
        { follower_id: userId, following_id: followingId },
        { onConflict: 'follower_id,following_id', ignoreDuplicates: true }
      )

    if (error) {
      console.error('[seguirUsuario]', error)
      return { success: false, error: 'No se pudo seguir a esta persona.' }
    }

    await Promise.all([
      sincronizarContadoresSociales(service, userId),
      sincronizarContadoresSociales(service, followingId),
    ])

    revalidatePath('/muro')
    return { success: true }
  } catch (e) {
    console.error('[seguirUsuario]', e)
    return { success: false, error: 'No se pudo seguir a esta persona.' }
  }
}

export async function dejarDeSeguir(followingId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUserId()
    if (!userId) return { success: false, error: 'No autenticado' }

    const service = createServiceRoleClient()
    await service.from('follows').delete().eq('follower_id', userId).eq('following_id', followingId)

    await Promise.all([
      sincronizarContadoresSociales(service, userId),
      sincronizarContadoresSociales(service, followingId),
    ])

    revalidatePath('/muro')
    return { success: true }
  } catch (e) {
    console.error('[dejarDeSeguir]', e)
    return { success: false, error: 'No se pudo dejar de seguir.' }
  }
}

/** Lista de seguidores o de seguidos, para el modal del perfil. */
export async function getListaSeguidores(
  userId: string,
  tipo: 'seguidores' | 'siguiendo'
): Promise<UsuarioMini[]> {
  const service = createServiceRoleClient()

  const { data } = await service
    .from('follows')
    .select(tipo === 'seguidores' ? 'follower_id' : 'following_id')
    .eq(tipo === 'seguidores' ? 'following_id' : 'follower_id', userId)
    .limit(200)

  const ids = ((data ?? []) as Record<string, string>[])
    .map(f => (tipo === 'seguidores' ? f.follower_id : f.following_id))
    .filter(Boolean)

  if (ids.length === 0) return []

  const { data: perfiles } = await service.from('profiles').select(PERFIL_CAMPOS).in('id', ids)
  return ((perfiles ?? []) as PerfilRow[]).map(aUsuarioMini)
}

// ── Perfil gamificado ────────────────────────────────────────

/** Perfil propio si no se pasa username; el de otra persona si se pasa. */
export async function getPerfilGamificado(username?: string): Promise<PerfilGamificado | null> {
  const viewerId = await getUserId()
  const service = createServiceRoleClient()

  const consulta = service.from('profiles').select(PERFIL_CAMPOS)
  const { data: perfil } = username
    ? await consulta.eq('username', username.replace(/^@/, '')).maybeSingle()
    : viewerId
      ? await consulta.eq('id', viewerId).maybeSingle()
      : { data: null }

  if (!perfil) return null
  const usuario = aUsuarioMini(perfil as PerfilRow)
  const esPropio = usuario.id === viewerId

  const [misGooalsRes, catalogoRes, seguidoresRes, siguiendoRes, siguiendoloRes] = await Promise.all([
    service
      .from('user_gooals')
      .select('id, gooal_id, foto_url, puntos_ganados, completado_at')
      .eq('user_id', usuario.id)
      .eq('estado', 'completado')
      .order('completado_at', { ascending: false }),
    service.from('gooals_v2').select('id, titulo, categoria').eq('activo', true),
    service.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', usuario.id),
    service.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', usuario.id),
    viewerId && !esPropio
      ? service.from('follows').select('id').eq('follower_id', viewerId).eq('following_id', usuario.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const completados = (misGooalsRes.data ?? []) as {
    id: string; gooal_id: string; foto_url: string | null
    puntos_ganados: number | null; completado_at: string | null
  }[]
  const catalogo = (catalogoRes.data ?? []) as { id: string; titulo: string; categoria: string }[]
  const porId = new Map(catalogo.map(g => [g.id, g]))

  const hechosPorCategoria = new Map<string, number>()
  for (const c of completados) {
    const cat = porId.get(c.gooal_id)?.categoria
    if (cat) hechosPorCategoria.set(cat, (hechosPorCategoria.get(cat) ?? 0) + 1)
  }
  const totalPorCategoria = new Map<string, number>()
  for (const g of catalogo) {
    totalPorCategoria.set(g.categoria, (totalPorCategoria.get(g.categoria) ?? 0) + 1)
  }

  const stats: StatCategoria[] = CATEGORIAS.map(categoria => {
    const hechos = hechosPorCategoria.get(categoria) ?? 0
    const total = totalPorCategoria.get(categoria) ?? 0
    return {
      categoria,
      completados: hechos,
      total,
      porcentaje: total > 0 ? Math.round((hechos / total) * 100) : 0,
    }
  })

  const conFoto = completados.filter(c => c.foto_url).slice(0, 30)
  const { data: posts } = conFoto.length > 0
    ? await service.from('muro_posts').select('id, user_gooal_id').in('user_gooal_id', conFoto.map(c => c.id))
    : { data: [] }
  const postPorUserGooal = new Map(
    ((posts ?? []) as { id: string; user_gooal_id: string | null }[])
      .filter(p => p.user_gooal_id)
      .map(p => [p.user_gooal_id as string, p.id])
  )

  return {
    usuario,
    puntos: usuario.puntos_totales ?? 0,
    seguidores: seguidoresRes.count ?? 0,
    siguiendo: siguiendoRes.count ?? 0,
    siguiendolo: esPropio ? null : Boolean(siguiendoloRes.data),
    esPropio,
    stats,
    recientes: conFoto.map(c => ({
      postId: postPorUserGooal.get(c.id) ?? null,
      userGooalId: c.id,
      foto_url: c.foto_url,
      titulo: porId.get(c.gooal_id)?.titulo ?? 'Gooal',
      puntos: c.puntos_ganados ?? 0,
      completado_at: c.completado_at,
    })),
  }
}

/** Un post concreto del muro, para abrirlo desde el perfil. */
export async function getMuroPost(postId: string): Promise<MuroPostFeed | null> {
  const viewerId = await getUserId()
  const service = createServiceRoleClient()

  const { data: post } = await service.from('muro_posts').select('*').eq('id', postId).maybeSingle()
  if (!post) return null

  const fila = post as {
    id: string; user_id: string; gooal_id: string | null; created_at: string
    foto_url: string | null; video_url: string | null; descripcion: string | null
    puntos: number | null; likes: number | null
  }

  const [perfilRes, gooalRes, likeRes] = await Promise.all([
    service.from('profiles').select(PERFIL_CAMPOS).eq('id', fila.user_id).maybeSingle(),
    fila.gooal_id
      ? service.from('gooals_v2').select('*').eq('id', fila.gooal_id).maybeSingle()
      : Promise.resolve({ data: null }),
    viewerId
      ? service.from('muro_likes').select('id').eq('post_id', postId).eq('user_id', viewerId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return {
    id: fila.id,
    user_id: fila.user_id,
    created_at: fila.created_at,
    foto_url: fila.foto_url,
    video_url: fila.video_url,
    descripcion: fila.descripcion,
    puntos: fila.puntos ?? 0,
    likes: fila.likes ?? 0,
    liked: Boolean(likeRes.data),
    autor: perfilRes.data
      ? aUsuarioMini(perfilRes.data as PerfilRow)
      : { id: fila.user_id, nombre: 'Usuario', username: null, foto_perfil_url: null },
    gooal: (gooalRes.data as GooalV2 | null) ?? null,
  }
}

/** Gooals sugeridos en el onboarding, priorizando las categorías elegidas. */
export async function getGooalsOnboarding(categorias: string[], cantidad = 8): Promise<GooalV2[]> {
  const service = createServiceRoleClient()

  const consulta = service.from('gooals_v2').select('*').eq('activo', true)
  const { data } = categorias.length > 0
    ? await consulta.in('categoria', categorias).limit(cantidad * 3)
    : await consulta.limit(cantidad * 3)

  const gooals = (data ?? []) as GooalV2[]

  // Sin gooals de sus categorías, mejor enseñar algo del catálogo que dejar una
  // pantalla vacía en mitad del onboarding.
  if (gooals.length === 0 && categorias.length > 0) {
    const { data: fallback } = await service
      .from('gooals_v2').select('*').eq('activo', true).limit(cantidad)
    return (fallback ?? []) as GooalV2[]
  }

  for (let i = gooals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[gooals[i], gooals[j]] = [gooals[j], gooals[i]]
  }
  return gooals.slice(0, cantidad)
}
