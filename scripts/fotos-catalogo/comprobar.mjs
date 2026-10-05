// ¿Están de verdad las fotos donde la base dice que están?
//
//   node --env-file=.env.local scripts/fotos-catalogo/comprobar.mjs
//
// SOLO LEE. No escribe en la base ni en el almacén.
//
// ── POR QUÉ ESTE GUION NO SE FÍA DEL OTRO ─────────────────
//
// El guion que sube las fotos termina diciendo "escritas 223 filas". Eso no
// demuestra nada: demuestra que el guion cree que fue bien. Es el mismo error
// que dio un "19 de 20" cuando eran 10, y el que dio una tabla de países
// completa cuando le faltaban 22.
//
// Así que aquí no se mira ni el fichero de elecciones ni lo que dijo el otro
// guion. Se lee gooals_v2, y de cada dirección que haya escrito se PIDE la foto
// a Supabase como la pediría el navegador de cualquiera. Si una no está donde
// dice, sale con su título.
//
// Se piden con HEAD y sin ninguna clave: es exactamente lo que hará el móvil de
// quien abra la app.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// La carpeta de los ficheros intermedios, calculada desde este guion: así no
// lleva escrita dentro la ruta del ordenador de nadie.
const SALIDA = fileURLToPath(new URL('../../Claude outputs', import.meta.url))
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !clave) throw new Error('Faltan las variables. Lánzalo con --env-file=.env.local')
const s = createClient(url, clave, { auth: { persistSession: false } })

// ── Lo que dice la base ───────────────────────────────────
const filas = []
for (let d = 0; ; d += 1000) {
  const { data, error } = await s.from('gooals_v2')
    .select('id, titulo, ciudad, pais, estado, imagen_url, foto_autor, foto_licencia, foto_origen')
    .order('id').range(d, d + 999)
  if (error) throw new Error(error.message)
  filas.push(...data)
  if (data.length < 1000) break
}

const tiene = v => v != null && v !== ''
const conFoto = filas.filter(f => tiene(f.imagen_url))
const conAutor = filas.filter(f => tiene(f.foto_autor))
const conLicencia = filas.filter(f => tiene(f.foto_licencia))
const conOrigen = filas.filter(f => tiene(f.foto_origen))

console.log('SEGÚN LA BASE (' + filas.length + ' filas en gooals_v2):')
console.log('  con imagen_url   :', conFoto.length)
console.log('  con foto_autor   :', conAutor.length)
console.log('  con foto_licencia:', conLicencia.length)
console.log('  con foto_origen  :', conOrigen.length)

// Las cuatro tienen que ir siempre juntas: una foto sin autor no se puede usar,
// y un crédito sin foto es basura.
const aMedias = filas.filter(f => {
  const n = [f.imagen_url, f.foto_autor, f.foto_licencia, f.foto_origen].filter(tiene).length
  return n > 0 && n < 4
})
console.log('\nfilas con las cuatro columnas a medias:', aMedias.length)
for (const f of aMedias.slice(0, 20)) {
  console.log('  · ' + f.titulo + ' → ' + [
    tiene(f.imagen_url) ? 'foto' : 'SIN foto',
    tiene(f.foto_autor) ? 'autor' : 'SIN autor',
    tiene(f.foto_licencia) ? 'licencia' : 'SIN licencia',
    tiene(f.foto_origen) ? 'origen' : 'SIN origen',
  ].join(' · '))
}

// Y que ninguna apunte todavía a Commons: la gracia era tener copia propia.
const aCommons = conFoto.filter(f => !f.imagen_url.startsWith(url + '/storage/v1/object/public/catalogo/'))
console.log('\nfilas que apuntan fuera de nuestro almacén:', aCommons.length)
for (const f of aCommons.slice(0, 10)) console.log('  · ' + f.titulo + ' → ' + f.imagen_url.slice(0, 80))

// ── Pedir cada foto, sin clave, como el navegador de cualquiera ──
console.log('\nPidiendo las ' + conFoto.length + ' fotos a Supabase, sin ninguna clave...')
const rotas = []
const pesos = []
let n = 0
for (const f of conFoto) {
  try {
    const r = await fetch(f.imagen_url, { method: 'HEAD' })
    if (!r.ok) rotas.push({ ...f, motivo: 'responde ' + r.status })
    else {
      const tipo = r.headers.get('content-type')
      const bytes = Number(r.headers.get('content-length') ?? 0)
      if (tipo !== 'image/webp') rotas.push({ ...f, motivo: 'no es una foto webp, es ' + tipo })
      else if (bytes < 2000) rotas.push({ ...f, motivo: 'pesa ' + bytes + ' bytes: está vacía o truncada' })
      else pesos.push(bytes)
    }
  } catch (e) {
    rotas.push({ ...f, motivo: 'no se pudo pedir: ' + e.message })
  }
  if (++n % 50 === 0) console.log('  ' + n + '/' + conFoto.length)
}

console.log('\n── RESULTADO ──')
console.log('fotos que llegan bien:', pesos.length, 'de', conFoto.length)
if (pesos.length) {
  const mb = pesos.reduce((a, b) => a + b, 0) / 1024 / 1024
  console.log('peso total:', mb.toFixed(1), 'MB · media', Math.round(pesos.reduce((a, b) => a + b, 0) / pesos.length / 1024), 'KB')
}
if (rotas.length) {
  console.log('\nROTAS (' + rotas.length + '):')
  for (const r of rotas) console.log('  · ' + r.titulo + ' → ' + r.motivo)
} else {
  console.log('rotas: NINGUNA')
}

// ── La hoja de contacto, desde las direcciones de verdad ──
// Las <img> apuntan a Supabase, no a una copia local: si una no estuviera donde
// la base dice, aquí se vería el hueco.
const esc = t => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const celda = f => `
  <figure>
    <img src="${esc(f.imagen_url)}" alt="${esc(f.titulo)}" loading="lazy"
         onerror="this.closest('figure').classList.add('rota')">
    <figcaption>
      <b>${esc(f.titulo)}</b>
      <span class="sitio">${esc([f.ciudad, f.pais].filter(Boolean).join(', '))}</span>
      <span class="autor">${esc(f.foto_autor).slice(0, 70)}</span>
      <span class="lic">${esc(f.foto_licencia)}</span>
      <a href="${esc(f.foto_origen)}" target="_blank" rel="noreferrer">original en Commons</a>
    </figcaption>
  </figure>`

writeFileSync(`${SALIDA}/fotos-en-produccion.html`, `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Las fotos del catálogo, tal como están en producción</title>
<style>
  :root { color-scheme: dark }
  body { margin:0; padding:24px; background:#0B0B0B; color:#F5F5F2; font:15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif }
  h1 { font-size:20px; margin:0 0 4px }
  p.resumen { color:#A3B1AC; font-size:13px; max-width:78ch; margin:0 0 20px }
  b.si { color:#00D1A7 } b.no { color:#FF5252 }
  #aviso { color:#FF5252; font-size:13px; margin:0 0 16px }
  .rejilla { display:grid; gap:16px; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)) }
  figure { margin:0; background:#161817; border:1px solid #2A2E2C; border-radius:14px; overflow:hidden; display:flex; flex-direction:column }
  figure.rota { border-color:#FF5252 }
  figure.rota::before { content:'ESTA FOTO NO CARGA'; color:#FF5252; font-size:12px; padding:8px 10px }
  img { width:100%; aspect-ratio:4/3; object-fit:cover; display:block; background:#1E2120 }
  figcaption { padding:9px 11px 11px; display:flex; flex-direction:column; gap:2px; font-size:11px }
  figcaption b { font-size:13px; color:#fff; line-height:1.25 }
  .sitio { color:#7A8A85 } .autor { color:#A3B1AC } .lic { color:#00D1A7 }
  a { color:#7A8A85; font-size:11px }
</style></head>
<body>
<h1>Las fotos del catálogo, leídas de la base</h1>
<p class="resumen">
  <b class="si">${conFoto.length}</b> gooals con foto, según <b>gooals_v2</b>, no según ningún guion.
  Cada imagen se pide a Supabase con su dirección real: si una no estuviera donde la base dice,
  su recuadro saldría en rojo. Al pedirlas una a una desde fuera, rotas: <b class="${rotas.length ? 'no' : 'si'}">${rotas.length}</b>.
  Generado el ${new Date().toLocaleString('es-ES')}.
</p>
<p id="aviso"></p>
<div class="rejilla">${conFoto.map(celda).join('')}</div>
<script>
// Segundo par de ojos: el navegador también dice cuáles no cargan.
window.addEventListener('load', () => {
  setTimeout(() => {
    const rotas = [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0)
    rotas.forEach(i => i.closest('figure').classList.add('rota'))
    document.getElementById('aviso').textContent = rotas.length
      ? rotas.length + ' fotos no han cargado en el navegador: ' + rotas.map(i => i.alt).join(' · ')
      : ''
  }, 4000)
})
</script>
</body></html>`, 'utf8')

console.log('\nHOJA: Claude outputs/fotos-en-produccion.html')
process.exitCode = (rotas.length || aMedias.length || aCommons.length) ? 1 : 0
