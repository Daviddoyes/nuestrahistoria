// EL REGISTRO DE TODAS LAS IMÁGENES GENERADAS, CON SU ESTADO.
//
//   npm run registro            (lo rehace leyendo el disco)
//   npm run registro -- --seco  (dice qué cambiaría y no escribe)
//
// ── QUÉ PROBLEMA RESUELVE ─────────────────────────────────
//
// `fotos-definitivas.json` dice QUÉ FOTO LLEVA CADA GOOAL, que es otra
// pregunta. De una imagen generada solo sabe decir «es la elegida» o no decir
// nada — y «no decir nada» mezcla dos cosas que no son lo mismo:
//
//   · se miró y se descartó, y
//   · nadie la ha mirado todavía.
//
// Mezcladas, no hay forma de saber cuánto trabajo queda. El 13-10-2026 se
// contaron las imágenes del disco: **463 generadas y el manifiesto conocía
// 122**. Las otras 341 no eran rechazos: eran catorce tandas que nunca se
// anotaron. Por eso los números de «cuántas esperan» salían como un suelo y no
// como una respuesta.
//
// Aquí cada IMAGEN tiene su fila y su estado: `aprobada`, `rechazada` (con
// motivo) o `sin_mirar`.
//
// ── LO QUE ESTE GUION NO HACE: INVENTAR ───────────────────
//
// Al rellenar lo que ya existía solo se marca `aprobada` lo que está ESCRITO:
// el fichero que `fotos-definitivas.json` declara como el elegido de su gooal.
// Todo lo demás queda `sin_mirar`, incluidas las imágenes de un gooal que SÍ
// está en `APROBADAS` — porque esa lista aprueba un TÍTULO, no un fichero, y
// de varios títulos hay cuatro versiones en cuatro tandas. Decidir cuál era la
// buena sería adivinar.
//
// Y `rechazada` NO SE DEDUCE NUNCA. Los registros de las tandas traen la lista
// de rechazadas vacía, así que de un rechazo no hay constancia de ninguna
// clase: dar por rechazado lo que sobra sería fabricar una decisión que nadie
// tomó.
//
// ── Y LO QUE SÍ CONSERVA ──────────────────────────────────
//
// Relanzarlo no pisa lo decidido: lo que ya tenga estado escrito a mano se
// queda como está, y solo se añaden las imágenes nuevas. Un registro que se
// borra al rehacerlo no es un registro.
import { readdirSync, existsSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'

const RAIZ = 'Claude outputs'
const DESTINO = 'scripts/fotos-generadas.json'
const seco = process.argv.includes('--seco')
const normal = p => p.split('\\').join('/')

const { APROBADAS } = await import('./fotos-ia/decisiones.mjs')
const definitivas = JSON.parse(readFileSync('scripts/fotos-definitivas.json', 'utf8')).gooals

/** El fichero que cada gooal tiene declarado como su foto elegida. */
const elegidas = new Map()
for (const [titulo, d] of Object.entries(definitivas)) {
  if (d.fichero) elegidas.set(normal(d.fichero), titulo)
}

// ── Las imágenes, de las dos formas en que quedaron anotadas ──
//
// Las tandas viejas dejan un .txt con el prompt al lado de cada PNG; las de
// revisión lo guardan todo en un `tanda.json`. Hay que leer las dos: mirar
// solo una se dejó fuera catorce carpetas enteras.
const imagenes = new Map()

function andar(d, alVer) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = normal(join(d, e.name))
    if (e.isDirectory()) andar(p, alVer)
    else alVer(p, e.name)
  }
}

// Forma 1: PNG con su .txt al lado. El título va dentro del prompt, entre
// comillas angulares: «La acción de «Bailar salsa», ocurriendo».
andar(RAIZ, (p, nombre) => {
  if (!nombre.toLowerCase().endsWith('.png')) return
  const txt = p.slice(0, -4) + '.txt'
  if (!existsSync(txt)) return
  const prompt = readFileSync(txt, 'utf8')
  const m = prompt.match(/«([^»]+)»/)
  imagenes.set(p, { titulo: m ? m[1] : null, encuadre: null, tanda: dirname(p), prompt: txt })
})

// Forma 2: un `tanda.json` que las lista con título y encuadre.
const tandas = []
andar(RAIZ, (p, nombre) => { if (nombre === 'tanda.json') tandas.push(p) })
for (const t of tandas) {
  const j = JSON.parse(readFileSync(t, 'utf8'))
  for (const lista of Object.values(j)) {
    if (!Array.isArray(lista)) continue
    for (const e of lista) {
      if (!e?.fichero) continue
      const f = normal(e.fichero)
      if (!existsSync(f)) continue
      imagenes.set(f, { titulo: e.titulo ?? null, encuadre: e.encuadre ?? null, tanda: dirname(f), registro: t })
    }
  }
}

// ── EL TÍTULO QUE FALTA, SACADO DEL NOMBRE DEL FICHERO ────
//
// Algunas tandas viejas no meten el título en el prompt, pero sí en el nombre
// del fichero: `B-montar-tu-propia-empresa-1.png`.
//
// NO se adivina: se convierte el nombre a su forma simple y se busca en los
// títulos del CATÁLOGO. Si no casa con ninguno, se queda sin título — un
// título inventado es peor que un hueco, porque el hueco se ve.
const simple = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const porSimple = new Map()
{
  const { createClient } = await import('@supabase/supabase-js')
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data, error } = await s.from('gooals_v2').select('titulo').eq('estado', 'verificado')
  if (error) throw new Error(error.message)
  for (const g of data) {
    const k = simple(g.titulo)
    // El título no es único en la tabla; si dos publicados dieran la misma
    // forma simple, no se elige: se deja fuera y se queda sin título.
    if (porSimple.has(k) && porSimple.get(k) !== g.titulo) porSimple.set(k, null)
    else porSimple.set(k, g.titulo)
  }
}

let recuperados = 0
for (const [p, info] of imagenes) {
  if (info.titulo) continue
  // `B-montar-tu-propia-empresa-1.png` -> quitar la letra de delante y el
  // número de detrás.
  const base = p.split('/').pop().replace(/\.png$/i, '').replace(/^[A-Za-z]-/, '').replace(/-\d+$/, '')
  const t = porSimple.get(simple(base))
  if (t) { info.titulo = t; recuperados++ }
}
if (recuperados) console.log('títulos recuperados del nombre del fichero: ' + recuperados)

// ── Se junta con lo que ya hubiera decidido ───────────────
const previo = existsSync(DESTINO) ? JSON.parse(readFileSync(DESTINO, 'utf8')).imagenes ?? {} : {}

const salida = {}
const cuenta = { aprobada: 0, rechazada: 0, sin_mirar: 0 }
let nuevas = 0
for (const [fichero, info] of [...imagenes].sort((a, b) => a[0].localeCompare(b[0]))) {
  const antes = previo[fichero]
  let estado = antes?.estado
  let motivo = antes?.motivo ?? null

  if (!estado) {
    nuevas++
    // Lo único que se puede dar por aprobado sin adivinar: que sea la foto que
    // su gooal declara como elegida.
    estado = elegidas.get(fichero) ? 'aprobada' : 'sin_mirar'
  }

  cuenta[estado] = (cuenta[estado] ?? 0) + 1
  salida[fichero] = {
    titulo: info.titulo ?? antes?.titulo ?? null,
    encuadre: info.encuadre ?? antes?.encuadre ?? null,
    tanda: info.tanda,
    estado,
    motivo,
    // Información, no decisión: que el TÍTULO esté en APROBADAS no dice cuál de
    // sus versiones se aprobó.
    titulo_en_aprobadas: info.titulo ? APROBADAS.has(info.titulo) : false,
    kb: Math.round(statSync(fichero).size / 1024),
  }
}

const faltan = [...elegidas.keys()].filter(f => !imagenes.has(f))

console.log('imágenes generadas encontradas en disco: ' + imagenes.size)
console.log('  aprobada:   ' + String(cuenta.aprobada ?? 0).padStart(4) + '   (las que su gooal declara como elegidas)')
console.log('  rechazada:  ' + String(cuenta.rechazada ?? 0).padStart(4) + '   (ninguna se deduce: solo lo escrito a mano)')
console.log('  sin_mirar:  ' + String(cuenta.sin_mirar ?? 0).padStart(4))
console.log('  nuevas en este pase: ' + nuevas)
if (faltan.length) console.log('\n  OJO: ' + faltan.length + ' ficheros declarados en fotos-definitivas.json que no están en disco')

if (seco) { console.log('\nEN SECO, no se ha escrito nada.'); process.exit(0) }

writeFileSync(DESTINO, JSON.stringify({
  _comentario:
    'ESTADO DE CADA IMAGEN GENERADA, una fila por fichero. Lo rehace ' +
    '`npm run registro` leyendo el disco, y NO pisa lo que ya tenga estado. ' +
    'Tres estados: aprobada / rechazada (con motivo) / sin_mirar. ' +
    '«sin_mirar» quiere decir que nadie la ha mirado, NO que se descartara: ' +
    'esa diferencia es justo la que faltaba cuando se descubrió que había 463 ' +
    'imágenes generadas y el manifiesto conocía 122. ' +
    '`titulo_en_aprobadas` es información, no decisión: APROBADAS aprueba un ' +
    'título y de varios títulos hay cuatro versiones en cuatro tandas.',
  imagenes: salida,
}, null, 2) + '\n', 'utf8')
console.log('\nescrito: ' + DESTINO)
