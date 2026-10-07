// ¿La foto está HECHA en el país que dice el gooal?
//
//   node --env-file=.env.local scripts/fotos-catalogo/coordenadas.mjs
//
// El nombre del fichero es una pista (ver sospechosas.mjs); las coordenadas son
// un hecho. Muchas fotos de Commons traen el sitio donde se tomaron, y eso se
// puede cruzar con el país del gooal sin interpretar nada.
//
// NO ARREGLA NADA. Escribe una lista para que la mire una persona.
//
// ── LAS TRES RESPUESTAS, Y LA TERCERA IMPORTA ─────────────
//
// Cada foto acaba en uno de tres montones:
//
//   CUADRA              las coordenadas caen en el país que dice el gooal
//   NO CUADRA           caen en otro país  ->  a la lista
//   NO SE PUDO MIRAR    no hay coordenadas, o el país no está en la tabla ISO,
//                       o el servicio no contestó
//
// El tercero se cuenta y se dice en voz alta. Una comprobación que solo cubre
// parte de los datos y presenta el resto como "todo bien" es peor que no
// tenerla: sin ella uno desconfía y mira; con ella a medias, uno se fía.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { ISO } from '../lib/paises-iso.mjs'

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

/**
 * Fotos que NO cuadran y están BIEN, miradas una a una.
 *
 * Van con su motivo escrito, siempre. Una excepción sin motivo no se distingue
 * de un olvido, y dentro de seis meses nadie sabrá si se miró o si se calló.
 * Siguen saliendo en el informe, en su propio apartado: no se esconden, se
 * explican. Lo que se evita es que vuelvan a la lista de sospechosas y gasten
 * la atención de quien revisa.
 *
 * La clave es el id del gooal, que no cambia aunque se le reescriba el título.
 */
const MIRADAS_Y_BIEN = {
  // «Hacer cumbre en el Kilimanjaro» (Moshi, Tanzania), y la foto cae en Kenia:
  '688b9de9-d3b1-40ee-bcc7-aeed5b43c254':
    'Está hecha desde Amboseli (Kenia), que es el mirador clásico del Kilimanjaro. ' +
    'La foto es correcta; lo que falla es la pregunta: un pico se fotografía de lejos, ' +
    'y a veces lejos es otro país. Mirada el 7-10-2026.',
}

const AGENTE = 'GooALS/1.0 (https://gooals.app) comprobacion-de-fotos'
const ESPERA_NOMINATIM = 1100   // su política: una petición por segundo
const dormir = ms => new Promise(r => setTimeout(r, ms))
const sinAcentos = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '')
const clave = p => sinAcentos((p ?? '').toLowerCase()).trim()

// ── 1 · Las fotos ──
const { data: filas, error } = await s.from('gooals_v2')
  .select('id, titulo, ciudad, pais, foto_origen')
  .not('imagen_url', 'is', null).not('foto_origen', 'is', null)
  .order('titulo')
if (error) throw new Error(error.message)

// La tabla, contrastada contra TODOS los datos ANTES de empezar.
const paises = [...new Set(filas.map(f => f.pais).filter(Boolean))]
const faltan = paises.filter(p => !ISO[clave(p)])
console.log(`${filas.length} fotos · ${paises.length} países distintos`)
if (faltan.length) {
  console.error('\nPARA: estos países del catálogo no están en scripts/lib/paises-iso.mjs,')
  console.error('así que a sus filas no se les podría comprobar nada:')
  console.error(' ', faltan.join(' · '))
  console.error('Añádelos a la tabla y vuelve a lanzarlo.')
  process.exit(1)
}
console.log('la tabla ISO cubre los', paises.length, 'países del catálogo\n')

// ── 2 · Las coordenadas, a Commons (de 50 en 50) ──
//
// Cada fila lleva SU título de Commons, y los títulos se agrupan aparte para
// preguntar. Antes esto era un Map título -> fila, y tres gooals desaparecían
// del informe sin dejar rastro: hay tres ficheros usados por dos gooals cada
// uno, y el segundo pisaba al primero. Lo cazó el cuadre del final, que para eso
// está. Si una fila no puede mirarse, tiene que SALIR como no mirada, no
// evaporarse.
const conTitulo = filas.map(f => ({
  ...f,
  fichero: decodeURIComponent((f.foto_origen.split('/wiki/')[1] ?? '').replace(/_/g, ' ')),
}))
const titulos = [...new Set(conTitulo.map(f => f.fichero).filter(Boolean))]
const coords = new Map()

for (let i = 0; i < titulos.length; i += 50) {
  const lote = titulos.slice(i, i + 50)
  const u = new URL('https://commons.wikimedia.org/w/api.php')
  for (const [k, v] of Object.entries({
    format: 'json', formatversion: 2, action: 'query',
    titles: lote.join('|'), prop: 'coordinates', coprimary: 'all', colimit: 'max',
  })) u.searchParams.set(k, v)
  const j = await (await fetch(u, { headers: { 'User-Agent': AGENTE } })).json()
  for (const p of j.query?.pages ?? []) {
    const c = p.coordinates?.[0]
    if (c) coords.set(p.title, { lat: c.lat, lon: c.lon })
  }
  process.stdout.write(`\rCommons: ${Math.min(i + 50, titulos.length)}/${titulos.length}`)
  await dormir(300)
}
console.log(`\ncon coordenadas: ${coords.size} de ${titulos.length}\n`)

// ── 3 · De coordenadas a país, con Nominatim ──
const cuadran = [], noCuadran = [], sinCoords = [], sinComprobar = [], sabidas = []
// Un fichero compartido por dos gooals se pregunta una vez y se reparte a los
// dos: la posición de la foto es la misma, el país del gooal puede no serlo.
const yaPreguntado = new Map()

for (const fila of conTitulo) {
  const titulo = fila.fichero
  const c = titulo ? coords.get(titulo) : null
  if (!c) { sinCoords.push(fila); continue }

  if (yaPreguntado.has(titulo)) {
    const { devuelto, motivo } = yaPreguntado.get(titulo)
    if (motivo) { sinComprobar.push({ ...fila, ...c, motivo }); continue }
    const esperados = ISO[clave(fila.pais)].split(' ')
    const registro = { ...fila, ...c, devuelto }
    if (esperados.includes(devuelto)) cuadran.push(registro)
    else if (MIRADAS_Y_BIEN[fila.id]) sabidas.push({ ...registro, porque: MIRADAS_Y_BIEN[fila.id] })
    else noCuadran.push(registro)
    continue
  }

  const u = `https://nominatim.openstreetmap.org/reverse?lat=${c.lat}&lon=${c.lon}&format=jsonv2&zoom=3&addressdetails=1`
  let devuelto = null, motivo = null
  try {
    const r = await fetch(u, { headers: { 'User-Agent': AGENTE } })
    if (!r.ok) motivo = `Nominatim ha respondido HTTP ${r.status}`
    else {
      const j = await r.json()
      devuelto = (j.address?.country_code ?? '').toLowerCase()
      if (!devuelto) motivo = 'Nominatim no devuelve país (¿mar abierto?)'
    }
  } catch (e) { motivo = 'no se pudo hablar con Nominatim: ' + e.message }
  await dormir(ESPERA_NOMINATIM)

  yaPreguntado.set(titulo, { devuelto, motivo })
  if (motivo) { sinComprobar.push({ ...fila, ...c, motivo }); continue }

  // El país del gooal puede valer con dos códigos ("gl dk"): vale cualquiera.
  const esperados = ISO[clave(fila.pais)].split(' ')
  const registro = { ...fila, ...c, devuelto }
  if (esperados.includes(devuelto)) cuadran.push(registro)
  else if (MIRADAS_Y_BIEN[fila.id]) sabidas.push({ ...registro, porque: MIRADAS_Y_BIEN[fila.id] })
  else noCuadran.push(registro)

  const hechas = cuadran.length + noCuadran.length
  process.stdout.write(`\rNominatim: ${hechas}/${coords.size}  ·  no cuadran: ${noCuadran.length}   `)
}
console.log('\n')

// ── 4 · El cuadre, que tiene que sumar ──
const suma = cuadran.length + noCuadran.length + sabidas.length + sinCoords.length + sinComprobar.length
console.log('CUADRE')
console.log('  cuadran          ', cuadran.length)
console.log('  NO cuadran       ', noCuadran.length)
console.log('  no cuadran pero están bien (miradas):', sabidas.length)
console.log('  sin coordenadas  ', sinCoords.length)
console.log('  no se pudo mirar ', sinComprobar.length)
console.log('  ───────────────── ')
console.log('  total            ', suma, suma === filas.length ? '= las fotos que hay' : `¡NO CUADRA! deberían ser ${filas.length}`)

console.log('')
console.log('  ' + '!'.repeat(62))
console.log(`  DE ${sinCoords.length} DE LAS ${filas.length} NO SABEMOS NADA: no traen coordenadas.`)
console.log('  No están bien. No se han mirado. No es lo mismo.')
console.log('  ' + '!'.repeat(62))

console.log('\nNO CUADRAN:')
for (const g of noCuadran) {
  console.log(` · ${g.titulo}  [${g.ciudad ?? '—'}, ${g.pais}]  ->  la foto está en "${g.devuelto}"  (${g.lat}, ${g.lon})`)
}

// ── 5 · La lista, en un fichero ──
const hoy = new Date().toISOString().slice(0, 10)
const paraTabla = g => `| ${g.titulo} | ${[g.ciudad, g.pais].filter(Boolean).join(', ')} | **${g.devuelto.toUpperCase()}** | [${g.fichero.replace('File:', '')}](${g.foto_origen}) | [${g.lat}, ${g.lon}](https://www.openstreetmap.org/?mlat=${g.lat}&mlon=${g.lon}#map=8/${g.lat}/${g.lon}) |`

writeFileSync('Claude outputs/fotos-por-coordenadas.md', [
  '# Fotos del catálogo: dónde se hicieron de verdad',
  '',
  `Generada el ${hoy}. **Es una lista para mirar a ojo, no un diagnóstico.**`,
  '',
  'Muchas fotos de Wikimedia Commons traen el sitio donde se tomaron. Aquí se le',
  'pide a Commons esa posición, se le pregunta a OpenStreetMap en qué país cae, y',
  'se compara con el país que dice el gooal. El nombre del fichero era una pista;',
  'esto es un hecho.',
  '',
  '> [!WARNING]',
  `> ## De ${sinCoords.length} de las ${filas.length} NO SABEMOS NADA`,
  '>',
  '> No traen coordenadas en Wikimedia Commons, así que esta comprobación no las',
  '> ha mirado. **No están bien: están sin mirar**, que no es lo mismo y a los dos',
  '> meses se confunde. Van listadas una a una al final de este fichero.',
  '',
  '## El cuadre',
  '',
  '| | |',
  '|---|---:|',
  `| Fotos del catálogo | **${filas.length}** |`,
  `| Cuadran: la foto está en el país del gooal | ${cuadran.length} |`,
  `| **No cuadran** | **${noCuadran.length}** |`,
  `| No cuadran pero ya se miraron y están bien | ${sabidas.length} |`,
  `| **Sin coordenadas: SIN MIRAR** | **${sinCoords.length}** |`,
  `| No se pudo mirar (el servicio no contestó, o mar abierto) | ${sinComprobar.length} |`,
  '',
  `Suman ${suma}${suma === filas.length ? ', que son todas.' : `, y deberían sumar ${filas.length}. ALGO FALLA.`}`,
  '',
  '## Lo que esta lista NO dice',
  '',
  `- **De las ${sinCoords.length} sin coordenadas no sabemos nada.** No están bien ni mal: no se`,
  '  han mirado. Aparecen listadas al final para que conste.',
  '- **Que una foto cuadre no quiere decir que sea buena.** Dice que se hizo en ese',
  '  país, no que enseñe lo que el gooal pide. Una foto de un bar de Madrid cuadra',
  '  perfectamente en un gooal del Prado.',
  '- **Que no cuadre no quiere decir que esté mal.** Un retrato de alguien hecho en',
  '  otro país, una maqueta en un museo, una foto aérea mal situada. Decide una',
  '  persona, como con los pines.',
  '',
  `## ${noCuadran.length} que no cuadran`,
  '',
  '| Gooal | Dice que está en | La foto está en | Fichero | Dónde |',
  '|---|---|---|---|---|',
  ...noCuadran.map(paraTabla),
  '',
  ...(sabidas.length ? [
    `## ${sabidas.length} que no cuadran y están bien`,
    '',
    'Miradas una a una. Siguen saliendo aquí, con su motivo, en vez de',
    'desaparecer: una excepción sin motivo escrito no se distingue de un olvido.',
    '',
    ...sabidas.map(g => `- **${g.titulo}** — dice ${g.pais}, la foto cae en ${g.devuelto.toUpperCase()}.
  ${g.porque}`),
    '',
  ] : []),
  `## ${sinCoords.length} sin coordenadas: SIN MIRAR`,
  '',
  'Ni bien ni mal. Sin mirar.',
  '',
  ...(sinCoords.length ? sinCoords.map(g => `- ${g.titulo} — ${[g.ciudad, g.pais].filter(Boolean).join(', ')}`) : ['(ninguna)']),
  '',
  ...(sinComprobar.length
    ? ['## No se pudo mirar', '', ...sinComprobar.map(g => `- ${g.titulo} — ${g.motivo}`), '']
    : []),
  '## Cómo se vuelve a sacar',
  '',
  '```bash',
  'node --env-file=.env.local scripts/fotos-catalogo/coordenadas.mjs',
  '```',
  '',
].join('\n'), 'utf8')

console.log('\nescrito: Claude outputs/fotos-por-coordenadas.md')
