import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { isAdminRequest } from '@/lib/admin-auth'
import type { Gooal, GooalLugar } from '@/types/planes'

const CATEGORIAS = ['viajes', 'deporte', 'gastronomia', 'cultura', 'aventura', 'musica']

// ── Listado de gooals (con nº de lugares) o lugares de un gooal ──
export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const gooalId = new URL(request.url).searchParams.get('gooal_id')
  const service = createServiceRoleClient()

  // Lugares de un gooal concreto (para "Ver lugares").
  if (gooalId) {
    const { data, error } = await service
      .from('gooal_lugares')
      .select('*')
      .eq('gooal_id', gooalId)
      .order('ciudad', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ lugares: data ?? [] })
  }

  const [gooalsRes, lugaresRes] = await Promise.all([
    service.from('gooals').select('*').order('created_at', { ascending: false }),
    service.from('gooal_lugares').select('gooal_id'),
  ])

  if (gooalsRes.error) {
    return NextResponse.json({ error: gooalsRes.error.message }, { status: 500 })
  }

  const conteo: Record<string, number> = {}
  for (const l of (lugaresRes.data ?? []) as { gooal_id: string }[]) {
    conteo[l.gooal_id] = (conteo[l.gooal_id] ?? 0) + 1
  }

  const gooals = ((gooalsRes.data ?? []) as Gooal[]).map(g => ({
    ...g,
    num_lugares: conteo[g.id] ?? 0,
  }))

  return NextResponse.json({ gooals })
}

// ── Crear gooal o añadir lugar (según body.tipo) ────────────────
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const service = createServiceRoleClient()

  if (body.tipo === 'lugar') {
    if (!body.gooal_id || !String(body.nombre_lugar ?? '').trim()) {
      return NextResponse.json({ error: 'Faltan gooal_id o nombre_lugar' }, { status: 400 })
    }
    const lugar: Partial<GooalLugar> = {
      gooal_id: body.gooal_id,
      nombre_lugar: String(body.nombre_lugar).trim(),
      ciudad: body.ciudad ? String(body.ciudad).trim() : null,
      pais: body.pais ? String(body.pais).trim() : 'España',
      latitud: body.latitud != null && body.latitud !== '' ? Number(body.latitud) : null,
      longitud: body.longitud != null && body.longitud !== '' ? Number(body.longitud) : null,
      direccion: body.direccion ? String(body.direccion).trim() : null,
    }
    const { error } = await service.from('gooal_lugares').insert(lugar)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Por defecto: crear gooal.
  const titulo = String(body.titulo ?? '').trim()
  const categoria = String(body.categoria ?? '').toLowerCase()
  if (!titulo) return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 })

  const gooal = {
    titulo: titulo.slice(0, 200),
    categoria: CATEGORIAS.includes(categoria) ? categoria : 'aventura',
    subcategoria: body.subcategoria ? String(body.subcategoria).trim() : null,
    descripcion: body.descripcion ? String(body.descripcion).trim() : null,
    dificultad: ['facil', 'medio', 'dificil'].includes(String(body.dificultad)) ? String(body.dificultad) : 'facil',
    duracion: body.duracion ? String(body.duracion).trim() : null,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
  }

  const { data, error } = await service.from('gooals').insert(gooal).select('id').single()
  if (error) {
    // 23505 = unique_violation sobre titulo.
    const msg = error.code === '23505' ? 'Ya existe un gooal con ese título' : error.message
    return NextResponse.json({ error: msg }, { status: error.code === '23505' ? 409 : 500 })
  }
  return NextResponse.json({ success: true, id: data.id })
}
