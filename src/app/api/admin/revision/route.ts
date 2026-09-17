import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { esAdmin } from '@/lib/admin-auth'
import { leerFila } from '@/lib/admin-gooals'
import type { EstadoRevision } from '@/types/gooals'

/** Lo que puede hacer David con una propuesta. */
const ACCIONES = ['aceptar', 'editar', 'descartar'] as const
type Accion = (typeof ACCIONES)[number]

const ESTADO_TRAS: Record<Accion, EstadoRevision> = {
  aceptar: 'aceptado',
  editar: 'editado',
  descartar: 'descartado',
}

/**
 * Decide una propuesta de título: aceptarla, escribir otra o descartarla.
 *
 * Cambia gooals_v2 y gooals_revision en la misma petición a propósito. Con dos
 * llamadas desde el navegador, una podría salir bien y la otra no, y quedaría
 * un título cambiado con la propuesta todavía "pendiente" (o al revés).
 */
export async function PATCH(request: Request) {
  if (!await esAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const id = String(body.id ?? '')
  const accion = String(body.accion ?? '') as Accion

  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })
  if (!ACCIONES.includes(accion)) return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })

  const service = createServiceRoleClient()

  const { data: revision, error: errorLectura } = await service
    .from('gooals_revision')
    .select('estado, titulo_propuesto')
    .eq('gooal_id', id)
    .maybeSingle()

  if (errorLectura) {
    console.error('[admin/revision PATCH] lectura', errorLectura)
    return NextResponse.json({ error: 'No se pudo leer la propuesta.' }, { status: 500 })
  }
  if (!revision) return NextResponse.json({ error: 'Ese gooal no tiene propuesta.' }, { status: 404 })

  // Ya decidida: se corta aquí. Dos pestañas abiertas, o un doble clic, no pueden
  // aplicar la misma propuesta dos veces ni pisar lo que ya se decidió.
  if (revision.estado !== 'pendiente') {
    return NextResponse.json(
      { error: `Esta propuesta ya estaba ${revision.estado}. Recarga la lista.` },
      { status: 409 },
    )
  }

  // Qué título queda. "Descartar" deja el que ya había.
  let titulo: string | null = null
  if (accion === 'aceptar') {
    titulo = (revision.titulo_propuesto ?? '').trim()
    if (!titulo) return NextResponse.json({ error: 'La propuesta está vacía.' }, { status: 400 })
  } else if (accion === 'editar') {
    titulo = String(body.titulo ?? '').trim().slice(0, 200)
    if (!titulo) return NextResponse.json({ error: 'El título no puede quedar vacío.' }, { status: 400 })
  }

  if (titulo) {
    // Que no acaben dos gooals con el mismo título: sería el mismo recuerdo
    // dando puntos dos veces. El script ya lo mira al proponer, pero entre
    // aquello y esto alguien ha podido crear ese título, o puede haber dos
    // propuestas distintas que apunten al mismo sitio.
    const { data: iguales } = await service
      .from('gooals_v2')
      .select('id')
      .eq('titulo', titulo)
      .neq('id', id)
      .limit(1)
    if (iguales && iguales.length > 0) {
      return NextResponse.json(
        { error: `Ya hay otro gooal con el título «${titulo}». Escribe otro o descarta la propuesta.` },
        { status: 409 },
      )
    }

    const { error } = await service.from('gooals_v2').update({ titulo }).eq('id', id)
    if (error) {
      console.error('[admin/revision PATCH] título', error)
      return NextResponse.json({ error: 'No se pudo cambiar el título. Inténtalo de nuevo.' }, { status: 500 })
    }
  }

  const { error: errorMarca } = await service
    .from('gooals_revision')
    .update({ estado: ESTADO_TRAS[accion], titulo_final: titulo, resuelto_en: new Date().toISOString() })
    .eq('gooal_id', id)

  if (errorMarca) {
    // El título SÍ se cambió: decirlo, en vez de un "no se pudo" que invitaría a
    // repetir la acción sobre un gooal que ya está bien.
    console.error('[admin/revision PATCH] marca', errorMarca)
    return NextResponse.json(
      { error: titulo ? 'El título se cambió, pero la propuesta sigue marcada como pendiente.' : 'No se pudo guardar la decisión.' },
      { status: 500 },
    )
  }

  const gooal = await leerFila(service, id)
  return NextResponse.json({ success: true, gooal })
}
