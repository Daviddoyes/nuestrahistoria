// Propone UNA foto por gooal de acción, y monta hojas para mirarlas todas.
//
//   node scripts/fotos-catalogo/elegir-accion.mjs
//
// Lee "Claude outputs/fotos-accion.json" (lo que dejó candidatas-accion.mjs) y
// escribe:
//   · fotos-accion-elegidas.json — una propuesta por gooal, o ninguna
//   · accion-revision-N.png — las propuestas pegadas de veinte en veinte, para
//     mirarlas de un vistazo y marcar las que no enseñan lo que dicen
//
// NO TOCA LA BASE. Propone; decide quien mira.
//
// ── EL ORDEN DE PREFERENCIA ───────────────────────────────
//
// Sale de la prueba de veinte, mirada una a una:
//
//   1. la carpeta de Commons de la actividad — alguien ya clasificó esas fotos
//      como "esto es eso", y es lo que mejor funcionó con las acciones
//   2. la portada del artículo — la eligió una persona, pero representa el
//      ARTÍCULO, y para una actividad eso a veces es un cartel o un esquema
//   3. la carpeta del nombre propio
//   4. la búsqueda en inglés
//   5. la búsqueda en español — la más ruidosa: "10K" devolvió un retrato
//      antiguo y una partitura
//
// ── Y UNA REGLA QUE NO ES DE CALIDAD, ES DE HONESTIDAD ────
//
// Si un gooal GENÉRICO y uno con NOMBRE PROPIO quieren la misma foto, se la
// queda el genérico y el concreto se queda SIN FOTO.
//
// La foto de la Marató de Barcelona, con el Arc de Triomf detrás, no puede
// ilustrar la Mitja de Granollers: los primeros usuarios son catalanes y lo
// verían al instante. Y sin foto no sale en Descubrir, que es el resultado
// correcto y no un fallo.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SALIDA = fileURLToPath(new URL('../../Claude outputs', import.meta.url))
const AGENTE = 'GooALS/1.0 (https://gooals.app) catalogo-de-fotos'
const dormir = ms => new Promise(r => setTimeout(r, ms))

const PREFERENCIA = [
  'carpeta de Commons',
  'portada del artículo',
  'carpeta del nombre propio',
  'Commons en inglés',
  'Commons en español',
]

const filas = JSON.parse(readFileSync(SALIDA + '/fotos-accion.json', 'utf8'))

// ── Una propuesta por gooal ───────────────────────────────
const mejor = c => {
  const i = PREFERENCIA.indexOf(c.estrategia)
  return i < 0 ? PREFERENCIA.length : i
}

const elegidas = filas.map(g => {
  const ordenadas = [...g.candidatas].sort((a, b) => mejor(a) - mejor(b))
  return { ...g, elegida: ordenadas[0] ?? null, motivoSinFoto: ordenadas[0] ? null : 'sin candidatas' }
})

// ── La regla del genérico y el concreto ───────────────────
// Se recorre dos veces a propósito: primero se apuntan las fotos que se quedan
// los genéricos, y solo después se les quita a los concretos. Al revés, el
// resultado dependería del orden de la lista.
const deGenericos = new Set()
for (const g of elegidas) {
  if (g.elegida && (g.nombresPropios ?? []).length === 0) deGenericos.add(g.elegida.fichero)
}
let quitadas = 0
for (const g of elegidas) {
  if (!g.elegida) continue
  if ((g.nombresPropios ?? []).length === 0) continue
  if (!deGenericos.has(g.elegida.fichero)) continue
  g.elegida = null
  g.motivoSinFoto = 'su foto ya ilustra un gooal genérico'
  quitadas++
}

const conFoto = elegidas.filter(g => g.elegida)
const sinFoto = elegidas.filter(g => !g.elegida)
const sinFotoConNombre = sinFoto.filter(g => (g.nombresPropios ?? []).length > 0)

console.log('gooals mirados:        ', elegidas.length)
console.log('con foto propuesta:    ', conFoto.length)
console.log('sin foto:              ', sinFoto.length)
console.log('  ...y llevan nombre propio en el título:', sinFotoConNombre.length)
console.log('quitadas por chocar con un genérico:     ', quitadas)
console.log('\npor categoría:')
for (const c of ['deporte', 'gastronomia', 'vida']) {
  const dentro = elegidas.filter(g => g.categoria === c)
  console.log(`  ${c.padEnd(12)} ${dentro.filter(g => g.elegida).length} de ${dentro.length}`)
}

writeFileSync(SALIDA + '/fotos-accion-elegidas.json', JSON.stringify(elegidas, null, 1), 'utf8')

// ── Las hojas para mirarlas ───────────────────────────────
const { default: sharp } = await import('sharp')
const ANCHO = 240, ALTO = 180, COLS = 5, FILAS = 4
const POR_HOJA = COLS * FILAS

const vacia = await sharp({ create: { width: ANCHO, height: ALTO, channels: 3, background: '#141615' } }).jpeg().toBuffer()

async function mini(url) {
  try {
    await dormir(200)
    const r = await fetch(url, { headers: { 'User-Agent': AGENTE } })
    if (!r.ok) throw new Error(String(r.status))
    return await sharp(Buffer.from(await r.arrayBuffer()))
      .resize({ width: ANCHO, height: ALTO, fit: 'cover' }).jpeg({ quality: 78 }).toBuffer()
  } catch { return vacia }
}

mkdirSync(SALIDA, { recursive: true })
let hoja = 0
for (let i = 0; i < conFoto.length; i += POR_HOJA) {
  const grupo = conFoto.slice(i, i + POR_HOJA)
  const capas = []
  for (const [n, g] of grupo.entries()) {
    const buf = await mini(g.elegida.miniatura ?? g.elegida.original)
    capas.push({ input: buf, left: (n % COLS) * (ANCHO + 3), top: Math.floor(n / COLS) * (ALTO + 3) })
  }
  hoja++
  const alto = Math.ceil(grupo.length / COLS) * (ALTO + 3)
  await sharp({ create: { width: COLS * (ANCHO + 3), height: alto, channels: 3, background: '#0B0B0B' } })
    .composite(capas).png().toFile(`${SALIDA}/accion-revision-${hoja}.png`)
  console.log(`\nhoja ${hoja} (de izquierda a derecha y de arriba abajo):`)
  grupo.forEach((g, n) => console.log(`  ${String(n + 1).padStart(2)}. ${g.titulo}`))
}

console.log('\nescrito: Claude outputs/fotos-accion-elegidas.json y', hoja, 'hojas de revisión')
