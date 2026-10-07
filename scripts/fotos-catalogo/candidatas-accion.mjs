// Candidatas de foto para gooals que son una ACCIÓN, no un sitio.
//
//   node --env-file=.env.local scripts/fotos-catalogo/candidatas-accion.mjs --prueba
//   node --env-file=.env.local scripts/fotos-catalogo/candidatas-accion.mjs
//
// Con --prueba hace veinte (10 deporte, 5 gastronomía, 5 vida). Sin nada, todos
// los que no tienen foto de esas tres categorías.
//
// ── POR QUÉ UN GUION APARTE ───────────────────────────────
//
// `candidatas.mjs` busca el SITIO: el Prado, la Boqueria, el Kilimanjaro. Sus
// cuatro estrategias van todas a nombres propios, y para eso Commons es
// inmejorable porque es un archivo de sitios.
//
// Esto es otra cosa. "Montar en skateboard" no tiene nombre propio ni
// coordenadas: lo que hay que encontrar es a alguien HACIÉNDOLO. Un skatepark
// vacío es del tema y no sirve. Por eso las cuatro estrategias de aquí buscan la
// actividad y, cuando pueden, se apoyan en una señal hecha por personas: el
// artículo que la describe en Wikipedia y la carpeta que Commons le ha puesto.
//
// ── LAS CUATRO, Y QUE SEAN DISTINTAS ──────────────────────
//
//   A · la portada del artículo de Wikipedia de la actividad. La eligió una
//       persona para representarla, y es lo que mejor funcionó con los sitios.
//   B · la carpeta de Commons de esa actividad (vía Wikidata o el enlace del
//       artículo): fotos que alguien ya clasificó como "esto es eso".
//   C · búsqueda en Commons con el nombre EN INGLÉS, que sale del enlace de
//       idioma del artículo. No lo traduzco yo: lo tradujo Wikipedia.
//   D · búsqueda en Commons en español, por si la actividad es de aquí.
//
// Cuatro resultados de la misma búsqueda serían cuatro fotos del mismo álbum.
//
// NO TOCA LA BASE. Escribe un JSON y una hoja de contactos para mirar.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const SALIDA = fileURLToPath(new URL('../../Claude outputs', import.meta.url))
const AGENTE = 'GooALS/1.0 (https://gooals.app) catalogo-de-fotos'
const ESPERA_MS = 1050
const ANCHO_MINIMO = 900
const prueba = process.argv.includes('--prueba')

const dormir = ms => new Promise(r => setTimeout(r, ms))
let peticiones = 0

async function pedir(host, params) {
  await dormir(ESPERA_MS)
  peticiones++
  const u = new URL(`https://${host}/w/api.php`)
  for (const [k, v] of Object.entries({ format: 'json', formatversion: 2, origin: '*', ...params })) {
    u.searchParams.set(k, v)
  }
  try {
    const r = await fetch(u, { headers: { 'User-Agent': AGENTE } })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

const limpio = t => (t?.value ?? '').replace(/<[^>]*>/g, '').trim()

/**
 * Ficheros que NUNCA son una foto de alguien haciendo algo. Sale de la primera
 * pasada: salían banderas, mapas y escudos como "la foto" de una fiesta.
 */
const BASURA = /(flag|bandera|map|mapa|logo|escudo|coat[_ ]of[_ ]arms|seal|diagram|chart|icon|symbol|poster|cartel|plano|svg|location|locator)/i

function sirve(info) {
  if (!info) return false
  if (!/\.(jpe?g|png)$/i.test(info.title)) return false
  if (BASURA.test(info.title)) return false
  return (info.imageinfo?.[0]?.width ?? 0) >= ANCHO_MINIMO
}

function aCandidata(p, estrategia) {
  const ii = p.imageinfo[0]
  return {
    estrategia,
    fichero: p.title,
    autor: limpio(ii.extmetadata?.Artist),
    licencia: limpio(ii.extmetadata?.LicenseShortName),
    pagina: ii.descriptionurl,
    original: ii.url.split('?')[0],
    miniatura: ii.thumburl?.split('?')[0] ?? null,
    ancho: ii.width,
    alto: ii.height,
  }
}

/** Datos de varios ficheros de Commons de una vez. */
async function infoDe(titulos) {
  if (!titulos.length) return []
  const j = await pedir('commons.wikimedia.org', {
    action: 'query', titles: titulos.slice(0, 20).join('|'),
    prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: 420,
  })
  return (j?.query?.pages ?? []).filter(p => p.imageinfo?.[0])
}

/** Lo que se busca: el título sin el verbo de delante ni las palabras vacías. */
const VERBOS = /^(montar en|montar|hacer|hacerse|ver|visitar|ir a|ir al|comer|comerte|probar|subir a|subir|bajar a|bajar|recorrer|cruzar|practicar|aprender a|aprender|sacarse|correr|nadar|dormir|bañarte en|bañarte|pasar|tomar|asistir a|conducir|navegar por|navegar|participar en|entrar en|perderte en|bailar|cantar|jugar a|jugar|saltar en|saltar|volar en|volar)\s+/i
const VACIAS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'por', 'con', 'y', 'a', 'al', 'para', 'tu', 'su'])

function nucleo(titulo) {
  const sinVerbo = titulo.replace(VERBOS, '')
  return sinVerbo.split(/\s+/).filter(p => !VACIAS.has(p.toLowerCase())).join(' ')
}

async function candidatasDe(gooal) {
  const busca = nucleo(gooal.titulo)
  const candidatas = []
  const puestos = new Set()
  const meter = c => {
    if (!c || puestos.has(c.fichero)) return
    puestos.add(c.fichero)
    candidatas.push(c)
  }

  // ── El artículo de la actividad en Wikipedia ──
  const art = await pedir('es.wikipedia.org', {
    action: 'query', generator: 'search', gsrsearch: busca, gsrlimit: 1, gsrnamespace: 0,
    prop: 'pageimages|pageprops|langlinks', piprop: 'original|name',
    ppprop: 'wikibase_item', lllang: 'en',
  })
  const pagina = art?.query?.pages?.[0] ?? null

  // A · la portada del artículo
  if (pagina?.pageimage && !BASURA.test(pagina.pageimage)) {
    const info = await infoDe(['File:' + pagina.pageimage])
    if (info[0] && sirve(info[0])) meter(aCandidata(info[0], 'portada del artículo'))
  }

  // B · la carpeta de Commons de la actividad
  let categoria = null
  const q = pagina?.pageprops?.wikibase_item
  if (q) {
    const wd = await pedir('www.wikidata.org', {
      action: 'wbgetentities', ids: q, props: 'claims|sitelinks',
    })
    const ent = wd?.entities?.[q]
    categoria = ent?.claims?.P373?.[0]?.mainsnak?.datavalue?.value
      ?? ent?.sitelinks?.commonswiki?.title?.replace(/^Category:/, '')
      ?? null
  }
  if (categoria) {
    const cat = await pedir('commons.wikimedia.org', {
      action: 'query', list: 'categorymembers', cmtitle: 'Category:' + categoria,
      cmtype: 'file', cmlimit: 12,
    })
    const titulos = (cat?.query?.categorymembers ?? []).map(m => m.title).filter(t => !BASURA.test(t))
    const info = await infoDe(titulos)
    const buena = info.find(sirve)
    if (buena) meter(aCandidata(buena, 'carpeta de Commons'))
  }

  // C · en inglés, con el nombre que le pone Wikipedia (no lo traduzco yo)
  const enIngles = pagina?.langlinks?.[0]?.title ?? null
  if (enIngles) {
    const j = await pedir('commons.wikimedia.org', {
      action: 'query', generator: 'search', gsrsearch: enIngles, gsrnamespace: 6, gsrlimit: 8,
      prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: 420,
    })
    const buena = (j?.query?.pages ?? []).filter(sirve)[0]
    if (buena) meter(aCandidata(buena, 'Commons en inglés'))
  }

  // D · en español, por si la actividad es de aquí
  const j = await pedir('commons.wikimedia.org', {
    action: 'query', generator: 'search', gsrsearch: busca, gsrnamespace: 6, gsrlimit: 8,
    prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: 420,
  })
  for (const p of (j?.query?.pages ?? []).filter(sirve)) {
    if (candidatas.length >= 4) break
    meter(aCandidata(p, 'Commons en español'))
  }

  return { ...gooal, busca, articulo: pagina?.title ?? null, enIngles, categoria, candidatas: candidatas.slice(0, 4) }
}

// ── Los gooals ────────────────────────────────────────────
async function sinFoto(categoria, cuantos) {
  const { data } = await s.from('gooals_v2')
    .select('id, titulo, categoria, puntos, ciudad, pais')
    .eq('activo', true).eq('estado', 'verificado').eq('categoria', categoria)
    .is('imagen_url', null)
    .order('titulo').limit(cuantos)
  return data ?? []
}

const lote = prueba
  ? [...await sinFoto('deporte', 10), ...await sinFoto('gastronomia', 5), ...await sinFoto('vida', 5)]
  : [...await sinFoto('deporte', 500), ...await sinFoto('gastronomia', 500), ...await sinFoto('vida', 500)]

console.log(`${lote.length} gooals sin foto` + (prueba ? ' (prueba de veinte)' : ''))
console.log(lote.map(g => `${g.categoria}: ${g.titulo}`).join('\n'))
console.log('\nA una petición por segundo, unos', Math.ceil(lote.length * 5 * ESPERA_MS / 60000), 'minutos.\n')

const filas = []
for (const [i, g] of lote.entries()) {
  const fila = await candidatasDe(g)
  filas.push(fila)
  console.log(`${String(i + 1).padStart(2)}/${lote.length}  ${fila.candidatas.length} candidatas  ${g.titulo.slice(0, 44).padEnd(44)} ${fila.articulo ? '· art: ' + fila.articulo.slice(0, 28) : '· sin artículo'}`)
}

mkdirSync(SALIDA, { recursive: true })
writeFileSync(SALIDA + '/fotos-accion.json', JSON.stringify(filas, null, 1), 'utf8')

const conCuatro = filas.filter(f => f.candidatas.length === 4).length
const sinNinguna = filas.filter(f => f.candidatas.length === 0).length
console.log(`\npeticiones: ${peticiones}`)
console.log(`con las cuatro: ${conCuatro} · sin ninguna: ${sinNinguna}`)
console.log('escrito: Claude outputs/fotos-accion.json')
console.log('\nLa hoja para mirarlas:')
console.log('  node scripts/fotos-catalogo/hoja-accion.mjs')
