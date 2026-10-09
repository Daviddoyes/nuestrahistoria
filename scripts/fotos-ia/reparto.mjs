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
import { CAMARA, DECIDIDOS, ELEMENTO } from './decisiones.mjs'

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
// El eje que nadie cuenta es el que se degrada. Pero el tope ya no puede ser
// el mismo para todos, porque cinco encuadres FIJAN uno de los dos ejes en su
// propio texto y solo dejan el otro libre (ver EJE_QUE_FIJA en estilos.mjs).
//
//   · Con los DOS ejes libres: ningún par ángulo+luz más de tres veces. Hay
//     25 combinaciones, así que tres es exigible.
//   · Con UNO libre: hay cinco valores y nada más, así que pedir tres sería
//     imposible con 24 gooals. Lo que se mira es que ninguno se lleve más
//     del 40 %: que la luz esté repartida, no que no se repita.
console.log('')
console.log('── CÓMO SE MIRA, dentro de cada encuadre ──')
let pasados = 0
let sinCamara = 0
for (const [nombre, lista] of orden) {
  const conCamara = lista.filter(g => CAMARA[g.titulo])
  if (conCamara.length === 0) { sinCamara += lista.length; continue }
  sinCamara += lista.length - conCamara.length
  const libres = conCamara[0] && CAMARA[conCamara[0].titulo]
  const unSoloEje = libres && (libres[0] === null || libres[1] === null)
  const clave = g => {
    const c = CAMARA[g.titulo]
    return unSoloEje ? (c[0] ?? c[1]) : c[0] + ' + ' + c[1]
  }
  const cuenta = {}
  for (const g of conCamara) cuenta[clave(g)] = (cuenta[clave(g)] ?? 0) + 1
  const tope = unSoloEje ? Math.max(3, Math.ceil(conCamara.length * 0.4)) : 3
  const repes = Object.entries(cuenta).filter(([, n]) => n > tope)
  console.log(`  ${nombre.padEnd(17)} ${conCamara.length} decididos, ${Object.keys(cuenta).length} ${unSoloEje ? "valores" : "pares"} distintos (tope ${tope})` +
    (repes.length ? '   <- SE PASAN:' : ''))
  for (const [par, n] of repes) { pasados++; console.log(`        ${par}  x${n}`) }
}
console.log(pasados === 0
  ? '  nada se repite por encima de su tope dentro de su encuadre'
  : `  ${pasados} por encima del tope. Cámbialos.`)
console.log(`  (${sinCamara} de los ${aIA.length} no llevan cámara decidida: los eligió una regla, no una persona)`)
// ── ESCENAS GEMELAS, POR ELEMENTO ─────────────────────────
//
// Comparar la prosa no caza dos fotos que son la misma con palabras
// distintas: «Ir a la Nit del Foc» y «Ir a la Patum de Berga» son las dos
// una silueta contra el fuego y no comparten casi ninguna palabra.
//
// Así que se compara el ELEMENTO decidido (ver ELEMENTO en decisiones.mjs).
// Dos gooals con el MISMO encuadre y el MISMO elemento son candidatos a ser
// la misma foto. Esto no decide: saca la pareja para mirarla.
console.log('')
console.log('── MISMO ENCUADRE Y MISMO ELEMENTO ──')
const porPar = {}
let sinElemento = 0
for (const g of aIA) {
  const el = ELEMENTO[g.titulo]
  if (!el) { sinElemento++; continue }
  const clave = g.encuadre + ' · ' + el
  ;(porPar[clave] ??= []).push(g.titulo)
}
const gemelas = Object.entries(porPar).filter(([, l]) => l.length > 1)
for (const [clave, titulos] of gemelas) {
  console.log(`  ${clave}`)
  for (const t of titulos) console.log(`      ${t}`)
}
console.log(gemelas.length === 0
  ? '  ninguna pareja comparte encuadre y elemento'
  : `  ${gemelas.length} grupo(s) a mirar.`)
console.log(`  (${sinElemento} de los ${aIA.length} no tienen elemento decidido: su escena la pone el título)`)
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
