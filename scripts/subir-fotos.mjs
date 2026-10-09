// Sube al catálogo las fotos declaradas en scripts/fotos-definitivas.json.
//
//   node --env-file=.env.local scripts/subir-fotos.mjs --seco
//   node --env-file=.env.local scripts/subir-fotos.mjs
//   node --env-file=.env.local scripts/subir-fotos.mjs --escribir
//
// Tres pasos, en este orden y no en otro:
//
//   --seco      no toca nada. Comprueba TODO y dice qué haría. Empieza aquí.
//   (sin nada)  baja o lee cada imagen, la pasa a webp y la SUBE al cubo.
//               No escribe en la base.
//   --escribir  escribe en gooals_v2 la dirección de nuestra copia y las
//               columnas del crédito.
//
// Están separados a propósito: subir es reversible —se borra un objeto del
// cubo—, escribir en el catálogo toca lo que ve la gente.
//
// ── LEE EL FICHERO, NUNCA LAS CARPETAS ────────────────────
//
// Las imágenes generadas viven repartidas en seis tandas, porque dentro del
// proyecto no se borra nada. Resolver cuál es la buena «por la más reciente»
// sería una regla implícita, y se rompería el día que alguien regenere una
// vieja para probar algo sin que nadie se entere.
//
// Así que la verdad es `scripts/fotos-definitivas.json`, y este guion:
//
//   · solo sube lo que está DECLARADO ahí
//   · y SE PARA si encuentra en el catálogo un gooal con imagen que no esté
//     declarado. Lo que no está escrito no se sube, y lo que ya hay y no está
//     escrito es una pregunta que hay que contestar antes de seguir.
//
// ── Y EL CANDADO DE LA BASE ───────────────────────────────
//
// Desde fase3z.sql la restricción `gooals_v2_foto_con_autor` rechaza una foto
// sin su crédito. Si una se cuela, la base la para sola. **Si eso pasa, este
// guion se detiene y lo dice**: significa que el fichero de definitivas miente,
// y eso se arregla mirando, no rellenando el hueco.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { crearFrenos, esFreno } from './lib/frenos.mjs'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const DECLARADAS = RAIZ + 'scripts/fotos-definitivas.json'
const CUBO = 'catalogo'
const AGENTE = 'GooALS/1.0 (https://gooals.app) catalogo-de-fotos'
const ANCHO_MAXIMO = 1600
const OBJETIVO_KB = 300
const CALIDADES = [82, 72, 62, 52, 42]

const seco = process.argv.includes('--seco')
const escribir = process.argv.includes('--escribir')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !clave) throw new Error('Faltan las variables. Lánzalo con --env-file=.env.local')
const s = createClient(url, clave, { auth: { persistSession: false } })

const declaradas = JSON.parse(readFileSync(DECLARADAS, 'utf8')).gooals
const titulos = Object.keys(declaradas)
console.log('Declaradas en fotos-definitivas.json: ' + titulos.length)

// ── El catálogo, paginado ─────────────────────────────────
// Nunca un select sin range sobre una tabla que crece: PostgREST corta en
// 1.000 y no avisa.
const filas = []
for (let d = 0; ; d += 1000) {
  const { data, error } = await s.from('gooals_v2')
    .select('id, titulo, estado, activo, imagen_url, foto_fuente, foto_autor')
    .order('id').range(d, d + 999)
  if (error) throw new Error('no se puede leer gooals_v2: ' + error.message)
  filas.push(...data)
  if (data.length < 1000) break
}
// EL TÍTULO NO ES ÚNICO en gooals_v2: hay títulos que existen dos veces, la
// fila publicada y su gemela retirada del catálogo viejo («Correr una media
// maratón», «Pilotar un kart»). Un Map construido sobre las 5.240 filas se
// queda con la última, que puede ser la retirada — y entonces este guion diría
// que el gooal «está retirado» cuando el publicado está perfectamente ahí.
//
// Así que el índice se construye SOLO con lo publicado. Y si aun así un título
// sale dos veces publicado, se para: eso sería un duplicado de verdad y no se
// resuelve adivinando.
const publicadas = filas.filter(f => f.estado === 'verificado' && f.activo)
const porTitulo = new Map()
const repetidos = []
for (const f of publicadas) {
  if (porTitulo.has(f.titulo)) repetidos.push(f.titulo)
  porTitulo.set(f.titulo, f)
}
if (repetidos.length) {
  console.error('PARA: estos títulos están publicados DOS veces y no se puede saber a cuál va la foto:')
  for (const t of [...new Set(repetidos)]) console.error('   · ' + t)
  process.exit(1)
}
console.log('Filas en el catálogo: ' + filas.length + '\n')

// ── Comprobaciones. Todas antes de tocar nada ─────────────
const problemas = []
const avisos = []

// 1 · Lo declarado existe, está publicado y no tiene ya otra foto.
for (const [titulo, d] of Object.entries(declaradas)) {
  const g = porTitulo.get(titulo)
  if (!g) { problemas.push(`${titulo}: declarado pero NO está en el catálogo`); continue }
  if (g.estado !== 'verificado' || !g.activo) { problemas.push(`${titulo}: está ${g.estado}/${g.activo ? 'activo' : 'inactivo'}`); continue }
  if (g.imagen_url && !d.ya_subida) avisos.push(`${titulo}: YA tiene foto. Se le pondrá la declarada, con nombre nuevo.`)

  // `ya_subida` quiere decir: su imagen está en el cubo desde antes de que
  // existiera este fichero. No se baja, no se sube, no se reescribe. Solo se
  // comprueba que la base siga diciendo lo mismo.
  if (d.ya_subida) {
    if (g.imagen_url !== d.imagen_url) {
      problemas.push(`${titulo}: declarada como ya subida, pero la base apunta a otra imagen`)
    }
    continue
  }

  if (d.fuente === 'ia') {
    if (!d.fichero) problemas.push(`${titulo}: declarado como ia y sin fichero`)
    else if (!existsSync(RAIZ + d.fichero)) problemas.push(`${titulo}: no está el fichero ${d.fichero}`)
    if (!d.prompt) problemas.push(`${titulo}: declarado como ia y sin prompt`)
    else if (!existsSync(RAIZ + d.prompt)) problemas.push(`${titulo}: no está el prompt ${d.prompt}`)
  } else if (d.fuente === 'commons') {
    for (const campo of ['original', 'autor', 'licencia', 'pagina']) {
      if (!d[campo] || String(d[campo]).includes('sin autor') || String(d[campo]).includes('sin licencia')) {
        problemas.push(`${titulo}: de Commons y le falta ${campo}`)
      }
    }
  } else {
    problemas.push(`${titulo}: fuente «${d.fuente}», que no es ni commons ni ia`)
  }
}

// 2 · Una foto, un gooal.
const vistas = new Map()
for (const [titulo, d] of Object.entries(declaradas)) {
  const huella = d.fuente === 'ia' ? d.fichero : d.fichero_commons
  if (!huella) continue
  if (vistas.has(huella)) problemas.push(`la misma foto en dos gooals: «${vistas.get(huella)}» y «${titulo}» → ${huella}`)
  else vistas.set(huella, titulo)
}

// 3 · LO QUE NO ESTÁ DECLARADO. Un gooal con imagen que no aparece en el
//     fichero es una pregunta sin contestar, no un detalle.
const noDeclaradas = publicadas.filter(f => f.imagen_url && !(f.titulo in declaradas))
if (noDeclaradas.length) {
  problemas.push(`${noDeclaradas.length} gooals tienen imagen y NO están declarados en fotos-definitivas.json`)
}

console.log('── COMPROBACIONES ──')
console.log('  declaradas sin ningún problema: ' + titulos.length)
if (avisos.length) {
  console.log(`  avisos (${avisos.length}):`)
  for (const a of avisos.slice(0, 10)) console.log('     · ' + a)
  if (avisos.length > 10) console.log(`     ... y ${avisos.length - 10} más`)
}
if (problemas.length) {
  console.error(`\n  ${problemas.length} PROBLEMAS, y no se sube nada:`)
  for (const p of problemas.slice(0, 25)) console.error('     · ' + p)
  if (problemas.length > 25) console.error(`     ... y ${problemas.length - 25} más`)
  if (noDeclaradas.length) {
    console.error('\n  Los no declarados, los diez primeros:')
    for (const f of noDeclaradas.slice(0, 10)) console.error('     · ' + f.titulo + ' → ' + f.imagen_url.split('/').pop())
  }
  console.error('\n  Lo que no está declarado no se sube. Hay que decidirlo y escribirlo.')
  process.exit(1)
}

// ── El nombre del objeto: SIEMPRE NUEVO ───────────────────
//
// El cubo sirve con cache-control de un año, porque una dirección es una foto y
// no cambia nunca. Si una corregida se subiera con el mismo nombre, los
// navegadores de quien ya hubiera abierto esa ficha seguirían dando la vieja
// durante meses: parecería que el cambio no se aplicó.
const { data: objetos } = await s.storage.from(CUBO).list('', { limit: 1000 })
const enCubo = new Set((objetos ?? []).map(o => o.name))
const nombreLibre = id => {
  if (!enCubo.has(id + '.webp')) return id + '.webp'
  for (let n = 2; ; n++) if (!enCubo.has(`${id}-${n}.webp`)) return `${id}-${n}.webp`
}

if (seco) {
  // Lo que de verdad se va a tocar, que no es lo mismo que lo declarado: las
  // `ya_subida` llevan en el cubo desde antes y no se vuelven a subir.
  const aSubir = Object.values(declaradas).filter(d => !d.ya_subida)
  const yaEstaban = titulos.length - aSubir.length
  console.log('\nEN SECO. Esto es lo que haría:')
  console.log(`  de las ${titulos.length} declaradas, ${yaEstaban} ya están en el cubo y NO se tocan`)
  console.log(`  1. bajar o leer ${aSubir.length} imágenes, reducirlas a ${ANCHO_MAXIMO} px y pasarlas a webp`)
  console.log(`  2. subirlas al cubo «${CUBO}» con nombre nuevo (en el cubo ya hay ${enCubo.size} objetos)`)
  console.log('  3. con --escribir, poner en gooals_v2 la dirección y el crédito')
  const porFuente = {}
  for (const d of aSubir) porFuente[d.fuente] = (porFuente[d.fuente] ?? 0) + 1
  console.log('\n  por fuente: ' + JSON.stringify(porFuente))
  const ej = Object.entries(declaradas).find(([, d]) => !d.ya_subida)
  console.log(`\n  Ejemplo: ${ej[0]}`)
  console.log(`    de   ${(ej[1].fichero ?? ej[1].original ?? '').slice(0, 90)}`)
  console.log(`    a    ${url}/storage/v1/object/public/${CUBO}/${nombreLibre(porTitulo.get(ej[0]).id)}`)
  console.log(`    crédito: ${ej[1].fuente === 'ia' ? 'generada, con prompt' : ej[1].autor + ' · ' + ej[1].licencia}`)
  console.log('\nPara subirlas de verdad, quita --seco.')
} else {

const { default: sharp } = await import('sharp')
const frenos = crearFrenos()
const dormir = ms => new Promise(r => setTimeout(r, ms))

const bajar = async direccion => {
  const r = await frenos.intentar(async () => {
    let resp
    try { resp = await fetch(direccion, { headers: { 'User-Agent': AGENTE } }) }
    catch (e) { return { freno: 'no conecta: ' + e.message } }
    if (esFreno(resp.status)) return { freno: 'responde ' + resp.status }
    if (!resp.ok) return { error: 'responde ' + resp.status }
    return { buf: Buffer.from(await resp.arrayBuffer()) }
  })
  if (r.agotado) throw new Error(r.motivo)
  if (r.error) throw new Error(r.error)
  return r.buf
}

const aWebp = async bruta => {
  let webp = null
  for (const calidad of CALIDADES) {
    webp = await sharp(bruta).rotate().resize({ width: ANCHO_MAXIMO, withoutEnlargement: true }).webp({ quality: calidad }).toBuffer()
    if (webp.length <= OBJETIVO_KB * 1024) break
  }
  return webp
}

const subidas = new Map()   // titulo -> nombre del objeto
let nuevas = 0, saltadas = 0, fallos = 0, n = 0

for (const [titulo, d] of Object.entries(declaradas)) {
  n++
  if (d.ya_subida) { saltadas++; continue }
  const g = porTitulo.get(titulo)
  // Si ya subimos esta misma imagen en una pasada anterior, se reconoce porque
  // la fila ya apunta a un objeto del cubo con el id de este gooal.
  const yaSuya = (objetos ?? []).find(o => o.name.startsWith(g.id) && g.imagen_url?.endsWith(o.name))
  if (yaSuya) { saltadas++; subidas.set(titulo, yaSuya.name); continue }

  try {
    await frenos.antesDePedir()
    const bruta = d.fuente === 'ia'
      ? readFileSync(RAIZ + d.fichero)
      : await bajar(d.original)
    const webp = await aWebp(bruta)
    const objeto = nombreLibre(g.id)
    const { error } = await s.storage.from(CUBO).upload(objeto, webp, {
      contentType: 'image/webp', upsert: false, cacheControl: '31536000',
    })
    if (error) throw new Error(error.message)
    enCubo.add(objeto)
    subidas.set(titulo, objeto)
    nuevas++
    console.log(`${String(n).padStart(3)}/${titulos.length}  ${String(Math.round(webp.length / 1024)).padStart(4)} KB · ${objeto} · ${titulo.slice(0, 46)}`)
    if (d.fuente === 'commons') await dormir(300)
  } catch (e) {
    fallos++
    console.error(`${String(n).padStart(3)}/${titulos.length}  FALLO · ${titulo.slice(0, 46)} · ${e.message}`)
  }
}

console.log(`\nSubidas ${nuevas} · ya estaban ${saltadas} · fallos ${fallos}`)
if (frenos.frenazos) console.log(`(hubo ${frenos.frenazos} frenos por el camino, reintentados)`)

if (!escribir) {
  console.log('\nNo se ha escrito nada en la base. Para eso: --escribir')
  process.exitCode = fallos ? 1 : 0
} else {

// ── Escribir en el catálogo ───────────────────────────────
// Solo lo que está DE VERDAD en el cubo: mejor sin foto que apuntando a un hueco.
let escritas = 0, rechazadas = 0
for (const [titulo, d] of Object.entries(declaradas)) {
  if (d.ya_subida) continue   // su fila ya está escrita desde antes
  const objeto = subidas.get(titulo)
  if (!objeto) continue
  const g = porTitulo.get(titulo)
  const fila = d.fuente === 'ia'
    ? {
        imagen_url: `${url}/storage/v1/object/public/${CUBO}/${objeto}`,
        foto_fuente: 'ia', foto_autor: null, foto_licencia: null, foto_origen: null,
        foto_prompt: readFileSync(RAIZ + d.prompt, 'utf8').trim(),
      }
    : {
        imagen_url: `${url}/storage/v1/object/public/${CUBO}/${objeto}`,
        foto_fuente: 'commons', foto_autor: d.autor, foto_licencia: d.licencia,
        foto_origen: d.pagina, foto_prompt: null,
      }
  const { error } = await s.from('gooals_v2').update(fila).eq('id', g.id).eq('estado', 'verificado')
  if (error) {
    rechazadas++
    console.error(`RECHAZADA por la base: ${titulo} · ${error.message}`)
    // El candado de fase3z ha parado esto. No se rellena el hueco: se mira.
    console.error('\n*** PARA. La base ha rechazado una foto, y eso significa que')
    console.error('*** fotos-definitivas.json dice algo que no es verdad.')
    console.error('*** No sigas ni rellenes el hueco: mira esa entrada.')
    process.exit(1)
  }
  escritas++
}
console.log(`\nEscritas ${escritas} filas · rechazadas por la base ${rechazadas}`)
console.log('\nComprobación de verdad, que lee la base y pide cada foto sin clave:')
console.log('  node --env-file=.env.local scripts/fotos-catalogo/comprobar.mjs')
}
}
