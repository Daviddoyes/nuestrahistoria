#!/usr/bin/env node
/**
 * GooALS — pone coordenadas a los gooals que tienen un lugar concreto.
 *
 *   node geocodificar.mjs --limite 20     # prueba corta, para ver qué sale
 *   node geocodificar.mjs                 # todos (unos 50 min)
 *   node geocodificar.mjs --fallidos      # solo los que quedaron sin resultado
 *   node geocodificar.mjs --rehacer       # TODOS otra vez (casi una hora)
 *   node geocodificar.mjs --rehacer --solo espectaculos   # rehacer una sola
 *
 *   node geocodificar.mjs --recuperar --solo espectaculos # mejorar pines malos
 *
 * Cada sitio se intenta hasta tres veces, bajando el listón:
 *   1. sitio + ciudad + país   el ideal
 *   2. sitio + país            cuando la "ciudad" estorba o engaña
 *   3. ciudad + país           el peor pin posible, pero es un pin
 *
 * El orden importa: el nombre del recinto es único, el de la ciudad no. Hay
 * dos Lakeville y dos Madison en Estados Unidos, y preguntando primero por la
 * ciudad los pines se iban de estado.
 *
 * Lee gooals.json, pregunta a Nominatim (el buscador de OpenStreetMap) dónde
 * está cada sitio y escribe lat/lng de vuelta en el mismo fichero.
 *
 * Solo se geocodifican los gooals con ciudad Y país. Los que solo tienen país
 * son una zona, no un punto, y los deslocalizados (deporte entero, las fusiones
 * del PDF de aventura) no van al mapa a propósito.
 *
 * Es reanudable: guarda cada 25 y al relanzarlo salta los que ya tienen
 * coordenadas. Si lo cortas con Ctrl+C no pierdes lo hecho.
 *
 * Nominatim es gratis y su norma es máximo una consulta por segundo con un
 * User-Agent que identifique a quien pregunta. Este script respeta las dos.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const FICHERO = join(aqui, 'gooals.json')

const AGENTE = 'GooALS/1.0 (hola@gooals.app)'
const ESPERA_MS = 1100          // la norma es 1 s; damos margen
const GUARDAR_CADA = 25

// ── Argumentos ──────────────────────────────────────────────────────
const args = process.argv.slice(2)
const rehacer = args.includes('--rehacer')
// --rehacer vuelve a lanzar TODO, incluidos los miles ya resueltos (una hora).
// --fallidos coge solo los que quedaron sin resultado, que son unos pocos.
const soloFallidos = args.includes('--fallidos')
// --recuperar: todo lo que no sea un acierto exacto. Los 'solo-ciudad' tienen
// pin, pero es el centro de la ciudad, no el sitio; conviene reintentarlos
// cuando mejora la consulta, sin volver a lanzar los miles que ya están bien.
const recuperar = args.includes('--recuperar')
const iLimite = args.indexOf('--limite')
const limite = iLimite >= 0 ? parseInt(args[iLimite + 1], 10) : Infinity
// --solo <categoria u origen> acota a una categoría (naturaleza) o a un PDF de
// origen (espectaculos), para poder rehacer solo eso sin tirar abajo las horas
// de geocodificado del resto.
const iSolo = args.indexOf('--solo')
const soloCategoria = iSolo >= 0 ? args[iSolo + 1] : null

// ── Preparar la consulta ────────────────────────────────────────────
// Los títulos empiezan por un verbo ("Visitar el Museo del Prado") y pueden
// llevar el país pegado para desambiguar ("· Zambia"). Nada de eso ayuda a
// encontrar el sitio en un mapa.
const VERBOS = /^(Visitar|Probar|Vivir|Ver|Explorar|Ascender|Completar|Recorrer|Bucear en|Escalar en|Subir a|Asistir a|Ir al|Ir a)\s+/i
const ARTICULOS = /^(el|la|los|las|un|una)\s+/i

// En gastronomía el título es un plato, no un lugar: "Paella valenciana en su
// contexto local" no está en ningún mapa. Para esas se pregunta directamente por
// la ciudad, que es la respuesta correcta y ahorra una consulta por reto.
const SOLO_CIUDAD = new Set(['gastronomia'])

// En espectáculos el sitio va SIEMPRE detrás de un "en": "Ver un partido en el
// Santiago Bernabéu", "Ver un Gran Premio de MotoGP en Assen". Quitar solo el
// verbo dejaba "partido en el Santiago Bernabéu", que no existe en ningún mapa
// — y entonces caía al segundo intento y clavaba el pin en el centro de Madrid.
// Los 177 estadios habrían acabado todos en la plaza mayor de su ciudad.
const TRAS_EN = / en (?!.* en )/i

function sitioDe(r) {
  if (r.geo_consulta) return r.geo_consulta
  let t = r.titulo.split(' · ')[0]
  // Por origen y no por categoría: eventos mezcla los espectáculos con lo que
  // vino de música y cultura, y a esos otros no les vale esta regla.
  if (r.origen === 'espectaculos' && TRAS_EN.test(t)) {
    t = t.split(TRAS_EN).pop()
  }
  return t.replace(VERBOS, '').replace(ARTICULOS, '').trim()
}

function consultaDe(r) {
  return [sitioDe(r), r.ciudad, r.pais].filter(Boolean).join(', ')
}

async function preguntar(texto) {
  const url = 'https://nominatim.openstreetmap.org/search'
    + `?q=${encodeURIComponent(texto)}&format=json&limit=1&addressdetails=0`
  const res = await fetch(url, { headers: { 'User-Agent': AGENTE } })
  if (res.status === 429) throw new Error('Nominatim pide bajar el ritmo (429)')
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  const json = await res.json()
  if (!json.length) return null
  const p = json[0]
  return {
    lat: Number(p.lat),
    lng: Number(p.lon),
    // 'importance' de Nominatim: lo alto es un sitio conocido, lo bajo una
    // coincidencia dudosa. Sirve para saber qué repasar después.
    importancia: Number(p.importance ?? 0),
    encontrado: p.display_name,
  }
}

const espera = ms => new Promise(r => setTimeout(r, ms))

// ── Main ────────────────────────────────────────────────────────────
if (!existsSync(FICHERO)) {
  console.error(`No encuentro ${FICHERO}`)
  process.exit(1)
}

const catalogo = JSON.parse(readFileSync(FICHERO, 'utf8'))
const todos = Object.values(catalogo).flat()

const candidatos = todos.filter(r => {
  // Vale tanto una categoría (naturaleza) como un origen (espectaculos).
  if (soloCategoria && r.categoria !== soloCategoria && r.origen !== soloCategoria) return false
  if (!r.ciudad || !r.pais) return false          // sin lugar concreto
  if (soloFallidos) return r.geo === 'sin-resultado'
  // Los que llevan geo_consulta entran siempre: esa columna se escribió a mano
  // justamente porque la búsqueda automática había fallado, y el fallo puede
  // haber dejado un pin con pinta de bueno. "Bristol" salió como 'fiable'
  // apuntando a Rhode Island, y "Charlotte" al vertedero de al lado del
  // circuito. Sin esto, esos dos nunca se corregirían.
  if (recuperar) return r.geo === 'sin-resultado' || r.geo === 'solo-ciudad'
                      || Boolean(r.geo_consulta)
  if (r.lat != null && !rehacer) return false      // ya hecho
  if (r.geo === 'sin-resultado' && !rehacer) return false
  return true
})

const aHacer = candidatos.slice(0, limite)

console.log(`${todos.length} gooals en total`)
console.log(`${todos.filter(r => r.ciudad && r.pais).length} tienen ciudad y país`)
console.log(`${todos.filter(r => r.lat != null).length} ya tienen coordenadas`)
console.log(`\nVoy a geocodificar ${aHacer.length}.`)
if (aHacer.length > 100) {
  console.log(`Tardará unos ${Math.round(aHacer.length * ESPERA_MS / 60000)} minutos. Ctrl+C para parar; no se pierde lo hecho.`)
}
console.log()

function guardar() {
  writeFileSync(FICHERO, JSON.stringify(catalogo, null, 0), 'utf8')
}

let ok = 0, vacios = 0, fallos = 0

for (const [i, r] of aHacer.entries()) {
  const soloCiudad = SOLO_CIUDAD.has(r.categoria)
  // geo_consulta manda sobre todo lo demás: es la consulta escrita a mano en
  // espectaculos.txt para los sitios cuyo nombre corto engaña al buscador.
  const q = r.geo_consulta
    ? [r.geo_consulta, r.pais].filter(Boolean).join(', ')
    : soloCiudad ? [r.ciudad, r.pais].join(', ') : consultaDe(r)
  try {
    const sitio = await preguntar(q)
    if (sitio) {
      r.lat = sitio.lat
      r.lng = sitio.lng
      r.geo = soloCiudad ? 'solo-ciudad'
        : sitio.importancia >= 0.4 ? 'fiable' : 'revisar'
      r.geo_encontrado = sitio.encontrado
      ok++
    } else {
      // ── Segundo intento: el sitio con el país, sin la ciudad ──
      //
      // Dos motivos, uno por categoría:
      //
      // · En viajes la "ciudad" a menudo no es una ciudad: el PDF trae "Valle
      //   del Loira", "Alpes italianos", "Bohemia del Sur" y hasta "southwest".
      //   Nominatim no encuentra "Castillos del Loira, Valle del Loira,
      //   Francia", pero sí "Castillos del Loira, Francia".
      //
      // · En espectáculos la ciudad es ambigua y el recinto no. Hay un Lakeville
      //   en Connecticut y otro en Minnesota, un Madison en Illinois y otro en
      //   Wisconsin; preguntando por la ciudad sola, el pin de Lime Rock Park
      //   acababa a 1.500 km. "Lime Rock Park, Estados Unidos" solo hay uno.
      //
      // Por eso se pregunta por el recinto ANTES que por la ciudad: el nombre
      // propio es el dato fiable y el topónimo suelto es el que engaña.
      await espera(ESPERA_MS)
      const sitio2 = await preguntar([sitioDe(r), r.pais].join(', '))
      if (sitio2) {
        r.lat = sitio2.lat
        r.lng = sitio2.lng
        r.geo = sitio2.importancia >= 0.4 ? 'fiable' : 'revisar'
        r.geo_encontrado = sitio2.encontrado
        ok++
      } else {
        // Tercer intento: la ciudad. Es el peor pin posible, pero es un pin.
        await espera(ESPERA_MS)
        const ciudad = await preguntar([r.ciudad, r.pais].join(', '))
        if (ciudad) {
          r.lat = ciudad.lat
          r.lng = ciudad.lng
          r.geo = 'solo-ciudad'
          r.geo_encontrado = ciudad.encontrado
          ok++
        } else {
          r.geo = 'sin-resultado'
          vacios++
        }
      }
    }
  } catch (e) {
    console.error(`  ! ${q} — ${e.message}`)
    fallos++
    if (String(e.message).includes('429')) {
      console.error('  Espero 30 s antes de seguir.')
      await espera(30000)
    }
  }

  if ((i + 1) % GUARDAR_CADA === 0) {
    guardar()
    const pct = Math.round(((i + 1) / aHacer.length) * 100)
    process.stdout.write(`\r  ${i + 1}/${aHacer.length} (${pct}%) · ok ${ok} · sin resultado ${vacios} · errores ${fallos}   `)
  }

  await espera(ESPERA_MS)
}

guardar()

console.log(`\n\nHecho. ${ok} con coordenadas · ${vacios} sin resultado · ${fallos} errores.`)

const conCoord = todos.filter(r => r.lat != null)
const porGeo = {}
for (const r of conCoord) porGeo[r.geo] = (porGeo[r.geo] ?? 0) + 1
console.log('Calidad:', porGeo)
console.log('\nLos marcados como "revisar" y "solo-ciudad" son los que conviene repasar en /admin.')
