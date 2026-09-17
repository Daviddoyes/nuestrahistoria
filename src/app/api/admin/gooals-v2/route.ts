import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { esAdmin } from '@/lib/admin-auth'
import { limpiarBusqueda } from '@/lib/busqueda'
import {
  CATEGORIAS, PUNTOS_MIN, ambitoDeGooal, esCategoria, normalizarCategoriaGooal, puntosEnEscala,
  type EstadoGooal,
} from '@/lib/gooals'
import {
  COLUMNAS, COLUMNAS_REPASO, COLUMNAS_SIN_REVISION, aGooalAdmin, leerFila, sinTablaDeRepaso,
} from '@/lib/admin-gooals'

/** Filas por página de la lista de trabajo. Traer los 4.726 de golpe congelaba el navegador. */
const POR_PAGINA = 50

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

// ── Lista de trabajo: 50 por página, con filtros ────────────────
// El panel es la excepción al filtro de estado: aquí se ven TODOS, borradores
// e inactivos incluidos, porque es donde se revisan.
export async function GET(request: Request) {
  if (!await esAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = new URL(request.url).searchParams
  const pagina = Math.max(0, Number.parseInt(params.get('pagina') ?? '0', 10) || 0)
  const estado = params.get('estado')
  const categoria = params.get('categoria')
  const ambito = params.get('ambito')
  const sinPin = params.get('sinPin') === '1'
  const categoriaDudosa = params.get('categoriaDudosa') === '1'
  const repaso = params.get('repaso')
  const enRepaso = repaso === 'traducciones' || repaso === 'decidir'
  const busqueda = limpiarBusqueda(params.get('busqueda') ?? '')

  const service = createServiceRoleClient()
  const desde = pagina * POR_PAGINA

  const pedir = (columnas: string, conRepaso: boolean) => {
    let query = service
      .from('gooals_v2')
      .select(columnas, { count: 'exact' })
      .eq('conquistado.estado', 'completado')

    // El !inner de COLUMNAS_REPASO deja fuera a los que no tienen repaso; estos
    // filtros dejan fuera además los ya decididos, los que la IA dio por buenos
    // y la otra cola. En 'decidir' entran los señalados SIN propuesta: también
    // hay que decidirlos, y son justo los que no se pueden confirmar en bloque.
    if (conRepaso) {
      query = query
        .eq('revision.estado', 'pendiente')
        .eq('revision.tipo', repaso === 'traducciones' ? 'traduccion' : 'criterio')
    }

    if (estado === 'borrador' || estado === 'verificado') query = query.eq('estado', estado)
    if (categoria && esCategoria(categoria)) query = query.eq('categoria', categoria)
    if (ambito === 'lugar' || ambito === 'personal') query = query.eq('ambito', ambito)
    if (sinPin) query = query.eq('ambito', 'lugar').is('lat', null)
    if (categoriaDudosa) query = query.eq('categoria_dudosa', true)
    if (busqueda) query = query.ilike('titulo', `%${busqueda}%`)

    // Alfabético por título: los parecidos quedan juntos y los duplicados saltan a
    // la vista. El id desempata para que ninguna fila baile entre páginas.
    return query
      .order('titulo', { ascending: true })
      .order('id', { ascending: true })
      .range(desde, desde + POR_PAGINA - 1)
  }

  let { data, count, error } = await pedir(enRepaso ? COLUMNAS_REPASO : COLUMNAS, enRepaso)

  // Sin tabla de repaso todavía: el catálogo se sigue pudiendo trabajar, solo que
  // sin repaso. Los dos filtros del repaso no pueden tener resultados, y lo dicen.
  if (sinTablaDeRepaso(error)) {
    if (enRepaso) {
      return NextResponse.json({ gooals: [], total: 0, porPagina: POR_PAGINA, sinRepaso: true })
    }
    ({ data, count, error } = await pedir(COLUMNAS_SIN_REVISION, false))
  }

  if (error) {
    console.error('[admin/gooals-v2 GET]', error)
    return NextResponse.json({ error: 'No se pudo cargar el catálogo' }, { status: 500 })
  }

  return NextResponse.json({
    gooals: (data ?? []).map(aGooalAdmin),
    total: count ?? 0,
    porPagina: POR_PAGINA,
  })
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

// ── Guardar una fila ────────────────────────────────────────────
// Devuelve la fila tal como queda en la base, para que el panel pinte lo real
// (la dificultad recalculada, el pin quitado, la marca de rehacer) y no lo que
// creía haber mandado.
export async function PATCH(request: Request) {
  if (!await esAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const id = String(body.id ?? '')
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })

  const service = createServiceRoleClient()
  const { data: actual } = await service
    .from('gooals_v2')
    .select('ciudad, pais, lat, ambito')
    .eq('id', id)
    .maybeSingle()
  if (!actual) return NextResponse.json({ error: 'Ese gooal ya no existe' }, { status: 404 })
  const antes = actual as { ciudad: string | null; pais: string | null; lat: number | null; ambito: string }

  const texto = (valor: unknown) => String(valor ?? '').trim() || null
  const cambios: Record<string, unknown> = {}

  if (body.activo !== undefined) cambios.activo = Boolean(body.activo)
  if (body.descripcion !== undefined) cambios.descripcion = texto(body.descripcion)
  if (body.imagen_url !== undefined) cambios.imagen_url = texto(body.imagen_url)

  if (body.titulo !== undefined) {
    const titulo = String(body.titulo).trim().slice(0, 200)
    if (!titulo) return NextResponse.json({ error: 'El título no puede quedar vacío' }, { status: 400 })
    cambios.titulo = titulo
  }

  if (body.categoria !== undefined) {
    if (!esCategoria(String(body.categoria))) {
      return NextResponse.json({ error: `Categoría no válida. Son: ${CATEGORIAS.join(', ')}` }, { status: 400 })
    }
    cambios.categoria = String(body.categoria)
    // Elegir la categoría a mano ES revisarla: la marca de dudosa sobra.
    cambios.categoria_dudosa = false
  }

  // "Es correcta": se da por buena la categoría que ya tiene, sin cambiarla.
  if (body.categoria_dudosa === false) cambios.categoria_dudosa = false

  // La dificultad no se acepta: sale de los puntos (la recalcula la base).
  if (body.puntos !== undefined) {
    const puntos = puntosEnEscala(body.puntos)
    if (puntos === null) return NextResponse.json({ error: 'Los puntos van de 1 a 10' }, { status: 400 })
    cambios.puntos = puntos
  }

  if (body.estado !== undefined) {
    if (body.estado !== 'borrador' && body.estado !== 'verificado') {
      return NextResponse.json({ error: 'Estado no válido' }, { status: 400 })
    }
    cambios.estado = body.estado
  }

  if (body.ciudad !== undefined) cambios.ciudad = texto(body.ciudad)
  if (body.pais !== undefined) cambios.pais = texto(body.pais)

  let ambito = antes.ambito
  if (body.ambito !== undefined) {
    if (body.ambito !== 'lugar' && body.ambito !== 'personal') {
      return NextResponse.json({ error: 'Ámbito no válido' }, { status: 400 })
    }
    ambito = body.ambito
    cambios.ambito = ambito
  }

  if (ambito === 'personal') {
    // Si no es un sitio, el pin sobra. Además la base no deja guardar un gooal
    // personal con coordenadas (gooals_v2_personal_sin_coordenadas).
    if (antes.lat !== null) {
      cambios.lat = null
      cambios.lng = null
      cambios.geo = null
    }
  } else if (antes.lat !== null) {
    // Con el pin puesto, cambiar la ciudad o el país deja un pin que puede
    // apuntar al sitio equivocado. No se mueve aquí: se marca para la cola de
    // geolocalización, en vez de dejarlo mal y que nadie se acuerde.
    const cambiaCiudad = 'ciudad' in cambios && cambios.ciudad !== antes.ciudad
    const cambiaPais = 'pais' in cambios && cambios.pais !== antes.pais
    if (cambiaCiudad || cambiaPais) cambios.geo = 'rehacer'
  }

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const { error } = await service.from('gooals_v2').update(cambios).eq('id', id)
  if (error) {
    console.error('[admin/gooals-v2 PATCH]', error)
    return NextResponse.json({ error: 'No se pudo guardar. Inténtalo de nuevo.' }, { status: 500 })
  }

  const fila = await leerFila(service, id)
  return NextResponse.json({ success: true, gooal: fila })
}

// ── Borrar un gooal ─────────────────────────────────────────────
// Solo si NADIE lo tiene. Lo de la gente no se borra por limpiar el catálogo:
// user_gooals se borraría en cascada y alguien perdería un conquistado.
export async function DELETE(request: Request) {
  if (!await esAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })

  const service = createServiceRoleClient()

  // Se vuelve a comprobar aquí aunque el panel ya lo sepa: entre que se pintó la
  // fila y se pulsa borrar, alguien puede haberlo añadido a su lista.
  const { count, error: errorCuenta } = await service
    .from('user_gooals')
    .select('id', { count: 'exact', head: true })
    .eq('gooal_id', id)
  if (errorCuenta) {
    console.error('[admin/gooals-v2 DELETE] recuento', errorCuenta)
    return NextResponse.json({ error: 'No se pudo comprobar quién lo tiene. No se ha borrado.' }, { status: 500 })
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `No se puede borrar: ${count} ${count === 1 ? 'persona lo tiene' : 'personas lo tienen'} en su lista.` },
      { status: 409 },
    )
  }

  const { error } = await service.from('gooals_v2').delete().eq('id', id)
  if (error) {
    console.error('[admin/gooals-v2 DELETE]', error)
    return NextResponse.json({ error: 'No se pudo borrar. Inténtalo de nuevo.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
