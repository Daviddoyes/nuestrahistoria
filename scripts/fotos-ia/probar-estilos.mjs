// La prueba de los tres estilos: 8 gooals x 3 estilos x 2 veces = 48 imágenes.
//
//   node --env-file=.env.local scripts/fotos-ia/probar-estilos.mjs --seco
//   node --env-file=.env.local scripts/fotos-ia/probar-estilos.mjs
//
// NO TOCA LA BASE NI SUPABASE. Solo lee las filas de los 8 gooals y escribe
// imágenes en "Claude outputs/fotos-ia/". Es para mirar y decidir el estilo.
//
// ── POR QUÉ DOS VECES CADA UNA ────────────────────────────
//
// Es lo que de verdad se está comprando. Un estilo bonito que sale distinto
// cada vez no sirve: 260 fotos que no se parecen entre sí son peores que
// ninguna, porque el catálogo parece recortado de sitios distintos. Así que de
// cada gooal se generan DOS con el MISMO prompt y se ponen una al lado de otra.
//
// ── SE PUEDE PARAR Y SEGUIR ───────────────────────────────
//
// Antes de pedir una imagen mira si el fichero ya está. Cortar a mitad no
// cuesta dinero dos veces.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { construirPrompt, TAMANO, MODELO, CALIDAD } from './estilos.mjs'

const SALIDA = fileURLToPath(new URL('../../Claude outputs/fotos-ia', import.meta.url))
const seco = process.argv.includes('--seco')
// --una genera SOLO la primera, para comprobar que el modelo responde y ver el
// coste real antes de soltar las 48. Una tanda que falla a la mitad por un
// ajuste mal puesto se paga igual.
const soloUna = process.argv.includes('--una')
const dormir = ms => new Promise(r => setTimeout(r, ms))

// Las tarifas publicadas de gpt-image-1, en dólares por token. El coste se
// calcula con los tokens que devuelve la propia API, no a ojo. Aun así, el
// número que manda es el del panel de OpenAI: esto es una cuenta hecha con las
// tarifas de hoy, y las tarifas cambian.
const TARIFA = { textoEntrada: 5 / 1e6, imagenEntrada: 10 / 1e6, imagenSalida: 40 / 1e6 }

const CLAVE = process.env.OPENAI_API_KEY
if (!CLAVE) throw new Error('falta OPENAI_API_KEY. Lánzalo con --env-file=.env.local')

// ── Los ocho, uno por cada caso que rompe un estilo ───────
const LOS_OCHO = [
  { caso: '1 · logro abstracto, nada que fotografiar', titulo: 'Montar tu propia empresa' },
  { caso: '2 · una persona haciendo deporte',          titulo: 'Practicar esquí' },
  { caso: '3 · comida',                                titulo: 'Probar el fugu' },
  { caso: '4 · de noche o en interior',                titulo: 'Cantar en un karaoke' },
  { caso: '5 · con equipo o maquinaria',               titulo: 'Saltar en paracaídas' },
  { caso: '6 · en naturaleza',                         titulo: 'Caminar sobre un glaciar en Islandia' },
  { caso: '7 · tranquilo o íntimo',                    titulo: 'Dormir en una cabaña sin electricidad' },
  { caso: '8 · con mucha gente',                       titulo: 'Correr la Marató de Barcelona' },
]

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: filas, error } = await s.from('gooals_v2')
  .select('id, titulo, categoria, ambito, ciudad, pais, puntos, imagen_url')
  .in('titulo', LOS_OCHO.map(x => x.titulo)).eq('activo', true).eq('estado', 'verificado')
if (error) throw new Error('no se pudo leer el catálogo: ' + error.message)

// Si falta uno, se para: una rejilla de 7 no es la prueba que se encargó.
const gooals = LOS_OCHO.map(x => {
  const g = filas.find(f => f.titulo === x.titulo)
  if (!g) throw new Error('no está en el catálogo: ' + x.titulo)
  return { ...g, caso: x.caso }
})

const trabajos = []
for (const g of gooals) {
  for (const estilo of ['A', 'B', 'C']) {
    for (const vuelta of [1, 2]) {
      trabajos.push({ gooal: g, estilo, vuelta, prompt: construirPrompt(g, estilo) })
    }
  }
}

const nombreDe = t => t.estilo + '-' + t.gooal.titulo
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42) + '-' + t.vuelta

console.log(gooals.length + ' gooals x 3 estilos x 2 vueltas = ' + trabajos.length + ' imágenes')
console.log('modelo ' + MODELO + ' · ' + TAMANO + ' · calidad ' + CALIDAD + '\n')
for (const g of gooals) {
  console.log('  ' + g.caso.padEnd(42) + g.titulo + '  [' + g.categoria + ' · ' + g.ambito + ']')
}

if (seco) {
  console.log('\nEN SECO. Un prompt de ejemplo:\n')
  console.log(trabajos[0].prompt)
  console.log('\nPara generarlas de verdad, quita --seco.')
} else {

mkdirSync(SALIDA, { recursive: true })

// ── Pedir una imagen, con reintento ───────────────────────
// Un 429 es "ahora no" y un 5xx es un mal rato suyo: se espera y se reinsiste.
// Un 400 es el prompt, y eso no se reintenta: sería pagar dos veces el mismo
// error y además el segundo intento daría exactamente lo mismo.
const ESPERAS = [4000, 12000, 30000]
async function pedirImagen(prompt) {
  let ultimo = null
  for (let intento = 0; intento <= ESPERAS.length; intento++) {
    if (intento) await dormir(ESPERAS[intento - 1])
    let r
    try {
      r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + CLAVE },
        body: JSON.stringify({ model: MODELO, prompt, size: TAMANO, quality: CALIDAD, n: 1 }),
      })
    } catch (e) { ultimo = 'no conecta: ' + e.message; continue }
    if (r.status === 429 || r.status >= 500) { ultimo = 'responde ' + r.status; continue }
    const j = await r.json().catch(() => null)
    if (!r.ok) return { error: (j && j.error && j.error.message) || ('responde ' + r.status), definitivo: true }
    const b64 = j && j.data && j.data[0] && j.data[0].b64_json
    if (!b64) return { error: 'la respuesta no trae imagen', definitivo: true }
    return { b64, usage: j.usage || null }
  }
  return { error: ultimo + ' después de ' + (ESPERAS.length + 1) + ' intentos' }
}

// ── A por ellas, de tres en tres ──────────────────────────
const hechos = []
let saltadas = 0, fallos = 0, n = 0
const EN_PARALELO = 3

async function trabajar(t) {
  const nombre = nombreDe(t)
  const ruta = SALIDA + '/' + nombre + '.png'
  // El prompt se guarda SIEMPRE al lado de su imagen, aunque la imagen falle:
  // sin él, una foto que no gusta no se sabe retocar.
  writeFileSync(SALIDA + '/' + nombre + '.txt', t.prompt, 'utf8')
  if (existsSync(ruta)) {
    saltadas++
    const meta = existsSync(SALIDA + '/' + nombre + '.json')
      ? JSON.parse(readFileSync(SALIDA + '/' + nombre + '.json', 'utf8')) : {}
    hechos.push({ ...t, nombre, usage: meta.usage || null })
    return
  }
  const r = await pedirImagen(t.prompt)
  n++
  if (r.error) {
    fallos++
    console.error('  ' + String(n).padStart(2) + '/' + trabajos.length + '  FALLO · ' + nombre + ' · ' + r.error)
    hechos.push({ ...t, nombre, error: r.error })
    return
  }
  const buf = Buffer.from(r.b64, 'base64')
  writeFileSync(ruta, buf)
  writeFileSync(SALIDA + '/' + nombre + '.json', JSON.stringify({
    gooal: t.gooal.titulo, estilo: t.estilo, vuelta: t.vuelta,
    prompt: t.prompt, usage: r.usage, modelo: MODELO, tamano: TAMANO, calidad: CALIDAD,
  }, null, 1), 'utf8')
  console.log('  ' + String(n).padStart(2) + '/' + trabajos.length + '  ' +
    String(Math.round(buf.length / 1024)).padStart(4) + ' KB · ' + nombre)
  hechos.push({ ...t, nombre, usage: r.usage })
}

const cola = soloUna ? [trabajos[0]] : [...trabajos]
await Promise.all(Array.from({ length: soloUna ? 1 : EN_PARALELO }, async () => {
  while (cola.length) await trabajar(cola.shift())
}))

// ── Lo que ha costado ─────────────────────────────────────
let coste = 0, conDato = 0, sinDato = 0
for (const h of hechos) {
  const u = h.usage
  if (!u) { if (!h.error) sinDato++; continue }
  const entradaImagen = (u.input_tokens_details && u.input_tokens_details.image_tokens) || 0
  const entradaTexto = (u.input_tokens || 0) - entradaImagen
  coste += entradaTexto * TARIFA.textoEntrada + entradaImagen * TARIFA.imagenEntrada + (u.output_tokens || 0) * TARIFA.imagenSalida
  conDato++
}

console.log('\ngeneradas ' + (n - fallos) + ' · ya estaban ' + saltadas + ' · fallos ' + fallos)
console.log('COSTE de esta tanda: $' + coste.toFixed(3) + (sinDato ? '  (' + sinDato + ' sin datos de uso)' : ''))
if (conDato) {
  const porImagen = coste / conDato
  console.log('por imagen: $' + porImagen.toFixed(4))
  console.log('las 260 del catálogo, a una por gooal: $' + (porImagen * 260).toFixed(2))
}
console.log('\nEl número que manda es el del panel de OpenAI. Esto es una cuenta hecha')
console.log('con los tokens que devuelve la API y las tarifas publicadas hoy.')

writeFileSync(SALIDA + '/resumen.json', JSON.stringify({
  modelo: MODELO, tamano: TAMANO, calidad: CALIDAD, coste,
  gooals: gooals.map(g => ({ titulo: g.titulo, caso: g.caso, categoria: g.categoria, ambito: g.ambito, ciudad: g.ciudad, pais: g.pais, yaTeniaFoto: Boolean(g.imagen_url) })),
  hechos: hechos.map(h => ({ gooal: h.gooal.titulo, estilo: h.estilo, vuelta: h.vuelta, nombre: h.nombre, error: h.error || null })),
}, null, 1), 'utf8')

console.log('\nAhora la hoja:  node scripts/fotos-ia/hoja.mjs')
}
