import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { esAdmin } from '@/lib/admin-auth'
import {
  esDificultad, normalizarCategoriaGooal, puntosPorDificultad, puntosValidos,
} from '@/lib/gooals'
import type { GooalSugerencia, EstadoSugerencia } from '@/types/gooals'

const ESTADOS: EstadoSugerencia[] = ['pendiente', 'aprobada', 'rechazada']

// ── Cola de moderación ──────────────────────────────────────────
export async function GET(request: Request) {
  if (!await esAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const estadoParam = url.searchParams.get('estado') ?? 'pendiente'
  const estado = (ESTADOS as string[]).includes(estadoParam) ? estadoParam : 'pendiente'

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from('gooal_sugerencias')
    .select('*')
    .eq('estado', estado)
    .order('created_at', { ascending: false })
    .range(0, 199)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { count: pendientes } = await service
    .from('gooal_sugerencias')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'pendiente')

  return NextResponse.json({
    sugerencias: (data ?? []) as GooalSugerencia[],
    pendientes: pendientes ?? 0,
  })
}

// ── Aprobar o rechazar ──────────────────────────────────────────
export async function PATCH(request: Request) {
  if (!await esAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const id = String(body.id ?? '')
  const accion = String(body.accion ?? '')
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })

  const service = createServiceRoleClient()

  if (accion === 'rechazar') {
    const { error } = await service
      .from('gooal_sugerencias')
      .update({ estado: 'rechazada', revisada_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (accion !== 'aprobar') {
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  }

  const { data: sugerencia, error: errorLectura } = await service
    .from('gooal_sugerencias')
    .select('*')
    .eq('id', id)
    .single()

  if (errorLectura || !sugerencia) {
    return NextResponse.json({ error: 'No existe esa sugerencia' }, { status: 404 })
  }
  const fila = sugerencia as GooalSugerencia
  if (fila.estado !== 'pendiente') {
    return NextResponse.json({ error: 'Esa sugerencia ya está revisada' }, { status: 409 })
  }

  // El admin puede corregir título y categoría al aprobar, y es quien pone la
  // dificultad: el usuario que sugiere no tiene por qué saber el baremo.
  const titulo = String(body.titulo ?? fila.titulo).trim().slice(0, 200)
  if (!titulo) return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 })
  const categoria = normalizarCategoriaGooal(String(body.categoria ?? fila.categoria))
  const dificultad = esDificultad(String(body.dificultad)) ? String(body.dificultad) : 'facil'
  // El admin puede afinar los puntos dentro de la banda de esa dificultad; si
  // no manda ninguno, se usa el valor por defecto.
  const puntos = puntosValidos(dificultad, Number(body.puntos))
    ? Number(body.puntos)
    : puntosPorDificultad(dificultad)

  // El gooal se publica sin rastro de quién lo sugirió: en el catálogo uno
  // sugerido es indistinguible de uno curado.
  const { data: creado, error: errorAlta } = await service
    .from('gooals_v2')
    .insert({
      titulo,
      descripcion: null,
      categoria,
      dificultad,
      puntos,
      ciudad: null,
      pais: null,
      imagen_url: null,
      activo: true,
    })
    .select('id')
    .single()

  if (errorAlta) return NextResponse.json({ error: errorAlta.message }, { status: 500 })

  const { error: errorCierre } = await service
    .from('gooal_sugerencias')
    .update({
      estado: 'aprobada',
      gooal_id: (creado as { id: string }).id,
      revisada_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (errorCierre) {
    // El gooal ya está publicado; si esto falla, la sugerencia se queda
    // pendiente y volvería a aprobarse creando un duplicado. Lo decimos.
    return NextResponse.json(
      { error: `Gooal publicado, pero no he podido cerrar la sugerencia: ${errorCierre.message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true, gooalId: (creado as { id: string }).id })
}
