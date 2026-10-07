// La hoja para elegir foto de los gooals de ACCIÓN, y los mosaicos para mirarlas.
//
//   node scripts/fotos-catalogo/hoja-accion.mjs
//
// Escribe dos cosas en "Claude outputs/":
//   · fotos-accion.html  — la hoja para David: cuatro candidatas por gooal, con
//     su autor y su licencia, y una quinta opción SIEMPRE: "ninguna".
//   · accion-mosaico-N.png — los mismos cuatro de cada gooal pegados en una
//     imagen, de cuatro gooals en cuatro gooals, para poder mirarlos de verdad.
//
// "Ninguna" no es un fallo de la prueba: que un gooal no tenga una foto decente
// es una respuesta válida. Sin foto no sale en Descubrir, y preferimos que falte
// a que salga una foto de archivo de alguien haciendo algo que no es.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SALIDA = fileURLToPath(new URL('../../Claude outputs', import.meta.url))
const AGENTE = 'GooALS/1.0 (https://gooals.app) catalogo-de-fotos'
const dormir = ms => new Promise(r => setTimeout(r, ms))

const filas = JSON.parse(readFileSync(SALIDA + '/fotos-accion.json', 'utf8'))
mkdirSync(SALIDA, { recursive: true })

// ── Los mosaicos ──────────────────────────────────────────
const { default: sharp } = await import('sharp')
const ANCHO = 300, ALTO = 220, POR_MOSAICO = 4

const bajada = new Map()
async function bajar(url) {
  if (!url) return null
  if (bajada.has(url)) return bajada.get(url)
  await dormir(220)
  try {
    const r = await fetch(url, { headers: { 'User-Agent': AGENTE } })
    if (!r.ok) throw new Error(String(r.status))
    const buf = await sharp(Buffer.from(await r.arrayBuffer()))
      .resize({ width: ANCHO, height: ALTO, fit: 'cover' }).jpeg({ quality: 78 }).toBuffer()
    bajada.set(url, buf)
    return buf
  } catch {
    bajada.set(url, null)
    return null
  }
}

const vacia = await sharp({
  create: { width: ANCHO, height: ALTO, channels: 3, background: '#14161500' === '' ? '#141615' : '#141615' },
}).jpeg().toBuffer()

let mosaico = 0
for (let i = 0; i < filas.length; i += POR_MOSAICO) {
  const grupo = filas.slice(i, i + POR_MOSAICO)
  const capas = []
  for (const [fila, g] of grupo.entries()) {
    for (let col = 0; col < 4; col++) {
      const c = g.candidatas[col]
      const buf = (c && await bajar(c.miniatura ?? c.original)) ?? vacia
      capas.push({ input: buf, left: col * (ANCHO + 4), top: fila * (ALTO + 4) })
    }
  }
  mosaico++
  const nombre = `${SALIDA}/accion-mosaico-${mosaico}.png`
  await sharp({
    create: {
      width: 4 * ANCHO + 12, height: grupo.length * (ALTO + 4), channels: 3, background: '#0B0B0B',
    },
  }).composite(capas).png().toFile(nombre)
  console.log(`mosaico ${mosaico}:`)
  grupo.forEach((g, n) => console.log(`   fila ${n + 1} · ${g.titulo}  [${g.candidatas.map(c => c.estrategia).join(' | ') || 'sin candidatas'}]`))
}

// ── La hoja para David ────────────────────────────────────
const escapar = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fotos de acción — ${filas.length} gooals</title>
<style>
  :root{--aurora:#00D1A7;--sand:#F5F5F2;--stone:#7A8A85;--panel:#141514;--line:#2A2D2B}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0F1110;color:var(--sand);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;padding:28px 16px 80px}
  .wrap{max-width:1180px;margin:0 auto}
  h1{font-size:21px;font-weight:650;margin-bottom:6px}
  .lead{color:var(--stone);font-size:13.5px;line-height:1.6;max-width:780px;margin-bottom:26px}
  .lead b{color:var(--sand)}
  .gooal{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:16px}
  .cab{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:11px}
  .cab h2{font-size:15px;font-weight:600}
  .cat{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--aurora);
    background:rgba(0,209,167,.12);border:1px solid rgba(0,209,167,.3);border-radius:20px;padding:2px 8px}
  .via{font-size:11px;color:#55605C}
  .tira{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
  .op{border:1px solid var(--line);border-radius:11px;overflow:hidden;background:#0D0F0E;display:flex;flex-direction:column}
  .op img{width:100%;height:150px;object-fit:cover;display:block;background:#000}
  .op .pie{padding:8px 9px;font-size:10.5px;line-height:1.4;color:#8A9793;flex:1}
  .op .pie b{color:var(--sand);font-weight:600;display:block;margin-bottom:2px}
  .op a{color:var(--aurora);text-decoration:none;font-size:10px}
  .ninguna{display:flex;align-items:center;justify-content:center;min-height:150px;
    color:#8A9793;font-size:13px;border:1px dashed var(--line);border-radius:11px;background:#0D0F0E;
    text-align:center;padding:12px;line-height:1.5}
</style></head><body><div class="wrap">
<h1>Fotos para los gooals de acción</h1>
<p class="lead">
  ${filas.length} gooals de <b>deporte, gastronomía y vida</b>, que son los que se han quedado sin foto.
  Cuatro candidatas por gooal, cada una de una <b>estrategia distinta</b> — no cuatro resultados de la
  misma búsqueda. La pregunta no es «¿es del tema?» sino <b>«¿se ve en la foto lo que dice el título?»</b>.
  <br><br>
  <b>«Ninguna» es una respuesta válida</b> y está siempre. Un gooal sin foto simplemente no aparece en
  Descubrir, y eso es mejor que una foto de archivo de alguien haciendo algo que no es.
</p>
${filas.map(g => `
<div class="gooal">
  <div class="cab">
    <h2>${escapar(g.titulo)}</h2>
    <span class="cat">${escapar(g.categoria)}</span>
    <span class="via">artículo: ${escapar(g.articulo ?? '—')}${g.categoria_commons ? ' · carpeta: ' + escapar(g.categoria_commons) : ''}</span>
  </div>
  <div class="tira">
    ${g.candidatas.map(c => `
    <div class="op">
      <img src="${escapar(c.miniatura ?? c.original)}" alt="" loading="lazy">
      <div class="pie">
        <b>${escapar(c.estrategia)}</b>
        ${escapar((c.autor || '—').slice(0, 60))} · ${escapar(c.licencia || '—')}<br>
        <a href="${escapar(c.pagina)}" target="_blank" rel="noopener">ver en Commons</a>
      </div>
    </div>`).join('')}
    <div class="ninguna">Ninguna<br><span style="font-size:10.5px">ninguna enseña lo que dice el título</span></div>
  </div>
</div>`).join('')}
</div></body></html>`

writeFileSync(SALIDA + '/fotos-accion.html', html, 'utf8')
console.log('\nescrito: Claude outputs/fotos-accion.html')
