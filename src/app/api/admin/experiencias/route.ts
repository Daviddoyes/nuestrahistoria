import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { isAdminRequest } from '@/lib/admin-auth'
import type { ExperienciaGenerada } from '@/types/planes'

const PAGE_SIZE = 20
const CATEGORIAS = ['viajes', 'deporte', 'gastronomia', 'cultura', 'aventura', 'musica']

// Solo estos campos pueden llegar del cliente; nada de id, veces_anadida ni created_at.
function limpiarExperiencia(raw: Record<string, unknown>) {
  const categoria = String(raw.categoria ?? '').toLowerCase()
  return {
    titulo: String(raw.titulo ?? '').trim().slice(0, 200),
    descripcion: raw.descripcion ? String(raw.descripcion).trim() : null,
    categoria: CATEGORIAS.includes(categoria) ? categoria : 'aventura',
    subcategoria: raw.subcategoria ? String(raw.subcategoria).trim() : null,
    ciudad: raw.ciudad ? String(raw.ciudad).trim() : null,
    pais: raw.pais ? String(raw.pais).trim() : 'España',
    lugar_nombre: raw.lugar_nombre ? String(raw.lugar_nombre).trim() : null,
    lugar_direccion: raw.lugar_direccion ? String(raw.lugar_direccion).trim() : null,
    dificultad: ['facil', 'medio', 'dificil'].includes(String(raw.dificultad)) ? String(raw.dificultad) : 'facil',
    duracion: raw.duracion ? String(raw.duracion).trim() : null,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String).slice(0, 10) : null,
  }
}

// ── Listado paginado + stats de la cabecera ──────────────────
export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const page = Math.max(0, Number(url.searchParams.get('page')) || 0)
  const service = createServiceRoleClient()

  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const [listaRes, totalRes, verificadasRes] = await Promise.all([
    service
      .from('experiencias')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to),
    service.from('experiencias').select('id', { count: 'exact', head: true }),
    service.from('experiencias').select('id', { count: 'exact', head: true }).eq('verificada', true),
  ])

  if (listaRes.error) {
    console.error('[experiencias GET]', listaRes.error.message)
    return NextResponse.json({ error: listaRes.error.message }, { status: 500 })
  }

  const total = totalRes.count ?? 0
  const verificadas = verificadasRes.count ?? 0

  return NextResponse.json({
    experiencias: listaRes.data ?? [],
    page,
    pageSize: PAGE_SIZE,
    total,
    verificadas,
    pendientes: total - verificadas,
  })
}

// ── Crear (manual o guardar generadas) ───────────────────────
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const service = createServiceRoleClient()

  // Lote (generadas por IA) o una sola (manual).
  const entrada: Record<string, unknown>[] = Array.isArray(body.experiencias)
    ? (body.experiencias as ExperienciaGenerada[]).map(e => ({ ...e }))
    : [body]

  const verificada = body.verificada === true

  const filas = entrada
    .map(limpiarExperiencia)
    .filter(e => e.titulo.length > 0)
    .map(e => ({ ...e, verificada }))

  if (filas.length === 0) {
    return NextResponse.json({ error: 'Nada que guardar' }, { status: 400 })
  }

  const { data, error } = await service.from('experiencias').insert(filas).select('id')
  if (error) {
    console.error('[experiencias POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, insertadas: data?.length ?? 0 })
}

// ── Actualizar (toggle verificada o editar) ──────────────────
export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const id = String(body.id ?? '')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const service = createServiceRoleClient()

  // Solo el toggle → cambio puntual de verificada.
  let update: Record<string, unknown>
  if (typeof body.verificada === 'boolean' && Object.keys(body).length === 2) {
    update = { verificada: body.verificada }
  } else {
    update = limpiarExperiencia(body)
    if (typeof body.verificada === 'boolean') update.verificada = body.verificada
  }

  const { error } = await service.from('experiencias').update(update).eq('id', id)
  if (error) {
    console.error('[experiencias PATCH]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// ── Borrar ───────────────────────────────────────────────────
export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const service = createServiceRoleClient()
  const { error } = await service.from('experiencias').delete().eq('id', id)
  if (error) {
    console.error('[experiencias DELETE]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
