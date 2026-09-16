// Lecturas del panel de admin: la lista de usuarios y las métricas.
//
// SOLO SERVIDOR: usa el service role. Lo importan páginas de servidor que ya han
// comprobado esAdmin(); no lo importes nunca desde un componente 'use client'.

import { createServiceRoleClient } from '@/lib/supabase/service'
import { CATEGORIAS, type CategoriaGooal } from '@/lib/gooals'

export type Servicio = ReturnType<typeof createServiceRoleClient>

/** Lo máximo que devuelve PostgREST por consulta. Si se pide más, corta sin avisar. */
const PAGINA_BASE = 1000

/**
 * Todas las filas de una consulta, de 1.000 en 1.000.
 *
 * `consulta` recibe el rango y devuelve la consulta YA ordenada por una columna
 * única (el id): sin un orden fijo, las páginas pueden solaparse y saltarse filas.
 */
export async function leerTodo<T>(
  consulta: (desde: number, hasta: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const filas: T[] = []
  for (let desde = 0; ; desde += PAGINA_BASE) {
    const { data, error } = await consulta(desde, desde + PAGINA_BASE - 1)
    if (error) throw new Error(error.message)
    filas.push(...((data ?? []) as T[]))
    if (!data || data.length < PAGINA_BASE) return filas
  }
}

/** Número de filas sin traérselas. */
async function contar(
  consulta: PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> {
  const { count, error } = await consulta
  if (error) throw new Error(error.message)
  return count ?? 0
}

const sinAcentos = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

// ── Usuarios ──────────────────────────────────────────────────────

export const USUARIOS_POR_PAGINA = 25

export type UsuarioAdmin = {
  id: string
  nombre: string | null
  username: string | null
  email: string
  alta: string
  /** null si nunca ha iniciado sesión. */
  ultimoAcceso: string | null
  completados: number
  puntos: number
  esAdmin: boolean
}

export type CuentaAuth = { id: string; email?: string; created_at: string; last_sign_in_at?: string | null }

/**
 * Todas las cuentas de auth.users, página a página.
 *
 * Antes se pedía solo la página 1 de 1.000: con la cuenta 1.001 el panel habría
 * empezado a perder usuarios sin decir nada.
 */
export async function cuentasAuth(service: Servicio): Promise<CuentaAuth[]> {
  const cuentas: CuentaAuth[] = []
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await service.auth.admin.listUsers({ page: pagina, perPage: PAGINA_BASE })
    if (error) throw new Error(`No se pudieron leer las cuentas: ${error.message}`)
    cuentas.push(...(data.users as CuentaAuth[]))
    if (data.users.length < PAGINA_BASE) return cuentas
  }
}

/**
 * Una página de usuarios, con buscador por nombre, @usuario o email.
 *
 * El email vive en auth.users y el resto en profiles, así que no hay una sola
 * consulta que busque en los tres: se leen las dos tablas enteras (paginadas),
 * se cruzan aquí y al navegador solo viajan las 25 filas de la página. Cuando
 * haya decenas de miles de usuarios convendrá una vista SQL que las junte.
 */
export async function listarUsuarios({ busqueda, pagina }: { busqueda: string; pagina: number }) {
  const service = createServiceRoleClient()

  const [cuentas, perfiles, completados] = await Promise.all([
    cuentasAuth(service),
    leerTodo<{ id: string; nombre: string | null; username: string | null; puntos_totales: number | null; es_admin: boolean | null }>(
      (desde, hasta) => service.from('profiles').select('id, nombre, username, puntos_totales, es_admin').order('id').range(desde, hasta),
    ),
    leerTodo<{ user_id: string }>(
      (desde, hasta) => service.from('user_gooals').select('user_id').eq('estado', 'completado').order('id').range(desde, hasta),
    ),
  ])

  const perfilPorId = new Map(perfiles.map(p => [p.id, p]))
  const completadosPorId = new Map<string, number>()
  for (const c of completados) completadosPorId.set(c.user_id, (completadosPorId.get(c.user_id) ?? 0) + 1)

  // Se parte de auth.users y no de profiles: una cuenta sin perfil (un alta a
  // medias) también es un usuario, y tiene que poder encontrarse.
  const todos: UsuarioAdmin[] = cuentas.map(c => {
    const p = perfilPorId.get(c.id)
    return {
      id: c.id,
      nombre: p?.nombre ?? null,
      username: p?.username ?? null,
      email: c.email ?? '',
      alta: c.created_at,
      ultimoAcceso: c.last_sign_in_at ?? null,
      completados: completadosPorId.get(c.id) ?? 0,
      puntos: p?.puntos_totales ?? 0,
      esAdmin: Boolean(p?.es_admin),
    }
  })

  const q = sinAcentos(busqueda.replace(/^@/, ''))
  const filtrados = q
    ? todos.filter(u => [u.nombre, u.username, u.email].some(campo => campo && sinAcentos(campo).includes(q)))
    : todos
  // Los más recientes primero; el id desempata para que nadie baile entre páginas.
  filtrados.sort((a, b) => b.alta.localeCompare(a.alta) || a.id.localeCompare(b.id))

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / USUARIOS_POR_PAGINA))
  const actual = Math.min(Math.max(1, pagina), totalPaginas)
  return {
    usuarios: filtrados.slice((actual - 1) * USUARIOS_POR_PAGINA, actual * USUARIOS_POR_PAGINA),
    total: filtrados.length,
    pagina: actual,
    totalPaginas,
  }
}

// ── Métricas ──────────────────────────────────────────────────────
// Solo números agregados: aquí no sale ni un email ni un nombre de usuario.

export type MetricasAdmin = {
  usuarios: { total: number; onboarding: number }
  /** 12 semanas, de la más antigua a la actual (que va a medias). Lunes en hora de Madrid. */
  altasPorSemana: { lunes: string; altas: number }[]
  completados: { total: number; ultimos30Dias: number }
  porCategoria: { categoria: CategoriaGooal; completados: number }[]
  masConquistados: { id: string; titulo: string; categoria: CategoriaGooal; conquistados: number }[]
  catalogo: { total: number; verificados: number; borradores: number; dudosos: number }
}

const SEMANAS = 12
const DIA_MS = 24 * 60 * 60 * 1000

/** "2026-09-15" del día en Madrid: una alta a las 00:30 de un lunes es de ese lunes, no del domingo. */
function diaEnMadrid(fecha: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(fecha)
}

/** El lunes de la semana de un día "AAAA-MM-DD". Se opera en UTC sobre la fecha pura, sin horas. */
function lunesDe(dia: string): string {
  const d = new Date(`${dia}T00:00:00Z`)
  const desdeLunes = (d.getUTCDay() + 6) % 7
  return new Date(d.getTime() - desdeLunes * DIA_MS).toISOString().slice(0, 10)
}

export async function leerMetricas(): Promise<MetricasAdmin> {
  const service = createServiceRoleClient()
  const ahora = new Date()
  const lunesActual = lunesDe(diaEnMadrid(ahora))
  const primerLunes = new Date(new Date(`${lunesActual}T00:00:00Z`).getTime() - (SEMANAS - 1) * DIA_MS * 7).toISOString().slice(0, 10)
  // Un día de margen por la diferencia horaria; las que sobren caen fuera al agrupar.
  const desdeAltas = new Date(new Date(`${primerLunes}T00:00:00Z`).getTime() - DIA_MS).toISOString()

  const [
    totalUsuarios, onboarding, altas,
    totalCompletados, completados30, conquistas,
    totalCatalogo, verificados, borradores, dudosos,
  ] = await Promise.all([
    contar(service.from('profiles').select('id', { count: 'exact', head: true })),
    contar(service.from('profiles').select('id', { count: 'exact', head: true }).eq('onboarding_completado', true)),
    leerTodo<{ created_at: string }>(
      (desde, hasta) => service.from('profiles').select('id, created_at').gte('created_at', desdeAltas).order('id').range(desde, hasta),
    ),
    contar(service.from('user_gooals').select('id', { count: 'exact', head: true }).eq('estado', 'completado')),
    contar(service.from('user_gooals').select('id', { count: 'exact', head: true }).eq('estado', 'completado')
      .gte('completado_at', new Date(ahora.getTime() - 30 * DIA_MS).toISOString())),
    // Se cuenta desde user_gooals y no con gooals_v2.veces_completado, que es una copia.
    leerTodo<{ gooal_id: string; gooal: { titulo: string; categoria: CategoriaGooal } | null }>(
      (desde, hasta) => service.from('user_gooals').select('id, gooal_id, gooal:gooals_v2(titulo, categoria)')
        .eq('estado', 'completado').order('id').range(desde, hasta),
    ),
    contar(service.from('gooals_v2').select('id', { count: 'exact', head: true })),
    contar(service.from('gooals_v2').select('id', { count: 'exact', head: true }).eq('estado', 'verificado')),
    contar(service.from('gooals_v2').select('id', { count: 'exact', head: true }).eq('estado', 'borrador')),
    contar(service.from('gooals_v2').select('id', { count: 'exact', head: true }).eq('categoria_dudosa', true)),
  ])

  // Las 12 semanas siempre, aunque alguna tenga 0: un hueco en la gráfica es información.
  const altasPorLunes = new Map<string, number>()
  for (let i = 0; i < SEMANAS; i++) {
    altasPorLunes.set(new Date(new Date(`${primerLunes}T00:00:00Z`).getTime() + i * 7 * DIA_MS).toISOString().slice(0, 10), 0)
  }
  for (const a of altas) {
    const lunes = lunesDe(diaEnMadrid(new Date(a.created_at)))
    if (altasPorLunes.has(lunes)) altasPorLunes.set(lunes, (altasPorLunes.get(lunes) ?? 0) + 1)
  }

  const porCategoria = new Map<CategoriaGooal, number>(CATEGORIAS.map(c => [c, 0]))
  const porGooal = new Map<string, { titulo: string; categoria: CategoriaGooal; conquistados: number }>()
  for (const c of conquistas) {
    // Un gooal borrado del catálogo deja su user_gooal sin gooal: no tiene categoría ni título que enseñar.
    if (!c.gooal) continue
    porCategoria.set(c.gooal.categoria, (porCategoria.get(c.gooal.categoria) ?? 0) + 1)
    const previo = porGooal.get(c.gooal_id)
    if (previo) previo.conquistados++
    else porGooal.set(c.gooal_id, { titulo: c.gooal.titulo, categoria: c.gooal.categoria, conquistados: 1 })
  }

  return {
    usuarios: { total: totalUsuarios, onboarding },
    altasPorSemana: [...altasPorLunes].map(([lunes, n]) => ({ lunes, altas: n })),
    completados: { total: totalCompletados, ultimos30Dias: completados30 },
    porCategoria: CATEGORIAS
      .map(categoria => ({ categoria, completados: porCategoria.get(categoria) ?? 0 }))
      .sort((a, b) => b.completados - a.completados || CATEGORIAS.indexOf(a.categoria) - CATEGORIAS.indexOf(b.categoria)),
    masConquistados: [...porGooal]
      .map(([id, g]) => ({ id, ...g }))
      .sort((a, b) => b.conquistados - a.conquistados || a.titulo.localeCompare(b.titulo, 'es'))
      .slice(0, 20),
    catalogo: { total: totalCatalogo, verificados, borradores, dudosos },
  }
}
