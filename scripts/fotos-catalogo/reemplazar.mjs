// Cambiar la foto de UN gooal, cuando la que tiene está mal.
//
//   node --env-file=.env.local scripts/fotos-catalogo/reemplazar.mjs <id> "File:Lo que sea.jpg"
//   node --env-file=.env.local scripts/fotos-catalogo/reemplazar.mjs <id> "File:Lo que sea.jpg" --escribir
//
// Sin --escribir no toca nada: enseña lo que haría. Hace lo mismo que subir.mjs
// pero de una en una, para los casos sueltos que salen de
// `Claude outputs/fotos-sospechosas.md`.
//
// ── POR QUÉ NO SE PISA EL FICHERO ANTERIOR ────────────────
//
// Las fotos del catálogo se suben con cache de un año (son inmutables: una
// dirección, una foto). Si la nueva se subiera con el mismo nombre, los
// navegadores y el CDN seguirían sirviendo la vieja durante meses y parecería
// que el cambio no se ha aplicado. Así que la nueva va con un nombre nuevo
// (`<id>-r2.webp`) y la fila apunta ahí. La vieja se queda huérfana en el cubo
// a propósito: borrar en producción se decide aparte, no de paso.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const s = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const CUBO = 'catalogo'
const AGENTE = 'GooALS/1.0 (https://gooals.app) catalogo-de-fotos'
const ANCHO_MAXIMO = 1600
const OBJETIVO_KB = 300
const CALIDADES = [82, 72, 62, 52, 42]

const [id, ficheroCommons] = process.argv.slice(2).filter(a => !a.startsWith('--'))
const escribir = process.argv.includes('--escribir')

if (!id || !ficheroCommons) {
  console.error('Faltan argumentos.')
  console.error('  node --env-file=.env.local scripts/fotos-catalogo/reemplazar.mjs <id-del-gooal> "File:Algo.jpg" [--escribir]')
  process.exit(1)
}

const limpio = t => (t?.value ?? '').replace(/<[^>]*>/g, '').trim()

// ── 1 · El gooal que se va a tocar ──
const { data: gooal, error: eG } = await s.from('gooals_v2')
  .select('id, titulo, ciudad, pais, estado, imagen_url, foto_autor, foto_licencia, foto_origen')
  .eq('id', id).maybeSingle()
if (eG) throw new Error(eG.message)
if (!gooal) { console.error('No existe ningún gooal con ese id.'); process.exit(1) }

console.log('GOOAL:', gooal.titulo, `[${[gooal.ciudad, gooal.pais].filter(Boolean).join(', ')}]`)
console.log('  tiene ahora:', gooal.foto_origen ?? '(sin origen)')
console.log('              ', gooal.foto_autor, '·', gooal.foto_licencia)

// ── 2 · La foto nueva, con su crédito ──
const u = new URL('https://commons.wikimedia.org/w/api.php')
for (const [k, v] of Object.entries({
  format: 'json', formatversion: 2, action: 'query', titles: ficheroCommons,
  prop: 'imageinfo', iiprop: 'url|extmetadata|size',
})) u.searchParams.set(k, v)
const j = await (await fetch(u, { headers: { 'User-Agent': AGENTE } })).json()
const pagina = j.query?.pages?.[0]
const ii = pagina?.imageinfo?.[0]
if (!ii) { console.error('Commons no devuelve ese fichero:', ficheroCommons); process.exit(1) }

const meta = ii.extmetadata ?? {}
const nuevo = {
  autor: limpio(meta.Artist),
  licencia: limpio(meta.LicenseShortName),
  pagina: ii.descriptionurl,
  original: ii.url.split('?')[0],
  tam: `${ii.width}x${ii.height}`,
}
// Una foto sin autor NO se pone: 203 de las 223 licencias exigen citarlo, y una
// fila sin crédito es una foto que no podemos usar. Mejor dejar la vieja.
if (!nuevo.autor || !nuevo.licencia) {
  console.error('\nEsa foto no trae autor o licencia en Commons. No se pone: sin crédito no se puede usar.')
  process.exit(1)
}

console.log('\nFOTO NUEVA:', pagina.title, `(${nuevo.tam})`)
console.log('  autor:   ', nuevo.autor.slice(0, 90))
console.log('  licencia:', nuevo.licencia)
console.log('  página:  ', nuevo.pagina)

// ── 3 · Un nombre nuevo, para que no mande la caché ──
const { data: yaHay } = await s.storage.from(CUBO).list('', { limit: 1000, search: id })
const cuantos = (yaHay ?? []).filter(o => o.name.startsWith(id)).length
const objeto = `${id}-r${cuantos + 1}.webp`
const direccion = `${url}/storage/v1/object/public/${CUBO}/${objeto}`
console.log('\n  se subirá como:', objeto, `(ya hay ${cuantos} con este id)`)

if (!escribir) {
  console.log('\nEN SECO. No se ha tocado nada. Para hacerlo de verdad, repite con --escribir')
} else {
  const { default: sharp } = await import('sharp')
  const r = await fetch(nuevo.original, { headers: { 'User-Agent': AGENTE } })
  if (!r.ok) throw new Error('Commons devuelve ' + r.status)
  const bruta = Buffer.from(await r.arrayBuffer())

  let webp = null
  for (const calidad of CALIDADES) {
    webp = await sharp(bruta).rotate().resize({ width: ANCHO_MAXIMO, withoutEnlargement: true }).webp({ quality: calidad }).toBuffer()
    if (webp.length <= OBJETIVO_KB * 1024) break
  }
  console.log(`\n  ${Math.round(webp.length / 1024)} KB`)

  const { error: eS } = await s.storage.from(CUBO).upload(objeto, webp, {
    contentType: 'image/webp', upsert: false, cacheControl: '31536000',
  })
  if (eS) throw new Error('subiendo: ' + eS.message)

  const { error: eU } = await s.from('gooals_v2').update({
    imagen_url: direccion,
    foto_autor: nuevo.autor,
    foto_licencia: nuevo.licencia,
    foto_origen: nuevo.pagina,
  }).eq('id', id)
  if (eU) throw new Error('escribiendo: ' + eU.message)

  // Se vuelve a LEER de la base, que es lo único que demuestra que quedó escrito.
  const { data: despues } = await s.from('gooals_v2')
    .select('imagen_url, foto_autor, foto_licencia, foto_origen').eq('id', id).single()
  const sirve = await fetch(despues.imagen_url, { method: 'HEAD' })
  console.log('\nEN LA BASE, releído:')
  console.log('  imagen_url:', despues.imagen_url)
  console.log('  autor:     ', despues.foto_autor.slice(0, 70), '·', despues.foto_licencia)
  console.log('  origen:    ', despues.foto_origen)
  console.log('  y la dirección contesta:', sirve.status, sirve.headers.get('content-type'))
  console.log('\nLa foto vieja se queda huérfana en el cubo. Se borra aparte, si se decide.')
}
