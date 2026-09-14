import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { esAdmin } from '@/lib/admin-auth'
import {
  PUNTOS_MIN, ambitoDeGooal, normalizarCategoriaGooal, puntosEnEscala, type EstadoGooal,
} from '@/lib/gooals'
import type { GooalV2 } from '@/types/gooals'

/**
 * Fila lista para insertar.
 *
 * Sin dificultad: la calcula la base a partir de los puntos (disparador de
 * fase3f.sql). Unos puntos fuera de 1-10 no rompen la petición: se usa el mínimo.
 */
function normalizarGooal(body: Record<string, unknown>, estado: EstadoGooal) {
  const titulo = String(body.titulo ?? '').trim()
  if (!titulo) return null

  const texto = (campo: unknown) => (campo ? String(campo).trim() || null : null)
  const categoria = normalizarCategoriaGooal(body.categoria as string)
  const ciudad = texto(body.ciudad)
  const pais = texto(body.pais)

  return {
    titulo: titulo.slice(0, 200),
    descripcion: texto(body.descripcion),
    categoria,
    puntos: puntosEnEscala(body.puntos) ?? PUNTOS_MIN,
    ciudad,
    pais,
    imagen_url: texto(body.imagen_url),
    activo: body.activo === undefined ? true : Boolean(body.activo),
    estado,
    ambito: ambitoDeGooal({ categoria, ciudad, pais }),
  }
}

// ── Listado completo del catálogo ───────────────────────────────
// El panel es la excepción al filtro de estado: aquí se ven TODOS, borradores
// e inactivos incluidos, porque es donde se revisan.
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
  // Nacen en BORRADOR: son textos escritos por la IA que el admin solo ha visto
  // de pasada en una lista, igual que lo que genera el pipeline de siembra.
  if (Array.isArray(body.gooals)) {
    const filas = body.gooals
      .map((g: Record<string, unknown>) => normalizarGooal(g, 'borrador'))
      .filter(Boolean)

    if (filas.length === 0) {
      return NextResponse.json({ error: 'Ningún gooal válido' }, { status: 400 })
    }

    const { error } = await service.from('gooals_v2').insert(filas)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, insertados: filas.length })
  }

  // Alta manual de uno: nace VERIFICADO. Lo ha escrito el admin a mano, campo a
  // campo; crearlo ya es revisarlo.
  const fila = normalizarGooal(body, 'verificado')
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

  // La dificultad no se acepta: sale de los puntos (la recalcula la base). Unos
  // puntos fuera de 1-10 se ignoran en vez de guardar un valor inventado.
  if (body.puntos !== undefined) {
    const puntos = puntosEnEscala(body.puntos)
    if (puntos !== null) cambios.puntos = puntos
  }

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const { error } = await service.from('gooals_v2').update(cambios).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
