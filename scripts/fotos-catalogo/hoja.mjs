// Monta la hoja para elegir foto. NO TOCA LA BASE: solo lee el JSON de
// candidatas, baja las miniaturas y escribe un HTML.
//
// Las miniaturas se bajan al disco en vez de enlazarlas a Wikimedia por dos
// razones: la hoja se abre sin internet, y no se le piden 1.300 imágenes a
// Commons cada vez que David recarga la página.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

// La carpeta de los ficheros intermedios, calculada desde este guion: así no
// lleva escrita dentro la ruta del ordenador de nadie.
const SALIDA = fileURLToPath(new URL('../../Claude outputs', import.meta.url))
const CARPETA = SALIDA + '/fotos-elegir'
const AGENTE = 'GooALS/1.0 (https://gooals.app) catalogo-de-fotos'
const dormir = ms => new Promise(r => setTimeout(r, ms))

const filas = JSON.parse(readFileSync(SALIDA + '/fotos-candidatas.json', 'utf8'))
mkdirSync(CARPETA, { recursive: true })

// ── El orden: lo más conocido primero ─────────────────────
//
// Descubrir solo enseñará los gooals que tengan foto, así que si se deja a la
// mitad, lo hecho tiene que ser lo que más se va a ver.
//
// ORDENAR SOLO POR "FAMA" SALIÓ MAL y se vio mirando la lista: "Ver los cerezos
// en flor en Japón" salía primero con 419, porque el artículo que casó era
// JAPÓN, el país, no los cerezos. La fama medía el artículo, no el gooal.
//
// Se ordena por tres cosas, en este orden:
//   1. geo = 'fiable': el geocodificador encontró el sitio sin dudar, que es una
//      medida de lo conocido que es. Los 'revisar' son los sitios de los que OSM
//      sabe poco.
//   2. "enganche": que el artículo encontrado SEA el gooal y no su país o su
//      ciudad. Sin esto, lo genérico se cuela arriba.
//   3. la fama, pero TOPADA en 160: por encima de ahí ya no distingue entre
//      cosas famosas, solo premia haber casado con un país.
const s2 = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: geoFilas } = await s2.from('gooals_v2').select('id, geo').in('id', filas.map(f => f.id))
const geoDe = new Map((geoFilas ?? []).map(g => [g.id, g.geo]))
const sinTildes = t => (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
for (const f of filas) {
  f.geo = geoDe.get(f.id) ?? null
  f.enganche = Boolean(f.wiki && f.nombrePropio
    && (sinTildes(f.wiki.titulo).includes(sinTildes(f.nombrePropio))
      || sinTildes(f.nombrePropio).includes(sinTildes(f.wiki.titulo))))
}
const conFoto = filas.filter(f => f.candidatas.length > 0)
conFoto.sort((a, b) =>
  (b.geo === 'fiable') - (a.geo === 'fiable')
  || (b.enganche - a.enganche)
  || Math.min(b.fama, 160) - Math.min(a.fama, 160)
  || a.titulo.localeCompare(b.titulo, 'es'))
const sinNada = filas.filter(f => f.candidatas.length === 0)

console.log(`${filas.length} gooals · ${conFoto.length} con candidatas · ${sinNada.length} sin ninguna`)

// ── Bajar las miniaturas ──────────────────────────────────
let bajadas = 0, fallos = 0, saltadas = 0
for (const [i, f] of conFoto.entries()) {
  for (const [j, c] of f.candidatas.entries()) {
    // El nombre del fichero NO depende del orden de la hoja: si se reordena,
    // las miniaturas ya bajadas tienen que seguir siendo las de su gooal.
    const nombre = c.local ? c.local.split('/').pop() : `${f.id.slice(0, 8)}-${j + 1}.jpg`
    const ruta = `${CARPETA}/${nombre}`
    c.local = `fotos-elegir/${nombre}`
    if (existsSync(ruta) && statSync(ruta).size > 1000) { saltadas++; continue }
    await dormir(320)
    try {
      const r = await fetch(c.miniatura, { headers: { 'User-Agent': AGENTE } })
      if (!r.ok) { fallos++; c.local = null; continue }
      writeFileSync(ruta, Buffer.from(await r.arrayBuffer()))
      bajadas++
    } catch { fallos++; c.local = null }
  }
  if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${conFoto.length} gooals · ${bajadas} bajadas, ${saltadas} ya estaban, ${fallos} fallos`)
}
console.log(`miniaturas: ${bajadas} bajadas · ${saltadas} ya estaban · ${fallos} fallos`)

// ── La hoja ───────────────────────────────────────────────
const esc = t => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const tarjeta = (f, i) => `
<article class="gooal" data-id="${esc(f.id)}" data-n="${i}">
  <header>
    <span class="num">${i + 1}</span>
    <div class="quees">
      <b>${esc(f.titulo)}</b>
      <span class="sitio">${esc([f.ciudad, f.pais].filter(Boolean).join(', '))}${f.wiki ? ' · ' : ''}${f.wiki ? `<a href="${esc(f.wiki.url)}" target="_blank" rel="noreferrer">${esc(f.wiki.titulo)}</a>` : ''}</span>
    </div>
    <span class="hecho" aria-hidden>✓</span>
  </header>
  <div class="opciones">
    ${f.candidatas.map((c, j) => `
    <button class="op" data-eleccion="${j}" title="${esc(c.origen)}">
      <img src="${esc(c.local ?? c.miniatura)}" alt="candidata ${j + 1} de ${esc(f.titulo)}" loading="lazy">
      <span class="tecla">${j + 1}</span>
      <span class="pie">
        <span class="origen">${esc(c.origen).slice(0, 58)}</span>
        <span class="lic">${esc(c.licencia)}</span>
      </span>
    </button>`).join('')}
    <button class="op ninguna" data-eleccion="null">
      <span class="nada">Ninguna<br><small>se queda con su degradado</small></span>
      <span class="tecla">0</span>
    </button>
  </div>
</article>`

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Elegir fotos del catálogo — GooALS</title>
<style>
  :root { color-scheme: dark; --verde:#00D1A7 }
  * { box-sizing: border-box }
  body { margin:0; background:#0B0B0B; color:#F5F5F2; font:15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif }
  header.barra { position:sticky; top:0; z-index:10; background:#0B0B0Bee; backdrop-filter:blur(8px);
                 border-bottom:1px solid #2A2E2C; padding:12px 20px; display:flex; gap:16px; align-items:center; flex-wrap:wrap }
  header.barra h1 { font-size:16px; margin:0; flex-shrink:0 }
  .progreso { flex:1; min-width:200px }
  .barraprog { height:6px; background:#1E2120; border-radius:999px; overflow:hidden }
  .barraprog i { display:block; height:100%; background:var(--verde); width:0 }
  .cuenta { font-size:12px; color:#A3B1AC; margin-top:3px }
  button.accion { background:#1E2120; border:1px solid #2A2E2C; color:#F5F5F2; border-radius:10px;
                  padding:8px 12px; font-size:13px; cursor:pointer }
  button.accion:hover { border-color:var(--verde) }
  button.accion.destacado { background:var(--verde); color:#0B0B0B; border-color:var(--verde); font-weight:600 }
  main { padding:20px; display:flex; flex-direction:column; gap:14px; max-width:1500px; margin:0 auto }
  .ayuda { color:#7A8A85; font-size:13px; max-width:80ch; margin:0 0 6px }
  .ayuda kbd { background:#1E2120; border:1px solid #2A2E2C; border-radius:4px; padding:1px 5px; font-size:12px }

  article.gooal { background:#161817; border:1px solid #2A2E2C; border-radius:14px; padding:12px; scroll-margin-top:90px }
  article.gooal.activa { border-color:#4a5450 }
  article.gooal.decidida { opacity:.55 }
  article.gooal.decidida:hover { opacity:1 }
  body.solofaltan article.gooal.decidida { display:none }
  article.gooal header { display:flex; align-items:center; gap:10px; margin-bottom:10px }
  .num { font-size:12px; color:#7A8A85; min-width:34px }
  .quees { flex:1; min-width:0 }
  .quees b { font-size:15px; color:#fff }
  .sitio { display:block; font-size:12px; color:#7A8A85 }
  .sitio a { color:#7A8A85 }
  .hecho { color:var(--verde); font-size:18px; opacity:0 }
  article.gooal.decidida .hecho { opacity:1 }

  .opciones { display:grid; gap:10px; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)) }
  button.op { position:relative; padding:0; background:#1E2120; border:2px solid #2A2E2C; border-radius:12px;
              overflow:hidden; cursor:pointer; color:inherit; text-align:left; display:flex; flex-direction:column }
  button.op:hover { border-color:#4a5450 }
  button.op.elegida { border-color:var(--verde); box-shadow:0 0 0 2px rgba(0,209,167,.25) }
  button.op img { width:100%; aspect-ratio:4/3; object-fit:cover; display:block; background:#111 }
  .nada { aspect-ratio:4/3; display:flex; flex-direction:column; align-items:center; justify-content:center;
          color:#7A8A85; font-size:14px; text-align:center; padding:8px }
  .nada small { color:#5e6a66; font-size:11px }
  .tecla { position:absolute; top:6px; left:6px; background:#0B0B0Bcc; border-radius:6px; padding:1px 6px;
           font-size:11px; color:#A3B1AC }
  .pie { padding:7px 9px 9px; display:flex; flex-direction:column; gap:2px; font-size:11px }
  .origen { color:#A3B1AC; line-height:1.3 }
  .lic { color:var(--verde) }
  .sinopciones { color:#7A8A85; font-size:13px; padding:10px 0 }
  footer { padding:28px 20px 60px; color:#7A8A85; font-size:13px; max-width:80ch; margin:0 auto }
</style></head>
<body>
<header class="barra">
  <h1>Elegir fotos</h1>
  <div class="progreso">
    <div class="barraprog"><i id="relleno"></i></div>
    <div class="cuenta" id="cuenta">—</div>
  </div>
  <button class="accion" id="faltan">Ver solo los que faltan</button>
  <button class="accion" id="cargar">Cargar elecciones</button>
  <button class="accion destacado" id="descargar">Descargar mis elecciones</button>
  <input type="file" id="fichero" accept="application/json" hidden>
</header>

<main>
  <p class="ayuda">
    Para cada gooal, pulsa la foto que mejor lo enseñe, o <b>Ninguna</b> si las cuatro son malas —
    sin foto se queda con su degradado, que es lo que tiene hoy todo el catálogo, y eso es mejor que una foto que miente.
    Con el teclado: <kbd>1</kbd>–<kbd>4</kbd> eligen, <kbd>0</kbd> es ninguna, <kbd>↓</kbd>/<kbd>↑</kbd> cambian de gooal.
    <br><b>Se guarda solo según eliges</b>, así que puedes cerrar y volver. Aun así, descarga el fichero de vez en
    cuando: lo que guarda el navegador se pierde si borras sus datos.
    <br>Están ordenados de más conocido a menos, así que si lo dejas a la mitad, lo hecho es lo que más se va a ver.
  </p>
  ${conFoto.map(tarjeta).join('')}
  ${sinNada.length ? `<p class="sinopciones">Y ${sinNada.length} gooals para los que Wikimedia no da ninguna candidata. Se quedan con su degradado.</p>` : ''}
</main>

<footer>
  Hoja generada el ${new Date().toLocaleString('es-ES')}. Las fotos son de Wikimedia Commons y cada una
  arrastra su autor y su licencia; al elegir, eso queda guardado. Nada de esto toca la base de datos:
  es una lista de elecciones hasta que decidamos dónde se guardan las fotos.
</footer>

<script>
const DATOS = ${JSON.stringify(conFoto.map(f => ({
  id: f.id, titulo: f.titulo, ciudad: f.ciudad, pais: f.pais,
  candidatas: f.candidatas.map(c => ({
    origen: c.origen, fichero: c.fichero, original: c.original, pagina: c.pagina,
    autor: c.autor, licencia: c.licencia, licenciaUrl: c.licenciaUrl, citaObligatoria: c.citaObligatoria,
  })),
})))};

const CLAVE = 'gooals-fotos-elecciones'
let elecciones = {}
try { elecciones = JSON.parse(localStorage.getItem(CLAVE) ?? '{}') } catch { elecciones = {} }

const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(elecciones)) } catch {} }

function pintar() {
  let decididos = 0, conFoto = 0
  for (const art of document.querySelectorAll('article.gooal')) {
    const id = art.dataset.id
    const v = elecciones[id]
    const decidida = v !== undefined
    art.classList.toggle('decidida', decidida)
    if (decidida) { decididos++; if (v !== null) conFoto++ }
    for (const op of art.querySelectorAll('button.op')) {
      const valor = op.dataset.eleccion === 'null' ? null : Number(op.dataset.eleccion)
      op.classList.toggle('elegida', decidida && v === valor)
    }
  }
  document.getElementById('cuenta').textContent =
    decididos + ' de ' + DATOS.length + ' decididos · ' + conFoto + ' con foto'
  document.getElementById('relleno').style.width = (DATOS.length ? decididos / DATOS.length * 100 : 0) + '%'
}

document.querySelector('main').addEventListener('click', e => {
  const op = e.target.closest('button.op')
  if (!op) return
  const art = op.closest('article.gooal')
  const id = art.dataset.id
  const valor = op.dataset.eleccion === 'null' ? null : Number(op.dataset.eleccion)
  // Volver a pulsar lo ya elegido lo deshace: equivocarse no debe ser definitivo.
  if (elecciones[id] === valor) delete elecciones[id]
  else elecciones[id] = valor
  guardar(); pintar()
})

// ── Teclado ──
let activa = 0
const tarjetas = () => [...document.querySelectorAll('article.gooal')].filter(a => a.offsetParent !== null)
function irA(n) {
  const t = tarjetas()
  if (!t.length) return
  activa = Math.max(0, Math.min(t.length - 1, n))
  t.forEach(a => a.classList.remove('activa'))
  t[activa].classList.add('activa')
  t[activa].scrollIntoView({ behavior: 'smooth', block: 'center' })
}
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return
  const t = tarjetas()
  if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); irA(activa + 1); return }
  if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); irA(activa - 1); return }
  if (!/^[0-4]$/.test(e.key)) return
  const art = t[activa]
  if (!art) return
  const id = art.dataset.id
  const valor = e.key === '0' ? null : Number(e.key) - 1
  if (valor !== null && !art.querySelector('button.op[data-eleccion="' + valor + '"]')) return
  elecciones[id] = valor
  guardar(); pintar()
  irA(activa + 1)
})

// ── Descargar y cargar ──
document.getElementById('descargar').addEventListener('click', () => {
  const salida = DATOS.map(g => {
    const v = elecciones[g.id]
    if (v === undefined) return null
    return v === null
      ? { id: g.id, titulo: g.titulo, eleccion: null }
      : { id: g.id, titulo: g.titulo, eleccion: g.candidatas[v] }
  }).filter(Boolean)
  const hoy = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(salida, null, 1)], { type: 'application/json' }))
  a.download = 'fotos-elegidas-' + hoy + '.json'
  a.click()
})

document.getElementById('cargar').addEventListener('click', () => document.getElementById('fichero').click())
document.getElementById('fichero').addEventListener('change', async e => {
  const f = e.target.files?.[0]
  if (!f) return
  try {
    const lista = JSON.parse(await f.text())
    const porFichero = new Map(DATOS.map(g => [g.id, g]))
    let puestas = 0
    for (const fila of lista) {
      const g = porFichero.get(fila.id)
      if (!g) continue
      if (fila.eleccion === null) { elecciones[fila.id] = null; puestas++; continue }
      const i = g.candidatas.findIndex(c => c.fichero === fila.eleccion?.fichero)
      if (i >= 0) { elecciones[fila.id] = i; puestas++ }
    }
    guardar(); pintar()
    alert('Recuperadas ' + puestas + ' elecciones de ' + lista.length + '.')
  } catch { alert('Ese fichero no parece el de las elecciones.') }
  e.target.value = ''
})

document.getElementById('faltan').addEventListener('click', e => {
  document.body.classList.toggle('solofaltan')
  e.target.textContent = document.body.classList.contains('solofaltan') ? 'Ver todos' : 'Ver solo los que faltan'
  irA(0)
})

pintar(); irA(0)
</script>
</body></html>`

writeFileSync(SALIDA + '/elegir-fotos.html', html, 'utf8')
writeFileSync(SALIDA + '/fotos-candidatas.json', JSON.stringify(filas, null, 1), 'utf8')
console.log('\nHOJA: Claude outputs/elegir-fotos.html')
