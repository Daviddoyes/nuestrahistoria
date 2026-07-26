// ─────────────────────────────────────────────────────────────
// GOOALS — generador de experiencias (script LOCAL, no forma parte de la app)
//
//   FASE 1: Google Places → filtra por calidad → Claude redacta → Supabase
//   FASE 2: experiencias icónicas globales hardcodeadas → Supabase
//
// Uso:  cd scripts/generar-experiencias && npm install && node index.mjs
// ─────────────────────────────────────────────────────────────

import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// ── Configuración ────────────────────────────────────────────

const {
  GOOGLE_PLACES_API_KEY,
  ANTHROPIC_API_KEY,
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
} = process.env

for (const [k, v] of Object.entries({ GOOGLE_PLACES_API_KEY, ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY })) {
  if (!v || v.startsWith('tu_')) {
    console.error(`✗ Falta la variable ${k} en .env (o sigue con el valor de ejemplo).`)
    process.exit(1)
  }
}

// Calidad mínima para aceptar un lugar de Google Places.
const MIN_RATING = 4.0
const MIN_RESENAS = 50
// Top-N lugares por búsqueda+ciudad. Sin esto serían miles de llamadas a Claude.
const MAX_POR_BUSQUEDA = 2
// Pausa entre llamadas a Claude, para no saturar la API.
const PAUSA_MS = 400

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── Datos de entrada ─────────────────────────────────────────

const CIUDADES = [
  { ciudad: 'Madrid', pais: 'España' },
  { ciudad: 'Barcelona', pais: 'España' },
  { ciudad: 'Valencia', pais: 'España' },
  { ciudad: 'Sevilla', pais: 'España' },
  { ciudad: 'Bilbao', pais: 'España' },
  { ciudad: 'Lisboa', pais: 'Portugal' },
  { ciudad: 'París', pais: 'Francia' },
  { ciudad: 'Berlín', pais: 'Alemania' },
  { ciudad: 'Amsterdam', pais: 'Países Bajos' },
  { ciudad: 'Roma', pais: 'Italia' },
  { ciudad: 'Londres', pais: 'Reino Unido' },
]

// Buscamos el LUGAR físico donde se hace la actividad, no el proveedor que la
// organiza. Las queries apuntan a sitios (rocódromo, playa, estación), y donde
// el includedType del sitio es válido en la Places API (New) lo usamos para
// afinar (ver INCLUDED_TYPE_VALIDOS).
const BUSQUEDAS_LOCALES = [
  // AVENTURA — lugares físicos, no empresas
  { query: 'puente via ferrata barranquismo', categoria: 'aventura', subcategoria: 'puenting', tipo_lugar: 'natural_feature' },
  { query: 'circuito karting circuit', categoria: 'aventura', subcategoria: 'karting', tipo_lugar: 'establishment' },
  { query: 'rocódromo escalada indoor', categoria: 'aventura', subcategoria: 'escalada', tipo_lugar: 'gym' },
  { query: 'zona paracaidismo aeródromo skydiving', categoria: 'aventura', subcategoria: 'paracaidismo', tipo_lugar: 'airport' },
  { query: 'tirolina parque aventura', categoria: 'aventura', subcategoria: 'tirolina', tipo_lugar: 'amusement_park' },

  // DEPORTE — spots y zonas, no academias
  { query: 'playa surf spot olas', categoria: 'deporte', subcategoria: 'surf', tipo_lugar: 'natural_feature' },
  { query: 'estación de esquí pistas', categoria: 'deporte', subcategoria: 'ski', tipo_lugar: 'ski_resort' },
  { query: 'bahía playa tranquila kayak', categoria: 'deporte', subcategoria: 'kayak', tipo_lugar: 'natural_feature' },
  { query: 'playa alquiler moto de agua jetski', categoria: 'deporte', subcategoria: 'moto_agua', tipo_lugar: 'natural_feature' },
  { query: 'box crossfit gimnasio funcional', categoria: 'deporte', subcategoria: 'crossfit', tipo_lugar: 'gym' },
  { query: 'club padel pistas', categoria: 'deporte', subcategoria: 'padel', tipo_lugar: 'sports_complex' },

  // GASTRONOMÍA — restaurantes y mercados reales
  { query: 'restaurante estrella michelin', categoria: 'gastronomia', subcategoria: 'michelin', tipo_lugar: 'restaurant' },
  { query: 'mercado alimentación gourmet', categoria: 'gastronomia', subcategoria: 'mercado', tipo_lugar: 'food_market' },

  // CULTURA — espacios físicos
  { query: 'museo arte galería', categoria: 'cultura', subcategoria: 'museo', tipo_lugar: 'museum' },
  { query: 'teatro ópera auditorio', categoria: 'cultura', subcategoria: 'teatro', tipo_lugar: 'performing_arts_theater' },
]

// includedType de la Places API (New) que son válidos (Table A). Los que NO lo
// son (natural_feature, establishment, food_market) devolverían 400 si se
// enviaran, así que se omiten: la query en texto ya afina la búsqueda.
const INCLUDED_TYPE_VALIDOS = new Set([
  'gym', 'airport', 'amusement_park', 'ski_resort',
  'sports_complex', 'restaurant', 'museum', 'performing_arts_theater',
])

const ICONICAS = [
  // Festivales música
  { titulo: 'Asistir a Tomorrowland', categoria: 'musica', subcategoria: 'festival', ciudad: 'Boom', pais: 'Bélgica', descripcion: 'El festival de música electrónica más grande del mundo. Una experiencia que trasciende la música.', dificultad: 'facil', duracion: '3 días', tags: ['festival', 'electrónica', 'epic'], lugar_nombre: 'Tomorrowland', lugar_direccion: 'Boom, Bélgica', verificada: true },
  { titulo: 'Asistir a Awakenings', categoria: 'musica', subcategoria: 'festival', ciudad: 'Amsterdam', pais: 'Países Bajos', descripcion: 'El templo del techno. Awakenings en Amsterdam es una experiencia única para los amantes de la música electrónica más profunda.', dificultad: 'facil', duracion: '2 días', tags: ['techno', 'festival', 'amsterdam'], lugar_nombre: 'Awakenings Festival', lugar_direccion: 'Amsterdam, Países Bajos', verificada: true },
  { titulo: 'Asistir a UNTOLD', categoria: 'musica', subcategoria: 'festival', ciudad: 'Cluj-Napoca', pais: 'Rumanía', descripcion: 'Uno de los festivales que más ha crecido en Europa. 4 días de música en Cluj-Napoca.', dificultad: 'facil', duracion: '4 días', tags: ['festival', 'edm', 'rumania'], lugar_nombre: 'UNTOLD Festival', lugar_direccion: 'Cluj-Napoca, Rumanía', verificada: true },
  { titulo: 'Asistir a Coachella', categoria: 'musica', subcategoria: 'festival', ciudad: 'Indio', pais: 'Estados Unidos', descripcion: 'El festival más icónico del mundo en el desierto de California.', dificultad: 'facil', duracion: '3 días', tags: ['festival', 'california', 'iconic'], lugar_nombre: 'Coachella Valley Music Festival', lugar_direccion: 'Indio, California, USA', verificada: true },
  { titulo: 'Asistir a Glastonbury', categoria: 'musica', subcategoria: 'festival', ciudad: 'Somerset', pais: 'Reino Unido', descripcion: 'El festival de música más famoso del mundo. Una experiencia cultural única en el campo inglés.', dificultad: 'facil', duracion: '5 días', tags: ['festival', 'uk', 'legendary'], lugar_nombre: 'Glastonbury Festival', lugar_direccion: 'Worthy Farm, Somerset, UK', verificada: true },
  { titulo: 'Asistir a Primavera Sound Barcelona', categoria: 'musica', subcategoria: 'festival', ciudad: 'Barcelona', pais: 'España', descripcion: 'El festival de música independiente más importante de España y uno de los mejores de Europa.', dificultad: 'facil', duracion: '3 días', tags: ['festival', 'barcelona', 'indie'], lugar_nombre: 'Primavera Sound', lugar_direccion: 'Parc del Fòrum, Barcelona', verificada: true },
  { titulo: 'Asistir a Ultra Music Festival', categoria: 'musica', subcategoria: 'festival', ciudad: 'Miami', pais: 'Estados Unidos', descripcion: 'El festival de electrónica más importante de América. Miami en marzo con los mejores DJs del mundo.', dificultad: 'facil', duracion: '3 días', tags: ['festival', 'miami', 'edm'], lugar_nombre: 'Ultra Music Festival', lugar_direccion: 'Miami, Florida, USA', verificada: true },

  // Deporte épico
  { titulo: 'Correr la Maratón de Nueva York', categoria: 'deporte', subcategoria: 'maraton', ciudad: 'Nueva York', pais: 'Estados Unidos', descripcion: 'La maratón más grande del mundo. 42km atravesando los 5 boroughs de Nueva York con 2 millones de espectadores.', dificultad: 'dificil', duracion: '1 día', tags: ['maraton', 'running', 'nyc'], lugar_nombre: 'TCS New York City Marathon', lugar_direccion: 'Nueva York, USA', verificada: true },
  { titulo: 'Correr la Maratón de Berlín', categoria: 'deporte', subcategoria: 'maraton', ciudad: 'Berlín', pais: 'Alemania', descripcion: 'El circuito más rápido del mundo. La maratón donde se baten más records del mundo.', dificultad: 'dificil', duracion: '1 día', tags: ['maraton', 'running', 'berlin'], lugar_nombre: 'BMW Berlin Marathon', lugar_direccion: 'Berlín, Alemania', verificada: true },
  { titulo: 'Competir en Hyrox World Championship', categoria: 'deporte', subcategoria: 'hyrox', ciudad: 'Hamburgo', pais: 'Alemania', descripcion: 'El campeonato mundial de Hyrox. El reto fitness más exigente del mundo reunido en Hamburgo.', dificultad: 'dificil', duracion: '1 día', tags: ['hyrox', 'fitness', 'competicion'], lugar_nombre: 'Hyrox World Championship', lugar_direccion: 'Hamburgo, Alemania', verificada: true },
  { titulo: 'Completar un Ironman', categoria: 'deporte', subcategoria: 'triatlon', ciudad: 'Kona', pais: 'Estados Unidos', descripcion: '3.8km natación, 180km bici, 42km carrera. El reto físico más duro del deporte de resistencia.', dificultad: 'dificil', duracion: '1 día', tags: ['ironman', 'triatlon', 'epic'], lugar_nombre: 'Ironman World Championship', lugar_direccion: 'Kona, Hawaii, USA', verificada: true },

  // Viajes épicos
  { titulo: 'Hacer el Camino de Santiago', categoria: 'viajes', subcategoria: 'camino', ciudad: 'Santiago de Compostela', pais: 'España', descripcion: 'Una de las rutas de peregrinación más antiguas de Europa. 800km de transformación personal.', dificultad: 'dificil', duracion: '30 días', tags: ['camino', 'senderismo', 'espiritual'], lugar_nombre: 'Camino Francés', lugar_direccion: 'Saint-Jean-Pied-de-Port → Santiago de Compostela', verificada: true },
  { titulo: 'Ver la Aurora Boreal en Noruega', categoria: 'viajes', subcategoria: 'naturaleza', ciudad: 'Tromsø', pais: 'Noruega', descripcion: 'El espectáculo natural más impresionante del planeta. Las auroras boreales en el ártico noruego.', dificultad: 'facil', duracion: '4 días', tags: ['aurora', 'noruega', 'naturaleza'], lugar_nombre: 'Tromsø, Noruega', lugar_direccion: 'Tromsø, Noruega', verificada: true },
  { titulo: 'Subir al Campo Base del Everest', categoria: 'viajes', subcategoria: 'trekking', ciudad: 'Solukhumbu', pais: 'Nepal', descripcion: 'El trekking más icónico del mundo. 14 días caminando hacia el techo del mundo a 5.364m de altitud.', dificultad: 'dificil', duracion: '14 días', tags: ['everest', 'trekking', 'nepal'], lugar_nombre: 'Everest Base Camp', lugar_direccion: 'Solukhumbu, Nepal', verificada: true },
  { titulo: 'Carnaval de Río de Janeiro', categoria: 'cultura', subcategoria: 'festival', ciudad: 'Río de Janeiro', pais: 'Brasil', descripcion: 'La fiesta más grande del mundo. 5 días de samba, colores y alegría en Río.', dificultad: 'facil', duracion: '5 días', tags: ['carnaval', 'brasil', 'fiesta'], lugar_nombre: 'Carnaval de Río', lugar_direccion: 'Río de Janeiro, Brasil', verificada: true },
]

const FESTIVALES_ESPANA = [
  { titulo: 'Asistir al FIB', ciudad: 'Benicàssim', provincia: 'Castellón', lat: 40.0617, lng: 0.0756, tags: ['festival', 'indie', 'rock', 'internacional'] },
  { titulo: 'Asistir a Canet Rock', ciudad: 'Canet de Mar', provincia: 'Barcelona', lat: 41.5878, lng: 2.5833, tags: ['festival', 'rock', 'catalan'] },
  { titulo: 'Asistir a Medusa Festival', ciudad: 'Cullera', provincia: 'Valencia', lat: 39.1667, lng: -0.2500, tags: ['festival', 'electronica', 'playa'] },
  { titulo: 'Asistir a Resurreccion', ciudad: 'Vitoria-Gasteiz', provincia: 'Álava', lat: 42.8467, lng: -2.6727, tags: ['festival', 'rock', 'metal'] },
  { titulo: 'Asistir a Primavera Sound', ciudad: 'Barcelona', provincia: 'Barcelona', lat: 41.4036, lng: 2.2134, tags: ['festival', 'indie', 'internacional'] },
  { titulo: 'Asistir al Sonar', ciudad: 'Barcelona', provincia: 'Barcelona', lat: 41.3709, lng: 2.1494, tags: ['festival', 'electronica', 'arte'] },
  { titulo: 'Asistir al Arenal Sound', ciudad: 'Burriana', provincia: 'Castellón', lat: 39.8894, lng: -0.0819, tags: ['festival', 'pop', 'rock', 'playa'] },
  { titulo: 'Asistir al Mad Cool', ciudad: 'Madrid', provincia: 'Madrid', lat: 40.5139, lng: -3.6892, tags: ['festival', 'rock', 'internacional'] },
  { titulo: 'Asistir al BBK Live', ciudad: 'Bilbao', provincia: 'Vizcaya', lat: 43.2627, lng: -2.9253, tags: ['festival', 'rock', 'internacional'] },
  { titulo: 'Asistir al Viña Rock', ciudad: 'Villarrobledo', provincia: 'Albacete', lat: 39.2647, lng: -2.6058, tags: ['festival', 'rock', 'punk', 'ska'] },
  { titulo: 'Asistir al Dreambeach', ciudad: 'Villaricos', provincia: 'Almería', lat: 37.3333, lng: -1.7333, tags: ['festival', 'electronica', 'playa'] },
  { titulo: 'Asistir al Dcode', ciudad: 'Madrid', provincia: 'Madrid', lat: 40.4500, lng: -3.7200, tags: ['festival', 'indie', 'alternativo'] },
  { titulo: 'Asistir al Warm Up', ciudad: 'Murcia', provincia: 'Murcia', lat: 37.9922, lng: -1.1307, tags: ['festival', 'indie', 'alternativo'] },
  { titulo: 'Asistir al Cultura Inquieta', ciudad: 'Getafe', provincia: 'Madrid', lat: 40.3056, lng: -3.7328, tags: ['festival', 'indie', 'cultura'] },
  { titulo: 'Asistir al O Son do Camiño', ciudad: 'Santiago de Compostela', provincia: 'A Coruña', lat: 42.8782, lng: -8.5448, tags: ['festival', 'rock', 'pop', 'galicia'] },
  { titulo: 'Asistir al Rototom Sunsplash', ciudad: 'Benicàssim', provincia: 'Castellón', lat: 40.0617, lng: 0.0756, tags: ['festival', 'reggae', 'internacional'] },
  { titulo: 'Asistir al Low Festival', ciudad: 'Benidorm', provincia: 'Alicante', lat: 38.5406, lng: -0.1313, tags: ['festival', 'indie', 'playa'] },
  { titulo: 'Asistir al Cruïlla', ciudad: 'Barcelona', provincia: 'Barcelona', lat: 41.4036, lng: 2.2134, tags: ['festival', 'diversidad', 'internacional'] },
  { titulo: "Asistir al Festiuet", ciudad: "L'Hospitalet de Llobregat", provincia: 'Barcelona', lat: 41.3598, lng: 2.0997, tags: ['festival', 'indie', 'catalan'] },
  { titulo: 'Asistir al Bilbao BBK Live', ciudad: 'Bilbao', provincia: 'Vizcaya', lat: 43.2630, lng: -2.9350, tags: ['festival', 'rock', 'indie'] },
]

// ── Google Places ────────────────────────────────────────────

async function buscarLugares(query, ciudad, tipoLugar) {
  const body = { textQuery: `${query} en ${ciudad}`, languageCode: 'es' }
  if (INCLUDED_TYPE_VALIDOS.has(tipoLugar)) body.includedType = tipoLugar

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask':
        'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const txt = await res.text()
    console.error(`  ✗ Google Places ${res.status}: ${txt.slice(0, 160)}`)
    return []
  }
  const data = await res.json()
  return data.places ?? []
}

// Extrae ciudad y país de un formattedAddress de Google (en español, porque
// pedimos languageCode 'es'). Heurístico: el país es el último segmento; la
// ciudad, el que sigue al código postal, o el antepenúltimo como fallback.
function extraerPais(addr) {
  const parts = (addr || '').split(',').map(s => s.trim()).filter(Boolean)
  return parts.length ? parts[parts.length - 1] : null
}

function extraerCiudad(addr) {
  const parts = (addr || '').split(',').map(s => s.trim()).filter(Boolean)
  for (const p of parts) {
    const m = p.match(/^\d{4,5}\s+(.+)$/) // "43840 Salou" → "Salou"
    if (m) return m[1]
  }
  if (parts.length >= 3) return parts[parts.length - 3]
  if (parts.length >= 2) return parts[parts.length - 2]
  return null
}

const DESC_SCHEMA = {
  type: 'object',
  properties: { descripcion: { type: 'string' } },
  required: ['descripcion'],
  additionalProperties: false,
}

async function redactarDescripcionFestival(fest) {
  const prompt = `Escribe una descripción para una app de bucket list del festival de música español "${fest.titulo.replace(/^Asistir a(l)? /, '')}" en ${fest.ciudad} (${fest.provincia}, España).
2-3 frases evocadoras en español que transmitan la vibra del festival. Sin inventar fechas ni cifras concretas.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 512,
    thinking: { type: 'disabled' },
    output_config: { effort: 'low', format: { type: 'json_schema', schema: DESC_SCHEMA } },
    messages: [{ role: 'user', content: prompt }],
  })

  if (message.stop_reason === 'refusal') return null
  const texto = message.content.find(b => b.type === 'text')?.text
  return texto ? JSON.parse(texto).descripcion : null
}

// ── Supabase: inserta con control de duplicados ──────────────

let total = 0

// Comprobación previa (por lugar) para saltar ANTES de llamar a Claude y no
// gastar tokens redactando lugares que ya existen.
async function yaExisteLugar(lugarNombre, ciudad) {
  const { data } = await supabase
    .from('experiencias')
    .select('id')
    .eq('ciudad', ciudad)
    .eq('lugar_nombre', lugarNombre)
    .limit(1)
  return !!(data && data.length > 0)
}

async function insertar(exp) {
  // Dedup por lugar_nombre+ciudad: el nombre real (de Google, o del festival)
  // es estable entre ejecuciones. El titulo NO —lo regenera Claude cada vez— así
  // que usarlo como clave dejaba colar el mismo sitio con títulos distintos.
  const q = supabase.from('experiencias').select('id').eq('ciudad', exp.ciudad)
  const { data: existe } = exp.lugar_nombre
    ? await q.eq('lugar_nombre', exp.lugar_nombre).limit(1)
    : await q.eq('titulo', exp.titulo).limit(1)

  if (existe && existe.length > 0) {
    console.log(`  – Duplicada, saltada: ${exp.titulo} (${exp.ciudad})`)
    return false
  }

  // Campos auxiliares (prefijo _) que no son columnas de la tabla.
  const rating = exp._rating
  const fila = Object.fromEntries(Object.entries(exp).filter(([k]) => !k.startsWith('_')))

  const { error } = await supabase.from('experiencias').insert(fila)
  if (error) {
    console.error(`  ✗ Error al guardar ${exp.titulo}: ${error.message}`)
    return false
  }

  total++
  console.log(`  ✓ Guardada: ${exp.lugar_nombre ?? exp.titulo}, ${exp.ciudad}` +
    (rating ? ` (${rating}★)` : ''))
  return true
}

// ── FASE 1 — Lugares físicos directos a gooal_lugares ────────

// Cache subcategoria -> gooalId para no repetir el lookup en cada ciudad.
const gooalPorSubcat = new Map()

// Busca el gooal por subcategoria; si no existe (p.ej. kayak, moto_agua, que no
// venían de la migración) lo crea con un título genérico. Así ningún lugar se
// pierde por falta de gooal destino.
async function obtenerOCrearGooal(subcategoria, categoria) {
  if (gooalPorSubcat.has(subcategoria)) return gooalPorSubcat.get(subcategoria)

  const { data } = await supabase
    .from('gooals')
    .select('id')
    .eq('subcategoria', subcategoria)
    .limit(1)

  let id = data && data.length ? data[0].id : null
  if (!id) {
    const titulo = await generarTituloGenerico(subcategoria, { titulo: subcategoria })
    if (titulo) {
      id = await upsertGooal({ titulo, categoria, subcategoria })
      if (id) console.log(`  + Gooal creado: ${titulo} (${subcategoria})`)
    }
  }
  gooalPorSubcat.set(subcategoria, id)
  return id
}

async function insertarLugarDesdePlace(gooalId, place, ciudadFallback, paisFallback) {
  const nombre = place.displayName?.text // SIEMPRE el nombre del sitio en Google Maps
  if (!nombre) return false

  const { data: existe } = await supabase
    .from('gooal_lugares')
    .select('id')
    .eq('gooal_id', gooalId)
    .eq('nombre_lugar', nombre)
    .limit(1)
  if (existe && existe.length > 0) return false

  const ciudad = extraerCiudad(place.formattedAddress) || ciudadFallback
  const { error } = await supabase.from('gooal_lugares').insert({
    gooal_id: gooalId,
    nombre_lugar: nombre,
    ciudad,
    pais: extraerPais(place.formattedAddress) || paisFallback,
    latitud: place.location?.latitude ?? null,
    longitud: place.location?.longitude ?? null,
    rating: place.rating ?? null,
    direccion: place.formattedAddress ?? null,
  })
  if (error) { console.error(`  ✗ ${nombre}: ${error.message}`); return false }

  console.log(`✓ Lugar añadido: ${nombre}${ciudad ? `, ${ciudad}` : ''}${place.rating ? ` (${place.rating}★)` : ''}`)
  return true
}

async function fase1() {
  console.log('\n══ FASE 1 — Lugares físicos → gooal_lugares ══\n')
  let añadidos = 0

  for (const busqueda of BUSQUEDAS_LOCALES) {
    const gooalId = await obtenerOCrearGooal(busqueda.subcategoria, busqueda.categoria)
    if (!gooalId) { console.log(`  – Sin gooal para "${busqueda.subcategoria}", saltado`); continue }

    for (const { ciudad, pais } of CIUDADES) {
      console.log(`Buscando ${busqueda.subcategoria} en ${ciudad}...`)

      let lugares
      try {
        lugares = await buscarLugares(busqueda.query, ciudad, busqueda.tipo_lugar)
      } catch (err) {
        console.error(`  ✗ Fallo de red: ${err.message}`)
        continue
      }

      const buenos = lugares
        .filter(p => (p.rating ?? 0) >= MIN_RATING && (p.userRatingCount ?? 0) >= MIN_RESENAS)
        .slice(0, MAX_POR_BUSQUEDA)

      for (const place of buenos) {
        try {
          if (await insertarLugarDesdePlace(gooalId, place, ciudad, pais)) añadidos++
        } catch (err) {
          console.error(`  ✗ Error con ${place.displayName?.text}: ${err.message}`)
        }
      }
      await sleep(PAUSA_MS)
    }
  }

  console.log(`\nFase 1: ${añadidos} lugares nuevos en gooal_lugares`)
}

// ── FASE 2 ───────────────────────────────────────────────────

async function fase2() {
  console.log('\n══ FASE 2 — Experiencias icónicas ══\n')
  for (const exp of ICONICAS) {
    await insertar(exp)
  }
}

// ── FASE 3 — Festivales de España ────────────────────────────

async function fase3() {
  console.log('\n══ FASE 3 — Festivales de España ══\n')
  for (const fest of FESTIVALES_ESPANA) {
    const lugarNombre = fest.titulo.replace(/^Asistir a(l)? /, '')
    try {
      if (await yaExisteLugar(lugarNombre, fest.ciudad)) {
        console.log(`  – Ya existe, saltado: ${lugarNombre} (${fest.ciudad})`)
        continue
      }
      console.log(`Redactando ${fest.titulo} (${fest.ciudad})...`)
      const descripcion = await redactarDescripcionFestival(fest)
      if (!descripcion) { console.log('  – Sin descripción, saltado'); continue }

      await insertar({
        titulo: fest.titulo,
        categoria: 'musica',
        subcategoria: 'festival',
        ciudad: fest.ciudad,
        pais: 'España',
        descripcion,
        dificultad: 'facil',
        duracion: null,
        tags: fest.tags,
        lugar_nombre: lugarNombre,
        lugar_direccion: `${fest.ciudad}, ${fest.provincia}`,
        latitud: fest.lat,
        longitud: fest.lng,
        es_generico: false,
        verificada: true,
      })
    } catch (err) {
      console.error(`  ✗ Error con ${fest.titulo}: ${err.message}`)
    }
    await sleep(PAUSA_MS)
  }
}

// ── FASE 4 — Migración experiencias → gooals + gooal_lugares ──

// Subcategorías que representan ACTIVIDADES repetibles (Fase 1): se agrupan en
// un gooal genérico con muchos lugares. El resto (festival, maraton, camino…)
// son eventos únicos → un gooal propio cada uno. Agrupar por subcategoria a
// secas juntaría los ~27 festivales bajo un solo gooal "festival", que es justo
// lo que no queremos.
const SUBCATS_GENERICAS = new Set([
  'karting', 'paintball', 'escalada', 'paracaidismo', 'tirolina', 'puenting',
  'crossfit', 'surf', 'ski', 'padel', 'michelin', 'mercado', 'cocina', 'museo', 'teatro',
])

const TITULO_SCHEMA = {
  type: 'object',
  properties: { titulo: { type: 'string' } },
  required: ['titulo'],
  additionalProperties: false,
}

async function generarTituloGenerico(subcategoria, ejemplo) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 100,
    thinking: { type: 'disabled' },
    output_config: { effort: 'low', format: { type: 'json_schema', schema: TITULO_SCHEMA } },
    messages: [{
      role: 'user',
      content: `Genera un título genérico en español para este tipo de experiencia: "${subcategoria}".
Ejemplo de lugar: "${ejemplo.titulo}".
El título debe ser en infinitivo, corto (2-4 palabras) y aspiracional.
Ejemplos: "Practicar Karting", "Hacer Paintball", "Escalar en Roca".`,
    }],
  })
  const texto = message.content.find(b => b.type === 'text')?.text
  return texto ? JSON.parse(texto).titulo.trim() : null
}

// Upsert idempotente: devuelve el gooal existente o lo crea. La constraint UNIQUE
// sobre titulo hace de clave.
async function upsertGooal(g) {
  const { data, error } = await supabase
    .from('gooals')
    .upsert(g, { onConflict: 'titulo' })
    .select('id')
    .single()
  if (error) { console.error(`  ✗ Gooal "${g.titulo}": ${error.message}`); return null }
  return data.id
}

async function insertarLugar(gooalId, exp) {
  const nombre = exp.lugar_nombre || exp.titulo
  const { data: existe } = await supabase
    .from('gooal_lugares')
    .select('id')
    .eq('gooal_id', gooalId)
    .eq('nombre_lugar', nombre)
    .eq('ciudad', exp.ciudad ?? '')
    .limit(1)
  if (existe && existe.length > 0) return false

  const { error } = await supabase.from('gooal_lugares').insert({
    gooal_id: gooalId,
    nombre_lugar: nombre,
    ciudad: exp.ciudad,
    pais: exp.pais,
    latitud: exp.latitud,
    longitud: exp.longitud,
    rating: null,
    direccion: exp.lugar_direccion,
  })
  if (error) { console.error(`  ✗ Lugar "${nombre}": ${error.message}`); return false }
  return true
}

async function fase4() {
  console.log('\n══ FASE 4 — Migración a gooals ══\n')

  const { data: experiencias, error } = await supabase
    .from('experiencias')
    .select('*')
    .eq('verificada', true)
  if (error) { console.error(error.message); return }

  const genericos = {} // subcategoria -> exps[]
  const unicos = []
  for (const exp of experiencias) {
    if (exp.subcategoria && SUBCATS_GENERICAS.has(exp.subcategoria)) {
      ;(genericos[exp.subcategoria] ??= []).push(exp)
    } else {
      unicos.push(exp)
    }
  }

  let gooalsCreados = 0
  let lugaresCreados = 0

  // Gooals genéricos (una actividad, muchos lugares).
  for (const [subcat, exps] of Object.entries(genericos)) {
    const titulo = await generarTituloGenerico(subcat, exps[0])
    if (!titulo) { console.log(`  – Sin título para "${subcat}", saltado`); continue }

    const gooalId = await upsertGooal({
      titulo,
      categoria: exps[0].categoria,
      subcategoria: subcat,
      descripcion: exps[0].descripcion,
      tags: exps[0].tags,
      dificultad: exps[0].dificultad,
    })
    if (!gooalId) continue
    gooalsCreados++
    console.log(`  ✓ Gooal genérico: ${titulo} (${exps.length} lugares)`)

    for (const exp of exps) {
      if (await insertarLugar(gooalId, exp)) lugaresCreados++
    }
    await sleep(PAUSA_MS)
  }

  // Gooals únicos (festivales, eventos icónicos): uno por experiencia.
  for (const exp of unicos) {
    const gooalId = await upsertGooal({
      titulo: exp.titulo,
      categoria: exp.categoria,
      subcategoria: exp.subcategoria,
      descripcion: exp.descripcion,
      tags: exp.tags,
      dificultad: exp.dificultad,
    })
    if (!gooalId) continue
    gooalsCreados++
    if (await insertarLugar(gooalId, exp)) lugaresCreados++
  }

  console.log(`\n✓ Migración completada: ${gooalsCreados} gooals, ${lugaresCreados} lugares nuevos`)
}

// ── FASE 5 — Limpieza de lugares con nombre de empresa ───────

// Solo términos INEQUÍVOCOS de empresa u organizador. Se quitaron a propósito
// 'Club', 'Center', 'Centre' y 'Sports': en España/Cataluña muchos recintos
// físicos legítimos se llaman "Club de Pádel X" o "Centro Deportivo Y", así que
// esos keywords borraban sitios reales, no solo intermediarios. 'CAT' y '.com'
// van aparte para no tocar "Mercat…"/"Catalunya".
const KEYWORDS_EMPRESA = [
  'S.L.', 'S.A.', 'GROUP', 'School', 'Academy', 'Adventures',
]

function pareceEmpresa(nombre) {
  const n = nombre || ''
  if (KEYWORDS_EMPRESA.some(k => n.includes(k))) return true
  if (/\bCAT\b/.test(n)) return true // 'CAT' como palabra suelta, no dentro de "Mercat"
  if (/\.com/i.test(n)) return true
  return false
}

async function fase5() {
  console.log('\n══ FASE 5 — Limpieza de nombres de empresa ══\n')

  const { data, error } = await supabase
    .from('gooal_lugares')
    .select('id, nombre_lugar')
    .limit(5000)
  if (error) { console.error(error.message); return }

  const aBorrar = (data ?? []).filter(r => pareceEmpresa(r.nombre_lugar))
  console.log(`Lugares con pinta de empresa: ${aBorrar.length}`)
  for (const r of aBorrar.slice(0, 25)) console.log(`  – ${r.nombre_lugar}`)
  if (aBorrar.length === 0) return

  const ids = aBorrar.map(r => r.id)
  let borrados = 0
  for (let i = 0; i < ids.length; i += 100) {
    const lote = ids.slice(i, i + 100)
    const { error: delErr } = await supabase.from('gooal_lugares').delete().in('id', lote)
    if (delErr) { console.error('  ✗', delErr.message); return }
    borrados += lote.length
  }
  console.log(`\n✓ Eliminados ${borrados} lugares con nombre de empresa`)
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  // Selector de fases. Sin argumentos corre 1-3. Las fases 4 (migración) y 5
  // (limpieza de empresas) son opt-in: `node index.mjs 4`, `node index.mjs 5`.
  // Fase 1 ahora escribe directamente en gooal_lugares (no en experiencias).
  const pedidas = process.argv.slice(2).filter(a => ['1', '2', '3', '4', '5'].includes(a))
  const fases = pedidas.length ? pedidas : ['1', '2', '3']
  console.log(`Fases a ejecutar: ${fases.join(', ')}`)

  if (fases.includes('1')) await fase1()
  if (fases.includes('2')) await fase2()
  if (fases.includes('3')) await fase3()
  if (fases.includes('4')) await fase4()
  if (fases.includes('5')) await fase5()
  console.log(`\nTotal experiencias insertadas (fases 2-3): ${total}`)
}

main().catch(err => {
  console.error('\n✗ El script ha fallado:', err)
  process.exit(1)
})
