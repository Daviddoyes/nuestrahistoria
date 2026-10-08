// La rejilla para mirar los tres estilos de una vez.
//
//   node scripts/fotos-ia/hoja.mjs
//
// SOLO LEE lo que dejó probar-estilos.mjs. No llama a ninguna API ni cuesta
// nada: se puede lanzar las veces que haga falta.
//
// ── CÓMO ESTÁ MONTADA Y POR QUÉ ───────────────────────────
//
// Una fila por gooal y tres columnas, una por estilo, para poder recorrer una
// fila con el ojo y ver qué estilo aguanta ESE caso. Dentro de cada celda, las
// DOS vueltas pegadas: si se parecen, el estilo sirve para 260; si no, no, por
// bonita que sea cualquiera de las dos.
//
// El prompt va debajo de cada celda, plegado. Es largo y taparía las imágenes,
// pero tiene que estar: una foto que no gusta se retoca cambiando el prompt, y
// sin verlo no se sabe qué tocar.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { ESTILOS } from './estilos.mjs'

// Cada ronda vive en su carpeta: --carpeta=ronda2-A, --carpeta=abstractos-B...
// Así una ronda nueva no tapa a la anterior y se pueden comparar.
const arg = (n, d) => {
  const a = process.argv.find(x => x.startsWith('--' + n + '='))
  return a ? a.slice(n.length + 3) : d
}
const CARPETA_NOMBRE = arg('carpeta', 'fotos-ia')
const SALIDA = fileURLToPath(new URL('../../Claude outputs/' + CARPETA_NOMBRE, import.meta.url))
if (!existsSync(SALIDA + '/resumen.json')) {
  throw new Error('no hay nada que enseñar. Lanza antes: node --env-file=.env.local scripts/fotos-ia/probar-estilos.mjs')
}
const resumen = JSON.parse(readFileSync(SALIDA + '/resumen.json', 'utf8'))

// La hoja vive en "Claude outputs/" y las imágenes en "Claude outputs/fotos-ia/",
// así que las direcciones llevan la subcarpeta delante. Se referencian por ruta
// y no incrustadas en base64: son 48 imágenes de ~2,5 MB y el fichero pesaría
// 120 MB, que no lo abre ningún navegador con gusto.
const CARPETA = CARPETA_NOMBRE + '/'
const hay = new Set(readdirSync(SALIDA).filter(n => n.endsWith('.png')))

const esc = t => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const buscar = (gooal, estilo, vuelta) => {
  const h = resumen.hechos.find(x => x.gooal === gooal && x.estilo === estilo && x.vuelta === vuelta)
  return h || null
}

const celda = (gooal, estilo) => {
  const dos = [1, 2].map(v => buscar(gooal.titulo, estilo, v))
  const promptDe = dos.map(h => h && existsSync(SALIDA + '/' + h.nombre + '.txt')
    ? readFileSync(SALIDA + '/' + h.nombre + '.txt', 'utf8') : null).find(Boolean)

  const imagenes = dos.map((h, i) => {
    if (!h) return '<div class="hueco">no se generó</div>'
    if (h.error) return '<div class="hueco fallo">' + esc(h.error) + '</div>'
    if (!hay.has(h.nombre + '.png')) return '<div class="hueco fallo">falta el fichero</div>'
    return '<figure><img src="' + CARPETA + esc(h.nombre) + '.png" alt="" loading="lazy">' +
           '<figcaption>vuelta ' + (i + 1) + '</figcaption></figure>'
  }).join('')

  return '<td>' +
    '<div class="par">' + imagenes + '</div>' +
    (promptDe ? '<details><summary>el prompt</summary><pre>' + esc(promptDe) + '</pre></details>' : '') +
    '</td>'
}

const filas = resumen.gooals.map(g =>
  '<tr>' +
  '<th scope="row"><span class="caso">' + esc(g.caso) + '</span>' +
  '<b>' + esc(g.titulo) + '</b>' +
  '<span class="meta">' + esc(g.categoria) + ' · ' + esc(g.ambito) +
  (g.ciudad ? ' · ' + esc(g.ciudad) : '') + '</span>' +
  '<span class="meta">encuadre: ' + esc(g.encuadre || '—') +
    (g.escenaFija ? ' · escena fija' : '') + '</span>' +
  (g.yaTeniaFoto ? '<span class="meta aviso">ya tiene foto de Commons</span>' : '') +
  '</th>' +
  COLUMNAS.map(e => celda(g, e)).join('') +
  '</tr>').join('')

// Solo las columnas de los estilos que se hayan generado en esta ronda.
const COLUMNAS = resumen.estilos || ['A', 'B', 'C']
const cabecera = COLUMNAS.map(e =>
  '<th scope="col"><b>' + e + ' · ' + esc(ESTILOS[e].nombre) + '</b>' +
  '<span class="meta">' + esc(ESTILOS[e].resumen) + '</span></th>').join('')

const fallos = resumen.hechos.filter(h => h.error).length

// El título sale de la ronda y no está escrito a mano: una hoja de un solo
// estilo que se titulara "tres estilos" sería una razón caducada el mismo día.
const TITULO = COLUMNAS.length === 1
  ? 'Estilo ' + COLUMNAS[0] + ' · ' + (resumen.grupo === 'abstractos' ? 'los gooals abstractos' : 'los ocho casos')
  : COLUMNAS.length + ' estilos para las fotos del catálogo'

writeFileSync(SALIDA + '/../' + CARPETA_NOMBRE + '.html', `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(TITULO)}</title>
<style>
  :root { color-scheme: dark }
  body { margin:0; padding:24px; background:#0B0B0B; color:#F5F5F2;
         font:15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif }
  h1 { font-size:22px; margin:0 0 6px }
  p.intro { color:#A3B1AC; font-size:14px; max-width:80ch; margin:0 0 8px }
  table { border-collapse:separate; border-spacing:14px; width:100%; table-layout:fixed }
  th[scope=col] { text-align:left; vertical-align:bottom; padding:0 0 4px }
  th[scope=row] { width:16%; text-align:left; vertical-align:top; padding-top:4px }
  th b { display:block; font-size:15px; color:#fff; margin-bottom:3px }
  .caso { display:block; font-size:11px; color:#00D1A7; margin-bottom:4px; font-weight:600 }
  .meta { display:block; font-size:11px; color:#7A8A85 }
  .meta.aviso { color:#C7A04A; margin-top:3px }
  td { vertical-align:top; padding:0 }
  .par { display:grid; grid-template-columns:1fr 1fr; gap:6px }
  figure { margin:0 }
  img { width:100%; aspect-ratio:1024/1536; object-fit:cover; display:block;
        border-radius:10px; background:#1E2120; border:1px solid #2A2E2C }
  figcaption { font-size:10px; color:#7A8A85; padding:3px 0 0 2px }
  .hueco { aspect-ratio:1024/1536; border-radius:10px; background:#161817;
           border:1px dashed #2A2E2C; display:grid; place-items:center;
           font-size:11px; color:#7A8A85; padding:8px; text-align:center }
  .hueco.fallo { border-color:#FF5252; color:#FF5252 }
  details { margin-top:7px }
  summary { font-size:11px; color:#7A8A85; cursor:pointer }
  pre { white-space:pre-wrap; font:11px/1.45 ui-monospace, "Cascadia Code", monospace;
        color:#A3B1AC; background:#111312; border:1px solid #2A2E2C; border-radius:8px;
        padding:9px; margin:5px 0 0 }
  .pie { color:#7A8A85; font-size:12px; margin-top:22px; max-width:80ch }
</style></head>
<body>
<h1>${esc(TITULO)}</h1>
<p class="intro">
  ${resumen.gooals.length} gooals del catálogo real${resumen.grupo === 'abstractos' ? ', de los que no tienen nada que fotografiar' : ', uno por cada caso que rompe un estilo'}, en ${COLUMNAS.length === 1 ? 'un solo estilo' : COLUMNAS.length + ' direcciones distintas'}.
  <b>Las dos imágenes de cada celda son el MISMO prompt lanzado dos veces</b>: si no se parecen,
  ese estilo no vale para 260 fotos por bonita que sea una de las dos.
</p>
<p class="intro">
  ${esc(resumen.modelo)} · ${esc(resumen.tamano)} · calidad ${esc(resumen.calidad)} ·
  mismos ajustes en los tres, lo único que cambia es el bloque de estilo ·
  coste de esta tanda <b>$${resumen.coste.toFixed(2)}</b>${fallos ? ' · <b style="color:#FF5252">' + fallos + ' fallaron</b>' : ''}
</p>
<table>
  <thead><tr><th></th>${cabecera}</tr></thead>
  <tbody>${filas}</tbody>
</table>
<p class="pie">
  El prompt de cada celda está plegado debajo. No se escribió a mano: lo arma
  <code>scripts/fotos-ia/estilos.mjs</code> con los campos de la fila del gooal (título, categoría,
  ámbito y lugar) más el bloque del estilo. Cambiar una línea ahí cambia las 260 a la vez.
</p>
</body></html>`, 'utf8')

console.log('escrito: Claude outputs/estilos-ia.html')
console.log('  ' + resumen.gooals.length + ' gooals x 3 estilos x 2 vueltas')
if (fallos) console.log('  ' + fallos + ' imágenes fallaron y salen marcadas en rojo')
