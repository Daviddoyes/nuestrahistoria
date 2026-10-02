// Audita los pines ya puestos: ¿el sitio encontrado se parece de verdad al que
// se buscaba, o coincidía solo por la ciudad?
//
// Nace de un fallo real: la primera versión del verificador comparaba el nombre
// buscado con la dirección COMPLETA del resultado, y la dirección de cualquier
// sitio de Milán lleva "Milano" dentro. Así, «Duomo de Milán» casó con las
// Gallerie d'Italia, que es otro museo a cuatro calles. El pin era mentira.
//
// Esto NO vuelve a preguntar a Nominatim: lee el registro que dejó la pasada,
// donde está el nombre del sitio que devolvió cada consulta, y aplica el
// criterio corregido. Los sospechosos se quedan SIN pin para que la siguiente
// pasada los vuelva a buscar con el verificador bueno.
//
// Uso, desde la raíz del repo:
//   node --env-file=.env.local scripts/catalogo-nuevo/auditar-pines.mjs --seco <registros...>
//   node --env-file=.env.local scripts/catalogo-nuevo/auditar-pines.mjs <registros...>

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const seco = args.includes('--seco')
const registros = args.filter(a => !a.startsWith('--'))
if (registros.length === 0) {
  console.error('Pásame los ficheros de registro de las pasadas.')
  process.exit(1)
}

const sinAcentos = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const VACIAS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'y', 'a', 'al', 'en', 'of', 'the', 'and',
  'museo', 'museum', 'parque', 'park', 'nacional', 'national', 'mercado', 'market',
  'iglesia', 'church', 'catedral', 'cathedral', 'monte', 'mount', 'lago', 'lake',
  'rio', 'river', 'playa', 'beach', 'isla', 'island', 'calle', 'plaza', 'square',
  'puente', 'bridge', 'torre', 'tower', 'palacio', 'palace', 'templo', 'temple',
  'barrio', 'centro', 'ciudad', 'city', 'casco', 'historico', 'historic',
])
/** Las mismas listas que usa geocodificar.mjs para rechazar una respuesta. */
const ASENTAMIENTOS = new Set([
  'city', 'town', 'village', 'hamlet', 'suburb', 'quarter', 'neighbourhood',
  'administrative', 'boundary', 'county', 'state', 'province', 'region',
  'municipality', 'borough', 'district', 'city_district',
])
const SERVICIOS = new Set([
  'hospital', 'postcode', 'post_office', 'police', 'fire_station',
  'fire_detection_system', 'ngo', 'residential', 'living_street',
])

const significativas = texto => new Set(
  sinAcentos(texto).replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/)
    .filter(p => p.length > 2 && !VACIAS.has(p)))

// Las líneas de acierto del registro:  «Título»  →  Sitio encontrado [tipo, marca]
const LINEA = /^\s*\d+\/\d+\s+✓\s+«(.+?)»\s+→\s+(.+?)\s+\[([^,]+),\s*([^\]]+)\]\s*$/
const encontrados = new Map()
for (const fichero of registros) {
  for (const linea of readFileSync(fichero, 'utf8').split(/\r?\n/)) {
    const m = linea.match(LINEA)
    if (m) encontrados.set(m[1], { sitio: m[2], tipo: m[3], marca: m[4] })
  }
}
console.log(`Aciertos leídos del registro: ${encontrados.size}`)

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const filas = []
for (let desde = 0; ; desde += 1000) {
  const { data, error } = await service
    .from('gooals_v2')
    .select('id, titulo, ciudad, pais, geo_consulta, geo, lat')
    .eq('ambito', 'lugar')
    .gte('created_at', '2026-10-01')
    .not('lat', 'is', null)
    .order('id', { ascending: true })
    .range(desde, desde + 999)
  if (error) { console.error(error.message); process.exit(1) }
  filas.push(...data)
  if (data.length < 1000) break
}
console.log(`Con pin en la base: ${filas.length}\n`)

const sospechosos = []
const sinRegistro = []
for (const g of filas) {
  const dato = encontrados.get(g.titulo)
  if (!dato) { sinRegistro.push(g); continue }

  const nombreSitio = (g.geo_consulta ?? '').split(',')[0].trim()
  const buscadas = significativas(nombreSitio)
  for (const p of [...significativas(g.ciudad ?? ''), ...significativas(g.pais ?? '')]) buscadas.delete(p)
  // Si al quitar ciudad y país no queda nada que distinga, la consulta era solo
  // el nombre de la ciudad: el pin apunta a la ciudad y eso no es un engaño.
  if (buscadas.size === 0) continue

  // Un distrito o un servicio no son el sitio, por mucho que se llamen igual.
  if (ASENTAMIENTOS.has(dato.tipo)) {
    sospechosos.push({ ...g, ...dato, tokens: [...buscadas], motivo: `es un ${dato.tipo}, no el sitio` })
    continue
  }
  if (SERVICIOS.has(dato.tipo)) {
    sospechosos.push({ ...g, ...dato, tokens: [...buscadas], motivo: `es un ${dato.tipo}` })
    continue
  }

  const texto = sinAcentos(dato.sitio)
  if (![...buscadas].some(p => texto.includes(p))) {
    sospechosos.push({ ...g, ...dato, tokens: [...buscadas], motivo: 'el nombre no se parece' })
  }
}

console.log(`SOSPECHOSOS (el sitio encontrado no se parece al buscado): ${sospechosos.length}`)
for (const g of sospechosos) {
  console.log(`  «${g.titulo}»`)
  console.log(`      buscaba: ${g.geo_consulta}`)
  console.log(`      encontró: ${g.sitio} [${g.tipo}]  ·  faltaba: ${g.tokens.join(', ')}`)
}
if (sinRegistro.length) console.log(`\nSin línea en el registro (no se pueden auditar): ${sinRegistro.length}`)

if (!seco && sospechosos.length) {
  for (const g of sospechosos) {
    const { error } = await service.from('gooals_v2')
      .update({ lat: null, lng: null, geo: null })
      .eq('id', g.id)
    if (error) console.error(`  no se pudo quitar el pin de «${g.titulo}»: ${error.message}`)
  }
  console.log(`\nPines retirados: ${sospechosos.length}. Vuelve a lanzar geocodificar.mjs y los buscará con el verificador corregido.`)
}
if (seco) console.log('\nEN SECO: no se ha tocado nada.')
