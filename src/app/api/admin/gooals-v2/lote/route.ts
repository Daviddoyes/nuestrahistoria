import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { esAdmin } from '@/lib/admin-auth'

/**
 * Tope de un lote: una página de la lista de trabajo. Verificar es revisar, y
 * cientos de gooals de golpe sin haberlos mirado no es revisar.
 */
const MAX_LOTE = 50

// ── Verificar o mandar a borrador varios a la vez ───────────────
export async function POST(request: Request) {
  if (!await esAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const estado = body.estado
  if (estado !== 'borrador' && estado !== 'verificado') {
    return NextResponse.json({ error: 'Estado no válido' }, { status: 400 })
  }

  const ids = Array.isArray(body.ids)
    ? [...new Set((body.ids as unknown[]).map(String).filter(Boolean))]
    : []
  if (ids.length === 0) return NextResponse.json({ error: 'No hay nada seleccionado' }, { status: 400 })
  if (ids.length > MAX_LOTE) {
    return NextResponse.json({ error: `Como mucho ${MAX_LOTE} a la vez, una página` }, { status: 400 })
  }

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from('gooals_v2')
    .update({ estado })
    .in('id', ids)
    .select('id')

  if (error) {
    console.error('[admin/gooals-v2/lote]', error)
    return NextResponse.json({ error: 'No se pudo aplicar. No ha cambiado ninguno.' }, { status: 500 })
  }
  // Se devuelve cuántos cambiaron de verdad: si alguno se borró entretanto, no
  // se cuenta como hecho.
  return NextResponse.json({ success: true, actualizados: (data ?? []).length })
}
