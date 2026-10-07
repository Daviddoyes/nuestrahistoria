'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { calcularNivel } from '@/lib/niveles'
import { CATEGORIAS, contarPorCategoria, normalizarCategoriaGooal } from '@/lib/gooals'
import { limpiarBusqueda } from '@/lib/busqueda'
import { amigosDe, puedeVerLaFoto, VISIBILIDADES } from '@/lib/permisos'
import {
  BUCKET_LOGROS, errorDeArchivo, rutaDeRecuerdo, tipoDeRecuerdo, type TipoRecuerdo,
} from '@/lib/recuerdo-media'
import type {
  GooalV2, MuroPostFeed, UsuarioMini,
  EstadoUserGooal, FiltrosCatalogo, FiltrosMapa, GooalMapa, FiltrosPines, PinMapa, Profile,
  PerfilCompleto, LineaPerfil, GooalResumen, VisibilidadFoto, ResumenInicio,
  SugerenciasInicio, GooalCerca,
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

/**
 * Recuenta gooals_v2.veces_completado: cuánta gente lo ha conseguido.
 *
 * Es el número que sale en la ficha y el que ordena Explorar, así que tiene que
 * cuadrar con lo que dice el detalle.
 *
 * Se llama desde los TRES sitios que pueden moverlo: conseguir con foto,
 * conseguir sin foto y quitar de la lista. Si se olvida uno, el número se queda
 * alto para siempre y nadie se entera.
 */
async function sincronizarVecesConseguido(
  service: ReturnType<typeof createServiceRoleClient>,
  gooalId: string
): Promise<void> {
  const { count } = await service
    .from('user_gooals')
    .select('id', { count: 'exact', head: true })
    .eq('gooal_id', gooalId)
    .eq('estado', 'completado')
  await service.from('gooals_v2').update({ veces_completado: count ?? 0 }).eq('id', gooalId)
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

/**
 * ¿Sigue esta persona a alguien? Solo para el mensaje del muro vacío.
 *
 * El muro enseña tus posts MÁS los de quien sigues, así que vacío puede
 * significar dos cosas distintas y el mensaje tiene que decir la que es.
 */
export async function sigoAAlguien(): Promise<boolean> {
  const userId = await getUserId()
  if (!userId) return false
  const { count } = await createServiceRoleClient()
    .from('follows')
    .select('following_id', { count: 'exact', head: true })
    .eq('follower_id', userId)
  return (count ?? 0) > 0
}

/**
 * Se queda con los posts que quien mira PUEDE VER.
 *
 * ── DÓNDE VIVE EL PERMISO ─────────────────────────────────
 *
 * En la fila de `user_gooals`, que es donde la persona lo eligió, y NO en el
 * post. Se podría copiar a `muro_posts` y filtrar por ahí, que sería una
 * consulta menos; pero entonces la misma decisión viviría en dos sitios, y el
 * día que no coincidan gana la equivocada sin que nadie se entere. Así, cambiar
 * quién ve la foto se nota en el muro al instante y no hay nada que sincronizar.
 *
 * ── LO QUE NO SE PUEDE COMPROBAR, NO SE ENSEÑA ────────────
 *
 * Un post sin `user_gooal_id`, o cuya fila ya no está, o cuya fila es de otra
 * persona distinta a la que firma el post, se cae. No es un caso teórico que
 * convenga resolver "mostrando por si acaso": si no se puede averiguar de quién
 * es el permiso, enseñarlo es apostar con la foto de alguien. Se deja rastro en
 * el log, porque un post que desaparece sin explicación es un misterio caro.
 *
 * Una sola consulta de amistades para toda la lista, como en el perfil.
 */
async function filtrarPostsVisibles<T extends { id: string; user_id: string; user_gooal_id: string | null }>(
  service: ReturnType<typeof createServiceRoleClient>,
  quienMira: string | null,
  filas: T[]
): Promise<T[]> {
  if (filas.length === 0) return []

  const ids = [...new Set(filas.map(p => p.user_gooal_id).filter((id): id is string => Boolean(id)))]
  const { data, error } = ids.length
    ? await service.from('user_gooals').select('id, user_id, visibilidad').in('id', ids)
    : { data: [], error: null }

  if (error) {
    // Sin permisos no se puede decidir, y ante la duda no se enseña nada. Un
    // muro vacío por un fallo de red es malo; enseñar fotos privadas es peor.
    console.error('[muro] no se pudieron leer los permisos', error)
    return []
  }

  const permisos = new Map(
    ((data ?? []) as { id: string; user_id: string; visibilidad: VisibilidadFoto | null }[])
      .map(f => [f.id, f])
  )
  const amigos = await amigosDe(quienMira)

  return filas.filter(post => {
    const permiso = post.user_gooal_id ? permisos.get(post.user_gooal_id) : null
    if (!permiso || permiso.user_id !== post.user_id) {
      console.error('[muro] post sin permiso averiguable, no se enseña:', post.id)
      return false
    }
    return puedeVerLaFoto({
      quienMira,
      duenio: permiso.user_id,
      // Una fila sin nada escrito se trata como 'amigos', el valor por defecto
      // de la columna: ante la duda, lo prudente.
      visibilidad: permiso.visibilidad ?? 'amigos',
      amigos,
    })
  })
}

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

  const todas = (posts ?? []) as {
    id: string; user_id: string; gooal_id: string | null; user_gooal_id: string | null; created_at: string
    foto_url: string | null; video_url: string | null; descripcion: string | null
    puntos: number | null; likes: number | null
  }[]

  // Se filtra ANTES de ir a buscar perfiles, gooals y likes: lo que no se va a
  // enseñar no se busca. Puede devolver menos de `limite` posts, y está bien:
  // el muro no tiene paginación, así que no hay ninguna cuenta que descuadre.
  const filas = await filtrarPostsVisibles(service, userId, todas)
  if (filas.length === 0) return []

  const gooalIds = [...new Set(filas.map(p => p.gooal_id).filter((id): id is string => Boolean(id)))]

  const [perfilesRes, gooalsRes, misLikesRes] = await Promise.all([
    service.from('profiles').select(PERFIL_CAMPOS).in('id', autorIds),
    // SIN filtro de estado, a propósito. Un post del muro es algo que alguien ya
    // conquistó: si su gooal pasa a borrador, el post no puede quedarse sin
    // título ni desaparecer. No añadir .eq('estado', 'verificado') aquí.
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
    userGooalId: p.user_gooal_id ?? null,
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

  // No se le da like a lo que no puedes ver. Sin esto, con el id de un post
  // basta para tocar el contador de algo que no se te enseña nunca.
  const { data: post } = await service
    .from('muro_posts').select('id, user_id, user_gooal_id').eq('id', postId).maybeSingle()
  if (!post) return { liked: false, likes: 0 }
  const [puede] = await filtrarPostsVisibles(service, userId, [post as { id: string; user_id: string; user_gooal_id: string | null }])
  if (!puede) return { liked: false, likes: 0 }

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
 * quedaba sin viajes y sin deporte, y filtrar por esas categorías
 * no daba ningún resultado.
 */
export async function getCatalogoGooals(filtros: FiltrosCatalogo = {}): Promise<{
  gooals: GooalV2[]
  hayMas: boolean
}> {
  const service = createServiceRoleClient()
  const pagina = Math.max(0, filtros.pagina ?? 0)
  const desde = pagina * GOOALS_POR_PAGINA

  // CATÁLOGO: solo lo verificado. Aquí entra también la búsqueda de Explorar.
  let query = service
    .from('gooals_v2')
    .select('*')
    .eq('activo', true)
    .eq('estado', 'verificado')

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
    // CATÁLOGO: solo lo verificado. Un borrador no debe asomar como pin.
    let query = service
      .from('gooals_v2')
      .select('id, lat, lng, categoria')
      .eq('activo', true)
      .eq('estado', 'verificado')
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
    // CATÁLOGO: solo lo verificado, igual que getPinesMapa.
    .eq('estado', 'verificado')
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
 *
 * CATÁLOGO: solo devuelve gooals verificados y activos. Hoy la llaman el popup
 * del mapa y su ficha, que abren gooals del catálogo. El perfil y el muro NO
 * pasan por aquí: traen el gooal en su propia consulta, sin filtro de estado,
 * para que lo que alguien ya tiene no desaparezca. Si algún día hay que abrir
 * desde el perfil un gooal que pasó a borrador, no uses esta función.
 */
export async function getGooalV2(id: string): Promise<GooalV2 | null> {
  const service = createServiceRoleClient()
  const { data } = await service
    .from('gooals_v2')
    .select('*')
    .eq('id', id)
    .eq('activo', true)
    .eq('estado', 'verificado')
    .maybeSingle()
  return (data as GooalV2 | null) ?? null
}

/**
 * El gooal de UNA FILA concreta de la lista de alguien, para abrir su ficha
 * desde un perfil.
 *
 * Se pide por el id de la fila y SIN filtrar por estado, a propósito, porque el
 * perfil tampoco filtra: lo que alguien ya tiene es suyo aunque su gooal haya
 * pasado a borrador, y la ficha tiene que poder abrirse igual. getGooalV2() no
 * sirve aquí porque exige 'verificado', y esos gooals se verían en la lista sin
 * poder abrirlos, que es la clase de fallo que no da ningún error.
 */
export async function getGooalDeLista(userGooalId: string): Promise<GooalV2 | null> {
  const service = createServiceRoleClient()
  const { data } = await service
    .from('user_gooals')
    .select('gooal:gooals_v2(*)')
    .eq('id', userGooalId)
    .maybeSingle()
  return (data as { gooal: GooalV2 | null } | null)?.gooal ?? null
}

/**
 * Qué gooals tiene ya el usuario, para pintar los checks del grid.
 *
 * Va aparte del catálogo porque no depende de los filtros ni de la página: se
 * pide una vez al montar Explorar (o el mapa) y vale para todas las páginas.
 *
 * Paginado: sin páginas se cortaba en 1.000 filas sin avisar, y quien tuviera
 * más veía como pendiente o sin marcar algo que ya había conquistado.
 */
export async function getMisEstadosGooals(): Promise<Record<string, EstadoUserGooal>> {
  const userId = await getUserId()
  if (!userId) return {}

  const filas = await listarEstados(createServiceRoleClient(), userId)

  const misEstados: Record<string, EstadoUserGooal> = {}
  for (const fila of filas) misEstados[fila.gooal_id] = fila.estado
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

  // Si ya existe no es una sugerencia nueva. Se mira TODA la tabla, borradores
  // incluidos, pero el mensaje depende de si la persona puede encontrarlo: a un
  // borrador no se le puede mandar a buscarlo al catálogo, porque no está.
  const { data: yaExisten } = await service
    .from('gooals_v2')
    .select('estado, activo')
    .ilike('titulo', limpio)
    .limit(5)
  const coincidencias = (yaExisten ?? []) as { estado: string; activo: boolean }[]
  if (coincidencias.some(g => g.estado === 'verificado' && g.activo)) {
    return { ok: false, error: 'Ese gooal ya está en el catálogo, búscalo por otro nombre.' }
  }
  if (coincidencias.length > 0) {
    return { ok: false, error: 'Ese gooal ya está propuesto y lo estamos revisando.' }
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

/**
 * Detalle social de un gooal: cuánta gente lo ha conseguido y quiénes fueron
 * los últimos.
 */
export async function getDetalleGooal(gooalId: string): Promise<{
  vecesConseguido: number
  ultimos: UsuarioMini[]
  /**
   * Si quien mira ya tiene una foto de este gooal. Lo necesita la ficha para
   * saber si puede ofrecer quitarlo: un conseguido sin foto se puede deshacer,
   * uno con foto no. Sin esto la ficha enseñaría un botón que no hace nada, o
   * escondería uno que sí hace falta — que es lo que pasaba.
   */
  tieneFoto: boolean
  /**
   * El post del muro de QUIEN MIRA para este gooal, si lo hay. Con él, la ficha
   * puede llevarte a tus propios comentarios: antes al perfil se llegaba por el
   * post y ahora se llega por la ficha, y sin esto los comentarios de lo tuyo
   * se quedaban sin ninguna puerta desde el perfil.
   */
  miPostId: string | null
}> {
  const service = createServiceRoleClient()
  const viewerId = await getUserId()

  const { data: conseguidos, count } = await service
    .from('user_gooals')
    .select('user_id, completado_at', { count: 'exact' })
    .eq('gooal_id', gooalId)
    .eq('estado', 'completado')
    .order('completado_at', { ascending: false, nullsFirst: false })
    .limit(8)

  let tieneFoto = false
  let miPostId: string | null = null
  if (viewerId) {
    const { data: mia } = await service
      .from('user_gooals')
      .select('foto_url, video_url')
      .eq('user_id', viewerId).eq('gooal_id', gooalId)
      .maybeSingle()
    const fila = mia as { foto_url: string | null; video_url: string | null } | null
    tieneFoto = Boolean(fila?.foto_url || fila?.video_url)

    const { data: post } = await service
      .from('muro_posts')
      .select('id')
      .eq('user_id', viewerId).eq('gooal_id', gooalId)
      .maybeSingle()
    miPostId = (post as { id: string } | null)?.id ?? null
  }

  const userIds = [...new Set(((conseguidos ?? []) as { user_id: string }[]).map(c => c.user_id))]
  if (userIds.length === 0) return { vecesConseguido: count ?? 0, ultimos: [], tieneFoto, miPostId }

  const { data: perfiles } = await service.from('profiles').select(PERFIL_CAMPOS).in('id', userIds)
  const porId = new Map(((perfiles ?? []) as PerfilRow[]).map(p => [p.id, aUsuarioMini(p)]))

  return {
    vecesConseguido: count ?? 0,
    ultimos: userIds.map(id => porId.get(id)).filter((u): u is UsuarioMini => Boolean(u)),
    tieneFoto,
    miPostId,
  }
}

/** Añade un gooal del catálogo a la lista del usuario. Idempotente. */
export async function anadirGooal(gooalId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUserId()
    if (!userId) return { success: false, error: 'No autenticado' }

    const service = createServiceRoleClient()

    // CATÁLOGO: solo se añade lo que el catálogo enseña. Añadir se hace desde
    // Explorar o el mapa, así que un borrador aquí sería una llamada a mano.
    const { data: gooal } = await service
      .from('gooals_v2')
      .select('id, activo, estado')
      .eq('id', gooalId)
      .maybeSingle()

    const fila = gooal as { activo: boolean; estado: string } | null
    if (!fila || !fila.activo || fila.estado !== 'verificado') {
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

    revalidatePath('/perfil')
    return { success: true }
  } catch (e) {
    console.error('[anadirGooal]', e)
    return { success: false, error: 'No se pudo añadir el gooal.' }
  }
}

/**
 * "Ya lo hice, pero no tengo foto": deja el gooal CONSEGUIDO, con sus puntos.
 *
 * ── POR QUÉ DA PUNTOS SIN FOTO ────────────────────────────
 *
 * Porque la foto nunca fue una prueba. Nadie comprueba que ese Taj Mahal sea
 * tuyo: era una barrera, no una verificación. Los puntos los da el gooal
 * conseguido; la foto es el recuerdo.
 *
 * Esto sustituye al estado 'vivido', que duró dos días y daba cero puntos.
 *
 * ── LO QUE NO HACE ────────────────────────────────────────
 *
 * NO publica en el muro. Sin foto no hay nada que enseñar, y además: si marcar
 * sin foto publicara, cualquiera que deslice doscientas veces en Descubrir
 * entierra el muro de todos los demás.
 *
 * NO BAJA UN CONSEGUIDO. Si ya lo tiene conseguido con foto, esta acción no
 * puede borrarle la prueba: lo impide el filtro de estado del update, no un
 * `if` de la pantalla — una pantalla se puede saltar.
 */
export async function conseguirSinFoto(gooalId: string): Promise<{
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

    // El mismo portero que anadirGooal: no se consigue lo que el catálogo no enseña.
    const { data: fila } = await service
      .from('gooals_v2')
      .select('id, puntos, estado, activo')
      .eq('id', gooalId)
      .maybeSingle()

    const gooal = fila as { puntos: number | null; estado: string; activo: boolean } | null
    if (!gooal || !gooal.activo || gooal.estado !== 'verificado') {
      return { success: false, error: 'Este gooal ya no está disponible.' }
    }
    const puntosGanados = gooal.puntos ?? 1

    // El nivel de antes, para saber si sube. Se mira ANTES de tocar nada.
    const { data: perfilAntes } = await service
      .from('profiles').select('puntos_totales').eq('id', userId).maybeSingle()
    const nivelAntes = calcularNivel(
      (perfilAntes as { puntos_totales: number | null } | null)?.puntos_totales ?? 0
    ).nombre

    // 1 · Si lo tenía pendiente, pasa a conseguido. El filtro de estado impide
    //     que esto toque uno que ya está conseguido y le borre la foto.
    const { data: tocadas, error: errorUpdate } = await service
      .from('user_gooals')
      .update({ estado: 'completado', puntos_ganados: puntosGanados, completado_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('gooal_id', gooalId)
      .eq('estado', 'pendiente')
      .select('id')

    if (errorUpdate) {
      console.error('[conseguirSinFoto] update:', errorUpdate)
      return { success: false, error: 'No se pudo guardar el gooal.' }
    }

    // 2 · Si no lo tenía, se crea ya conseguido. Si el índice único lo rechaza
    //     es que ya lo tiene conseguido, y entonces no hay nada que hacer.
    if ((tocadas ?? []).length === 0) {
      const { error: errorInsert } = await service.from('user_gooals').insert({
        user_id: userId, gooal_id: gooalId, estado: 'completado',
        puntos_ganados: puntosGanados, completado_at: new Date().toISOString(),
      })
      if (errorInsert) return { success: false, error: 'Ya lo tienes conseguido.' }
    }

    const { puntos, nivel } = await sincronizarPuntos(service, userId)
    await sincronizarVecesConseguido(service, gooalId)
    revalidatePath('/perfil')

    return { success: true, puntosGanados, puntosTotales: puntos, nivel, subioDeNivel: nivel !== nivelAntes }
  } catch (e) {
    console.error('[conseguirSinFoto]', e)
    return { success: false, error: 'No se pudo guardar el gooal.' }
  }
}

/**
 * Quita de la lista un gooal pendiente, o uno conseguido que NO tenga foto.
 *
 * El motivo de que un conseguido no se pudiera quitar siempre fue que se
 * perdería la prueba. Desde que se puede conseguir sin foto, hay conseguidos sin
 * nada que perder, y un toque equivocado no puede dejarte unos puntos para
 * siempre. Los que SÍ tienen foto o vídeo siguen sin poder quitarse.
 *
 * Al quitar un conseguido se recalculan los puntos: no se puede quedar con los
 * de algo que ya no tiene.
 */
export async function quitarGooal(gooalId: string): Promise<{ success: boolean }> {
  const userId = await getUserId()
  if (!userId) return { success: false }

  const service = createServiceRoleClient()
  // La condición de "sin foto" va en la consulta, no en un `if`: así no hay
  // forma de borrar una prueba llamando a esto a mano.
  await service
    .from('user_gooals')
    .delete()
    .eq('user_id', userId)
    .eq('gooal_id', gooalId)
    .in('estado', ['pendiente', 'completado'])
    .is('foto_url', null)
    .is('video_url', null)

  // Quitar un conseguido baja sus puntos y el contador del gooal. Quitar un
  // pendiente no mueve ninguno de los dos, pero recontar siempre sale más
  // barato que acordarse de cuándo sí y cuándo no.
  await sincronizarPuntos(service, userId)
  await sincronizarVecesConseguido(service, gooalId)

  revalidatePath('/perfil')
  return { success: true }
}

const SUBIDA_NO_VALIDA = 'No hemos podido guardar esa foto. Vuelve a elegirla e inténtalo otra vez.'

/**
 * Comprueba que el fichero es de verdad una subida de este usuario para este
 * gooal. Devuelve el mensaje de error, o null si vale.
 *
 * Además de la URL se mira el fichero en Storage: que exista y que su peso y su
 * tipo cumplan los límites. Los límites del navegador los puede saltar
 * cualquiera que llame a la Server Action a mano.
 */
async function validarRecuerdo(
  service: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  gooalId: string,
  fotoUrl: string | null,
  videoUrl: string | null
): Promise<string | null> {
  if (Boolean(fotoUrl) === Boolean(videoUrl)) return 'Necesitas subir una foto o un vídeo.'

  const tipoEsperado: TipoRecuerdo = fotoUrl ? 'foto' : 'video'
  const ruta = rutaDeRecuerdo((fotoUrl ?? videoUrl) as string, userId, gooalId)
  if (!ruta) return SUBIDA_NO_VALIDA

  const { data: fichero, error } = await service.storage.from(BUCKET_LOGROS).info(ruta)
  if (error || !fichero) return SUBIDA_NO_VALIDA

  if (tipoDeRecuerdo(fichero.contentType ?? '') !== tipoEsperado) return SUBIDA_NO_VALIDA
  return errorDeArchivo({ type: fichero.contentType ?? '', size: fichero.size ?? 0 })
}

/**
 * Completa un gooal: guarda la foto, recalcula puntos y nivel, publica en el
 * muro y actualiza el contador del catálogo. La foto/vídeo ya viene subida a
 * 'gooals-media' desde el cliente (el server action tiene límite de body).
 */
export async function completarGooal(
  gooalId: string,
  fotoUrl: string | null,
  videoUrl: string | null,
  descripcion: string | null,
  /**
   * Quién podrá ver la foto. Llega de la pantalla de subir, donde nace en
   * "Mis amigos". Se comprueba aquí: el tipo solo vale mientras quien llama es
   * nuestro código, y esto es una Server Action.
   */
  visibilidad: VisibilidadFoto = 'amigos'
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

    const errorRecuerdo = await validarRecuerdo(service, userId, gooalId, fotoUrl, videoUrl)
    if (errorRecuerdo) return { success: false, error: errorRecuerdo }

    if (!VISIBILIDADES.includes(visibilidad)) return { success: false, error: 'Esa opción no existe.' }

    // SIN filtro de estado, a propósito. Completar un pendiente propio tiene que
    // funcionar aunque ese gooal haya pasado a borrador después de añadirlo: lo
    // que alguien ya tiene es suyo. Lo que sí se exige es que, si NO está
    // verificado, lo tenga ya en su lista; si no, esto serviría para completar
    // borradores que el catálogo nunca le ha enseñado.
    const { data: gooalRow } = await service
      .from('gooals_v2')
      .select('id, puntos, estado, activo')
      .eq('id', gooalId)
      .maybeSingle()

    if (!gooalRow) return { success: false, error: 'Este gooal ya no existe.' }
    const gooalDatos = gooalRow as { puntos: number | null; estado: string; activo: boolean }

    if (gooalDatos.estado !== 'verificado' || !gooalDatos.activo) {
      const { data: loTiene } = await service
        .from('user_gooals')
        .select('id')
        .eq('user_id', userId)
        .eq('gooal_id', gooalId)
        .maybeSingle()
      if (!loTiene) return { success: false, error: 'Este gooal ya no está disponible.' }
    }

    const puntosGanados = gooalDatos.puntos ?? 1

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
          visibilidad,
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
    // así que se reemplaza si el usuario vuelve a subir una foto del mismo.
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

    await sincronizarVecesConseguido(service, gooalId)

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

// ── Perfil ───────────────────────────────────────────────────

/**
 * Filas por consulta al leer listas del perfil. Es el tope de PostgREST, que
 * corta en 1.000 sin avisar; ya rompió Explorar y los porcentajes del perfil.
 */
const FILAS_POR_VUELTA = 1000

/** Lo que enseña la tarjeta "en común": 4 miniaturas y 5 títulos. El resto es un número. */
/**
 * Lee una consulta entera, de 1.000 en 1.000. Quien llama debe ordenar por algo
 * que acabe en `id`: sin un orden estable, dos vueltas pueden repetir una fila o
 * saltarse otra.
 *
 * Si una vuelta falla se lanza el error en vez de devolver lo leído: un perfil
 * con la mitad de sus gooals, o un "0 en común" por un fallo de red, es un dato
 * falso que nadie detectaría.
 */
async function leerTodo<T>(
  etiqueta: string,
  pedir: (desde: number, hasta: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>
): Promise<T[]> {
  const filas: T[] = []
  for (let desde = 0; ; desde += FILAS_POR_VUELTA) {
    const { data, error } = await pedir(desde, desde + FILAS_POR_VUELTA - 1)
    if (error) {
      console.error(`[${etiqueta}]`, error)
      throw new Error(`No se pudo leer ${etiqueta}`)
    }
    const vuelta = (data ?? []) as T[]
    filas.push(...vuelta)
    if (vuelta.length < FILAS_POR_VUELTA) return filas
  }
}

type FilaUserGooal = {
  id: string
  foto_url: string | null
  video_url: string | null
  visibilidad: VisibilidadFoto | null
  puntos_ganados: number | null
  gooal: GooalResumen | null
}

/**
 * Los gooals de un usuario en un estado, con su gooal del catálogo traído en la
 * misma consulta. Así no hace falta mandar a la base listas de miles de ids con
 * `.in()`, que además de lentas acaban rompiendo por la longitud de la URL.
 *
 * NO se trae el post del muro. El perfil es una lista de títulos y al tocar uno
 * se abre su ficha, no el post: traer el post era una tabla más por cada perfil
 * para un dato que ya no se usa.
 */
function listarUserGooals(
  service: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  estado: EstadoUserGooal
): Promise<FilaUserGooal[]> {
  return leerTodo<FilaUserGooal>(`user_gooals ${estado}`, (desde, hasta) =>
    service
      .from('user_gooals')
      // SIN filtro de estado, a propósito, y así debe seguir. De aquí salen el
      // perfil propio y el ajeno: conquistados, pendientes, conteo por categoría
      // y "en común". Lo que alguien ya tiene es suyo aunque su gooal pase a
      // borrador. Filtrar por estado (o convertir este join en !inner con
      // gooals_v2.estado=eq.verificado) vaciaría el perfil de la gente.
      .select(
        'id, foto_url, video_url, visibilidad, puntos_ganados, ' +
        'gooal:gooals_v2(id, titulo, categoria, dificultad, puntos, ciudad, imagen_url)'
      )
      .eq('user_id', userId)
      .eq('estado', estado)
      // Solo lo conseguido tiene fecha propia; lo pendiente se ordena por cuándo
      // entró en la lista.
      .order(estado === 'completado' ? 'completado_at' : 'created_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: true })
      .range(desde, hasta)
  )
}

/** Solo qué gooals tiene alguien y en qué estado: lo justo para cruzar listas. */
function listarEstados(
  service: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<{ gooal_id: string; estado: EstadoUserGooal }[]> {
  return leerTodo('estados de gooals', (desde, hasta) =>
    service
      .from('user_gooals')
      .select('gooal_id, estado')
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .range(desde, hasta)
  )
}

/**
 * Los gooals que quien mira tiene en ese mismo estado. Es con lo que se marca
 * cada línea como "en común".
 *
 * Antes esto devolvía una MUESTRA (cuatro miniaturas y cinco títulos) para una
 * tarjeta aparte. Ya no: la pastilla de "En común" filtra la lista entera, y
 * para filtrar hay que saberlo de TODAS las líneas, no de las cuatro primeras.
 *
 * SIN filtro del estado del gooal, a propósito: cruza lo que cada uno ya tiene.
 * Si un gooal compartido pasa a borrador, los dos lo siguen teniendo en común.
 */
function losMiosEnEstado(
  mios: { gooal_id: string; estado: EstadoUserGooal }[] | null,
  estado: EstadoUserGooal
): Set<string> {
  if (!mios) return new Set()
  return new Set(mios.filter(m => m.estado === estado).map(m => m.gooal_id))
}

/**
 * Todo lo que pinta el perfil, en una sola llamada: el propio si no se pasa
 * username, el de otra persona si se pasa. Va junto y no en varias acciones
 * porque cada acción es un viaje al servidor y el perfil se pintaría a trozos.
 *
 * Los pendientes son públicos: se leen igual en un perfil propio que en uno ajeno.
 */
export async function getPerfil(username?: string): Promise<PerfilCompleto | null> {
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
  const idVisitante = !esPropio ? viewerId : null

  const [filasConseguidos, filasPendientes, seguidoresRes, siguiendoRes, siguiendoloRes, misEstados, amigos] = await Promise.all([
    listarUserGooals(service, usuario.id, 'completado'),
    listarUserGooals(service, usuario.id, 'pendiente'),
    service.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', usuario.id),
    service.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', usuario.id),
    idVisitante
      ? service.from('follows').select('id').eq('follower_id', idVisitante).eq('following_id', usuario.id).maybeSingle()
      : Promise.resolve({ data: null }),
    idVisitante ? listarEstados(service, idVisitante) : Promise.resolve(null),
    // UNA consulta para todo el perfil. Decide si el iconito de cámara sale o
    // no, y eso no se puede resolver fila a fila sin una consulta por fila.
    idVisitante ? amigosDe(idVisitante) : Promise.resolve(new Set<string>()),
  ])

  // La clave foránea borra la fila si se borra su gooal del catálogo; aun así se
  // descarta cualquiera que llegue sin él: mejor una casilla menos que una rota.
  const conGooal = (f: FilaUserGooal): f is FilaUserGooal & { gooal: GooalResumen } => Boolean(f.gooal)

  /**
   * Una fila de la base en una línea de la lista.
   *
   * `conseguido` decide de dónde salen los puntos: los que ganó de verdad si ya
   * lo consiguió, los que da el gooal hoy si solo lo tiene pendiente. No es lo
   * mismo: un cambio de baremo no reescribe el histórico (ver gooals_v2.puntos).
   */
  const aLineas = (filas: FilaUserGooal[], mios: Set<string>, conseguido: boolean): LineaPerfil[] =>
    filas.filter(conGooal).map(f => ({
      userGooalId: f.id,
      gooal: f.gooal,
      puntos: conseguido ? (f.puntos_ganados ?? 0) : (f.gooal.puntos ?? 0),
      enComun: mios.has(f.gooal.id),
      // Hay algo guardado Y quien mira puede verlo. La decisión la toma
      // permisos.ts y aquí no se repite: es la misma que usa el muro.
      fotoVisible: Boolean(f.foto_url || f.video_url) && puedeVerLaFoto({
        quienMira: viewerId,
        duenio: usuario.id,
        visibilidad: f.visibilidad ?? 'amigos',
        amigos,
      }),
      // Solo en tu propio perfil: en el de otra persona no hay nada que cambiar,
      // y lo que esa persona haya elegido no es asunto de quien mira.
      quienLaVe: esPropio ? (f.visibilidad ?? 'amigos') : null,
    }))

  const conseguidos = aLineas(filasConseguidos, losMiosEnEstado(misEstados, 'completado'), true)
  const pendientes = aLineas(filasPendientes, losMiosEnEstado(misEstados, 'pendiente'), false)

  return {
    usuario,
    esPropio,
    siguiendolo: esPropio ? null : Boolean(siguiendoloRes.data),
    seguidores: seguidoresRes.count ?? 0,
    siguiendo: siguiendoRes.count ?? 0,
    // Se suma desde la lista y no se lee profiles.puntos_totales: esa columna es
    // una caché, y así los puntos cuadran siempre con los gooals que se ven.
    puntos: conseguidos.reduce((suma, c) => suma + c.puntos, 0),
    conseguidos,
    pendientes,
    // Cuenta sobre lo del usuario, sin filtro de estado: sus borradores también suman.
    porCategoria: contarPorCategoria(conseguidos),
  }
}

/** Cuántos pendientes se enseñan en Inicio. El resto, en el perfil. */
const SIGUIENTES_EN_INICIO = 10

/**
 * Lo que pinta Inicio: tus tres cifras y los pendientes más recientes.
 *
 * Va aparte de getPerfil y no lo reusa: el perfil se trae TODAS tus filas con
 * su gooal para pintar dos listas enteras, y aquí hacen falta tres números y
 * diez títulos. En la pantalla de entrada, que es la que más se abre, eso
 * importa.
 */
export async function getInicio(): Promise<ResumenInicio | null> {
  const userId = await getUserId()
  if (!userId) return null
  const service = createServiceRoleClient()

  const [conseguidosRes, pendientesRes, siguientesRes, puntosFilas] = await Promise.all([
    service.from('user_gooals').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('estado', 'completado'),
    service.from('user_gooals').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('estado', 'pendiente'),
    // SIN filtro del estado del gooal, como el perfil: lo que alguien ya tiene
    // es suyo aunque su gooal haya pasado a borrador.
    service.from('user_gooals')
      .select('id, gooal:gooals_v2(id, titulo, categoria, dificultad, puntos, ciudad, imagen_url)')
      .eq('user_id', userId).eq('estado', 'pendiente')
      .order('created_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: true })
      .limit(SIGUIENTES_EN_INICIO),
    leerTodo<{ puntos_ganados: number | null }>('puntos de Inicio', (desde, hasta) =>
      service.from('user_gooals').select('puntos_ganados')
        .eq('user_id', userId).eq('estado', 'completado')
        .order('id', { ascending: true }).range(desde, hasta)),
  ])

  // El doble cast no es pereza: PostgREST tipa el join como un array aunque la
  // relación sea de uno a uno, y aquí llega un objeto. Es lo mismo que hace
  // listarUserGooals, solo que allí el tipo entra por el genérico de leerTodo.
  const filas = (siguientesRes.data ?? []) as unknown as { id: string; gooal: GooalResumen | null }[]

  return {
    conseguidos: conseguidosRes.count ?? 0,
    pendientes: pendientesRes.count ?? 0,
    puntos: puntosFilas.reduce((suma, f) => suma + (f.puntos_ganados ?? 0), 0),
    siguientes: filas
      .filter((f): f is { id: string; gooal: GooalResumen } => Boolean(f.gooal))
      .map(f => ({ userGooalId: f.id, gooal: f.gooal })),
  }
}

/** Cuántos se enseñan en cada tira de Inicio. */
const EN_UNA_TIRA = 12

/**
 * Un número entre 0 y 1 a partir de un texto. Siempre el mismo para el mismo
 * texto, así que sirve para barajar igual durante todo un día y distinto al
 * siguiente, sin guardar nada en ninguna parte.
 */
function azarEstable(semilla: string): number {
  let h = 2166136261
  for (let i = 0; i < semilla.length; i++) {
    h ^= semilla.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}

/**
 * "De lo que te interesa": gooals de las categorías que elegiste en el alta.
 *
 * ── ESTO NO ES UNA RECOMENDACIÓN, Y NO LO DISIMULA ────────
 *
 * No hay con qué recomendar: no hay datos de uso de los que aprender, así que
 * cualquier "porque te puede gustar" sería inventado. Lo que hay es lo que
 * dijiste en el alta, y con eso se hace lo honesto: coger de tus categorías,
 * quitar lo que ya tienes, y barajar.
 *
 * Dos detalles que no son caprichos:
 *
 * 1. BARAJADO ESTABLE DURANTE EL DÍA. Con un orden fijo la pantalla parecería
 *    muerta; cambiando en cada recarga, no podrías volver a lo que viste hace un
 *    minuto. Se baraja con tu id y la fecha, y no se guarda nada.
 * 2. REPARTIDO, UNO DE CADA CATEGORÍA POR TURNO. El catálogo está escorado: de
 *    los 221 gooals con foto, 160 son de viajes. Al azar puro saldrían quince
 *    viajes seguidos y parecería que la app solo sabe de viajar. Se coge de cada
 *    categoría por separado y se intercala.
 */
export async function getSugerencias(): Promise<SugerenciasInicio> {
  const userId = await getUserId()
  if (!userId) return { gooals: [], categorias: [] }
  const service = createServiceRoleClient()

  const { data: perfil } = await service.from('profiles').select('intereses').eq('id', userId).maybeSingle()
  const declarados = ((perfil as { intereses: unknown } | null)?.intereses ?? []) as unknown[]
  // Desde el 7-10-2026 los intereses SON las categorías. Se filtra igualmente:
  // si quedara alguno del vocabulario viejo, se descarta en vez de colarse como
  // una categoría que no existe y dejar la consulta sin resultados.
  const categorias = CATEGORIAS.filter(c => declarados.includes(c))
  const aBuscar = categorias.length > 0 ? categorias : CATEGORIAS

  const mios = new Set((await listarEstados(service, userId)).map(f => f.gooal_id))
  const hoy = new Date().toISOString().slice(0, 10)

  // De cada categoría por separado, empezando cada día por un sitio distinto.
  const porCategoria = await Promise.all(aBuscar.map(async categoria => {
    const { count } = await service.from('gooals_v2')
      .select('id', { count: 'exact', head: true })
      .eq('activo', true).eq('estado', 'verificado').eq('categoria', categoria)

    const total = count ?? 0
    if (total === 0) return [] as GooalResumen[]
    const desde = total > EN_UNA_TIRA
      ? Math.floor(azarEstable(userId + hoy + categoria) * (total - EN_UNA_TIRA))
      : 0

    const { data } = await service.from('gooals_v2')
      .select('id, titulo, categoria, dificultad, puntos, ciudad, imagen_url')
      .eq('activo', true).eq('estado', 'verificado').eq('categoria', categoria)
      .order('id', { ascending: true })
      .range(desde, desde + EN_UNA_TIRA - 1)

    return ((data ?? []) as GooalResumen[]).filter(g => !mios.has(g.id))
  }))

  // Intercalado: uno de cada categoría por turno. Así nunca salen dos seguidos
  // de la misma mientras queden de otras.
  const gooals: GooalResumen[] = []
  for (let vuelta = 0; gooals.length < EN_UNA_TIRA; vuelta++) {
    let quedaba = false
    for (const lista of porCategoria) {
      if (vuelta >= lista.length) continue
      quedaba = true
      gooals.push(lista[vuelta])
      if (gooals.length >= EN_UNA_TIRA) break
    }
    if (!quedaba) break
  }

  return { gooals, categorias }
}

/**
 * "Cerca de ti": gooals con sitio, ordenados por lo lejos que están.
 *
 * La posición llega de la pantalla y SOLO cuando la persona toca el botón: el
 * permiso de ubicación no se pide al abrir la app. Un cartel del sistema nada
 * más entrar es de las cosas que hacen que alguien cierre y no vuelva.
 *
 * Se filtra por un recuadro en la base y se ordena por distancia aquí: ordenar
 * por distancia en la consulta necesitaría PostGIS, y el recuadro ya deja la
 * lista en unas pocas filas.
 */
export async function getCercaDeMi(lat: number, lng: number): Promise<GooalCerca[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []
  const userId = await getUserId()
  const service = createServiceRoleClient()

  // Un grado de latitud son unos 111 km. Dos grados a cada lado es un recuadro
  // de unos 440 km de alto; en longitud hay que ensancharlo cuanto más al norte
  // o al sur, porque allí los meridianos se juntan.
  const GRADOS = 2
  const ensanche = Math.min(GRADOS / Math.max(Math.cos((lat * Math.PI) / 180), 0.05), 180)

  const { data, error } = await service.from('gooals_v2')
    .select('id, titulo, categoria, dificultad, puntos, ciudad, imagen_url, lat, lng')
    .eq('activo', true).eq('estado', 'verificado')
    .gte('lat', lat - GRADOS).lte('lat', lat + GRADOS)
    .gte('lng', lng - ensanche).lte('lng', lng + ensanche)
    .order('id', { ascending: true })
    .range(0, 499)

  if (error) {
    console.error('[getCercaDeMi]', error)
    return []
  }

  const mios = userId ? new Set((await listarEstados(service, userId)).map(f => f.gooal_id)) : new Set<string>()
  const filas = (data ?? []) as (GooalResumen & { lat: number; lng: number })[]

  return filas
    .filter(g => !mios.has(g.id))
    .map(({ lat: gLat, lng: gLng, ...gooal }) => ({ gooal, km: distanciaKm(lat, lng, gLat, gLng) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, EN_UNA_TIRA)
}

/** Distancia en kilómetros entre dos puntos de la Tierra. */
function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const RADIO = 6371
  const aRad = (g: number) => (g * Math.PI) / 180
  const dLat = aRad(lat2 - lat1)
  const dLng = aRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(aRad(lat1)) * Math.cos(aRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * RADIO * Math.asin(Math.sqrt(a)))
}

/**
 * Cuántos gooals tienen sitio y cuántos hay en total.
 *
 * Para decirlo en la pestaña del mapa. El mapa enseña menos que la lista —108
 * gooals son de ámbito personal y no van en ningún sitio— y sin explicarlo
 * parece que falten.
 */
export async function getCuantosEnMapa(): Promise<{ conSitio: number; total: number }> {
  const service = createServiceRoleClient()
  const publicados = () => service.from('gooals_v2')
    .select('id', { count: 'exact', head: true })
    .eq('activo', true).eq('estado', 'verificado')

  const [conSitio, total] = await Promise.all([
    publicados().not('lat', 'is', null),
    publicados(),
  ])
  return { conSitio: conSitio.count ?? 0, total: total.count ?? 0 }
}

/** Un post concreto del muro, para abrirlo desde el perfil. */
export async function getMuroPost(postId: string): Promise<MuroPostFeed | null> {
  const viewerId = await getUserId()
  const service = createServiceRoleClient()

  const { data: post } = await service.from('muro_posts').select('*').eq('id', postId).maybeSingle()
  if (!post) return null

  const crudo = post as {
    id: string; user_id: string; gooal_id: string | null; user_gooal_id: string | null; created_at: string
    foto_url: string | null; video_url: string | null; descripcion: string | null
    puntos: number | null; likes: number | null
  }

  // Un post se abre por su id, así que el permiso hay que mirarlo aquí también:
  // si no, bastaría con tener el id para saltarse el filtro del feed.
  const [visible] = await filtrarPostsVisibles(service, viewerId, [crudo])
  if (!visible) return null
  const fila = visible

  const [perfilRes, gooalRes, likeRes] = await Promise.all([
    service.from('profiles').select(PERFIL_CAMPOS).eq('id', fila.user_id).maybeSingle(),
    // SIN filtro de estado, a propósito: es un post ya publicado (se abre desde
    // el perfil y el muro). Si su gooal pasa a borrador, el post sigue entero.
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
    userGooalId: fila.user_gooal_id ?? null,
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

  // CATÁLOGO: solo lo verificado. Lo primero que ve alguien nuevo no puede ser un borrador.
  const consulta = service.from('gooals_v2').select('*').eq('activo', true).eq('estado', 'verificado')
  const { data } = categorias.length > 0
    ? await consulta.in('categoria', categorias).limit(cantidad * 3)
    : await consulta.limit(cantidad * 3)

  const gooals = (data ?? []) as GooalV2[]

  // Sin gooals de sus categorías, mejor enseñar algo del catálogo que dejar una
  // pantalla vacía en mitad del onboarding.
  if (gooals.length === 0 && categorias.length > 0) {
    const { data: fallback } = await service
      .from('gooals_v2').select('*').eq('activo', true).eq('estado', 'verificado').limit(cantidad)
    return (fallback ?? []) as GooalV2[]
  }

  for (let i = gooals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[gooals[i], gooals[j]] = [gooals[j], gooals[i]]
  }
  return gooals.slice(0, cantidad)
}
