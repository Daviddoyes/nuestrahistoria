// Genera las imágenes de prueba de un estilo sobre un grupo de gooals.
//
//   node --env-file=.env.local scripts/fotos-ia/probar-estilos.mjs --seco
//   node --env-file=.env.local scripts/fotos-ia/probar-estilos.mjs --una
//   node --env-file=.env.local scripts/fotos-ia/probar-estilos.mjs --estilos=A --carpeta=ronda2
//   node --env-file=.env.local scripts/fotos-ia/probar-estilos.mjs --estilos=B --grupo=abstractos --carpeta=abstractos-b
//
// NO TOCA LA BASE NI SUPABASE. Solo lee las filas de los gooals y escribe
// imágenes en "Claude outputs/<carpeta>/". Es para mirar y decidir.
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
// cuesta dinero dos veces. Y por eso cada ronda va a SU carpeta: si se
// reescribe la plantilla, las de antes no se mezclan con las nuevas ni las
// tapan.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { crearFrenos, esFreno } from '../lib/frenos.mjs'
import { construirPrompt, encuadreDe, ABSTRACTOS, TAMANO, MODELO, CALIDAD } from './estilos.mjs'

const arg = (nombre, porDefecto) => {
  const a = process.argv.find(x => x.startsWith('--' + nombre + '='))
  return a ? a.slice(nombre.length + 3) : porDefecto
}
const seco = process.argv.includes('--seco')
// --una genera SOLO la primera, para comprobar que el modelo responde y ver el
// coste real antes de soltar la tanda entera.
const soloUna = process.argv.includes('--una')
const estilosPedidos = arg('estilos', 'A,B,C').split(',').map(x => x.trim()).filter(Boolean)
const grupo = arg('grupo', 'ocho')
const carpeta = arg('carpeta', 'fotos-ia')
const vueltas = Number(arg('vueltas', '2'))

const SALIDA = fileURLToPath(new URL('../../Claude outputs/' + carpeta, import.meta.url))
const dormir = ms => new Promise(r => setTimeout(r, ms))

// Las tarifas publicadas de gpt-image-1, en dólares por token. El coste se
// calcula con los tokens que devuelve la propia API, no a ojo. Aun así, el
// número que manda es el del panel de OpenAI: esto es una cuenta hecha con las
// tarifas de hoy, y las tarifas cambian.
const TARIFA = { textoEntrada: 5 / 1e6, imagenEntrada: 10 / 1e6, imagenSalida: 40 / 1e6 }

const CLAVE = process.env.OPENAI_API_KEY
if (!CLAVE) throw new Error('falta OPENAI_API_KEY. Lánzalo con --env-file=.env.local')

// ── Los grupos de gooals ──────────────────────────────────
//
// «ocho»: uno por cada caso que rompe un estilo. Son los mismos de la primera
// prueba a propósito: cambiar los gooals Y el estilo a la vez haría imposible
// saber a cuál de las dos cosas se debe la diferencia.
const OCHO = [
  { caso: '1 · logro abstracto, nada que fotografiar', titulo: 'Montar tu propia empresa' },
  { caso: '2 · una persona haciendo deporte',          titulo: 'Practicar esquí' },
  { caso: '3 · comida',                                titulo: 'Probar el fugu' },
  { caso: '4 · de noche o en interior',                titulo: 'Cantar en un karaoke' },
  { caso: '5 · con equipo o maquinaria',               titulo: 'Saltar en paracaídas' },
  { caso: '6 · en naturaleza',                         titulo: 'Caminar sobre un glaciar en Islandia' },
  { caso: '7 · tranquilo o íntimo',                    titulo: 'Dormir en una cabaña sin electricidad' },
  { caso: '8 · con mucha gente',                       titulo: 'Correr la Marató de Barcelona' },
]

// «abstractos»: seis de los catorce que no tienen nada que fotografiar. Seis y
// no catorce porque es una prueba, y con seis ya se ve si la vía sirve.
const SEIS_ABSTRACTOS = [
  'Montar tu propia empresa', 'Sacarte el C1 de inglés', 'Publicar un libro',
  'Terminar un máster', 'Vivir un año en otro país', 'Sacarte el cinturón negro',
].map(t => ({ caso: 'abstracto · ' + t, titulo: t }))

// Y con --titulos=<ruta> se le da una lista cualquiera: un JSON con un array de
// títulos. Es lo que se usa para las tandas de verdad, donde los gooals salen
// de una clasificación que se ha mirado antes y no de una lista escrita aquí.
const rutaTitulos = arg('titulos', null)
const PEDIDOS = rutaTitulos
  ? JSON.parse(readFileSync(rutaTitulos, 'utf8')).map(t => ({ caso: 'de la lista', titulo: t }))
  : (grupo === 'abstractos' ? SEIS_ABSTRACTOS : OCHO)

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: filas, error } = await s.from('gooals_v2')
  .select('id, titulo, categoria, ambito, ciudad, pais, puntos, imagen_url')
  .in('titulo', PEDIDOS.map(x => x.titulo)).eq('activo', true).eq('estado', 'verificado')
if (error) throw new Error('no se pudo leer el catálogo: ' + error.message)

// Si falta uno, se para: una rejilla incompleta no es la prueba que se encargó.
const gooals = PEDIDOS.map(x => {
  const g = filas.find(f => f.titulo === x.titulo)
  if (!g) throw new Error('no está en el catálogo: ' + x.titulo)
  return { ...g, caso: x.caso }
})

const porTitulo = [...gooals].sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'))
const trabajos = []
for (const g of gooals) {
  const indice = porTitulo.findIndex(x => x.titulo === g.titulo)
  for (const estilo of estilosPedidos) {
    // Dos vueltas al probar un estilo (para ver si aguanta), una sola en la
    // tanda de verdad: ahí ya no se compara, se produce.
    for (const vuelta of (vueltas === 1 ? [1] : [1, 2])) {
      // El índice decide a quién le toca salir en la foto, por turno. Es la
      // posición del gooal en la lista ORDENADA POR TÍTULO, no en la lista tal
      // como venga: así dos lanzamientos de la misma tanda reparten igual.
      trabajos.push({ gooal: g, estilo, vuelta, prompt: construirPrompt(g, estilo, indice) })
    }
  }
}

const nombreDe = t => t.estilo + '-' + t.gooal.titulo
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42) + '-' + t.vuelta

console.log('grupo «' + grupo + '» · ' + gooals.length + ' gooals x ' + estilosPedidos.length +
  ' estilo(s) [' + estilosPedidos.join(',') + '] x ' + (vueltas === 1 ? 1 : 2) + ' vuelta(s) = ' + trabajos.length + ' imágenes')
console.log('modelo ' + MODELO + ' · ' + TAMANO + ' · calidad ' + CALIDAD)
console.log('salida: Claude outputs/' + carpeta + '/\n')
for (const g of gooals) {
  console.log('  ' + g.caso.padEnd(42) + g.titulo.padEnd(38) + '[encuadre: ' + encuadreDe(g) +
    (ABSTRACTOS.includes(g.titulo) ? ' · escena fija' : '') + ']')
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
//
// Las esperas son largas a propósito. Con 4s/12s/30s se perdían cuatro de cada
// trece: el límite de OpenAI es por ventana de tiempo, y una espera corta cae
// dentro de la misma ventana que ya te frenó. Es la misma lección que está en
// CLAUDE.md para comprobar-rls.mjs, aprendida otra vez aquí.
// La espera ante los frenos NO se escribe aquí: vive en scripts/lib/frenos.mjs
// y la usan también comprobar-rls.mjs y el buscador de Commons. Se sacó ahí
// después de que este guion perdiera cuatro de trece imágenes por tener sus
// propias esperas copiadas a mano, más cortas que las que ya se habían
// aprendido en otro sitio.
const frenos = crearFrenos()

async function pedirImagen(prompt) {
  const r = await frenos.intentar(async () => {
    let resp
    try {
      resp = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + CLAVE },
        body: JSON.stringify({ model: MODELO, prompt, size: TAMANO, quality: CALIDAD, n: 1 }),
      })
    } catch (e) { return { freno: 'no conecta: ' + e.message } }
    if (esFreno(resp.status)) return { freno: 'responde ' + resp.status }
    const j = await resp.json().catch(() => null)
    // Un 400 es el prompt: reintentarlo da lo mismo y se paga dos veces.
    if (!resp.ok) return { error: (j && j.error && j.error.message) || ('responde ' + resp.status) }
    const b64 = j && j.data && j.data[0] && j.data[0].b64_json
    if (!b64) return { error: 'la respuesta no trae imagen' }
    return { b64, usage: j.usage || null }
  })
  return r.agotado ? { error: r.motivo } : r
}

// ── A por ellas, de tres en tres ──────────────────────────
const hechos = []
let saltadas = 0, fallos = 0, n = 0
// Con --paralelo=1 va de una en una, que es lo que hay que hacer cuando la API
// ya está frenando.
const EN_PARALELO = Number(arg('paralelo', '3'))

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
  await frenos.antesDePedir()
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
  modelo: MODELO, tamano: TAMANO, calidad: CALIDAD, coste, grupo, estilos: estilosPedidos,
  gooals: gooals.map(g => ({
    titulo: g.titulo, caso: g.caso, categoria: g.categoria, ambito: g.ambito,
    ciudad: g.ciudad, pais: g.pais, yaTeniaFoto: Boolean(g.imagen_url),
    encuadre: encuadreDe(g), escenaFija: ABSTRACTOS.includes(g.titulo),
  })),
  hechos: hechos.map(h => ({ gooal: h.gooal.titulo, estilo: h.estilo, vuelta: h.vuelta, nombre: h.nombre, error: h.error || null })),
}, null, 1), 'utf8')

console.log('\nAhora la hoja:  node scripts/fotos-ia/hoja.mjs --carpeta=' + carpeta)
}
