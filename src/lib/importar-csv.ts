// Leer y validar el CSV de importación de gooals. Sin 'use server' y sin nada de
// la base: lo usan la Server Action (para validar de verdad) y el panel (para la
// plantilla y el CSV de las filas que fallan).

import Papa from 'papaparse'
import { CATEGORIAS, esCategoria, type AmbitoGooal, type CategoriaGooal } from '@/lib/gooals'

/** Cabecera exacta, en este orden. */
export const COLUMNAS_CSV = ['titulo', 'categoria', 'puntos', 'ambito', 'ciudad', 'pais', 'consulta_mapa'] as const

/**
 * Columna extra que lleva el CSV de las filas que fallan. Se acepta al final de
 * la cabecera y se ignora: así ese fichero, ya corregido, se reimporta tal cual.
 */
export const COLUMNA_MOTIVO = 'motivo'

export const MAX_FILAS_CSV = 5000
/**
 * Tamaño máximo del fichero. 5.000 filas con títulos largos rondan 1,5 MB, así que
 * sobra. Queda por debajo del límite de la Server Action (4 MB en next.config.ts,
 * que cuenta también el envoltorio del formulario) y del de Vercel (4,5 MB).
 */
export const MAX_BYTES_CSV = 3 * 1024 * 1024
const MAX_TITULO = 200

export type FilaCsv = {
  /** Línea del fichero, contando la cabecera como la 1: la que se ve al abrirlo en un editor. */
  linea: number
  titulo: string
  categoria: string
  puntos: string
  ambito: string
  ciudad: string
  pais: string
  consulta_mapa: string
  /** Cuántas celdas traía la línea (sin la de motivo). Distinto de 7: sobra o falta una coma. */
  columnas: number
  /**
   * La línea tal cual, solo cuando las columnas no cuadran: sus celdas están
   * corridas de sitio, y sin el original no hay manera de ver qué pasó.
   */
  original?: string
}

/** Una fila lista para insertar. */
export type GooalCsv = {
  titulo: string
  categoria: CategoriaGooal
  puntos: number
  ambito: AmbitoGooal
  ciudad: string | null
  pais: string | null
  geo_consulta: string | null
}

export type FilaRevisada =
  | { tipo: 'valida'; fila: FilaCsv; gooal: GooalCsv }
  | { tipo: 'error'; fila: FilaCsv; motivos: string[] }
  | { tipo: 'duplicada'; fila: FilaCsv; motivo: string }

export type Lectura =
  | { ok: true; filas: FilaCsv[] }
  | { ok: false; error: string }

/**
 * El título tal como se compara para detectar duplicados: minúsculas, sin
 * acentos y sin espacios de sobra. "Visitar  el Atomium" y "visitar el atómium"
 * son el mismo gooal.
 */
export function normalizarTitulo(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** De bytes a texto. Rechaza lo que no sea UTF-8 en vez de guardar tildes rotas. */
export function decodificarCsv(bytes: ArrayBuffer): { ok: true; texto: string } | { ok: false; error: string } {
  try {
    // fatal: sin esto, un CSV guardado en "ANSI" por Excel se lee sin error y
    // "Bélgica" entra en la base como "B�lgica".
    const texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    // El BOM de UTF-8 se quita a mano: si no, la primera columna se llamaría
    // "\uFEFFtitulo" y la cabecera no coincidiría.
    return { ok: true, texto: texto.replace(/^\uFEFF/, '') }
  } catch {
    return { ok: false, error: 'El fichero no está en UTF-8. En Excel, guárdalo como "CSV UTF-8 (delimitado por comas)".' }
  }
}

/**
 * Parte el CSV en filas con papaparse, que respeta las comillas: los títulos
 * llevan comas ("Ver el Atomium, de noche").
 */
export function leerCsv(texto: string): Lectura {
  if (!texto.trim()) return { ok: false, error: 'El fichero está vacío.' }

  const filas: string[][] = []
  const inicios: number[] = []
  const finales: number[] = []
  let cursor = 0
  let fallo: string | null = null

  Papa.parse<string[]>(texto, {
    header: false,
    delimiter: ',',
    skipEmptyLines: 'greedy',
    step: (resultado, parser) => {
      if (resultado.errors.length > 0) {
        const e = resultado.errors[0]
        fallo = e.code === 'MissingQuotes'
          ? 'Hay unas comillas sin cerrar. Revisa los títulos que llevan comillas.'
          : `No se puede leer el CSV: ${e.message}`
        parser.abort()
        return
      }
      // Dónde empieza esta fila, saltando las líneas vacías que papaparse se
      // come: con eso sale el número de línea real, aunque haya huecos.
      let inicio = cursor
      while (inicio < texto.length && /[\r\n\s]/.test(texto[inicio])) inicio++
      inicios.push(inicio)
      filas.push(resultado.data)
      cursor = resultado.meta.cursor
      finales.push(cursor)
    },
  })
  if (fallo) return { ok: false, error: fallo }
  if (filas.length === 0) return { ok: false, error: 'El fichero está vacío.' }

  const cabecera = filas[0].map(c => c.trim())
  const esperada = COLUMNAS_CSV.join(',')
  const conMotivo = cabecera.join(',') === `${esperada},${COLUMNA_MOTIVO}`
  if (cabecera.join(',') !== esperada && !conMotivo) {
    return { ok: false, error: `La primera línea tiene que ser exactamente:\n${esperada}\n\nY es:\n${cabecera.join(',')}` }
  }

  const datos = filas.slice(1)
  if (datos.length > MAX_FILAS_CSV) {
    return {
      ok: false,
      error: `El fichero tiene ${datos.length.toLocaleString('es-ES')} filas y el máximo son ${MAX_FILAS_CSV.toLocaleString('es-ES')}. Pártelo en varios.`,
    }
  }

  // Número de línea: 1 + saltos de línea antes del inicio de la fila. Se cuenta
  // de forma incremental; con 5.000 filas, recontar desde el principio cada vez
  // serían millones de pasadas.
  let linea = 1
  let hasta = 0
  const lineaDe = (posicion: number) => {
    for (; hasta < posicion; hasta++) if (texto[hasta] === '\n') linea++
    return linea
  }
  lineaDe(inicios[0])

  return {
    ok: true,
    filas: datos.map((celdas, i) => {
      const [titulo, categoria, puntos, ambito, ciudad, pais, consulta_mapa] = COLUMNAS_CSV.map((_, j) => celdas[j] ?? '')
      // La celda de motivo no cuenta: así un fichero con o sin ella se valida igual.
      const columnas = conMotivo && celdas.length === COLUMNAS_CSV.length + 1 ? COLUMNAS_CSV.length : celdas.length
      const fila: FilaCsv = { linea: lineaDe(inicios[i + 1]), titulo, categoria, puntos, ambito, ciudad, pais, consulta_mapa, columnas }
      if (columnas !== COLUMNAS_CSV.length) fila.original = texto.slice(inicios[i + 1], finales[i + 1]).trim()
      return fila
    }),
  }
}

const limpio = (valor: string) => valor.replace(/\s+/g, ' ').trim()
const sinAcentos = (valor: string) => valor.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/** Los errores de una fila; si no hay ninguno, el gooal listo para insertar. */
function validarFila(fila: FilaCsv): { motivos: string[] } | { gooal: GooalCsv } {
  const motivos: string[] = []
  // Una columna de más o de menos es casi siempre una coma: un título con comas
  // sin comillas parte la fila. Se dice así, y no con un confuso "falta el ámbito".
  if (fila.columnas !== COLUMNAS_CSV.length) {
    return { motivos: [`Tiene ${fila.columnas} columnas y tienen que ser ${COLUMNAS_CSV.length}. ¿Falta una coma, o un título con comas va sin comillas? La línea era: ${fila.original ?? ''}`] }
  }

  const titulo = limpio(fila.titulo)
  if (titulo.length < 3) motivos.push(titulo ? `El título "${titulo}" es demasiado corto (mínimo 3 caracteres).` : 'Falta el título.')
  else if (titulo.length > MAX_TITULO) motivos.push(`El título tiene ${titulo.length} caracteres; el máximo son ${MAX_TITULO}.`)

  // Tolera mayúsculas y tildes ("Gastronomía"), que es como lo escribe una persona.
  const categoria = sinAcentos(fila.categoria)
  if (!esCategoria(categoria)) {
    motivos.push(fila.categoria.trim()
      ? `La categoría "${fila.categoria.trim()}" no existe. Son: ${CATEGORIAS.join(', ')}.`
      : `Falta la categoría. Son: ${CATEGORIAS.join(', ')}.`)
  }

  // Solo dígitos: "5.5" o "cinco" no valen, y Number("5.0") colaría un decimal.
  const textoPuntos = fila.puntos.trim()
  const puntos = /^\d{1,2}$/.test(textoPuntos) ? Number(textoPuntos) : NaN
  if (!(puntos >= 1 && puntos <= 10)) {
    motivos.push(textoPuntos ? `Los puntos "${textoPuntos}" no valen: tiene que ser un número entero del 1 al 10.` : 'Faltan los puntos (un número entero del 1 al 10).')
  }

  const ambito = sinAcentos(fila.ambito)
  if (ambito !== 'lugar' && ambito !== 'personal') {
    motivos.push(fila.ambito.trim() ? `El ámbito "${fila.ambito.trim()}" no existe: tiene que ser lugar o personal.` : 'Falta el ámbito (lugar o personal).')
  }

  const ciudad = limpio(fila.ciudad) || null
  const pais = limpio(fila.pais) || null
  // Con ciudad es un sitio: tiene que ir como lugar para llegar al mapa. Solo con
  // país sí vale como personal: "Probar moussaka" con Grecia es un plato, no un
  // sitio, y ya hay cientos así en el catálogo.
  if (ambito === 'personal' && ciudad) {
    motivos.push(`Es personal pero lleva ciudad ("${ciudad}"). Si es un sitio, ponlo como lugar; si no, quita la ciudad.`)
  }

  if (motivos.length > 0) return { motivos }
  return {
    gooal: {
      titulo,
      categoria: categoria as CategoriaGooal,
      puntos,
      ambito: ambito as AmbitoGooal,
      ciudad,
      pais,
      geo_consulta: limpio(fila.consulta_mapa) || null,
    },
  }
}

/**
 * Clasifica cada fila en válida, con error o duplicada.
 *
 * Primero los errores y después los duplicados, y solo las válidas cuentan para
 * los duplicados dentro del fichero: si la primera copia de un título tiene un
 * error, la segunda (bien escrita) es la que entra, en vez de perderse las dos.
 */
export function revisarFilas(filas: FilaCsv[], titulosExistentes: Set<string>): FilaRevisada[] {
  const enFichero = new Map<string, number>()
  return filas.map(fila => {
    const r = validarFila(fila)
    if ('motivos' in r) return { tipo: 'error', fila, motivos: r.motivos }

    const clave = normalizarTitulo(r.gooal.titulo)
    if (titulosExistentes.has(clave)) {
      return { tipo: 'duplicada', fila, motivo: 'Ya existe en el catálogo.' }
    }
    const lineaPrevia = enFichero.get(clave)
    if (lineaPrevia !== undefined) {
      return { tipo: 'duplicada', fila, motivo: `Repite el título de la línea ${lineaPrevia}.` }
    }
    enFichero.set(clave, fila.linea)
    return { tipo: 'valida', fila, gooal: r.gooal }
  })
}

/** CSV con BOM, para que Excel lea bien las tildes al abrirlo con doble clic. */
export function aCsv(filas: FilaCsv[], motivos?: string[]): string {
  const columnas = motivos ? [...COLUMNAS_CSV, COLUMNA_MOTIVO] : [...COLUMNAS_CSV]
  const datos = filas.map((f, i) => {
    const base = COLUMNAS_CSV.map(c => f[c])
    return motivos ? [...base, motivos[i]] : base
  })
  return '\uFEFF' + Papa.unparse({ fields: columnas, data: datos }, { newline: '\r\n' })
}
