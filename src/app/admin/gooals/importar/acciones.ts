'use server'

import { esAdmin } from '@/lib/admin-auth'
import { createServiceRoleClient } from '@/lib/supabase/service'
import {
  MAX_BYTES_CSV, decodificarCsv, leerCsv, normalizarTitulo, revisarFilas, type FilaRevisada,
} from '@/lib/importar-csv'

/** Filas por INSERT. Con 5.000 de golpe la petición pesa demasiado y un fallo se lo lleva todo. */
const LOTE = 500
/** Lo máximo que devuelve PostgREST por consulta, avise o no. */
const PAGINA = 1000

export type Previsualizacion =
  | { ok: true; revisadas: FilaRevisada[] }
  | { ok: false; error: string }

export type ResultadoImportacion =
  | { ok: false; error: string }
  | {
      ok: true
      /** Revisadas otra vez al importar: puede haber duplicados nuevos desde la previsualización. */
      revisadas: FilaRevisada[]
      insertadas: number
      /** Si se cortó a mitad. Lo anterior a `desdeLinea` ya está dentro. */
      fallo: { mensaje: string; desdeLinea: number; pendientes: number } | null
    }

type Servicio = ReturnType<typeof createServiceRoleClient>

/** Lee y valida el fichero del formulario. Todo lo que puede fallar antes de mirar la base. */
async function leerFichero(formData: FormData) {
  const fichero = formData.get('fichero')
  if (!(fichero instanceof File) || fichero.size === 0) {
    return { ok: false as const, error: 'No ha llegado ningún fichero, o está vacío.' }
  }
  if (fichero.size > MAX_BYTES_CSV) {
    return { ok: false as const, error: `El fichero pesa ${(fichero.size / 1024 / 1024).toFixed(1)} MB y el máximo son ${MAX_BYTES_CSV / 1024 / 1024} MB.` }
  }
  const texto = decodificarCsv(await fichero.arrayBuffer())
  if (!texto.ok) return texto
  return leerCsv(texto.texto)
}

/**
 * Todos los títulos del catálogo, ya normalizados.
 *
 * De 1.000 en 1.000 y ordenados por id: PostgREST corta en 1.000 filas sin
 * avisar, y sin un orden fijo las páginas pueden solaparse y saltarse títulos.
 * Un título saltado aquí es un duplicado que entraría sin que nadie lo viera.
 */
async function titulosDelCatalogo(service: Servicio): Promise<Set<string>> {
  const titulos = new Set<string>()
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await service
      .from('gooals_v2')
      .select('titulo')
      .order('id', { ascending: true })
      .range(desde, desde + PAGINA - 1)
    if (error) throw new Error(`No se pudieron leer los títulos del catálogo: ${error.message}`)
    for (const f of data ?? []) titulos.add(normalizarTitulo((f as { titulo: string }).titulo))
    if (!data || data.length < PAGINA) return titulos
  }
}

/** Lee el fichero y dice qué entraría, qué falla y qué está repetido. No escribe nada. */
export async function previsualizarCsv(formData: FormData): Promise<Previsualizacion> {
  if (!await esAdmin()) return { ok: false, error: 'Esta cuenta no tiene acceso al panel.' }

  try {
    const lectura = await leerFichero(formData)
    if (!lectura.ok) return lectura
    const service = createServiceRoleClient()
    return { ok: true, revisadas: revisarFilas(lectura.filas, await titulosDelCatalogo(service)) }
  } catch (e) {
    console.error('[importar CSV] previsualizar', e)
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo leer el fichero.' }
  }
}

/**
 * Importa las filas válidas como borrador.
 *
 * Vuelve a leer y validar el fichero desde cero en vez de fiarse de lo que se
 * previsualizó: lo que llega del navegador se puede tocar, y entre un paso y
 * otro alguien puede haber creado un gooal con el mismo título.
 */
export async function importarCsv(formData: FormData): Promise<ResultadoImportacion> {
  if (!await esAdmin()) return { ok: false, error: 'Esta cuenta no tiene acceso al panel.' }

  let revisadas: FilaRevisada[]
  try {
    const lectura = await leerFichero(formData)
    if (!lectura.ok) return lectura
    revisadas = revisarFilas(lectura.filas, await titulosDelCatalogo(createServiceRoleClient()))
  } catch (e) {
    console.error('[importar CSV] revisar', e)
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo leer el fichero.' }
  }

  const validas = revisadas.flatMap(r => (r.tipo === 'valida' ? [r] : []))
  const service = createServiceRoleClient()
  let insertadas = 0

  for (let i = 0; i < validas.length; i += LOTE) {
    const lote = validas.slice(i, i + LOTE)
    const filas = lote.map(({ gooal }) => ({
      ...gooal,
      // Siempre borrador: se publica al verificarlo en el panel, nunca por venir en un CSV.
      estado: 'borrador',
      activo: true,
      // Sin dificultad: la calcula el disparador de fase3f.sql a partir de los puntos.
      // Sin pin: la geocodificación es un paso posterior. geo null es lo que ya
      // significa "todavía nadie lo ha buscado en el mapa" (los 370 lugares sin pin).
      lat: null,
      lng: null,
      geo: null,
    }))

    // Un lote es un único INSERT: entra entero o no entra nada. Por eso, si falla,
    // se sabe exactamente hasta dónde llegó.
    let mensaje: string | null = null
    try {
      const { error } = await service.from('gooals_v2').insert(filas)
      if (error) mensaje = error.message
    } catch (e) {
      mensaje = e instanceof Error ? e.message : 'Error de conexión'
    }

    if (mensaje) {
      console.error('[importar CSV] lote desde la línea', lote[0].fila.linea, mensaje)
      return {
        ok: true, revisadas, insertadas,
        fallo: { mensaje, desdeLinea: lote[0].fila.linea, pendientes: validas.length - insertadas },
      }
    }
    insertadas += lote.length
  }

  return { ok: true, revisadas, insertadas, fallo: null }
}
