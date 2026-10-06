// Mudanza de las fotos de la gente al cubo privado. NO BORRA NADA sin pedirlo.
//
//   node --env-file=.env.local scripts/fotos-usuarios/mudanza.mjs --seco
//   node --env-file=.env.local scripts/fotos-usuarios/mudanza.mjs --copiar
//   node --env-file=.env.local scripts/fotos-usuarios/mudanza.mjs --vaciar
//
// ── POR QUÉ EN DOS FASES Y NO EN UNA ──────────────────────
//
// Porque entre mover los ficheros y desplegar el código que sabe leerlos hay
// unos minutos, y en esos minutos las fotos no pueden desaparecer. El orden que
// no deja ningún hueco es:
//
//   1. --copiar   copia al cubo privado y reescribe las filas. El cubo viejo
//                 se queda intacto: si algo sale mal, se vuelve atrás solo
//                 reescribiendo las filas.
//   2. desplegar  el código que firma direcciones del cubo nuevo.
//   3. comprobar  que se ven.
//   4. --vaciar   y ENTONCES se vacía el cubo viejo.
//
// ── QUÉ SE GUARDA EN foto_url DESPUÉS ─────────────────────
//
// La RUTA dentro del cubo (`<usuario>/<gooal>/<fichero>`), no una dirección.
// Una dirección pública ya no serviría de nada: el cubo es privado y lo único
// que sirve es una dirección firmada, que caduca y se pide al servidor. La
// columna conserva su nombre porque renombrarla es una migración y no cambia
// nada de lo que se ve; queda dicho aquí y en src/lib/fotos-privadas.ts.
import { createClient } from '@supabase/supabase-js'

const VIEJO = 'gooals-media'
const NUEVO = 'pruebas'

const seco = process.argv.includes('--seco')
const copiar = process.argv.includes('--copiar')
const vaciar = process.argv.includes('--vaciar')
if (!seco && !copiar && !vaciar) {
  console.error('Dime qué hacer: --seco, --copiar o --vaciar')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !clave) throw new Error('Faltan las variables. Lánzalo con --env-file=.env.local')
const s = createClient(url, clave, { auth: { persistSession: false } })

/** Todos los ficheros del cubo viejo, con su ruta entera. */
async function ficherosDe(cubo) {
  const salida = []
  const { data: raiz } = await s.storage.from(cubo).list('', { limit: 1000 })
  for (const usuario of (raiz ?? []).filter(o => !o.metadata)) {
    const { data: gooals } = await s.storage.from(cubo).list(usuario.name, { limit: 1000 })
    for (const g of gooals ?? []) {
      const { data: fs } = await s.storage.from(cubo).list(`${usuario.name}/${g.name}`, { limit: 1000 })
      for (const f of (fs ?? []).filter(o => o.metadata)) {
        salida.push({ ruta: `${usuario.name}/${g.name}/${f.name}`, bytes: f.metadata?.size ?? 0, tipo: f.metadata?.mimetype })
      }
    }
  }
  // Y lo que hubiera suelto en la raíz, por si acaso.
  for (const f of (raiz ?? []).filter(o => o.metadata)) {
    salida.push({ ruta: f.name, bytes: f.metadata?.size ?? 0, tipo: f.metadata?.mimetype, enLaRaiz: true })
  }
  return salida
}

/** La ruta dentro del cubo a partir de lo que guarda una fila. */
function rutaDe(valor) {
  if (!valor) return null
  const marca = `/storage/v1/object/public/${VIEJO}/`
  const i = valor.indexOf(marca)
  if (i >= 0) return decodeURIComponent(valor.slice(i + marca.length))
  if (valor.startsWith('http')) return null
  return valor
}

const ficheros = await ficherosDe(VIEJO)
const { data: filas } = await s.from('user_gooals')
  .select('id, user_id, foto_url, video_url')
  .or('foto_url.not.is.null,video_url.not.is.null')
const { data: posts } = await s.from('muro_posts')
  .select('id, user_gooal_id, foto_url, video_url')
  .or('foto_url.not.is.null,video_url.not.is.null')

console.log(`Cubo "${VIEJO}": ${ficheros.length} ficheros`)
console.log(`Filas con prueba: ${filas?.length ?? 0} en user_gooals · ${posts?.length ?? 0} en muro_posts\n`)

// Lo que apunta a algo que no existe, y lo que existe sin que nadie apunte.
const apuntadas = new Set()
for (const f of filas ?? []) for (const v of [f.foto_url, f.video_url]) { const r = rutaDe(v); if (r) apuntadas.add(r) }
const enCubo = new Set(ficheros.map(f => f.ruta))
const rotas = [...apuntadas].filter(r => !enCubo.has(r))
const huerfanas = ficheros.filter(f => !apuntadas.has(f.ruta))
if (rotas.length) console.log(`AVISO · ${rotas.length} filas apuntan a un fichero que no está:`, rotas.slice(0, 5))
if (huerfanas.length) console.log(`AVISO · ${huerfanas.length} ficheros en el cubo sin ninguna fila que los use (se copian igual, por si acaso)`)

if (seco) {
  console.log('\nEN SECO. Esto es lo que haría --copiar:')
  for (const f of ficheros.slice(0, 10)) {
    console.log(`  ${VIEJO}/${f.ruta}`)
    console.log(`     -> ${NUEVO}/${f.ruta}   (${Math.round(f.bytes / 1024)} KB, ${f.tipo})`)
  }
  if (ficheros.length > 10) console.log(`  ... y ${ficheros.length - 10} más`)
  console.log(`\nY reescribiría ${filas?.length ?? 0} filas de user_gooals y ${posts?.length ?? 0} de muro_posts`)
  console.log('para que guarden la RUTA en vez de la dirección pública.')
  console.log('\nNo se ha tocado nada.')
  process.exit(0)
}

if (copiar) {
  // ── 1. Copiar los ficheros ──
  const { data: yaHay } = await s.storage.from(NUEVO).list('', { limit: 1000 })
  if (yaHay === null) {
    console.error(`El cubo "${NUEVO}" no existe. Pega antes supabase/fase3u.sql.`)
    process.exit(1)
  }
  let copiados = 0, saltados = 0, fallos = 0
  for (const f of ficheros) {
    const { data: existe } = await s.storage.from(NUEVO).list(f.ruta.split('/').slice(0, -1).join('/'), {
      limit: 1000, search: f.ruta.split('/').pop(),
    })
    if ((existe ?? []).some(o => o.name === f.ruta.split('/').pop())) { saltados++; continue }
    const { data: bajada, error: eBajar } = await s.storage.from(VIEJO).download(f.ruta)
    if (eBajar || !bajada) { fallos++; console.error('  no se pudo bajar', f.ruta, eBajar?.message); continue }
    const { error: eSubir } = await s.storage.from(NUEVO).upload(f.ruta, bajada, {
      contentType: f.tipo ?? 'application/octet-stream', upsert: false,
    })
    if (eSubir) { fallos++; console.error('  no se pudo subir', f.ruta, eSubir.message); continue }
    copiados++
    console.log(`  copiado ${f.ruta} (${Math.round(f.bytes / 1024)} KB)`)
  }
  console.log(`\nFicheros: ${copiados} copiados · ${saltados} ya estaban · ${fallos} fallos`)
  if (fallos) { console.error('Con fallos NO se reescribe ninguna fila. Arréglalo y vuelve a lanzarlo.'); process.exit(1) }

  // ── 2. Reescribir las filas: de dirección a ruta ──
  let tocadas = 0
  for (const f of filas ?? []) {
    const cambios = {}
    const rf = rutaDe(f.foto_url), rv = rutaDe(f.video_url)
    if (rf && rf !== f.foto_url) cambios.foto_url = rf
    if (rv && rv !== f.video_url) cambios.video_url = rv
    if (!Object.keys(cambios).length) continue
    const { error } = await s.from('user_gooals').update(cambios).eq('id', f.id)
    if (error) { console.error('  no se pudo reescribir', f.id, error.message); continue }
    tocadas++
  }
  let tocadosPosts = 0
  for (const p of posts ?? []) {
    const cambios = {}
    const rf = rutaDe(p.foto_url), rv = rutaDe(p.video_url)
    if (rf && rf !== p.foto_url) cambios.foto_url = rf
    if (rv && rv !== p.video_url) cambios.video_url = rv
    if (!Object.keys(cambios).length) continue
    const { error } = await s.from('muro_posts').update(cambios).eq('id', p.id)
    if (error) { console.error('  no se pudo reescribir el post', p.id, error.message); continue }
    tocadosPosts++
  }
  console.log(`Filas reescritas: ${tocadas} en user_gooals · ${tocadosPosts} en muro_posts`)
  console.log(`\nEl cubo "${VIEJO}" SIGUE INTACTO. Despliega, comprueba que se ven, y entonces: --vaciar`)
}

if (vaciar) {
  // ── 3. Y solo entonces, vaciar el viejo ──
  // Antes de borrar nada se comprueba que TODO está copiado. Si falta uno, no
  // se borra ninguno: es preferible un cubo viejo de más que una foto perdida.
  const enNuevo = new Set((await ficherosDe(NUEVO)).map(f => f.ruta))
  const faltan = ficheros.filter(f => !enNuevo.has(f.ruta))
  console.log(`En "${VIEJO}": ${ficheros.length} · en "${NUEVO}": ${enNuevo.size} · sin copiar: ${faltan.length}`)
  if (faltan.length) {
    console.error('NO SE BORRA NADA: falta copiar', faltan.map(f => f.ruta).slice(0, 10))
    process.exit(1)
  }
  if (!ficheros.length) { console.log('El cubo ya está vacío.'); process.exit(0) }

  const { data, error } = await s.storage.from(VIEJO).remove(ficheros.map(f => f.ruta))
  if (error) { console.error('no se pudo vaciar:', error.message); process.exit(1) }
  console.log(`Borrados ${data?.length ?? 0} ficheros de "${VIEJO}".`)
  const quedan = await ficherosDe(VIEJO)
  console.log(`Quedan ${quedan.length}. El cubo se puede borrar desde el panel de Supabase cuando esté a cero.`)
}
