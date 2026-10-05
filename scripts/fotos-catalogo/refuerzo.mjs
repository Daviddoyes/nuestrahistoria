// Pasada de refuerzo para los gooals a los que les salieron malas candidatas.
// NO TOCA LA BASE: solo añade candidatas al JSON.
//
// EL PROBLEMA, visto mirando la hoja: a "Comer una pizza napolitana en Nápoles"
// el nombre propio que se le saca es "Nápoles", así que se buscó la carpeta de
// la CIUDAD y salieron cuatro fotos cualesquiera de Nápoles. Igual con
// "Caminar sobre un glaciar en Islandia" -> Islandia. Son 45, y 19 de ellos
// caen en los 40 primeros de la hoja, que es justo lo que más se va a ver.
//
// EL ARREGLO: buscar también por la FRASE del título sin el verbo — "pizza
// napolitana en Nápoles", "glaciar en Islandia" —, que sí dice qué se quiere
// retratar. Esas candidatas se ponen DELANTE, porque son más específicas.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// La carpeta de los ficheros intermedios, calculada desde este guion: así no
// lleva escrita dentro la ruta del ordenador de nadie.
const SALIDA = fileURLToPath(new URL('../../Claude outputs', import.meta.url))
const FICHERO = SALIDA + '/fotos-candidatas.json'
const AGENTE = 'GooALS/1.0 (https://gooals.app) catalogo-de-fotos'
const ESPERA_MS = 1050
const ANCHO_MINIMO = 700, ALTO_MINIMO = 500, ANCHO_MINIATURA = 400

const dormir = ms => new Promise(r => setTimeout(r, ms))
let peticiones = 0
async function pedir(url) {
  await dormir(ESPERA_MS); peticiones++
  try { const r = await fetch(url, { headers: { 'User-Agent': AGENTE, Accept: 'application/json' } }); return r.ok ? await r.json() : null }
  catch { return null }
}
const sinTildes = t => (t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const limpiar = h => (h ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
const CHATARRA = /(^|[\W_])(flag|bandera|senyera|map|mapa|location[\W_]?map|relief[\W_]?map|locator|escudo|coat[\W_]?of[\W_]?arms|blason|emblem|seal|logo|montage|collage|diagram|chart|plano|poster|banner|stub|icon|signature)([\W_]|$)/i
const FORMATOS = new Set(['image/jpeg', 'image/png', 'image/webp'])
const esChatarra = (n, m) => /\.(svg|djvu|pdf|tif|tiff|gif|ogg|webm|xcf)$/i.test(n) || (m != null && !FORMATOS.has(m)) || CHATARRA.test(n)
const VACIAS = new Set(['de','del','la','el','los','las','y','e','en','al','a','un','una','the','of','in','at','and','sobre','por','con','desde','hasta','que','su','sus'])
const palabras = t => sinTildes(t).split(/[^a-z0-9ñ]+/).filter(p => p.length >= 3 && !VACIAS.has(p))
const cuantoCasa = (t, d) => { if (!d.length) return 0; const p = new Set(palabras(t)); const c = d.filter(x => p.has(x)); return c.some(x => x.length >= 5) ? c.length / d.length : 0 }

/** El título sin el verbo ni los artículos de delante: lo que se quiere retratar. */
function fraseDe(titulo) {
  let t = titulo.split(/\s+/).slice(1)
  while (t.length && VACIAS.has(sinTildes(t[0]))) t = t.slice(1)
  return t.join(' ').trim() || null
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

async function articulo(idioma, consulta) {
  const j = await pedir(`https://${idioma}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2`
    + `&generator=search&gsrsearch=${encodeURIComponent(consulta)}&gsrlimit=1`
    + '&prop=pageimages|pageprops&piprop=original&ppprop=page_image_free')
  const p = j?.query?.pages?.[0]
  return p ? { titulo: p.title, fichero: p.pageprops?.page_image_free ?? null } : null
}
async function ficha(nombre) {
  if (!nombre) return null
  const j = await pedir('https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2'
    + `&titles=${encodeURIComponent('File:' + nombre)}&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=${ANCHO_MINIATURA}`)
  const p = j?.query?.pages?.[0]
  if (!p || p.missing || !p.imageinfo?.length) return null
  const i = p.imageinfo[0]
  if (esChatarra(nombre, i.mime) || (i.width ?? 0) < ANCHO_MINIMO || (i.height ?? 0) < ALTO_MINIMO) return null
  return datosDe(nombre, i)
}
async function porCategoria(termino) {
  const dist = palabras(termino)
  if (!dist.length) return []
  const b = await pedir('https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2'
    + `&list=search&srnamespace=14&srsearch=${encodeURIComponent(termino)}&srlimit=8`)
  const cat = ((b?.query?.search ?? []).map(x => x.title)
    .filter(t => cuantoCasa(t.replace(/^Category:/, ''), dist) >= 0.6)
    .sort((a, c) => a.length - c.length)[0])
  if (!cat) return []
  const j = await pedir('https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2'
    + `&generator=categorymembers&gcmtitle=${encodeURIComponent(cat)}&gcmtype=file&gcmlimit=40`
    + `&prop=imageinfo|categories&iiprop=url|size|mime|extmetadata&iiurlwidth=${ANCHO_MINIATURA}`
    + '&clcategories=' + encodeURIComponent('Category:Quality images|Category:Featured pictures on Wikimedia Commons'))
  return (j?.query?.pages ?? []).map(p => {
    const i = p.imageinfo?.[0]; if (!i) return null
    const nombre = p.title.replace(/^File:/, '')
    if (esChatarra(nombre, i.mime) || (i.width ?? 0) < ANCHO_MINIMO || (i.height ?? 0) < ALTO_MINIMO) return null
    const cats = (p.categories ?? []).map(c => c.title)
    const prop = i.width / i.height
    return { ...datosDe(nombre, i), cat,
      nota: (cats.includes('Category:Featured pictures on Wikimedia Commons') ? 1000 : 0)
        + (cats.includes('Category:Quality images') ? 500 : 0)
        + (prop >= 1.2 && prop <= 2.4 ? 120 : 0) + Math.min(80, Math.round(i.width * i.height / 400000)) }
  }).filter(Boolean).sort((a, b2) => b2.nota - a.nota)
}

const filas = JSON.parse(readFileSync(FICHERO, 'utf8'))
const esGenerico = f => {
  const n = sinTildes(f.nombrePropio)
  return Boolean(n) && (n === sinTildes(f.pais) || n === sinTildes(f.ciudad))
}
const aReforzar = filas.filter(f => !f.reforzado && (esGenerico(f) || f.candidatas.length < 4))
console.log(`${aReforzar.length} gooals a reforzar (genéricos o con menos de cuatro candidatas)\n`)

let n = 0
for (const f of aReforzar) {
  const frase = fraseDe(f.titulo)
  if (!frase) { f.reforzado = true; continue }
  const nuevas = []
  const art = await articulo('es', frase)
  const deArt = art?.fichero ? await ficha(art.fichero) : null
  if (deArt) nuevas.push({ origen: `portada del artículo «${art.titulo}» (buscando "${frase}")`, ...deArt })
  const lista = await porCategoria(frase)
  for (const c of lista.slice(0, 2)) nuevas.push({ origen: `carpeta ${c.cat} (buscando "${frase}")`, ...c })

  const vistos = new Set(f.candidatas.map(c => c.fichero))
  const anadidas = nuevas.filter(c => !vistos.has(c.fichero))
  // Delante: son más específicas que las de la carpeta del país.
  f.candidatas = [...anadidas, ...f.candidatas].slice(0, 4)
  f.reforzado = true
  n++
  if (n % 5 === 0) writeFileSync(FICHERO, JSON.stringify(filas, null, 1), 'utf8')
  console.log(`${String(n).padStart(3)}/${aReforzar.length}  +${anadidas.length} · ${f.titulo.slice(0, 48).padEnd(50)} ← "${frase.slice(0, 34)}"`)
}
writeFileSync(FICHERO, JSON.stringify(filas, null, 1), 'utf8')
console.log(`\nreforzados ${n} · peticiones ${peticiones}`)
