import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { isAdminRequest } from '@/lib/admin-auth'
import {
  esDificultad, normalizarCategoriaGooal, puntosPorDificultad,
} from '@/lib/gooals'
import type { GooalV2 } from '@/types/gooals'

/** Fila lista para insertar, con los puntos derivados de la dificultad. */
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
    // Los puntos nunca llegan del cliente: se derivan del baremo único.
    puntos: puntosPorDificultad(dificultad),
    ciudad: texto(body.ciudad),
    pais: texto(body.pais),
    imagen_url: texto(body.imagen_url),
    activo: body.activo === undefined ? true : Boolean(body.activo),
  }
}

// ── Listado completo del catálogo (incluye inactivos) ───────────
export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from('gooals_v2')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ gooals: (data ?? []) as GooalV2[] })
}

// ── Crear uno o varios gooals ───────────────────────────────────
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
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
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const id = String(body.id ?? '')
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })

  const cambios: Record<string, unknown> = {}
  if (body.activo !== undefined) cambios.activo = Boolean(body.activo)
  if (body.titulo !== undefined) cambios.titulo = String(body.titulo).trim().slice(0, 200)
  if (body.descripcion !== undefined) cambios.descripcion = String(body.descripcion).trim() || null
  if (body.imagen_url !== undefined) cambios.imagen_url = String(body.imagen_url).trim() || null
  if (body.categoria !== undefined) cambios.categoria = normalizarCategoriaGooal(String(body.categoria))
  if (body.dificultad !== undefined && esDificultad(String(body.dificultad))) {
    cambios.dificultad = String(body.dificultad)
    cambios.puntos = puntosPorDificultad(String(body.dificultad))
  }

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const service = createServiceRoleClient()
  const { error } = await service.from('gooals_v2').update(cambios).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
