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
const MAX_POR_BUSQUEDA = 5
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

const BUSQUEDAS_LOCALES = [
  { query: 'karting circuit', categoria: 'aventura', subcategoria: 'karting' },
  { query: 'paintball', categoria: 'aventura', subcategoria: 'paintball' },
  { query: 'indoor climbing wall escalada', categoria: 'aventura', subcategoria: 'escalada' },
  { query: 'paracaidismo skydiving', categoria: 'aventura', subcategoria: 'paracaidismo' },
  { query: 'tirolina zip line', categoria: 'aventura', subcategoria: 'tirolina' },
  { query: 'puenting bungee jumping', categoria: 'aventura', subcategoria: 'puenting' },
  { query: 'crossfit box gym', categoria: 'deporte', subcategoria: 'crossfit' },
  { query: 'surf school escuela surf', categoria: 'deporte', subcategoria: 'surf' },
  { query: 'ski resort estacion ski', categoria: 'deporte', subcategoria: 'ski' },
  { query: 'padel club', categoria: 'deporte', subcategoria: 'padel' },
  { query: 'restaurante estrella michelin', categoria: 'gastronomia', subcategoria: 'michelin' },
  { query: 'mercado gastronómico food market', categoria: 'gastronomia', subcategoria: 'mercado' },
  { query: 'cooking class taller cocina', categoria: 'gastronomia', subcategoria: 'cocina' },
  { query: 'museo arte museum', categoria: 'cultura', subcategoria: 'museo' },
  { query: 'teatro opera house', categoria: 'cultura', subcategoria: 'teatro' },
]

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

// ── Google Places ────────────────────────────────────────────

async function buscarLugares(query, ciudad) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask':
        'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location,places.photos',
    },
    body: JSON.stringify({ textQuery: `${query} en ${ciudad}`, languageCode: 'es' }),
  })

  if (!res.ok) {
    const txt = await res.text()
    console.error(`  ✗ Google Places ${res.status}: ${txt.slice(0, 160)}`)
    return []
  }
  const data = await res.json()
  return data.places ?? []
}

// ── Claude: redacta el detalle editorial de un lugar real ────

const DETALLE_SCHEMA = {
  type: 'object',
  properties: {
    titulo: { type: 'string' },
    descripcion: { type: 'string' },
    dificultad: { type: 'string', enum: ['facil', 'medio', 'dificil'] },
    duracion: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
  },
  required: ['titulo', 'descripcion', 'dificultad', 'duracion', 'tags'],
  additionalProperties: false,
}

async function redactarDetalle({ place, categoria, subcategoria, ciudad }) {
  const prompt = `Vas a describir una experiencia real para una app de bucket list.

Lugar: ${place.displayName?.text}
Dirección: ${place.formattedAddress}
Ciudad: ${ciudad}
Categoría: ${categoria} / ${subcategoria}
Valoración: ${place.rating}★ (${place.userRatingCount} reseñas)

Devuelve:
- titulo: en español, tipo "Karting en ${ciudad}" o el nombre del plan, menos de 70 caracteres.
- descripcion: 2-3 frases evocadoras en español, sin inventar datos que no tengas.
- dificultad: "facil", "medio" o "dificil".
- duracion: p.ej. "2-3 horas".
- tags: máximo 5 etiquetas en minúsculas.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    thinking: { type: 'disabled' },
    output_config: { effort: 'low', format: { type: 'json_schema', schema: DETALLE_SCHEMA } },
    messages: [{ role: 'user', content: prompt }],
  })

  if (message.stop_reason === 'refusal') return null
  const texto = message.content.find(b => b.type === 'text')?.text
  if (!texto) return null
  const d = JSON.parse(texto)
  return { ...d, tags: Array.isArray(d.tags) ? d.tags.slice(0, 5) : [] }
}

// ── Supabase: inserta con control de duplicados ──────────────

let total = 0

async function insertar(exp) {
  const { data: existe } = await supabase
    .from('experiencias')
    .select('id')
    .eq('titulo', exp.titulo)
    .eq('ciudad', exp.ciudad)
    .maybeSingle()

  if (existe) {
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

// ── FASE 1 ───────────────────────────────────────────────────

async function fase1() {
  console.log('\n══ FASE 1 — Google Places ══\n')

  for (const busqueda of BUSQUEDAS_LOCALES) {
    for (const { ciudad, pais } of CIUDADES) {
      console.log(`Buscando ${busqueda.subcategoria} en ${ciudad}...`)

      let lugares
      try {
        lugares = await buscarLugares(busqueda.query, ciudad)
      } catch (err) {
        console.error(`  ✗ Fallo de red: ${err.message}`)
        continue
      }

      const buenos = lugares.filter(p => {
        const ok = (p.rating ?? 0) >= MIN_RATING && (p.userRatingCount ?? 0) >= MIN_RESENAS
        if (!ok && p.rating != null) {
          console.log(`  ✗ Saltada: ${p.displayName?.text} rating ${p.rating} / ${p.userRatingCount ?? 0} reseñas`)
        }
        return ok
      }).slice(0, MAX_POR_BUSQUEDA)

      for (const place of buenos) {
        try {
          const detalle = await redactarDetalle({
            place, categoria: busqueda.categoria, subcategoria: busqueda.subcategoria, ciudad,
          })
          if (!detalle) { console.log(`  – Sin detalle para ${place.displayName?.text}`); continue }

          await insertar({
            titulo: detalle.titulo,
            categoria: busqueda.categoria,
            subcategoria: busqueda.subcategoria,
            ciudad,
            pais,
            descripcion: detalle.descripcion,
            dificultad: detalle.dificultad,
            duracion: detalle.duracion,
            tags: detalle.tags,
            lugar_nombre: place.displayName?.text ?? null,
            lugar_direccion: place.formattedAddress ?? null,
            latitud: place.location?.latitude ?? null,
            longitud: place.location?.longitude ?? null,
            verificada: true, // viene de Google Places con buena valoración
            _rating: place.rating,
          })
        } catch (err) {
          console.error(`  ✗ Error con ${place.displayName?.text}: ${err.message}`)
        }
        await sleep(PAUSA_MS)
      }
    }
  }
}

// ── FASE 2 ───────────────────────────────────────────────────

async function fase2() {
  console.log('\n══ FASE 2 — Experiencias icónicas ══\n')
  for (const exp of ICONICAS) {
    await insertar(exp)
  }
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  await fase1()
  await fase2()
  console.log(`\nTotal generadas: ${total} experiencias`)
}

main().catch(err => {
  console.error('\n✗ El script ha fallado:', err)
  process.exit(1)
})
