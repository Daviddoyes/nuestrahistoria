// Pone el pin en el mapa a los gooals de lugar escritos a mano.
//
// Usa la columna geo_consulta, que trae el nombre exacto del sitio
// ("Torre Eiffel, París, Francia"), no el título. Es la diferencia con las
// veces anteriores: al geocodificador se le da un nombre de sitio, no un reto.
//
// MEJOR SIN PIN QUE CON UN PIN MENTIROSO. Nominatim devuelve con alegría un
// alquiler de bicis llamado "Atomium" o un colegio médico en el malecón de
// Miraflores. Así que ninguna respuesta se guarda sin pasar antes por
// comprobar(): el nombre tiene que parecerse, el país tiene que coincidir y el
// tipo de sitio no puede ser un comercio cualquiera. Lo que no pasa el filtro
// se queda sin coordenadas y con geo = 'sin-resultado', para mirarlo a mano.
//
// Se puede parar con Ctrl+C y volver a lanzar: cada fila se guarda al momento y
// al arrancar solo coge las que siguen sin coordenadas.
//
// Uso, desde la raíz del repo:
//   node --env-file=.env.local scripts/catalogo-nuevo/geocodificar.mjs --seco
//   node --env-file=.env.local scripts/catalogo-nuevo/geocodificar.mjs
//
// Opciones: --seco (no escribe nada) · --limite N (solo las N primeras)

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'

/** Nominatim pide una petición por segundo como máximo. 1.100 ms va sobrado. */
const ESPERA = 1100
/** Y pide identificarse con algo real. Sin esto, cortan el acceso. */
const UA = 'GooALS/1.0 (+https://gooals.app; hola@gooals.app)'
const CORTE = '2026-10-01'
const PAGINA = 1000

const args = process.argv.slice(2)
const seco = args.includes('--seco')
const iLim = args.indexOf('--limite')
const limite = iLim >= 0 && args[iLim + 1] ? Number(args[iLim + 1]) : 0
// Por defecto solo se prueban las filas que nunca se han intentado. Con
// --reintentar entran también las que ya quedaron sin pin, para cuando se
// mejora el buscador o se corrige geo_consulta.
const reintentar = args.includes('--reintentar')

const dormir = ms => new Promise(r => setTimeout(r, ms))
const sinAcentos = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Tipos de sitio que SÍ pueden ser el destino de un gooal. Un resultado de estos
 * se da por bueno aunque Nominatim le ponga importancia 0: al Atomium le pone 0
 * y es el Atomium.
 */
const TIPOS_BUENOS = new Set([
  'attraction', 'museum', 'artwork', 'monument', 'memorial', 'castle', 'fort', 'ruins',
  'archaeological_site', 'place_of_worship', 'cathedral', 'church', 'mosque', 'temple',
  'volcano', 'peak', 'massif', 'glacier', 'waterfall', 'cave_entrance', 'cliff', 'beach',
  'bay', 'island', 'islet', 'national_park', 'nature_reserve', 'protected_area', 'park',
  'garden', 'zoo', 'aquarium', 'theme_park', 'water_park', 'viewpoint', 'marketplace',
  'theatre', 'opera_house', 'arena', 'stadium', 'raceway', 'pitch', 'sports_centre',
  'bridge', 'tower', 'lighthouse', 'palace', 'library', 'university', 'square',
  'pedestrian', 'townhall', 'station', 'funicular', 'cable_car', 'gondola', 'lake',
  'reservoir', 'river', 'canal', 'spring', 'hot_spring', 'desert', 'dune', 'wetland',
])

/**
 * Tipos que NUNCA son el destino, por mucho que se llamen igual. Esta lista es
 * la que impide el pin mentiroso: el "Atomium" alquiler de bicis, el "Atomium"
 * panadería, el colegio médico del malecón.
 */
const TIPOS_MALOS = new Set([
  'bicycle_rental', 'bakery', 'pharmacy', 'taxi', 'association', 'bank', 'atm',
  'fuel', 'dentist', 'doctors', 'clinic', 'hairdresser', 'clothes', 'supermarket',
  'convenience', 'kiosk', 'hotel', 'hostel', 'guest_house', 'apartment', 'office',
  'company', 'school', 'kindergarten', 'college', 'parking', 'bus_stop', 'platform',
  'residential', 'neighbourhood', 'living_street', 'service', 'track', 'path',
  'footway', 'bench', 'waste_basket', 'toilets', 'vending_machine', 'shop',
  'car_repair', 'car_rental', 'estate_agent', 'insurance', 'copyshop', 'laundry',
  'hospital', 'postcode', 'post_office', 'police', 'fire_station', 'fire_detection_system',
])

/**
 * Asentamientos y fronteras administrativas. NO se rechazan: un gooal sobre un
 * barrio (Alfama, Plaka, San Telmo, La Habana Vieja) tiene que apuntar al barrio,
 * y ahí el polígono administrativo ES la respuesta correcta.
 *
 * Se probó a rechazarlos cuando la consulta nombraba algo concreto, para evitar
 * que «Puente de Brooklyn» cayera en el centro del distrito. Tiraba 18 pines
 * buenos por 2 malos, así que no: se marcan como 'revisar', que es lo que son
 * —el área y no el punto exacto— y la vista la pone una persona.
 */
const ASENTAMIENTOS = new Set([
  'city', 'town', 'village', 'hamlet', 'suburb', 'quarter', 'neighbourhood',
  'administrative', 'boundary', 'county', 'state', 'province', 'region',
  'municipality', 'borough', 'district', 'city_district',
])

/** Palabras que no distinguen un sitio de otro al comparar nombres. */
const VACIAS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'y', 'a', 'al', 'en', 'of', 'the', 'and',
  'museo', 'museum', 'parque', 'park', 'nacional', 'national', 'mercado', 'market',
  'iglesia', 'church', 'catedral', 'cathedral', 'monte', 'mount', 'lago', 'lake',
  'rio', 'river', 'playa', 'beach', 'isla', 'island', 'calle', 'plaza', 'square',
  'puente', 'bridge', 'torre', 'tower', 'palacio', 'palace', 'templo', 'temple',
  'barrio', 'centro', 'ciudad', 'city', 'casco', 'historico', 'historic',
])

const significativas = texto => new Set(
  sinAcentos(texto).replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/)
    .filter(p => p.length > 2 && !VACIAS.has(p)))

/**
 * Las consultas que se van a probar, de la más precisa a la más suelta.
 *
 * Quitar la ciudad rescata muchas: el Nürburgring no sale con "Nürburg" delante
 * y sí sale sin ella. Y la ciudad del CSV puede estar mal (las cataratas del
 * Niágara no están en Toronto), así que insistir con ella no lleva a ninguna parte.
 */
function variantes(consulta) {
  const trozos = consulta.split(',').map(t => t.trim()).filter(Boolean)
  const nombre = trozos[0] ?? consulta
  const v = [consulta]
  if (trozos.length >= 3) v.push(`${trozos[0]}, ${trozos[trozos.length - 1]}`)
  if (trozos.length >= 2) v.push(nombre)

  // Y sin las palabras genéricas de delante. OSM guarda los nombres en el
  // idioma del sitio, así que "Mercado de" no está en "Mercat de Sant Josep":
  // buscar "Mercado de La Boqueria" no devuelve nada y "La Boqueria" devuelve
  // el mercado. Lo mismo con "Parque Nacional de", "Museo de", "Catedral de".
  const palabras = nombre.split(/\s+/)
  let i = 0
  while (i < palabras.length - 1 && VACIAS.has(sinAcentos(palabras[i]))) i++
  if (i > 0) v.push(palabras.slice(i).join(' '))

  return [...new Set(v)]
}

/**
 * ¿Esta respuesta es claramente el sitio que se buscaba?
 *
 * Devuelve la marca de confianza o null si no cuela. Sin acentos y por palabras
 * significativas: "Edificio del Reichstag" vale para "Reichstag".
 */
function comprobar(resultado, nombreSitio, paisEsperado, ciudadEsperada) {
  const tipo = resultado.type ?? ''
  if (TIPOS_MALOS.has(tipo)) return null

  // El nombre tiene que compartir al menos una palabra que distinga.
  //
  // Y las palabras de la ciudad y del país NO cuentan: la dirección completa de
  // cualquier resultado de Milán lleva "Milano" dentro, así que «Duomo de
  // Milán» casaba con las Gallerie d'Italia solo por la ciudad. El parecido
  // tiene que venir del nombre del SITIO.
  const buscadas = significativas(nombreSitio)
  for (const p of [...significativas(ciudadEsperada ?? ''), ...significativas(paisEsperado ?? '')]) {
    buscadas.delete(p)
  }
  // SOLO el nombre del sitio, nunca la dirección completa. La dirección lleva
  // dentro los nombres de los distritos, y muchos se llaman igual que el
  // monumento: la del Gallerie d'Italia incluye el barrio "Duomo" de Milán, y
  // la de un huerto comunitario de Brooklyn incluye "Brooklyn". Comparando con
  // la dirección, los dos colaban. Quitar ciudad y país de la búsqueda no
  // bastaba: el engaño venía de los barrios.
  const texto = sinAcentos(resultado.name || (resultado.display_name ?? '').split(',')[0])
  // Por trozos y no por palabras enteras: «Reichstag» tiene que valer para
  // «Reichstagsgebäude», y «Chouara» para «Tanneries Chouara». Comparar palabra
  // a palabra rechazaba respuestas correctas.
  const encaja = [...buscadas].some(p => texto.includes(p))
  if (buscadas.size > 0 && !encaja) return null

  // Y el país tiene que ser el mismo. Es lo que separa un sitio homónimo al otro
  // lado del mundo del que se buscaba.
  const pais = resultado.address?.country ?? ''
  if (paisEsperado && pais) {
    const p1 = significativas(pais)
    const p2 = significativas(paisEsperado)
    if (p2.size > 0 && ![...p2].some(x => p1.has(x))) return null
  }

  const importancia = Number(resultado.importance ?? 0)
  // 'fiable': el tipo de sitio encaja, o Nominatim lo tiene por conocido.
  // 'revisar': coincide el nombre y el país pero el sitio es oscuro. El pin
  // suele estar bien; es la misma marca que ya usa el catálogo para esos casos.
  // Un asentamiento o un área administrativa: el pin cae en su centro, que no
  // es el punto exacto de nada. Vale, pero marcado para mirarlo.
  if (ASENTAMIENTOS.has(tipo)) return 'revisar'
  if (TIPOS_BUENOS.has(tipo) || importancia >= 0.3) return 'fiable'
  return 'revisar'
}

async function buscar(q) {
  const url = 'https://nominatim.openstreetmap.org/search'
    + `?q=${encodeURIComponent(q)}&format=jsonv2&addressdetails=1&limit=5`
    + '&accept-language=es,en'
  // Español CON respaldo en inglés, y no una cosa ni la otra por separado. Sin
  // idioma, los nombres vuelven en el local ("Vesuvio", "Reichstagsgebäude") y
  // no casan con una consulta escrita en español. Solo en español, el orden de
  // resultados empeora: el Atomium sale como alquiler de bicis. Por eso se
  // piden cinco y se recorren todos, que el filtro de tipo encuentra el bueno
  // aunque venga tercero.
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.status === 429 || res.status === 503) return { espera: true }
    // Un error de transporte NO es "este sitio no existe". Si se tratara como
    // tal, un 403 marcaría cientos de filas como sin-resultado y parecería que
    // el catálogo no se puede geocodificar. Se corta la pasada y se dice.
    if (!res.ok) return { corta: `Nominatim ha respondido HTTP ${res.status}` }
    return { filas: await res.json() }
  } catch (e) {
    return { corta: `No se pudo hablar con Nominatim: ${e.message}` }
  }
}

// ── Allá vamos ─────────────────────────────────────────────
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const pendientes = []
for (let desde = 0; ; desde += PAGINA) {
  const { data, error } = await service
    .from('gooals_v2')
    .select('id, titulo, ciudad, pais, geo_consulta, geo')
    .eq('ambito', 'lugar')
    .is('lat', null)
    .gte('created_at', CORTE)
    .order('id', { ascending: true })
    .range(desde, desde + PAGINA - 1)
  if (error) { console.error('No se pudo leer el catálogo:', error.message); process.exit(1) }
  pendientes.push(...data)
  if (data.length < PAGINA) break
}

const frescas = reintentar ? pendientes : pendientes.filter(g => g.geo === null)
const cola = limite ? frescas.slice(0, limite) : frescas
console.log(seco ? 'EN SECO: no se escribe nada.\n' : 'GEOCODIFICANDO DE VERDAD.\n')
console.log(`Sin pin y de ámbito lugar: ${pendientes.length} · nunca intentadas: ${pendientes.filter(g => g.geo === null).length} · se van a probar ahora: ${cola.length}`)
console.log(`A una petición por segundo, unos ${Math.ceil(cola.length * 1.6 * ESPERA / 60000)} minutos.\n`)

const conPin = []
const sinPin = []
let i = 0

for (const g of cola) {
  i++
  const consulta = (g.geo_consulta ?? '').trim()
  if (!consulta) { sinPin.push({ ...g, porque: 'no tiene geo_consulta' }); continue }

  const nombreSitio = consulta.split(',')[0].trim()
  let elegido = null
  let usada = null

  for (const v of variantes(consulta)) {
    const r = await buscar(v)
    await dormir(ESPERA)
    if (r.corta) {
      console.error(`\n✗ ${r.corta}. Se para aquí para no marcar filas por un fallo de red.`)
      console.error(`  Lo hecho hasta ahora está guardado. Vuelve a lanzarlo cuando se arregle.`)
      process.exit(1)
    }
    if (r.espera) {
      // Nos han pedido calma: se espera de más y se reintenta esta variante.
      console.log('   (Nominatim pide esperar; 30 s)')
      await dormir(30000)
      const otra = await buscar(v)
      await dormir(ESPERA)
      r.filas = otra.filas ?? []
    }
    for (const fila of r.filas ?? []) {
      const marca = comprobar(fila, nombreSitio, g.pais, g.ciudad)
      if (marca) { elegido = { fila, marca }; usada = v; break }
    }
    if (elegido) break
  }

  if (!elegido) {
    sinPin.push({ ...g, porque: 'ninguna respuesta era claramente el sitio' })
    if (!seco) {
      await service.from('gooals_v2').update({ geo: 'sin-resultado' }).eq('id', g.id)
    }
    console.log(`${i}/${cola.length}  ✗  «${g.titulo}»  —  ${consulta}`)
    continue
  }

  const { fila, marca } = elegido
  const lat = Number(fila.lat)
  const lng = Number(fila.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    sinPin.push({ ...g, porque: 'coordenadas ilegibles' })
    continue
  }

  if (!seco) {
    const { error } = await service
      .from('gooals_v2')
      // Solo lat, lng y geo: son las columnas que hay. Lo que devolvió
      // Nominatim (nombre, tipo y consulta que funcionó) va al informe local,
      // que para un trabajo de una sola vez vale más que una columna nueva.
      .update({ lat, lng, geo: marca })
      .eq('id', g.id)
    if (error) {
      // Si falla el guardado se dice y se sigue: al relanzar se reintenta, porque
      // esa fila sigue sin coordenadas.
      console.log(`${i}/${cola.length}  !  «${g.titulo}» — no se pudo guardar: ${error.message}`)
      continue
    }
  }
  conPin.push({ ...g, marca, tipo: fila.type, nombre: fila.name, usada, encontrado: fila.display_name, lat, lng })
  console.log(`${i}/${cola.length}  ✓  «${g.titulo}»  →  ${fila.name || fila.display_name?.slice(0, 40)} [${fila.type}, ${marca}]`)
}

// ── El parte ───────────────────────────────────────────────
console.log('\n═══════ RESUMEN ═══════')
console.log(`Con pin:    ${conPin.length}  (fiable ${conPin.filter(x => x.marca === 'fiable').length} · revisar ${conPin.filter(x => x.marca === 'revisar').length})`)
console.log(`Sin pin:    ${sinPin.length}`)

if (sinPin.length) {
  console.log('\n═══════ SIN PIN, PARA MIRAR A MANO ═══════')
  for (const g of sinPin) {
    console.log(`  «${g.titulo}»`)
    console.log(`      consulta: ${g.geo_consulta ?? '(vacía)'}  —  ${g.porque}`)
  }
}

// Un informe al lado, para poder repasar un pin sin volver a preguntar a nadie:
// qué sitio devolvió Nominatim, de qué tipo y con qué consulta se encontró.
const celda = v => `"${String(v ?? '').replace(/"/g, '""')}"`
const informe = '﻿' + [
  ['resultado', 'titulo', 'consulta', 'consulta_que_funciono', 'encontrado', 'tipo', 'marca', 'lat', 'lng', 'por_que_no'],
  ...conPin.map(g => ['con pin', g.titulo, g.geo_consulta, g.usada, g.encontrado, g.tipo, g.marca, g.lat, g.lng, '']),
  ...sinPin.map(g => ['SIN PIN', g.titulo, g.geo_consulta, '', '', '', '', '', '', g.porque]),
].map(f => f.map(celda).join(',')).join('\r\n') + '\r\n'
const rutaInforme = `scripts/catalogo-nuevo/geocodificacion-${new Date().toISOString().slice(0, 10)}.csv`
if (!seco) { writeFileSync(rutaInforme, informe, 'utf8'); console.log(`\nInforme: ${rutaInforme}`) }

const quedan = pendientes.length - cola.length
if (quedan > 0) console.log(`\nQuedan ${quedan} sin probar. Vuelve a lanzarlo: sigue por donde iba.`)
console.log(seco ? '\nEN SECO: no se ha escrito nada.' : '\nGuardado. Los que quedaron sin pin salen en el panel con el filtro "Sin pin".')
