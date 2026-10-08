// Busca CUATRO candidatas de foto para cada gooal de lugar. NO TOCA LA BASE.
//
// Cuatro estrategias distintas a propósito, para que las cuatro miniaturas no
// sean cuatro fotos parecidas del mismo álbum:
//
//   A · la portada del artículo de Wikipedia buscado por el NOMBRE PROPIO del
//       gooal ("La Tomatina"). La portada la eligió una persona para representar
//       ese artículo, y eso es lo que mejor ha funcionado en las pruebas.
//   B · la portada del artículo buscado por el LUGAR (la consulta del mapa).
//       Para un museo suele ser la misma que A; para una fiesta es el pueblo, y
//       a veces sale una buena foto del sitio.
//   C · la carpeta de Commons que se llama como el gooal.
//   D · la carpeta de Commons que dice Wikidata, que es el enlace oficial entre
//       la cosa y sus fotos, y no depende de cómo se llame en español.
//
// Si una estrategia no da nada, el hueco lo rellena la siguiente mejor de las
// carpetas, para que siempre haya cuatro donde elegir.
//
// SE PUEDE PARAR Y SEGUIR: cada gooal se guarda en cuanto se resuelve, y al
// relanzarlo se salta los que ya están. Son ~2.500 peticiones a Wikimedia a una
// por segundo; perderlas por un corte sería absurdo.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
// La carpeta de los ficheros intermedios, calculada desde este guion: así no
// lleva escrita dentro la ruta del ordenador de nadie.
const SALIDA = fileURLToPath(new URL('../../Claude outputs', import.meta.url))
// --titulos=<ruta a un JSON con un array de títulos> busca SOLO esos, y
// --salida=<nombre> escribe en su propio fichero. Las dos juntas permiten una
// prueba pequeña sin tocar lo de la pasada anterior.
const argumento = (n, d) => {
  const a = process.argv.find(x => x.startsWith('--' + n + '='))
  return a ? a.slice(n.length + 3) : d
}
const SOLO_ESTOS = argumento('titulos', null)
const FICHERO = SALIDA + '/' + argumento('salida', 'fotos-candidatas') + '.json'
const AGENTE = 'GooALS/1.0 (https://gooals.app) catalogo-de-fotos'
const ESPERA_MS = 1050
const ANCHO_MINIMO = 700
const ALTO_MINIMO = 500
const ANCHO_MINIATURA = 400

const dormir = ms => new Promise(r => setTimeout(r, ms))
let peticiones = 0
async function pedir(url) {
  await dormir(ESPERA_MS)
  peticiones++
  try {
    const r = await fetch(url, { headers: { 'User-Agent': AGENTE, Accept: 'application/json' } })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

const sinTildes = t => (t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const limpiar = html => (html ?? '').replace(/<[^>]*>/g, '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()

const CHATARRA = /(^|[\W_])(flag|bandera|senyera|map|mapa|location[\W_]?map|relief[\W_]?map|locator|escudo|coat[\W_]?of[\W_]?arms|blason|emblem|seal|logo|montage|collage|diagram|chart|plano|poster|banner|stub|icon|signature|firma)([\W_]|$)/i
const FORMATOS = new Set(['image/jpeg', 'image/png', 'image/webp'])
const esChatarra = (nombre, mime) =>
  /\.(svg|djvu|pdf|tif|tiff|gif|ogg|webm|xcf)$/i.test(nombre)
  || (mime != null && !FORMATOS.has(mime))
  || CHATARRA.test(nombre)

const VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'en', 'al', 'a', 'un', 'una',
  'the', 'of', 'in', 'at', 'and', 'di', 'da', 'il', 'le', 'des', 'du', 'der', 'die', 'das', 'van'])
const palabras = t => sinTildes(t).split(/[^a-z0-9ñ]+/).filter(p => p.length >= 3 && !VACIAS.has(p))
const comparte = (texto, dist) => { const p = new Set(palabras(texto)); return dist.some(d => p.has(d)) }
const cuantoCasa = (texto, dist) => {
  if (!dist.length) return 0
  const p = new Set(palabras(texto))
  const c = dist.filter(d => p.has(d))
  return c.some(d => d.length >= 5) ? c.length / dist.length : 0
}

/** El nombre propio del gooal: el tramo en mayúsculas del título, sin el verbo. */
function nombrePropio(titulo) {
  const trozos = titulo.split(/\s+/).slice(1)
  const enlaces = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en'])
  const tramos = []
  let actual = []
  for (const t of trozos) {
    if (/^[A-ZÁÉÍÓÚÑÜÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÇ]/.test(t)) actual.push(t)
    else if (actual.length && enlaces.has(t.toLowerCase())) actual.push(t)
    else { if (actual.length) tramos.push(actual.join(' ')); actual = [] }
  }
  if (actual.length) tramos.push(actual.join(' '))
  return tramos.map(t => t.replace(/\s+(de|del|la|las|el|los|y|en)$/i, ''))
    .filter(t => palabras(t).length).sort((a, b) => b.length - a.length)[0] ?? null
}

async function articulo(idioma, consulta) {
  const j = await pedir(`https://${idioma}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2`
    + `&generator=search&gsrsearch=${encodeURIComponent(consulta)}&gsrlimit=1`
    + '&prop=pageimages|coordinates|pageprops&piprop=original&ppprop=page_image_free|wikibase_item&colimit=1')
  const p = j?.query?.pages?.[0]
  if (!p) return null
  return {
    idioma, titulo: p.title, url: `https://${idioma}.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
    fichero: p.pageprops?.page_image_free ?? null,
    wikidata: p.pageprops?.wikibase_item ?? null,
    lat: p.coordinates?.[0]?.lat ?? null, lng: p.coordinates?.[0]?.lon ?? null,
  }
}

/** La carpeta de Commons según Wikidata, y de paso lo conocida que es la cosa. */
async function deWikidata(id) {
  if (!id) return { categoria: null, fama: 0 }
  const j = await pedir(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=${id}&props=claims|sitelinks`)
  const e = j?.entities?.[id]
  if (!e) return { categoria: null, fama: 0 }
  const p373 = e.claims?.P373?.[0]?.mainsnak?.datavalue?.value
  const enlace = e.sitelinks?.commonswiki?.title
  return {
    // En cuántos idiomas tiene artículo: la mejor medida de "cómo de conocido es"
    // que hay a mano, y sale gratis en esta misma petición.
    fama: Object.keys(e.sitelinks ?? {}).length,
    categoria: p373 ? 'Category:' + p373 : (enlace?.startsWith('Category:') ? enlace : null),
  }
}

async function categoriaPorNombre(termino) {
  const dist = palabras(termino)
  if (!dist.length) return null
  const j = await pedir('https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2'
    + `&list=search&srnamespace=14&srsearch=${encodeURIComponent(termino)}&srlimit=8`)
  return ((j?.query?.search ?? []).map(x => x.title)
    .filter(t => cuantoCasa(t.replace(/^Category:/, ''), dist) >= 0.6)
    .sort((a, b) => a.length - b.length)[0]) ?? null
}

async function ficherosDe(categoria) {
  if (!categoria) return []
  const j = await pedir('https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2'
    + `&generator=categorymembers&gcmtitle=${encodeURIComponent(categoria)}&gcmtype=file&gcmlimit=60`
    + `&prop=imageinfo|categories&iiprop=url|size|mime|extmetadata&iiurlwidth=${ANCHO_MINIATURA}`
    + '&clcategories=' + encodeURIComponent('Category:Quality images|Category:Featured pictures on Wikimedia Commons'))
  return (j?.query?.pages ?? []).map(p => {
    const i = p.imageinfo?.[0]
    if (!i) return null
    const nombre = p.title.replace(/^File:/, '')
    if (esChatarra(nombre, i.mime)) return null
    if ((i.width ?? 0) < ANCHO_MINIMO || (i.height ?? 0) < ALTO_MINIMO) return null
    const cats = (p.categories ?? []).map(c => c.title)
    const destacada = cats.includes('Category:Featured pictures on Wikimedia Commons')
    const calidad = cats.includes('Category:Quality images')
    const prop = i.width / i.height
    const apaisada = prop >= 1.2 && prop <= 2.4
    return {
      ...datosDe(nombre, i),
      destacada, calidad,
      nota: (destacada ? 1000 : 0) + (calidad ? 500 : 0) + (apaisada ? 120 : 0)
        + Math.min(80, Math.round((i.width * i.height) / 400000)),
    }
  }).filter(Boolean).sort((a, b) => b.nota - a.nota)
}

function datosDe(nombre, i) {
  const m = i.extmetadata ?? {}
  return {
    fichero: nombre, original: i.url, miniatura: i.thumburl ?? i.url, pagina: i.descriptionurl,
    ancho: i.width, alto: i.height,
    autor: limpiar(m.Artist?.value) || '(sin autor declarado)',
    licencia: limpiar(m.LicenseShortName?.value) || '(sin licencia declarada)',
    licenciaUrl: limpiar(m.LicenseUrl?.value) || null,
    citaObligatoria: limpiar(m.AttributionRequired?.value) === 'true',
  }
}

async function ficha(nombre) {
  if (!nombre) return null
  const j = await pedir('https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2'
    + `&titles=${encodeURIComponent('File:' + nombre)}&prop=imageinfo`
    + `&iiprop=url|extmetadata|size|mime&iiurlwidth=${ANCHO_MINIATURA}`)
  const p = j?.query?.pages?.[0]
  if (!p || p.missing || !p.imageinfo?.length) return null
  const i = p.imageinfo[0]
  if (esChatarra(nombre, i.mime)) return null
  if ((i.width ?? 0) < ANCHO_MINIMO || (i.height ?? 0) < ALTO_MINIMO) return null
  return datosDe(nombre, i)
}

// ── Los gooals ────────────────────────────────────────────
const filas = []
for (let d = 0; ; d += 1000) {
  const { data, error } = await s.from('gooals_v2')
    .select('id, titulo, categoria, ambito, ciudad, pais, lat, lng, geo_consulta')
    .eq('estado', 'verificado')
    .order('id').range(d, d + 999)
  if (error) throw new Error(error.message)
  filas.push(...data)
  if (data.length < 1000) break
}

// Con una lista, manda la lista: incluye gooals de ámbito personal que llevan
// un nombre propio en el título («Terminar un Ironman», «Correr la Mitja de
// Granollers»), que antes se quedaban fuera por no ser de ámbito «lugar» y
// también tienen sitio que fotografiar.
if (SOLO_ESTOS) {
  const pedidos = new Set(JSON.parse(readFileSync(SOLO_ESTOS, 'utf8')))
  const antes = filas.length
  const dentro = filas.filter(f => pedidos.has(f.titulo))
  const faltan = [...pedidos].filter(t => !dentro.some(f => f.titulo === t))
  if (faltan.length) {
    console.error('PARA: ' + faltan.length + ' de la lista no están en el catálogo publicado:')
    for (const t of faltan.slice(0, 10)) console.error('  · ' + t)
    process.exit(1)
  }
  console.log('de ' + antes + ' filas del catálogo, la lista pide ' + dentro.length)
  filas.length = 0
  filas.push(...dentro)
} else {
  // Sin lista, el comportamiento de siempre: solo los de ámbito lugar.
  const soloLugar = filas.filter(f => f.ambito === 'lugar')
  filas.length = 0
  filas.push(...soloLugar)
}

const hechos = existsSync(FICHERO) ? JSON.parse(readFileSync(FICHERO, 'utf8')) : []
const yaEsta = new Set(hechos.map(h => h.id))
const pendientes = filas.filter(g => !yaEsta.has(g.id))
console.log(`${filas.length} gooals de lugar · ${hechos.length} ya resueltos · ${pendientes.length} por hacer\n`)

const guardar = () => writeFileSync(FICHERO, JSON.stringify(hechos, null, 1), 'utf8')

for (const [n, g] of pendientes.entries()) {
  const propio = nombrePropio(g.titulo)
  const fila = { ...g, nombrePropio: propio, fama: 0, wiki: null, candidatas: [] }
  try {
    // A · artículo por el nombre propio
    let artA = propio ? await articulo('es', propio) : null
    if (propio && !(artA && comparte(artA.titulo, palabras(propio)))) {
      const en = await articulo('en', propio)
      artA = (en && comparte(en.titulo, palabras(propio))) ? en : null
    }
    // B · artículo por el lugar
    const artB = g.geo_consulta ? await articulo('es', g.geo_consulta) : null

    const art = artA ?? artB
    if (art) fila.wiki = { titulo: art.titulo, url: art.url, idioma: art.idioma }

    const wd = await deWikidata(artA?.wikidata ?? artB?.wikidata ?? null)
    fila.fama = wd.fama

    const catNombre = propio ? await categoriaPorNombre(propio) : null
    const listaC = catNombre ? await ficherosDe(catNombre) : []
    const listaD = (wd.categoria && wd.categoria !== catNombre) ? await ficherosDe(wd.categoria) : []

    const vistos = new Set()
    const mete = async (origen, dato) => {
      if (!dato || vistos.has(dato.fichero) || fila.candidatas.length >= 4) return
      vistos.add(dato.fichero)
      fila.candidatas.push({ origen, ...dato })
    }

    await mete(`portada del artículo «${artA?.titulo ?? ''}»`, artA?.fichero ? await ficha(artA.fichero) : null)
    await mete(`portada del artículo del lugar «${artB?.titulo ?? ''}»`, artB?.fichero ? await ficha(artB.fichero) : null)
    await mete(`carpeta ${catNombre ?? ''}`, listaC[0])
    await mete(`carpeta de Wikidata ${wd.categoria ?? ''}`, listaD[0])
    // Los huecos que queden, con las siguientes mejores de las carpetas.
    for (const extra of [listaC[1], listaD[1], listaC[2], listaD[2], listaC[3], listaD[3]]) {
      await mete('otra de la misma carpeta', extra)
    }
  } catch (e) {
    fila.error = e.message
  }
  hechos.push(fila)
  if (hechos.length % 5 === 0) guardar()
  console.log(`${String(n + 1).padStart(3)}/${pendientes.length}  ${String(fila.candidatas.length)} cand · fama ${String(fila.fama).padStart(3)} · ${g.titulo.slice(0, 50)}`)
}
guardar()

const con = hechos.filter(h => h.candidatas.length > 0).length
console.log(`\nResueltos ${hechos.length} · con alguna candidata ${con} · sin ninguna ${hechos.length - con}`)
console.log('peticiones:', peticiones)
console.log('fichero:', FICHERO)
