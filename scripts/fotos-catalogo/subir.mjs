// Sube a NUESTRO almacén las fotos elegidas en la hoja de contacto.
//
//   node --env-file=.env.local scripts/fotos-catalogo/subir.mjs --seco
//   node --env-file=.env.local scripts/fotos-catalogo/subir.mjs
//   node --env-file=.env.local scripts/fotos-catalogo/subir.mjs --escribir
//
// Tres pasos, y hacen falta en este orden:
//
//   --seco      no toca nada: dice qué haría y comprueba el fichero de
//               elecciones. Empieza siempre por aquí.
//   (sin nada)  baja de Commons, reduce, convierte a webp y SUBE al cubo.
//               NO escribe en la base.
//   --escribir  escribe en gooals_v2 la dirección de NUESTRA copia y las tres
//               columnas del autor, la licencia y el original.
//
// Están separados a propósito: subir es reversible (se borra un objeto del
// cubo), escribir en el catálogo toca lo que ve la gente.
//
// ── POR QUÉ UNA COPIA NUESTRA Y NO UN ENLACE A COMMONS ────
//
// Porque un enlace se rompe. Si en Commons borran o renombran la foto —y pasa—,
// la ficha se queda con un hueco y nadie se entera. Nuestra copia no depende de
// nadie. `foto_origen` guarda la página de Commons para poder dar el crédito y
// comprobar la licencia cuando haga falta.
//
// ── EL CUBO ───────────────────────────────────────────────
//
// 'catalogo': lectura pública, CERO políticas de escritura. Sube este guion con
// la clave secreta, que se salta la RLS. Y nunca, jamás, se meten aquí las
// fotos que sube la gente: esas van a 'gooals-media', que es privado, y este
// cubo es público de lectura. Está escrito en supabase/politicas.sql.
//
// SE PUEDE PARAR Y SEGUIR: antes de subir mira si el objeto ya está en el cubo.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
// sharp se carga SOLO cuando hay fotos que procesar. Cargarlo siempre hacía que
// el guion reventara al terminar en seco: deja hilos abiertos, y salir a la
// fuerza con hilos vivos tumba Node en Windows.

// La carpeta de los ficheros intermedios, calculada desde este guion: así no
// lleva escrita dentro la ruta del ordenador de nadie.
const CARPETA_ELECCIONES = fileURLToPath(new URL('../../Claude outputs', import.meta.url))
const CUBO = 'catalogo'
const AGENTE = 'GooALS/1.0 (https://gooals.app) catalogo-de-fotos'
const ANCHO_MAXIMO = 1600
const OBJETIVO_KB = 300
// Calidades a probar, de mejor a peor. Se para en la primera que baje del
// objetivo; si ninguna llega, se queda la última y se avisa.
const CALIDADES = [82, 72, 62, 52, 42]
const ESPERA_MS = 400

const seco = process.argv.includes('--seco')
const escribir = process.argv.includes('--escribir')
const dormir = ms => new Promise(r => setTimeout(r, ms))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !clave) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Lánzalo con --env-file=.env.local')
const s = createClient(url, clave, { auth: { persistSession: false } })

// ── El fichero de elecciones: el más reciente ─────────────
const ficheros = readdirSync(CARPETA_ELECCIONES).filter(n => /^fotos-elegidas.*\.json$/.test(n)).sort()
if (!ficheros.length) throw new Error('No encuentro ningún fotos-elegidas-*.json en "Claude outputs"')
const cual = ficheros[ficheros.length - 1]
const elecciones = JSON.parse(readFileSync(`${CARPETA_ELECCIONES}/${cual}`, 'utf8'))
const conFoto = elecciones.filter(e => e.eleccion)

console.log(`Elecciones: ${cual}`)
console.log(`  ${elecciones.length} decididos · ${conFoto.length} con foto · ${elecciones.length - conFoto.length} sin foto a propósito\n`)

// ── Comprobar que lo elegido existe y está completo ───────
// Un gooal que ya no esté, o una elección sin autor, se paran aquí y no a
// mitad de la subida.
const { data: enBase, error: errorBase } = await s.from('gooals_v2')
  .select('id, titulo, estado, imagen_url').in('id', conFoto.map(e => e.id))
if (errorBase) throw new Error('no se puede leer gooals_v2: ' + errorBase.message)
const porId = new Map((enBase ?? []).map(g => [g.id, g]))

const problemas = []
for (const e of conFoto) {
  const g = porId.get(e.id)
  if (!g) problemas.push(`${e.titulo}: ya no está en el catálogo`)
  else if (g.estado !== 'verificado') problemas.push(`${e.titulo}: está en estado ${g.estado}`)
  const f = e.eleccion
  if (!f.original) problemas.push(`${e.titulo}: la elección no trae la dirección del original`)
  if (!f.autor) problemas.push(`${e.titulo}: la elección no trae autor`)
  if (!f.licencia) problemas.push(`${e.titulo}: la elección no trae licencia`)
  if (!f.pagina) problemas.push(`${e.titulo}: la elección no trae la página de Commons`)
}
if (problemas.length) {
  console.error(`HAY ${problemas.length} PROBLEMAS Y NO SE SUBE NADA:`)
  for (const p of problemas.slice(0, 20)) console.error('  · ' + p)
  if (problemas.length > 20) console.error(`  ... y ${problemas.length - 20} más`)
  process.exit(1)
}
console.log('Las elecciones cuadran con el catálogo: todas existen, están verificadas y traen autor, licencia y origen.\n')

const nombreObjeto = e => `${e.id}.webp`
const direccionPublica = e => `${url}/storage/v1/object/public/${CUBO}/${nombreObjeto(e)}`

if (seco) {
  console.log('EN SECO. Esto es lo que haría:')
  console.log(`  1. crear el cubo "${CUBO}" si no existe (lectura pública, sin políticas de escritura)`)
  console.log(`  2. bajar ${conFoto.length} fotos de Commons, reducirlas a ${ANCHO_MAXIMO} px y pasarlas a webp`)
  console.log(`  3. subirlas como <id del gooal>.webp`)
  console.log(`  4. con --escribir, poner en gooals_v2 la dirección de NUESTRA copia y las tres columnas`)
  console.log(`\nEjemplo: ${conFoto[0].titulo}`)
  console.log(`  de   ${conFoto[0].eleccion.original.slice(0, 95)}`)
  console.log(`  a    ${direccionPublica(conFoto[0])}`)
  console.log(`  autor ${conFoto[0].eleccion.autor} · ${conFoto[0].eleccion.licencia}`)
  // Nada de process.exit(): salir a la fuerza con el cliente de Supabase
  // abierto hace saltar una aserción de Node en Windows. El resto va en un else.
} else {

// ── El cubo ───────────────────────────────────────────────
if (!escribir) {
  const { data: cubos } = await s.storage.listBuckets()
  const existe = (cubos ?? []).some(b => b.name === CUBO)
  if (!existe) {
    const { error } = await s.storage.createBucket(CUBO, {
      public: true,                                    // lectura para todos
      allowedMimeTypes: ['image/webp'],                // aquí solo entran fotos del catálogo
      fileSizeLimit: `${OBJETIVO_KB * 4}KB`,           // margen sobre el objetivo, por si alguna no comprime bien
    })
    if (error) throw new Error('no se pudo crear el cubo: ' + error.message)
    console.log(`Cubo "${CUBO}" creado: lectura pública, solo webp, sin ninguna política de escritura.\n`)
  } else {
    console.log(`Cubo "${CUBO}" ya existe.\n`)
  }

  const { default: sharp } = await import('sharp')

  // ── Bajar, reducir, subir ───────────────────────────────
  const { data: yaHay } = await s.storage.from(CUBO).list('', { limit: 1000 })
  const subidos = new Set((yaHay ?? []).map(o => o.name))
  console.log(`En el cubo ya hay ${subidos.size} objetos.\n`)

  let nuevas = 0, saltadas = 0, fallos = 0, gordas = 0
  for (const [i, e] of conFoto.entries()) {
    const objeto = nombreObjeto(e)
    if (subidos.has(objeto)) { saltadas++; continue }
    try {
      await dormir(ESPERA_MS)
      const r = await fetch(e.eleccion.original, { headers: { 'User-Agent': AGENTE } })
      if (!r.ok) throw new Error('Commons devuelve ' + r.status)
      const bruta = Buffer.from(await r.arrayBuffer())

      // Reducir a lo ancho y pasar a webp, bajando la calidad hasta dar el peso.
      // `withoutEnlargement` evita agrandar una foto que ya venga pequeña: se
      // vería peor y pesaría más.
      let webp = null
      for (const calidad of CALIDADES) {
        webp = await sharp(bruta)
          .rotate()                                     // respeta la orientación del EXIF
          .resize({ width: ANCHO_MAXIMO, withoutEnlargement: true })
          .webp({ quality: calidad })
          .toBuffer()
        if (webp.length <= OBJETIVO_KB * 1024) break
      }
      if (webp.length > OBJETIVO_KB * 1024) gordas++

      const { error } = await s.storage.from(CUBO).upload(objeto, webp, {
        contentType: 'image/webp', upsert: false, cacheControl: '31536000',
      })
      if (error) throw new Error(error.message)
      nuevas++
      console.log(`${String(i + 1).padStart(3)}/${conFoto.length}  ${String(Math.round(webp.length / 1024)).padStart(4)} KB · ${e.titulo.slice(0, 52)}`)
    } catch (err) {
      fallos++
      console.error(`${String(i + 1).padStart(3)}/${conFoto.length}  FALLO · ${e.titulo.slice(0, 44)} · ${err.message}`)
    }
  }
  console.log(`\nSubidas ${nuevas} · ya estaban ${saltadas} · fallos ${fallos}` + (gordas ? ` · ${gordas} no bajaron de ${OBJETIVO_KB} KB ni con la calidad más baja` : ''))
  console.log('\nNo se ha escrito nada en la base. Para eso: --escribir')
  // Sin salir a la fuerza: con sharp cargado, process.exit() tumba Node en
  // Windows. Se marca el código de salida y se deja terminar solo.
  process.exitCode = fallos ? 1 : 0
} else {

// ── Paso 3: escribir en la base ───────────────────────────
// Solo se escribe lo que está DE VERDAD en el cubo. Si un objeto no subió, su
// fila se queda sin foto, que es lo correcto: mejor sin foto que apuntando a un
// hueco.
const { data: objetos } = await s.storage.from(CUBO).list('', { limit: 1000 })
const hay = new Set((objetos ?? []).map(o => o.name))
console.log(`En el cubo hay ${hay.size} objetos.\n`)

let escritas = 0, sinSubir = 0
for (const e of conFoto) {
  if (!hay.has(nombreObjeto(e))) { sinSubir++; continue }
  const { error } = await s.from('gooals_v2').update({
    imagen_url: direccionPublica(e),
    foto_autor: e.eleccion.autor,
    foto_licencia: e.eleccion.licencia,
    foto_origen: e.eleccion.pagina,
  }).eq('id', e.id).eq('estado', 'verificado')
  if (error) { console.error('FALLO al escribir ' + e.titulo + ': ' + error.message); continue }
  escritas++
}
console.log(`Escritas ${escritas} filas · ${sinSubir} se quedan sin foto porque su objeto no está en el cubo`)
console.log('\nComprobación de verdad (lee la base y carga las fotos desde Supabase):')
console.log('  node --env-file=.env.local scripts/fotos-catalogo/comprobar.mjs')
}
}
