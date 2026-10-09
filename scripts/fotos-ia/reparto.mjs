// EL REPARTO DE LAS FOTOS DEL CATÁLOGO. No genera ni una imagen.
//
//   node --env-file=.env.local scripts/fotos-ia/reparto.mjs
//
// Contesta cuatro cosas, y las deja escritas en "Claude outputs/reparto.json"
// porque una respuesta en una conversación se pierde:
//
//   a) cuántos gooals caen en cada encuadre
//   b) cuántos se quedan en Commons y cuántos van a IA
//   c) cuánto costaría generarlos
//   d) una muestra de veinte para mirar si el reparto está bien
//
// ── LO QUE ESTE GUION NO ES ───────────────────────────────
//
// No es un veredicto. Propone un reparto a partir del título, y en este repo
// está medido y pagado que una regla sobre títulos acierta la mayoría y falla
// de maneras raras. Por eso existe la muestra de veinte: lo que se mira y se
// corrige se escribe a mano en ENCUADRE_DE, que manda sobre todo esto.
import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { encuadreDe, clasificarEncuadre, ENCUADRE_DE, construirPrompt } from './estilos.mjs'

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

/** Lo que costó cada imagen en la última tanda: gpt-image-1, 1024x1536, medium. */
const EURO_POR_IMAGEN = 0.0656

const PAGINA = 1000
async function leerTodo(pedir) {
  const filas = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await pedir(desde, desde + PAGINA - 1)
    if (error) throw new Error(error.message)
    filas.push(...data)
    if (data.length < PAGINA) return filas
  }
}

// ── NOMBRE PROPIO O TIPO DE SITIO ─────────────────────────
//
// La división del 10-10-2026: si el gooal nombra un sitio CONCRETO (la Sagrada
// Família, el Coliseo) se queda en Commons, porque la IA no acierta un edificio
// real y lo deforma. Si nombra un TIPO de sitio (un faro, un castillo) va a IA:
// no tiene que acertar ningún faro, solo tiene que hacer un faro.
//
// Se reconoce por las mayúsculas de dentro del título, que es la regla que ya
// se midió aquí: marcó 70 de 73 y se pasó de ancho siete veces. Esos siete son
// esta lista, y son todos del mismo tipo: marcas, pruebas con nombre, niveles y
// certificaciones. **Nadie mira una foto y dice «ese no es el Ironman»; sí dice
// «ese no es el Pedraforca».**
const NO_SON_SITIOS = [
  'Michelin', 'Ironman', 'Hyrox', 'C1', 'B2', 'Open Water', 'GR', 'PR',
  'Erasmus', 'Mundial', 'Navidad', 'Nochevieja', 'Semana Santa', 'San Juan',
  'Año Nuevo', 'Carnaval', 'Halloween', 'Reyes', 'Tour', 'Grand Slam',
]

/** Las palabras que, en minúscula, son un TIPO de sitio y no uno concreto. */
const MESES = /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)$/i

function nombraUnSitioConcreto(titulo) {
  // Se quita la primera palabra: siempre va en mayúscula por ser el principio.
  const palabras = titulo.split(/\s+/).slice(1)
  for (const cruda of palabras) {
    const p = cruda.replace(/[«».,:;()¿?¡!]/g, '')
    if (p.length < 2) continue
    if (!/^[A-ZÁÉÍÓÚÑÀÈÌÒÙÇ]/.test(p)) continue
    if (MESES.test(p)) continue
    if (NO_SON_SITIOS.some(n => n.toLowerCase() === p.toLowerCase() || titulo.includes(n))) continue
    return true
  }
  return false
}

// ── La frase de escena que saldría ────────────────────────
// Del prompt entero interesa solo el trozo que describe la escena, que es lo
// que hay que juzgar. El estilo y lo prohibido son iguales para todos.
function fraseDeEscena(gooal) {
  const entero = construirPrompt(gooal, 'A', 0)
  return entero.split(' PROHIBIDO que aparezca')[0].trim()
}

// ── El recorrido ──────────────────────────────────────────
const filas = await leerTodo((d, h) => s.from('gooals_v2')
  .select('id, titulo, categoria, ambito, ciudad, pais, imagen_url, foto_fuente')
  .eq('activo', true).eq('estado', 'verificado').order('titulo').range(d, h))

const todo = filas.map((g, i) => {
  const concreto = nombraUnSitioConcreto(g.titulo)
  return {
    ...g,
    indice: i,
    destino: concreto ? 'commons' : 'ia',
    encuadre: encuadreDe(g),
    aMano: Boolean(ENCUADRE_DE[g.titulo]),
    propuesto: clasificarEncuadre(g),
  }
})

const aIA = todo.filter(g => g.destino === 'ia')
const aCommons = todo.filter(g => g.destino === 'commons')

console.log(`EL CATÁLOGO PUBLICADO: ${todo.length} gooals\n`)

// ── b) El reparto entre Commons y la IA ───────────────────
console.log('── A DÓNDE VA CADA UNO ──')
console.log(`  nombre propio → se quedan en Commons   ${aCommons.length}`)
console.log(`  genéricos     → van a IA               ${aIA.length}`)
const yaIA = aIA.filter(g => g.foto_fuente === 'ia')
const yaCommons = aIA.filter(g => g.foto_fuente === 'commons')
const sinNada = aIA.filter(g => !g.imagen_url)
console.log(`      ...con foto de IA, a rehacer       ${yaIA.length}`)
console.log(`      ...con foto de Commons hoy         ${yaCommons.length}   <- decisión tuya`)
console.log(`      ...sin ninguna foto                ${sinNada.length}`)

const sinFotoEnCommons = aCommons.filter(g => !g.imagen_url)
console.log(`  de los de nombre propio, sin foto      ${sinFotoEnCommons.length}`)

// ── a) La cuenta por encuadre ─────────────────────────────
console.log('\n── CUÁNTOS CAEN EN CADA ENCUADRE (solo los que van a IA) ──')
const porEncuadre = {}
for (const g of aIA) (porEncuadre[g.encuadre] ??= []).push(g)
const orden = Object.entries(porEncuadre).sort((a, b) => b[1].length - a[1].length)
for (const [nombre, lista] of orden) {
  const pct = (lista.length / aIA.length) * 100
  console.log(`  ${nombre.padEnd(17)} ${String(lista.length).padStart(4)}   ${pct.toFixed(1).padStart(5)} %` +
    (pct > 20 ? '   <- pasa del 20 %, mira su lista' : ''))
}

// ── c) Lo que costaría ────────────────────────────────────
console.log('\n── LO QUE COSTARÍA GENERARLOS ──')
const aGenerar = yaIA.length + sinNada.length
console.log(`  a rehacer + sin nada: ${aGenerar} imágenes x ${EURO_POR_IMAGEN} $ = ${(aGenerar * EURO_POR_IMAGEN).toFixed(2)} $`)
console.log(`  si además se rehicieran los ${yaCommons.length} que hoy tienen Commons: ` +
  `${aIA.length} x ${EURO_POR_IMAGEN} $ = ${(aIA.length * EURO_POR_IMAGEN).toFixed(2)} $`)

// ── d) La muestra de veinte ───────────────────────────────
//
// No al azar entera: cinco de las que más dudas dan, cinco de 'espaldas' (que
// es el cajón de sastre y donde más fácil es colarse), cinco de 'lugar_vacio'
// (el encuadre nuevo que más va a salir) y cinco al azar de verdad.
const azar = (lista, n, semilla) => {
  const copia = [...lista]
  let h = semilla
  const sacados = []
  while (sacados.length < n && copia.length) {
    h = (h * 1103515245 + 12345) % 2147483648
    sacados.push(copia.splice(h % copia.length, 1)[0])
  }
  return sacados
}

/**
 * Las dudosas: las que el título no deja claras. Son las que caen en 'espaldas'
 * por descarte Y ADEMÁS tienen un verbo que podría ser de otra rama, más las
 * que tienen una mayúscula que no sé si es un sitio.
 */
const dudosas = aIA.filter(g =>
  g.encuadre === 'espaldas' && /\b(ver|hacer|probar|pasar|vivir|aprender)\b/i.test(g.titulo),
).slice(0, 5)

const muestra = [
  ...dudosas.map(g => ({ ...g, porque: 'de las que más dudas dan' })),
  ...azar(porEncuadre.espaldas ?? [], 5, 7).map(g => ({ ...g, porque: 'espaldas' })),
  ...azar(porEncuadre.lugar_vacio ?? [], 5, 13).map(g => ({ ...g, porque: 'lugar_vacio' })),
  ...azar(aIA, 5, 29).map(g => ({ ...g, porque: 'al azar' })),
]

console.log('\n── LA MUESTRA DE VEINTE ──')
for (const g of muestra) {
  console.log(`\n  [${g.porque}] ${g.titulo}`)
  console.log(`     categoría ${g.categoria} · encuadre ${g.encuadre}${g.aMano ? ' (escrito a mano)' : ''}`)
  console.log(`     escena: ${fraseDeEscena(g)}`)
}

// ── Y todo, a un fichero ──────────────────────────────────
writeFileSync('Claude outputs/reparto.json', JSON.stringify({
  cuando: new Date().toISOString().slice(0, 10),
  total: todo.length,
  commons: aCommons.length,
  ia: aIA.length,
  aRehacer: yaIA.length,
  conCommonsHoy: yaCommons.length,
  sinNada: sinNada.length,
  porEncuadre: Object.fromEntries(orden.map(([n, l]) => [n, l.length])),
  gooals: todo.map(g => ({ titulo: g.titulo, categoria: g.categoria, destino: g.destino, encuadre: g.encuadre, aMano: g.aMano, fuenteHoy: g.foto_fuente ?? null })),
}, null, 1), 'utf8')
console.log('\nEl reparto entero, en "Claude outputs/reparto.json".')
