// LA HOJA DE CONTACTO PARA DECIDIR FOTOS.
//
//   npm run hoja -- A     gooals SIN foto hoy, con imagen generada
//   npm run hoja -- B     gooals con foto de IA y otra versión generada
//   npm run hoja -- C     gooals con foto de Commons y una generada
//
// Deja el fichero en `Claude outputs/hoja-X.html`. Se abre con el navegador y
// no necesita servidor ni nada: es un HTML suelto.
//
// ── SE DECIDE TOCANDO, Y LA HOJA ESCRIBE EL RESULTADO ─────
//
// La primera versión solo enseñaba las fotos, y entonces había que DECIR cuáles
// valen — con cuatro versiones del mismo título, eso es un lío de nombres en el
// que alguien se equivoca seguro.
//
// Ahora se toca una foto y queda elegida; abajo del todo hay una caja con el
// resultado en texto y un botón de copiar. Y el resultado dice **el fichero y
// el gooal**, nunca un número de orden: un número depende de que la hoja se
// vuelva a generar igual, y el fichero no.
//
// ── TRES RESPUESTAS, NO DOS ───────────────────────────────
//
// Por cada gooal: una de las candidatas, «se queda la que está» (en B y C) o
// NINGUNA. Y lo que no se toca sale como «sin decidir», que es distinto de
// «ninguna» — la misma diferencia que faltaba en el registro y por la que no se
// podía contar cuánto quedaba.
//
// ── A QUÉ TAMAÑO SE VEN ───────────────────────────────────
//
// A 179 px, que es lo que mide una tarjeta en un móvil de 390: la pregunta es
// «¿se entiende de qué gooal es EN UNA TARJETA?». Pero cada foto tiene una lupa
// que la abre entera, porque la lección contraria también está pagada: una foto
// buena mal leída en miniatura es un falso negativo.
import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const grupo = (process.argv[2] ?? 'A').toUpperCase()
const todas = process.argv.includes('--todas')
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

// ── LO YA RECHAZADO NO VUELVE A SALIR ─────────────────────
//
// Para eso está el registro de tres estados: una hoja que vuelve a enseñar lo
// que alguien ya descartó hace que mirarla otra vez no sirva de nada, y es la
// manera más segura de que nadie la abra una segunda vez.
//
// Con `--rechazadas` salen igualmente, por si hay que revisar un descarte.
const verRechazadas = process.argv.includes('--rechazadas')
let escondidasPorRechazo = 0

const porGooal = new Map()
for (const [fichero, info] of Object.entries(registro)) {
  if (!info.titulo) continue
  if (info.estado === 'rechazada' && !verRechazadas) { escondidasPorRechazo++; continue }
  if (!porGooal.has(info.titulo)) porGooal.set(info.titulo, [])
  porGooal.get(info.titulo).push({ fichero, ...info })
}

const PINTA = {
  A: {
    titulo: 'A · Gooals SIN foto, con imagen generada',
    explica: 'No hay nada que comparar: o vale o no vale. Si vale, el gooal gana una foto donde hoy no tiene ninguna.',
    filtra: g => !g.imagen_url,
    conLaQueEsta: false,
  },
  B: {
    titulo: 'B · Gooals con foto de IA y otra versión generada',
    explica: 'A la izquierda, la que está en la app. EN CASO DE DUDA GANA LA QUE YA ESTÁ: cambiar una que funciona por otra que no sabemos si es mejor es como se perdieron cinco buenas.',
    filtra: g => g.imagen_url && g.foto_fuente === 'ia',
    conLaQueEsta: true,
  },
  C: {
    titulo: 'C · Gooals con foto de Commons y una generada',
    explica: 'Si gana la de IA desaparece el crédito del autor y hay que tocar los campos de la fuente. No es solo elegir foto.',
    filtra: g => g.imagen_url && g.foto_fuente === 'commons',
    conLaQueEsta: true,
  },
}[grupo]

const filas = []
for (const [titulo, imgs] of porGooal) {
  const g = enLaApp.get(titulo)
  if (!g) continue

  // ── LA QUE ESTÁ SUBIDA Y NO ESTÁ EN LA APP ──────────────
  //
  // Una foto puede estar en el cubo y su gooal salir SIN FOTO, porque subir y
  // escribir la fila son dos pasos y el segundo puede no haberse hecho. Le
  // pasó a «Flotar en el mar Muerto».
  //
  // Esa no se puede esconder como «ya puesta» —que es lo que hace la hoja con
  // la elegida— porque entonces nadie la mira nunca: se le enseñarían las
  // otras versiones y la buena se quedaría invisible para siempre. Así que
  // entra en la hoja B como una candidata más, diciendo lo que le pasa.
  const declarada = definitivas[titulo]?.fichero?.split('\\').join('/') ?? null
  const subidaSinFila = Boolean(definitivas[titulo]?.subida_como) && !g.imagen_url

  if (!subidaSinFila && !PINTA.filtra(g)) continue
  if (subidaSinFila && grupo !== 'B') continue

  // ── POR DEFECTO, SOLO LO QUE YA PASÓ POR UN OJO ─────────
  //
  // Sin esto la hoja B salen 96 gooals y 243 imágenes, porque entran también
  // las versiones que nadie ha mirado nunca. Eso no es una hoja de decidir, es
  // una tanda entera — y la hoja existe para despachar lo que ya está hecho.
  //
  // Con `--todas` salen las demás, que son una sesión distinta y más larga.
  //
  // NO se aplica a la A, y por poco se aplica: la A son gooals que hoy salen
  // SIN NINGUNA FOTO, y ahí cualquier imagen generada merece una mirada aunque
  // nadie la haya aprobado nunca. Al ponerlo para todos, la hoja A pasó de 20
  // gooals a 7 sin decir una palabra.
  if (grupo !== 'A' && !todas && !APROBADAS.has(titulo) && !subidaSinFila) continue

  const candidatas = imgs.filter(i => i.fichero !== declarada || subidaSinFila)
  if (candidatas.length === 0) continue
  filas.push({
    titulo, gooal: g, candidatas, aprobada: APROBADAS.has(titulo),
    subidaSinFila: subidaSinFila ? declarada : null,
  })
}
filas.sort((a, b) => a.titulo.localeCompare(b.titulo))

const esc = t => String(t ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
// El HTML vive en `Claude outputs/`, así que para llegar a un fichero de ahí
// dentro hay que subir uno y volver a entrar.
const ruta = f => '../' + f.split('/').map(encodeURIComponent).join('/')
const json = o => JSON.stringify(o).replace(/</g, '\\u003c')

const opcionesDe = f => [
  ...(PINTA.conLaQueEsta ? [{ valor: 'QUEDA_LA_QUE_ESTA', etiqueta: 'LA QUE ESTÁ EN LA APP', sub: f.gooal.foto_fuente, src: f.gooal.imagen_url, esLaQueEsta: true }] : []),
  ...f.candidatas.map(c => ({
    valor: c.fichero,
    etiqueta: (c.fichero === f.subidaSinFila ? 'YA SUBIDA · falta la fila · ' : '') + c.tanda.replace('Claude outputs/', ''),
    sub: [c.encuadre, c.kb + ' KB'].filter(Boolean).join(' · '),
    src: ruta(c.fichero),
  })),
]

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(PINTA.titulo)}</title>
<style>
  :root { --verde:#00D1A7 }
  body { background:#0B0B0B; color:#fff; font:15px/1.5 system-ui,sans-serif; margin:0; padding:24px 20px 300px }
  h1 { font-size:21px; margin:0 0 6px }
  .pie { color:#7A8A85; font-size:14px; margin:0 0 4px; max-width:72ch }
  .cuenta { color:var(--verde); font-weight:600; margin:14px 0 24px }
  .gooal { border-top:1px solid #2A2E2C; padding:18px 0 }
  .gooal[data-decidido="si"] { opacity:.55 }
  .cab { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:10px }
  .n { color:#7A8A85; font-variant-numeric:tabular-nums; min-width:2.4em }
  .t { font-weight:650; font-size:16px }
  .meta { color:#7A8A85; font-size:13px }
  .et { font-size:11px; text-transform:uppercase; letter-spacing:.07em; border-radius:999px; padding:3px 9px; background:rgba(0,209,167,.14); color:var(--verde) }
  .tiras { display:flex; gap:14px; flex-wrap:wrap; align-items:flex-start }
  figure { margin:0; position:relative; width:179px }
  figure img { width:179px; height:179px; object-fit:cover; border-radius:14px; display:block; background:#1E2120; cursor:pointer;
               border:3px solid transparent; box-sizing:border-box }
  figure[data-elegida="si"] img { border-color:var(--verde) }
  figure[data-elegida="si"]::after { content:'ELEGIDA'; position:absolute; top:8px; left:8px; background:var(--verde); color:#0B0B0B;
               font-size:10px; font-weight:700; letter-spacing:.06em; padding:3px 7px; border-radius:999px }
  .lupa { position:absolute; top:6px; right:6px; width:30px; height:30px; border-radius:999px; border:0;
          background:rgba(0,0,0,.6); color:#fff; font-size:15px; cursor:zoom-in; line-height:30px; padding:0 }
  figcaption { color:#7A8A85; font-size:11px; margin-top:5px }
  .laQueEsta figcaption strong { color:#fff }
  .ninguna { align-self:center; background:transparent; border:1px solid #2A2E2C; color:#7A8A85;
             border-radius:12px; padding:10px 14px; font-size:13px; cursor:pointer; min-height:44px }
  .ninguna[aria-pressed="true"] { border-color:#FF6B4A; color:#FF6B4A }
  dialog { border:0; background:#0B0B0B; padding:0; max-width:96vw; max-height:96vh }
  dialog img { max-width:92vw; max-height:86vh; display:block }
  dialog p { color:#7A8A85; font-size:13px; margin:8px 10px 14px }
  .caja { position:fixed; left:0; right:0; bottom:0; background:#161817; border-top:1px solid var(--verde); padding:12px 16px 16px }
  .caja h2 { font-size:14px; margin:0 0 8px; color:var(--verde) }
  .caja textarea { width:100%; height:120px; background:#0B0B0B; color:#fff; border:1px solid #2A2E2C;
                   border-radius:10px; padding:10px; font:12px/1.45 ui-monospace,monospace; resize:vertical }
  .caja .botones { display:flex; gap:10px; align-items:center; margin-top:8px; flex-wrap:wrap }
  button.accion { background:var(--verde); color:#0B0B0B; border:0; border-radius:10px; padding:10px 16px;
                  font-size:14px; font-weight:650; cursor:pointer; min-height:44px }
  button.suave { background:transparent; color:#7A8A85; border:1px solid #2A2E2C }
  .aviso { color:#7A8A85; font-size:12px }
</style></head><body>

<h1>${esc(PINTA.titulo)}</h1>
<p class="pie">${esc(PINTA.explica)}</p>
<p class="pie">Se ven a <strong>179&nbsp;px</strong>, el tamaño real de una tarjeta. <strong>Toca una para elegirla</strong>; la lupa de la esquina la abre entera antes de descartarla.</p>
<p class="cuenta" id="cuenta"></p>

${filas.map((f, i) => `
<div class="gooal" data-gooal="${esc(f.titulo)}" data-decidido="no">
  <div class="cab">
    <span class="n">${i + 1}.</span>
    <span class="t">${esc(f.titulo)}</span>
    <span class="meta">${esc(f.gooal.categoria)}${f.gooal.ciudad ? ' &middot; ' + esc([f.gooal.ciudad, f.gooal.pais].filter(Boolean).join(', ')) : ''}</span>
    ${f.aprobada ? '<span class="et">su título está en APROBADAS</span>' : ''}
  </div>
  <div class="tiras">
    ${opcionesDe(f).map(o => `
    <figure data-elegida="no" data-valor="${esc(o.valor)}"${o.esLaQueEsta ? ' class="laQueEsta"' : ''}>
      <img src="${esc(o.src)}" alt="" loading="lazy">
      <button class="lupa" title="Verla entera" data-src="${esc(o.src)}" data-pie="${esc(o.esLaQueEsta ? 'La que está en la app' : o.valor)}">&#128269;</button>
      <figcaption>${o.esLaQueEsta ? '<strong>LA QUE ESTÁ EN LA APP</strong><br>' : ''}${esc(o.etiqueta)}${o.sub ? '<br>' + esc(o.sub) : ''}</figcaption>
    </figure>`).join('')}
    <button class="ninguna" aria-pressed="false">Ninguna vale</button>
  </div>
</div>`).join('')}

<dialog id="lupa"><img id="lupaImg" alt=""><p id="lupaPie"></p></dialog>

<div class="caja">
  <h2>El resultado — cópialo y pégaselo a Claude</h2>
  <textarea id="salida" readonly></textarea>
  <div class="botones">
    <button class="accion" id="copiar">Copiar</button>
    <button class="accion suave" id="limpiar">Empezar de cero</button>
    <span class="aviso" id="aviso">Se guarda solo: puedes cerrar y volver.</span>
  </div>
</div>

<script>
(function () {
  var GRUPO = ${json(grupo)}
  var CLAVE = 'hoja-' + GRUPO
  var decisiones = {}
  try { decisiones = JSON.parse(localStorage.getItem(CLAVE) || '{}') } catch (e) { decisiones = {} }

  var bloques = Array.prototype.slice.call(document.querySelectorAll('.gooal'))

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(decisiones)) } catch (e) { /* modo privado */ }
  }

  function pintar() {
    var decididos = 0
    var lineas = []
    bloques.forEach(function (b) {
      var titulo = b.getAttribute('data-gooal')
      var elegido = decisiones[titulo]
      b.setAttribute('data-decidido', elegido ? 'si' : 'no')
      Array.prototype.forEach.call(b.querySelectorAll('figure'), function (fig) {
        fig.setAttribute('data-elegida', fig.getAttribute('data-valor') === elegido ? 'si' : 'no')
      })
      var nin = b.querySelector('.ninguna')
      nin.setAttribute('aria-pressed', elegido === 'NINGUNA' ? 'true' : 'false')
      if (!elegido) return
      decididos++
      var dice = elegido === 'NINGUNA' ? 'NINGUNA'
        : elegido === 'QUEDA_LA_QUE_ESTA' ? 'SE QUEDA LA QUE ESTÁ'
        : elegido
      lineas.push(titulo + '  ->  ' + dice)
    })
    document.getElementById('cuenta').textContent =
      decididos + ' de ' + bloques.length + ' decididos · quedan ' + (bloques.length - decididos)
    document.getElementById('salida').value =
      lineas.length === 0 ? '' : ('HOJA ' + GRUPO + ' · ' + decididos + ' de ' + bloques.length + '\\n' + lineas.join('\\n'))
  }

  function elegir(titulo, valor) {
    if (decisiones[titulo] === valor) delete decisiones[titulo]   // volver a tocar lo desmarca
    else decisiones[titulo] = valor
    guardar(); pintar()
  }

  bloques.forEach(function (b) {
    var titulo = b.getAttribute('data-gooal')
    Array.prototype.forEach.call(b.querySelectorAll('figure'), function (fig) {
      fig.querySelector('img').addEventListener('click', function () {
        elegir(titulo, fig.getAttribute('data-valor'))
      })
    })
    b.querySelector('.ninguna').addEventListener('click', function () { elegir(titulo, 'NINGUNA') })
  })

  Array.prototype.forEach.call(document.querySelectorAll('.lupa'), function (bt) {
    bt.addEventListener('click', function (e) {
      e.stopPropagation()
      document.getElementById('lupaImg').src = bt.getAttribute('data-src')
      document.getElementById('lupaPie').textContent = bt.getAttribute('data-pie')
      document.getElementById('lupa').showModal()
    })
  })
  document.getElementById('lupa').addEventListener('click', function () { this.close() })

  document.getElementById('copiar').addEventListener('click', function () {
    var ta = document.getElementById('salida')
    var aviso = document.getElementById('aviso')
    // Se intenta el portapapeles moderno y, si no deja —un fichero abierto
    // desde el disco a veces no—, se selecciona el texto para copiarlo a mano.
    // Lo que no puede pasar es que el botón no haga nada.
    function aMano() {
      ta.removeAttribute('readonly'); ta.select(); ta.setSelectionRange(0, 99999)
      var ok = false
      try { ok = document.execCommand('copy') } catch (e) { ok = false }
      ta.setAttribute('readonly', 'readonly')
      aviso.textContent = ok ? 'Copiado.' : 'No he podido copiarlo: está seleccionado, cópialo con Ctrl+C.'
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value).then(function () { aviso.textContent = 'Copiado.' }, aMano)
    } else aMano()
  })

  document.getElementById('limpiar').addEventListener('click', function () {
    if (!confirm('¿Borrar todo lo que has decidido en esta hoja?')) return
    decisiones = {}; guardar(); pintar()
    document.getElementById('aviso').textContent = 'Borrado.'
  })

  pintar()
})()
</script>
</body></html>`

const destino = `Claude outputs/hoja-${grupo}.html`
writeFileSync(destino, html, 'utf8')
console.log(PINTA.titulo)
console.log('  gooals: ' + filas.length + '   imágenes que mirar: ' + filas.reduce((a, f) => a + f.candidatas.length, 0))
console.log('  con el título en APROBADAS: ' + filas.filter(f => f.aprobada).length)
if (escondidasPorRechazo) console.log('  (y ' + escondidasPorRechazo + ' que ya estaban rechazadas, que no se vuelven a enseñar)')
console.log('\nescrita: ' + destino + '   (' + Math.round(statSync(destino).size / 1024) + ' KB)')
