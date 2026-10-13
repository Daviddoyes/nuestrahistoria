// LA HOJA DE CONTACTO PARA DECIDIR FOTOS.
//
//   npm run hoja -- A     gooals SIN foto hoy, con imagen generada
//   npm run hoja -- B     gooals con foto de IA y otra versión generada
//   npm run hoja -- C     gooals con foto de Commons y una generada
//
// Abre el fichero que deja en `Claude outputs/` con el navegador.
//
// ── A QUÉ TAMAÑO SE VEN ───────────────────────────────────
//
// A 179 px, que es lo que mide una tarjeta en la rejilla de un móvil de 390.
// La pregunta que hay que contestar es «¿se entiende de qué gooal es EN UNA
// TARJETA?», así que se mira al tamaño de la tarjeta y no en grande — mirarla
// grande contesta otra pregunta.
//
// Pero tocarla la abre a tamaño completo, porque la lección contraria también
// está pagada: «mírala GRANDE antes de condenar». Una foto buena mal leída en
// miniatura es un falso negativo, y regenerarla destruye trabajo bueno.
//
// ── POR QUÉ SALEN TODAS LAS VERSIONES DE CADA GOOAL ───────
//
// Porque `APROBADAS` aprueba un TÍTULO y de varios hay cuatro versiones en
// cuatro tandas. La hoja no decide cuál: las pone juntas y decide quien mira.
import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const grupo = (process.argv[2] ?? 'A').toUpperCase()
if (!['A', 'B', 'C'].includes(grupo)) {
  console.error('Dime qué hoja: A, B o C.')
  process.exit(1)
}

const registro = JSON.parse(readFileSync('scripts/fotos-generadas.json', 'utf8')).imagenes
const definitivas = JSON.parse(readFileSync('scripts/fotos-definitivas.json', 'utf8')).gooals
const { APROBADAS } = await import('./fotos-ia/decisiones.mjs')

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await s.from('gooals_v2')
  .select('titulo, imagen_url, foto_fuente, categoria, ciudad, pais').eq('estado', 'verificado')
if (error) throw new Error(error.message)
const enLaApp = new Map(data.map(g => [g.titulo, g]))

/** Las imágenes generadas de cada gooal, agrupadas. */
const porGooal = new Map()
for (const [fichero, info] of Object.entries(registro)) {
  if (!info.titulo) continue
  if (!porGooal.has(info.titulo)) porGooal.set(info.titulo, [])
  porGooal.get(info.titulo).push({ fichero, ...info })
}

const PINTA = {
  A: { titulo: 'A · Gooals SIN foto, con imagen generada',
       explica: 'No hay nada que comparar: o vale o no vale. Si vale, el gooal gana una foto donde hoy no tiene ninguna.',
       filtra: g => !g.imagen_url },
  B: { titulo: 'B · Gooals con foto de IA y otra versión generada',
       explica: 'A la izquierda la que está en la app. EN CASO DE DUDA GANA LA QUE YA ESTÁ: cambiar una que funciona por una que no sabemos si es mejor es como se perdieron cinco buenas.',
       filtra: g => g.imagen_url && g.foto_fuente === 'ia' },
  C: { titulo: 'C · Gooals con foto de Commons y una generada',
       explica: 'Si gana la de IA, desaparece el crédito del autor y hay que tocar los campos de la fuente. No es solo elegir foto.',
       filtra: g => g.imagen_url && g.foto_fuente === 'commons' },
}[grupo]

const filas = []
for (const [titulo, imgs] of porGooal) {
  const g = enLaApp.get(titulo)
  if (!g || !PINTA.filtra(g)) continue
  // En B y C, la que ya está puesta no se repite entre las candidatas.
  const puesta = definitivas[titulo]?.fichero?.split('\\').join('/') ?? null
  const candidatas = imgs.filter(i => i.fichero !== puesta)
  if (candidatas.length === 0) continue
  filas.push({ titulo, gooal: g, candidatas, aprobada: APROBADAS.has(titulo) })
}
filas.sort((a, b) => a.titulo.localeCompare(b.titulo))

const esc = t => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const ruta = f => '../' + f.split('/').map(encodeURIComponent).join('/')

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>${esc(PINTA.titulo)}</title>
<style>
  body { background:#0B0B0B; color:#fff; font:15px/1.5 system-ui,sans-serif; margin:0; padding:24px 20px 80px }
  h1 { font-size:21px; margin:0 0 6px }
  .pie { color:#7A8A85; font-size:14px; margin:0 0 4px; max-width:70ch }
  .cuenta { color:#00D1A7; font-weight:600; margin:14px 0 24px }
  .gooal { border-top:1px solid #2A2E2C; padding:18px 0 }
  .cab { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:10px }
  .n { color:#7A8A85; font-variant-numeric:tabular-nums; min-width:2.4em }
  .t { font-weight:650; font-size:16px }
  .meta { color:#7A8A85; font-size:13px }
  .et { font-size:11px; text-transform:uppercase; letter-spacing:.07em; border-radius:999px; padding:3px 9px; background:rgba(0,209,167,.14); color:#00D1A7 }
  .tiras { display:flex; gap:14px; flex-wrap:wrap }
  figure { margin:0 }
  /* 179 px: lo que mide una tarjeta en un móvil de 390. */
  figure img { width:179px; height:179px; object-fit:cover; border-radius:14px; display:block; background:#1E2120; cursor:zoom-in }
  figcaption { color:#7A8A85; font-size:11px; margin-top:5px; max-width:179px }
  dialog { border:0; background:#0B0B0B; padding:0; max-width:96vw; max-height:96vh }
  dialog img { max-width:92vw; max-height:88vh; display:block }
  dialog p { color:#7A8A85; font-size:13px; margin:8px 10px 14px }
</style></head><body>
<h1>${esc(PINTA.titulo)}</h1>
<p class="pie">${esc(PINTA.explica)}</p>
<p class="pie">Se ven a <strong>179&nbsp;px</strong>, que es el tamaño real de una tarjeta en un móvil. <strong>Toca una para verla grande</strong> antes de descartarla.</p>
<p class="cuenta">${filas.length} gooals &middot; ${filas.reduce((a, f) => a + f.candidatas.length, 0)} imágenes que mirar</p>
${filas.map((f, i) => `
<div class="gooal">
  <div class="cab">
    <span class="n">${i + 1}.</span>
    <span class="t">${esc(f.titulo)}</span>
    <span class="meta">${esc(f.gooal.categoria)}${f.gooal.ciudad ? ' &middot; ' + esc([f.gooal.ciudad, f.gooal.pais].filter(Boolean).join(', ')) : ''}</span>
    ${f.aprobada ? '<span class="et">su título está en APROBADAS</span>' : ''}
  </div>
  <div class="tiras">
    ${grupo !== 'A' && f.gooal.imagen_url ? `
    <figure>
      <img src="${esc(f.gooal.imagen_url)}" alt="" onclick="ver(this.src,'La que está en la app')">
      <figcaption><strong>LA QUE ESTÁ EN LA APP</strong><br>${esc(f.gooal.foto_fuente)}</figcaption>
    </figure>` : ''}
    ${f.candidatas.map(c => `
    <figure>
      <img src="${esc(ruta(c.fichero))}" alt="" onclick="ver(this.src,${esc(JSON.stringify(c.fichero))})">
      <figcaption>${esc(c.tanda.replace('Claude outputs/', ''))}${c.encuadre ? '<br>' + esc(c.encuadre) : ''}<br>${c.kb} KB</figcaption>
    </figure>`).join('')}
  </div>
</div>`).join('')}
<dialog id="lupa" onclick="this.close()"><img id="lupaImg" alt=""><p id="lupaPie"></p></dialog>
<script>
  function ver(src, pie) {
    document.getElementById('lupaImg').src = src
    document.getElementById('lupaPie').textContent = pie
    document.getElementById('lupa').showModal()
  }
</script>
</body></html>`

const destino = `Claude outputs/hoja-${grupo}.html`
writeFileSync(destino, html, 'utf8')
console.log(PINTA.titulo)
console.log('  gooals: ' + filas.length + '   imágenes: ' + filas.reduce((a, f) => a + f.candidatas.length, 0))
console.log('  con el título en APROBADAS: ' + filas.filter(f => f.aprobada).length)
console.log('\nescrita: ' + destino + '   (' + Math.round(statSync(destino).size / 1024) + ' KB)')
