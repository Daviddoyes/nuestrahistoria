import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { esAdmin } from '@/lib/admin-auth'

/** Tope por petición: es una página de la lista de trabajo. */
const MAX = 50

type FilaRevision = {
  gooal_id: string
  titulo_propuesto: string | null
  titulo_original: string
}

/**
 * Confirma en bloque una página de TRADUCCIONES.
 *
 * Solo traducciones: arreglar un título mal escrito es mecánico y se puede
 * mirar de un vistazo en bloque. Lo de criterio se decide de una en una y no
 * pasa por aquí ni aunque se pidan sus ids, porque la comprobación de abajo
 * exige tipo='traduccion'.
 */
export async function POST(request: Request) {
  if (!await esAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, MAX) : []
  if (ids.length === 0) return NextResponse.json({ error: 'No has seleccionado ninguna.' }, { status: 400 })

  const service = createServiceRoleClient()

  // Se releen de la base: los títulos que manda el navegador no se aplican nunca.
  const { data, error } = await service
    .from('gooals_revision')
    .select('gooal_id, titulo_propuesto, titulo_original')
    .in('gooal_id', ids)
    .eq('estado', 'pendiente')
    .eq('tipo', 'traduccion')

  if (error) {
    console.error('[admin/revision/lote] lectura', error)
    return NextResponse.json({ error: 'No se pudieron leer las traducciones.' }, { status: 500 })
  }

  const filas = (data ?? []) as FilaRevision[]
  const conPropuesta = filas.filter(f => (f.titulo_propuesto ?? '').trim())
  if (conPropuesta.length === 0) {
    return NextResponse.json({ error: 'Ninguna sigue pendiente. Recarga la lista.' }, { status: 409 })
  }

  // Segunda red contra los duplicados, aparte de la del script: entre la pasada
  // de la IA y este momento alguien ha podido crear ese título a mano.
  const propuestos = conPropuesta.map(f => (f.titulo_propuesto ?? '').trim())
  const { data: chocan } = await service
    .from('gooals_v2')
    .select('id, titulo')
    .in('titulo', propuestos)
  const yaExiste = new Map((chocan ?? []).map(g => [(g as { titulo: string }).titulo, (g as { id: string }).id]))

  const aplicadas: string[] = []
  const saltadas: { titulo: string; porque: string }[] = []
  const ahora = new Date().toISOString()

  for (const fila of conPropuesta) {
    const titulo = (fila.titulo_propuesto ?? '').trim()

    // Que el choque sea consigo mismo no es un choque: es que ya está aplicada.
    const duenoDelTitulo = yaExiste.get(titulo)
    if (duenoDelTitulo && duenoDelTitulo !== fila.gooal_id) {
      saltadas.push({ titulo: fila.titulo_original, porque: 'ya existe un gooal con ese título' })
      continue
    }

    // El mapa se leyó ANTES del bucle: sin esto, dos filas de la misma tanda que
    // propongan el mismo título entrarían las dos y quedaría el duplicado hecho.
    yaExiste.set(titulo, fila.gooal_id)

    const { error: errorTitulo } = await service.from('gooals_v2').update({ titulo }).eq('id', fila.gooal_id)
    if (errorTitulo) {
      console.error('[admin/revision/lote] título', fila.gooal_id, errorTitulo)
      saltadas.push({ titulo: fila.titulo_original, porque: 'no se pudo guardar' })
      continue
    }

    const { error: errorMarca } = await service
      .from('gooals_revision')
      .update({ estado: 'aceptado', titulo_final: titulo, resuelto_en: ahora })
      .eq('gooal_id', fila.gooal_id)
      .eq('estado', 'pendiente')
    if (errorMarca) console.error('[admin/revision/lote] marca', fila.gooal_id, errorMarca)

    aplicadas.push(fila.gooal_id)
  }

  return NextResponse.json({ success: true, aplicadas: aplicadas.length, ids: aplicadas, saltadas })
}
