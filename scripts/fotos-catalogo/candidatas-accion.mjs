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
//   E · si el título lleva un NOMBRE PROPIO (Nürburgring, Mont-rebei), la
//       carpeta de Commons de ese nombre, SIN pasar por la Wikipedia en
//       español. En la prueba de veinte esos dos salieron a cero candidatas, y
//       no era por falta de fotos: del Nürburgring hay cientos de coches en el
//       circuito. Era el buscador, que no encontraba artículo en español y se
//       quedaba sin por dónde tirar.
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

/**
 * ¿El artículo que ha encontrado Wikipedia habla de lo que buscamos?
 *
 * Se compara palabra a palabra. Si no comparten NI UNA, el artículo se tira
 * entero: su portada, su carpeta de Commons y su enlace al inglés. Un artículo
 * equivocado no da una foto mediocre, da una foto de otra cosa.
 *
 * Lo que cazó en la prueba de veinte:
 *
 *   "Bucear en las islas Medes"   -> artículo "Chipre"
 *                                    (barcas en un puerto y una iglesia)
 *
 * Y lo que NO caza, que conviene saberlo porque es la mitad del problema:
 *
 *   "Correr un 10K"               -> "10K Projects", un sello discográfico.
 *                                    Comparten "10K", así que pasa la regla.
 *   "Actuar en un escenario"      -> "Kaleido Star: ... Mismo Escenario", un
 *                                    anime. Comparten "escenario".
 *
 * Se podría afinar —pedir que coincida la mitad de las palabras del artículo,
 * por ejemplo— y entonces caería también "Maratón de Barcelona" buscando "Marató
 * de Barcelona", porque en catalán no lleva tilde. Cada vuelta de tuerca arregla
 * unos casos y rompe otros: esto se queda en lo simple, y lo demás lo cazan los
 * ojos de alguien mirando las candidatas.
 */
function elArticuloCasa(tituloArticulo, busca) {
  const palabras = t => new Set(
    (t ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/)
      .filter(p => p.length >= 3 && !VACIAS.has(p)))
  const delArticulo = palabras(tituloArticulo)
  const deLaBusqueda = palabras(busca)
  if (delArticulo.size === 0 || deLaBusqueda.size === 0) return false
  for (const p of delArticulo) if (deLaBusqueda.has(p)) return true
  return false
}

/** Los nombres propios del título: palabras con mayúscula que no son la primera. */
function nombresPropios(nucleoTitulo) {
  return nucleoTitulo.split(/\s+/)
    .filter((p, i) => i > 0 || /^[A-ZÀ-Ü]/.test(p))
    .filter(p => p.length >= 4 && /^[A-ZÀ-Ü]/.test(p))
    .map(p => p.replace(/[.,;:]$/, ''))
}

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
  const encontrado = art?.query?.pages?.[0] ?? null
  // Si el artículo no habla de esto, no vale NADA de él: ni su portada, ni su
  // carpeta, ni su nombre en inglés. Se anota para que figure en el informe.
  const casa = encontrado ? elArticuloCasa(encontrado.title, busca) : false
  const pagina = casa ? encontrado : null

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

  // E · el nombre propio, directo a las carpetas de Commons
  const propios = nombresPropios(busca)
  if (propios.length && candidatas.length < 4) {
    const nombre = propios.join(' ')
    const cats = await pedir('commons.wikimedia.org', {
      action: 'query', list: 'search', srsearch: nombre, srnamespace: 14, srlimit: 3,
    })
    for (const c of cats?.query?.search ?? []) {
      if (candidatas.length >= 4) break
      const miembros = await pedir('commons.wikimedia.org', {
        action: 'query', list: 'categorymembers', cmtitle: c.title, cmtype: 'file', cmlimit: 12,
      })
      const titulos = (miembros?.query?.categorymembers ?? []).map(m => m.title).filter(t => !BASURA.test(t))
      const info = await infoDe(titulos)
      const buena = info.filter(sirve)[0]
      if (buena) meter(aCandidata(buena, 'carpeta del nombre propio'))
    }
  }

  return {
    ...gooal, busca,
    articulo: pagina?.title ?? null,
    articuloDescartado: !casa && encontrado ? encontrado.title : null,
    nombresPropios: propios,
    enIngles, categoria_commons: categoria,
    candidatas: candidatas.slice(0, 4),
  }
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
const descartados = filas.filter(f => f.articuloDescartado).length
const conNombre = filas.filter(f => f.nombresPropios.length > 0).length
console.log(`\npeticiones: ${peticiones}`)
console.log(`con las cuatro: ${conCuatro} · sin ninguna candidata: ${sinNinguna}`)
console.log(`artículos descartados por no casar: ${descartados} · gooals con nombre propio: ${conNombre}`)
console.log('escrito: Claude outputs/fotos-accion.json')
console.log('\nLa hoja para mirarlas:')
console.log('  node scripts/fotos-catalogo/hoja-accion.mjs')
