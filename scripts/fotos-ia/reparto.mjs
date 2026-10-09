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
import { encuadreDe, porQueEncuadre, ENCUADRE_DE, construirPrompt } from './estilos.mjs'
import { destinoDe, comprobarControl, CONTROL } from './reparto-reglas.mjs'
import { CAMARA, DECIDIDOS } from './decisiones.mjs'

// ══ EL CONTROL, ANTES DE NADA ═════════════════════════════
//
// Quince títulos con el encuadre que deben dar. Si falla uno, aquí se acaba:
// **un reparto que sale con las reglas rotas es peor que ninguno, porque
// parece un resultado.** Esto es lo que habría cazado en el primer segundo que
// todas las reglas estaban muertas y todo caía en 'espaldas'.
console.log('Control: ' + comprobarControl(encuadreDe) + ' de ' + CONTROL.length + ' titulos dan el encuadre que deben.')


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
  const { destino, porque } = destinoDe(g)
  return {
    ...g,
    indice: i,
    destino,
    porque,
    encuadre: destino === 'ia' ? encuadreDe(g) : null,
    por: destino === 'ia' ? porQueEncuadre(g) : null,
    aMano: Boolean(ENCUADRE_DE[g.titulo]),
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
  const porDescarte = lista.filter(g => g.por === 'ultimo-recurso').length
  console.log(`  ${nombre.padEnd(17)} ${String(lista.length).padStart(4)}   ${pct.toFixed(1).padStart(5)} %` +
    (porDescarte ? `   (${porDescarte} por descarte)` : '') +
    (pct > 20 ? '   <- pasa del 20 %, mira su lista' : ''))
}

// ── LA ALARMA, que es la otra mitad del control ───────────
//
// No mira si un encuadre sale mucho: mira si sale mucho SIN QUE NINGUNA REGLA
// HAYA CASADO. Un encuadre al 40 % porque se ha decidido caso por caso está
// bien; al 40 % por descarte es la firma de que las reglas no están
// funcionando, que es exactamente lo que pasó con el  y nadie vio.
const porDescarte = aIA.filter(g => g.por === 'ultimo-recurso')
const pctDescarte = (porDescarte.length / aIA.length) * 100
if (pctDescarte > 30) {
  console.log(`
  AVISO: el ${pctDescarte.toFixed(1)} % llega a su encuadre POR DESCARTE, sin que ninguna`)
  console.log('  regla haya casado. Por encima del 30 % eso no es un reparto, es una regla rota.')
} else {
  console.log(`
  (por descarte llega el ${pctDescarte.toFixed(1)} %, por debajo del 30 % de la alarma)`)
}

// ── c) Lo que costaría ────────────────────────────────────
// ── EL SEGUNDO EJE, CONTADO ───────────────────────────────
//
// El eje que nadie cuenta es el que se degrada: variábamos QUÉ se ve y
// dejábamos sin tocar CÓMO se mira. Dentro de una misma familia de encuadre,
// ningún par ángulo+luz puede repetirse más de tres veces.
console.log('')
console.log('── CÓMO SE MIRA, dentro de cada encuadre ──')
let pasados = 0
let sinCamara = 0
for (const [nombre, lista] of orden) {
  const pares = {}
  for (const g of lista) {
    const c = CAMARA[g.titulo]
    if (!c) { sinCamara++; continue }
    const par = c[0] + ' + ' + c[1]
    pares[par] = (pares[par] ?? 0) + 1
  }
  const repes = Object.entries(pares).filter(([, n]) => n > 3)
  const conCamara = Object.values(pares).reduce((a, b) => a + b, 0)
  if (conCamara === 0) continue
  console.log(`  ${nombre.padEnd(17)} ${conCamara} decididos, ${Object.keys(pares).length} pares distintos` +
    (repes.length ? '   <- SE PASAN DEL TOPE DE 3:' : ''))
  for (const [par, n] of repes) { pasados++; console.log(`        ${par}  x${n}`) }
}
console.log(pasados === 0
  ? '  ningún par ángulo+luz se repite más de tres veces dentro de su encuadre'
  : `  ${pasados} par(es) por encima del tope. Cámbialos.`)
console.log(`  (${sinCamara} de los ${aIA.length} no llevan cámara decidida: los eligió una regla, no una persona)`)
// ── ESCENAS GEMELAS ───────────────────────────────────────
//
// El contador de ángulo+luz NO caza esto, y por eso hace falta otro: dos
// escenas pueden describir LA MISMA IMAGEN sin compartir ni ángulo ni luz.
// Pasó con «Correr la Cursa dels Bombers» y «Correr un maratón»: las dos
// eran siluetas de corredores en una avenida contra el sol bajo, con
// cámaras distintas.
//
// Esto NO decide: avisa. Compara las palabras con contenido de las escenas
// de un mismo encuadre y saca las parejas que se parecen demasiado, para
// mirarlas. Como todo lo que compara textos en este repo, trae candidatas.
console.log('')
console.log('── ESCENAS QUE PUEDEN SER LA MISMA FOTO ──')
const VACIAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'un', 'una', 'unos', 'unas', 'y', 'en', 'con', 'sin', 'por', 'al', 'a', 'que', 'se', 'su', 'sus', 'sobre', 'entre', 'desde', 'hasta', 'como', 'lo', 'le', 'no', 'ni', 'o', 'es', 'está', 'the'])
const contenido = texto => new Set(
  texto.toLowerCase().replace(/[.,:;«»()]/g, ' ').split(/\s+/).filter(p => p.length > 3 && !VACIAS.has(p)))

const porEncuadre2 = {}
for (const g of aIA) {
  const dec = DECIDIDOS[g.titulo]
  if (!dec || !dec[1]) continue
  ;(porEncuadre2[g.encuadre] ??= []).push({ titulo: g.titulo, palabras: contenido(dec[1]) })
}
let gemelas = 0
for (const [nombre, lista] of Object.entries(porEncuadre2)) {
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      const a = lista[i].palabras, b = lista[j].palabras
      const comunes = [...a].filter(p => b.has(p)).length
      const parecido = comunes / Math.min(a.size, b.size)
      if (parecido < 0.5) continue
      gemelas++
      console.log(`  ${nombre}: ${Math.round(parecido * 100)} % de palabras en común`)
      console.log(`      ${lista[i].titulo}`)
      console.log(`      ${lista[j].titulo}`)
    }
  }
}
if (gemelas === 0) console.log('  ninguna pareja de escenas se parece lo bastante como para mirarla')
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
