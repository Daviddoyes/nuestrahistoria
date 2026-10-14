// APLICA LO QUE SE DECIDIÓ EN UNA HOJA DE CONTACTO.
//
//   node --env-file=.env.local scripts/aplicar-hoja.mjs decisiones-A.txt --seco
//   node --env-file=.env.local scripts/aplicar-hoja.mjs decisiones-A.txt
//
// El fichero de decisiones es lo que escupe la caja de la hoja, tal cual:
//
//   HOJA A · 20 de 20
//   Ver un Gran Premio de MotoGP  ->  Claude outputs/cuarenta-nuevas/10-primera_persona.png
//   Ir al Burning Man  ->  NINGUNA
//
// ── LOS CUATRO CUIDADOS, DENTRO DEL GUION ─────────────────
//
// 1. NOMBRE NUEVO SIEMPRE. El objeto se sube como `<id>-<marca>.webp`, con una
//    marca distinta cada vez, y con `upsert: false`. El cubo se sirve con caché
//    de un año: reutilizar un nombre deja la foto vieja sirviéndose durante
//    meses, y como el fichero nuevo sí se guarda, no falla nada y nadie se
//    entera.
// 2. NO SE BORRA NADA. Ni en disco ni en el cubo. Lo que se sustituye se queda.
// 3. SE ANOTA EN EL MOMENTO, no al final. Esta regla existe porque 341
//    imágenes ya pagadas se quedaron sin registrar por anotar al terminar.
// 4. Y EL REGISTRO DICE LO QUE HAY, no lo que se pretendía. Por eso la subida y
//    la escritura de la fila se anotan POR SEPARADO: `subida_como` en cuanto el
//    objeto está en el cubo, y `en_el_catalogo` en cuanto la fila lo apunta.
//
// El punto 4 no es teoría. «Flotar en el mar Muerto» tenía `subida_como`
// escrito, su objeto estaba en el cubo… y el gooal salía SIN FOTO en la app,
// porque la fila nunca se escribió. Con un solo campo, eso es invisible.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const fichero = process.argv[2]
const seco = process.argv.includes('--seco')
if (!fichero || !existsSync(fichero)) {
  console.error('Dime el fichero con las decisiones de la hoja.')
  process.exit(1)
}

const CUBO = 'catalogo'
const ANCHO_MAXIMO = 1600
const OBJETIVO_KB = 300
const CALIDADES = [82, 72, 62, 52, 42]
const REGISTRO = 'scripts/fotos-generadas.json'
const MANIFIESTO = 'scripts/fotos-definitivas.json'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const s = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// ── Las decisiones ────────────────────────────────────────
const lineas = readFileSync(fichero, 'utf8').replace(/\r\n/g, '\n').split('\n')
  .map(l => l.trim()).filter(l => l.includes('  ->  '))
const decisiones = lineas.map(l => {
  const [titulo, valor] = l.split('  ->  ').map(x => x.trim())
  return { titulo, valor }
})
if (decisiones.length === 0) { console.error('No he encontrado ninguna línea «gooal  ->  valor».'); process.exit(1) }

const elegidas = decisiones.filter(d => d.valor !== 'NINGUNA' && d.valor !== 'SE QUEDA LA QUE ESTÁ')
const ningunas = decisiones.filter(d => d.valor === 'NINGUNA')
console.log('decisiones leídas: ' + decisiones.length + '   (elegidas ' + elegidas.length + ' · ninguna ' + ningunas.length + ')')

// ── Lo que hay que saber antes de tocar ───────────────────
const leerRegistro = () => JSON.parse(readFileSync(REGISTRO, 'utf8'))
const leerManifiesto = () => JSON.parse(readFileSync(MANIFIESTO, 'utf8'))

const { data: filas, error: eSel } = await s.from('gooals_v2')
  .select('id, titulo, imagen_url').eq('estado', 'verificado')
if (eSel) throw new Error(eSel.message)
const porTitulo = new Map()
for (const g of filas) {
  // El título no es único en la tabla: si dos publicados se llamaran igual, se
  // para en vez de adivinar cuál es.
  if (porTitulo.has(g.titulo)) { console.error('PARA: dos gooals publicados se llaman «' + g.titulo + '»'); process.exit(1) }
  porTitulo.set(g.titulo, g)
}

// ── Comprobaciones antes de empezar, todas o ninguna ──────
const problemas = []
for (const d of elegidas) {
  const g = porTitulo.get(d.titulo)
  if (!g) { problemas.push('no hay ningún gooal publicado llamado «' + d.titulo + '»'); continue }
  if (!existsSync(d.valor)) { problemas.push('no existe el fichero ' + d.valor); continue }
  const info = leerRegistro().imagenes[d.valor]
  if (!info) { problemas.push('el registro no conoce ' + d.valor); continue }
  if (info.titulo && info.titulo !== d.titulo) {
    problemas.push('el registro dice que ' + d.valor + ' es de «' + info.titulo + '», no de «' + d.titulo + '»')
  }
  if (g.imagen_url) problemas.push('«' + d.titulo + '» YA tiene foto: ' + g.imagen_url)
}
if (problemas.length) {
  console.error('\nPARA, hay ' + problemas.length + ' cosa(s) que no cuadran:')
  for (const p of problemas) console.error('  · ' + p)
  process.exit(1)
}
console.log('las ' + elegidas.length + ' elegidas cuadran: fichero en disco, gooal publicado y sin foto, y el registro les da ese título.')

// ── QUÉ IMÁGENES ENSEÑÓ LA HOJA DE CADA «NINGUNA» ─────────
//
// «Ninguna vale» rechaza LO QUE SE VIO, no todo lo que existe de ese gooal. Así
// que hay que reproducir exactamente lo que la hoja puso delante: todas las
// imágenes de ESE título menos la que el manifiesto declara como elegida, que
// la hoja esconde por darla por puesta.
//
// Y se busca por TÍTULO EXACTO, nunca por parecido: en el registro conviven
// «Ver un partido de la NBA» y «Ver una final de la NBA», y «Ir al Carnaval de
// Sitges» y «Ir al Festival de Cine de Sitges». Un `includes` aquí marcaría
// imágenes de un gooal que nadie miró.
const registroAhora = leerRegistro().imagenes
const manifiestoAhora = leerManifiesto().gooals

const encuadreDe = (fichero, info) => {
  if (info?.encuadre) return info.encuadre
  const m = fichero.split('/').pop().match(/^\d+-([a-z_]+)\.png$/i)
  return m ? m[1] : null
}

const MOTIVO_SILUETA = 'David, hoja A: silueta/figura humana dominante, todas parecidas'
const MOTIVO_NO_REPRESENTA = 'David, hoja A: no representa el gooal'

const aRechazar = []
const escondidas = []
for (const d of ningunas) {
  const declarada = manifiestoAhora[d.titulo]?.fichero?.split('\\').join('/') ?? null
  const suyas = Object.entries(registroAhora).filter(([, i]) => i.titulo === d.titulo)
  for (const [f, info] of suyas) {
    if (f === declarada) { escondidas.push({ titulo: d.titulo, fichero: f, estado: info.estado }); continue }
    const enc = encuadreDe(f, info)
    aRechazar.push({ titulo: d.titulo, fichero: f, encuadre: enc, estadoAntes: info.estado,
      motivo: enc === 'contraluz' ? MOTIVO_SILUETA : MOTIVO_NO_REPRESENTA })
  }
}

console.log('\n── LOS RECHAZOS, UNO A UNO ──')
for (const r of aRechazar) {
  console.log('  ' + r.titulo.slice(0, 38).padEnd(40) + (r.encuadre ?? '?').padEnd(16) + r.fichero.replace('Claude outputs/', ''))
}
console.log('  total: ' + aRechazar.length + ' imágenes de ' + ningunas.length + ' gooals')
if (escondidas.length) {
  console.log('\n  NO SE TOCAN, porque la hoja no las enseñó (el manifiesto las declara elegidas):')
  for (const e of escondidas) console.log('    [' + e.estado + '] ' + e.titulo + ' · ' + e.fichero.replace('Claude outputs/', ''))
}

if (seco) { console.log('\nEN SECO. No se ha subido ni escrito nada.'); process.exit(0) }

// ── A subir, de una en una y anotando sobre la marcha ─────
const marca = new Date().toISOString().slice(0, 10).replace(/-/g, '')
let subidas = 0, escritas = 0

for (const [i, d] of elegidas.entries()) {
  const g = porTitulo.get(d.titulo)
  const bruta = readFileSync(d.valor)

  let webp = null
  for (const calidad of CALIDADES) {
    webp = await sharp(bruta).rotate()
      .resize({ width: ANCHO_MAXIMO, withoutEnlargement: true })
      .webp({ quality: calidad }).toBuffer()
    if (webp.length <= OBJETIVO_KB * 1024) break
  }

  // Nombre nuevo, con `upsert: false`: si por lo que sea ya existiera, falla en
  // vez de pisar nada.
  const objeto = `${g.id}-${marca}-${Math.random().toString(36).slice(2, 6)}.webp`
  const { error: eUp } = await s.storage.from(CUBO).upload(objeto, webp, {
    contentType: 'image/webp', upsert: false, cacheControl: '31536000',
  })
  if (eUp) { console.error(`  FALLO al subir ${d.titulo}: ${eUp.message}`); continue }
  subidas++

  // (3) y (4): se anota AHORA que está en el cubo, antes de tocar el catálogo.
  const reg = leerRegistro()
  reg.imagenes[d.valor] = {
    ...reg.imagenes[d.valor],
    estado: 'aprobada',
    motivo: null,
    decidida_en: fichero,
    subida_como: objeto,
    en_el_catalogo: false,
  }
  writeFileSync(REGISTRO, JSON.stringify(reg, null, 2) + '\n', 'utf8')

  // El prompt con el que se hizo, para que la fila lo conserve como las demás.
  const txt = d.valor.slice(0, -4) + '.txt'
  let prompt = existsSync(txt) ? readFileSync(txt, 'utf8') : null
  if (!prompt) {
    const tanda = d.valor.split('/').slice(0, -1).join('/') + '/tanda.json'
    if (existsSync(tanda)) {
      const j = JSON.parse(readFileSync(tanda, 'utf8'))
      for (const lista of Object.values(j)) {
        if (!Array.isArray(lista)) continue
        const e = lista.find(x => (x.fichero ?? '').split('\\').join('/') === d.valor)
        if (e?.prompt) { prompt = e.prompt; break }
      }
    }
  }

  const direccion = `${url}/storage/v1/object/public/${CUBO}/${objeto}`
  const { error: eFila } = await s.from('gooals_v2').update({
    imagen_url: direccion,
    foto_fuente: 'ia',
    foto_prompt: prompt,
    // Una foto generada no tiene autor ni licencia que citar, y si quedara algo
    // escrito de antes la pantalla pintaría un crédito falso.
    foto_autor: null, foto_licencia: null, foto_origen: null,
  }).eq('id', g.id).eq('estado', 'verificado')

  if (eFila) {
    console.error(`  SUBIDA pero SIN FILA ${d.titulo}: ${eFila.message}`)
    console.error('     (queda anotado como subida y sin catálogo: eso es lo que hay)')
    continue
  }

  const reg2 = leerRegistro()
  reg2.imagenes[d.valor].en_el_catalogo = true
  writeFileSync(REGISTRO, JSON.stringify(reg2, null, 2) + '\n', 'utf8')

  const man = leerManifiesto()
  man.gooals[d.titulo] = {
    ...(man.gooals[d.titulo] ?? {}),
    fuente: 'ia',
    aprobado: new Date().toISOString().slice(0, 10),
    fichero: d.valor,
    tanda: d.valor.split('/').slice(0, -1).pop(),
    revisada: true,
    subida_como: objeto,
  }
  writeFileSync(MANIFIESTO, JSON.stringify(man, null, 2) + '\n', 'utf8')
  escritas++

  console.log(`${String(i + 1).padStart(3)}/${elegidas.length}  ${String(Math.round(webp.length / 1024)).padStart(4)} KB  ${d.titulo.slice(0, 48)}`)
}

console.log(`\nsubidas al cubo: ${subidas} de ${elegidas.length}   ·   con su fila escrita: ${escritas}`)
if (subidas !== escritas) console.log('OJO: hay ' + (subidas - escritas) + ' en el cubo sin fila. Están anotadas con `en_el_catalogo: false`.')

// ── Y los rechazos, que también son una decisión ──────────
//
// Pasan a `rechazada` con su motivo. Quedarse en `sin_mirar` sería perder lo
// único que distingue «se miró y no vale» de «nadie la ha visto», que es la
// razón de ser del registro.
let rechazadas = 0
for (const r of aRechazar) {
  const reg = leerRegistro()
  reg.imagenes[r.fichero] = {
    ...reg.imagenes[r.fichero],
    estado: 'rechazada',
    motivo: r.motivo,
    decidida_en: fichero,
  }
  writeFileSync(REGISTRO, JSON.stringify(reg, null, 2) + '\n', 'utf8')
  rechazadas++
}
console.log('marcadas como rechazada: ' + rechazadas)

const final = leerRegistro().imagenes
const cuenta = {}
for (const i of Object.values(final)) cuenta[i.estado] = (cuenta[i.estado] ?? 0) + 1
console.log('\nel registro queda: ' + JSON.stringify(cuenta))
