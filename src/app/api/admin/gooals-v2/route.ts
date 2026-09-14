import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { esAdmin } from '@/lib/admin-auth'
import {
  esDificultad, normalizarCategoriaGooal, puntosPorDificultad, puntosValidos,
} from '@/lib/gooals'
import type { GooalV2 } from '@/types/gooals'

/**
 * Puntos a guardar: los del body si caen en la banda de esa dificultad, y si no
 * el valor por defecto. Un valor fuera de banda no rompe la petición, se ignora.
 */
function resolverPuntos(dificultad: string, puntos: unknown): number {
  const pedidos = Number(puntos)
  return puntosValidos(dificultad, pedidos) ? pedidos : puntosPorDificultad(dificultad)
}

/** Fila lista para insertar. */
function normalizarGooal(body: Record<string, unknown>) {
  const titulo = String(body.titulo ?? '').trim()
  if (!titulo) return null

  const dificultad = esDificultad(String(body.dificultad)) ? String(body.dificultad) : 'facil'
  const texto = (campo: unknown) => (campo ? String(campo).trim() || null : null)

  return {
    titulo: titulo.slice(0, 200),
    descripcion: texto(body.descripcion),
    categoria: normalizarCategoriaGooal(body.categoria as string),
    dificultad,
    puntos: resolverPuntos(dificultad, body.puntos),
    ciudad: texto(body.ciudad),
    pais: texto(body.pais),
    imagen_url: texto(body.imagen_url),
    activo: body.activo === undefined ? true : Boolean(body.activo),
  }
}

// ── Listado completo del catálogo (incluye inactivos) ───────────
export async function GET(request: Request) {
  if (!await esAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceRoleClient()

  // PostgREST corta en 1.000 filas y el catálogo pasa de 4.900, así que sin
  // paginar el panel veía menos de un cuarto del catálogo. Se recorre por
  // páginas hasta agotarlo.
  const PAGINA = 1000
  const gooals: GooalV2[] = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await service
      .from('gooals_v2')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(desde, desde + PAGINA - 1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const filas = (data ?? []) as GooalV2[]
    gooals.push(...filas)
    if (filas.length < PAGINA) break
  }

  return NextResponse.json({ gooals })
}

// ── Crear uno o varios gooals ───────────────────────────────────
export async function POST(request: Request) {
  if (!await esAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const service = createServiceRoleClient()

  // Alta en lote: es lo que usa "Generar con IA" al guardar los 20 gooals.
  if (Array.isArray(body.gooals)) {
    const filas = body.gooals
      .map((g: Record<string, unknown>) => normalizarGooal(g))
      .filter(Boolean)

    if (filas.length === 0) {
      return NextResponse.json({ error: 'Ningún gooal válido' }, { status: 400 })
    }

    const { error } = await service.from('gooals_v2').insert(filas)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, insertados: filas.length })
  }

  const fila = normalizarGooal(body)
  if (!fila) return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 })

  const { data, error } = await service.from('gooals_v2').insert(fila).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, id: (data as { id: string }).id })
}

// ── Editar un gooal (usado por el toggle de activo) ─────────────
export async function PATCH(request: Request) {
  if (!await esAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const id = String(body.id ?? '')
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })

  const service = createServiceRoleClient()

  const cambios: Record<string, unknown> = {}
  if (body.activo !== undefined) cambios.activo = Boolean(body.activo)
  if (body.titulo !== undefined) cambios.titulo = String(body.titulo).trim().slice(0, 200)
  if (body.descripcion !== undefined) cambios.descripcion = String(body.descripcion).trim() || null
  if (body.imagen_url !== undefined) cambios.imagen_url = String(body.imagen_url).trim() || null
  if (body.categoria !== undefined) cambios.categoria = normalizarCategoriaGooal(String(body.categoria))

  const dificultadNueva = body.dificultad !== undefined && esDificultad(String(body.dificultad))
    ? String(body.dificultad)
    : null
  if (dificultadNueva) cambios.dificultad = dificultadNueva

  if (body.puntos !== undefined) {
    // La banda es la de la dificultad que tendrá el gooal DESPUÉS del PATCH: la
    // del body si viene, y si no la que ya tiene guardada.
    let dificultad = dificultadNueva
    if (!dificultad) {
      const { data } = await service
        .from('gooals_v2')
        .select('dificultad')
        .eq('id', id)
        .maybeSingle()
      dificultad = (data as { dificultad: string } | null)?.dificultad ?? null
    }

    if (dificultad && puntosValidos(dificultad, Number(body.puntos))) {
      cambios.puntos = Number(body.puntos)
    } else if (dificultadNueva) {
      cambios.puntos = puntosPorDificultad(dificultadNueva)
    }
    // Puntos fuera de banda y sin cambio de dificultad: se deja el valor que
    // ya tenía, en vez de aplanarlo al de por defecto.
  } else if (dificultadNueva) {
    // Sin puntos en el body, la dificultad nueva arrastra su valor por defecto.
    // Con puntos en el body NO se pisan: es lo que aplanaba la escala de
    // Espectáculos, donde hay 'facil' de 2 y de 3.
    cambios.puntos = puntosPorDificultad(dificultadNueva)
  }

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const { error } = await service.from('gooals_v2').update(cambios).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
