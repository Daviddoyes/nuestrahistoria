// Importa de una vez los CSV del catálogo nuevo escrito a mano.
//
// NO duplica la lógica del panel: importa y usa la misma
// (src/lib/importar-csv.ts), así que lo que valga aquí vale allí y al revés.
// El alias "@/" lo resuelve scripts/lib/registrar-alias.mjs.
//
// Entra todo como BORRADOR, igual que por el panel: publicar es otro paso.
//
// Los duplicados se miran en tres frentes:
//   - contra el catálogo que ya hay en la base
//   - contra los ficheros anteriores de esta misma pasada
//   - dentro del propio fichero
//
// Uso, desde la raíz del repo:
//   node --import ./scripts/lib/registrar-alias.mjs --env-file=.env.local \
//        scripts/catalogo-nuevo/importar-lotes.mjs --seco
//   ...y lo mismo sin --seco para que entre de verdad.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { decodificarCsv, leerCsv, normalizarTitulo, revisarFilas } from '@/lib/importar-csv'

/**
 * Los ficheros, nombrados uno a uno y en orden.
 *
 * A propósito NO se cogen todos los .csv de la carpeta con un comodín. Ahí
 * conviven con estas listas:
 *   - gooals-plantilla.csv, el ejemplo, con categorías viejas que la base ya no
 *     acepta.
 *   - las entregas siguientes (estadios, eventos, fiestas...), que se importan
 *     cuando toca y no antes.
 *   - gooals-comunes.csv: 60 gooals de vida cotidiana que se escribieron y se
 *     RECHAZARON. "Aprender un idioma hasta poder conversar" o "Ver el mar" no
 *     conectan a nadie: fallan el principio de que un gooal tiene que ser
 *     memorable. Ese fichero está borrado y no se vuelve a importar.
 *
 * Para añadir una entrega nueva, se escribe aquí su nombre. Nunca un comodín.
 */
const CARPETA = 'Claude outputs'
const FICHEROS = [
  '1-ciudades-europa.csv',
  '2-ciudades-asia.csv',
  '3-ciudades-america.csv',
  '4-ciudades-africa-oriente.csv',
  '5-ciudades-oceania.csv',
  '6-estadios.csv',
  // Eventos que cambian de sede cada año: van como PERSONAL y sin ciudad ni
  // país, a propósito. Lo que tiene sede fija es un pin del mapa; lo que se
  // muda de ciudad es un evento abierto y no lleva mapa.
  '7-eventos.csv',
  '8-fiestas.csv',
]

const LOTE = 500      // filas por INSERT, igual que el panel
const PAGINA = 1000   // PostgREST corta ahí y no avisa

const seco = process.argv.includes('--seco')
// Se pueden pasar nombres de fichero para importar solo esos. Sin ellos, todos.
// Útil al añadir una entrega nueva: relanzar los ya importados no rompe nada
// (son duplicados y se saltan), pero ensucia el parte con 238 falsos positivos.
const pedidos = process.argv.slice(2).filter(a => a.endsWith('.csv'))
const aImportar = pedidos.length ? pedidos : FICHEROS
const num = n => n.toLocaleString('es-ES')

for (const p of pedidos) {
  if (!FICHEROS.includes(p)) {
    console.error(`✗ "${p}" no está en la lista de ficheros del script. Añádelo arriba a mano si toca importarlo.`)
    process.exit(1)
  }
}

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

/** Todos los títulos del catálogo, normalizados. Paginado y ordenado por id. */
async function titulosDelCatalogo() {
  const titulos = new Set()
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await service.from('gooals_v2').select('titulo')
      .order('id', { ascending: true }).range(desde, desde + PAGINA - 1)
    if (error) throw new Error(`No se pudieron leer los títulos del catálogo: ${error.message}`)
    for (const f of data) titulos.add(normalizarTitulo(f.titulo))
    if (data.length < PAGINA) return titulos
  }
}

console.log(seco ? 'EN SECO: no se va a escribir nada.\n' : 'IMPORTANDO DE VERDAD.\n')

const delCatalogo = await titulosDelCatalogo()
console.log(`Catálogo actual: ${num(delCatalogo.size)} títulos\n`)

// El conjunto crece con lo que se acepta: así el fichero 3 ya sabe lo que entró
// por el 1 y el 2, y un sitio repetido entre continentes no entra dos veces.
const conocidos = new Set(delCatalogo)
const origen = new Map()   // clave normalizada -> fichero por el que entró
const parte = []

for (const nombre of aImportar) {
  const ruta = join(CARPETA, nombre)
  if (!existsSync(ruta)) { console.error(`✗ no está ${ruta}`); process.exit(1) }

  const bytes = readFileSync(ruta)
  const texto = decodificarCsv(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  if (!texto.ok) { console.error(`✗ ${nombre}: ${texto.error}`); process.exit(1) }
  const lectura = leerCsv(texto.texto)
  if (!lectura.ok) { console.error(`✗ ${nombre}: ${lectura.error}`); process.exit(1) }

  const revisadas = revisarFilas(lectura.filas, conocidos)
  const validas = revisadas.filter(r => r.tipo === 'valida')
  const errores = revisadas.filter(r => r.tipo === 'error')

  // De dónde viene cada duplicado. Lo que ya cubría el catálogo viejo es una
  // información distinta de lo que se repite entre las listas nuevas.
  const delViejo = []
  const entreNuevos = []
  const dentro = []
  for (const r of revisadas.filter(x => x.tipo === 'duplicada')) {
    const clave = normalizarTitulo(r.fila.titulo)
    if (/Repite el título de la línea/.test(r.motivo)) dentro.push(r)
    else if (origen.has(clave)) entreNuevos.push({ ...r, donde: origen.get(clave) })
    else delViejo.push(r)
  }

  // Insertar, en lotes y como borrador.
  let insertadas = 0
  let fallo = null
  for (let i = 0; i < validas.length && !seco; i += LOTE) {
    const lote = validas.slice(i, i + LOTE)
    const filas = lote.map(({ gooal }) => ({
      ...gooal,
      estado: 'borrador',   // publicar es otro paso, nunca por venir en un CSV
      activo: true,
      // Sin dificultad: la calcula el disparador a partir de los puntos.
      // Sin pin: geocodificar es un paso posterior, y geo null ya significa
      // "nadie lo ha buscado todavía en el mapa".
      lat: null, lng: null, geo: null,
    }))
    const { error } = await service.from('gooals_v2').insert(filas)
    if (error) { fallo = { mensaje: error.message, desdeLinea: lote[0].fila.linea }; break }
    insertadas += lote.length
  }

  // Lo aceptado pasa a ser "conocido" para los ficheros siguientes. Se apunta
  // aunque sea en seco: si no, en seco no se detectarían los cruces.
  for (const v of validas) {
    const clave = normalizarTitulo(v.gooal.titulo)
    conocidos.add(clave)
    origen.set(clave, nombre)
  }

  const ciudades = new Set(validas.map(v => v.gooal.ciudad).filter(Boolean))
  parte.push({ nombre, filas: lectura.filas.length, validas, insertadas, fallo, errores, delViejo, entreNuevos, dentro, ciudades })

  console.log(nombre)
  console.log(`  filas: ${lectura.filas.length} · entran: ${validas.length} (${ciudades.size} ciudades)${seco ? '' : ` · insertadas: ${insertadas}`}`)
  if (delViejo.length) console.log(`  ya estaban en el catálogo: ${delViejo.length}`)
  if (entreNuevos.length) console.log(`  repetidas con otro fichero nuevo: ${entreNuevos.length}`)
  if (dentro.length) console.log(`  repetidas dentro del propio fichero: ${dentro.length}`)
  if (errores.length) console.log(`  con error: ${errores.length}`)
  if (fallo) console.log(`  CORTADO en la línea ${fallo.desdeLinea}: ${fallo.mensaje}`)
  console.log()
}

// ── El detalle de los duplicados, que es lo que de verdad interesa ──
console.log('═══════ DUPLICADOS, UNO A UNO ═══════')
let hayDuplicados = false
for (const p of parte) {
  if (!p.delViejo.length && !p.entreNuevos.length && !p.dentro.length) continue
  hayDuplicados = true
  console.log(`\n${p.nombre}`)
  for (const r of p.delViejo) console.log(`  [ya en el catálogo] «${r.fila.titulo}»`)
  for (const r of p.entreNuevos) console.log(`  [ya en ${r.donde}] «${r.fila.titulo}»`)
  for (const r of p.dentro) console.log(`  [dentro del fichero] «${r.fila.titulo}» — ${r.motivo}`)
}
if (!hayDuplicados) console.log('Ninguno.')

console.log('\n═══════ ERRORES ═══════')
const conError = parte.filter(p => p.errores.length)
if (!conError.length) console.log('Ninguno.')
for (const p of conError) {
  console.log(`\n${p.nombre}`)
  for (const r of p.errores) console.log(`  línea ${r.fila.linea}: «${r.fila.titulo}» — ${r.motivos.join(' · ')}`)
}

const suma = c => parte.reduce((t, p) => t + (Array.isArray(p[c]) ? p[c].length : p[c]), 0)
console.log('\n═══════ TOTAL ═══════')
console.log(`Filas leídas:                  ${num(suma('filas'))}`)
console.log(`Entran:                        ${num(suma('validas'))}${seco ? ' (en seco, sin escribir)' : ''}`)
if (!seco) console.log(`Insertadas de verdad:          ${num(suma('insertadas'))}`)
console.log(`Ya estaban en el catálogo:     ${num(suma('delViejo'))}`)
console.log(`Repetidas entre ficheros:      ${num(suma('entreNuevos'))}`)
console.log(`Repetidas dentro del fichero:  ${num(suma('dentro'))}`)
console.log(`Con error:                     ${num(suma('errores'))}`)
console.log(seco
  ? '\nEN SECO: no se ha escrito nada. Si el parte cuadra, lánzalo sin --seco.'
  : '\nTodo lo que ha entrado está en BORRADOR: se publica al verificarlo en el panel.')
