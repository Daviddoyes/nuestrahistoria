// ¿POR QUÉ VA LENTA LA APP? Una lista de culpables medida, no una opinión.
//
//   npm run velocidad
//
// ── DÓNDE MIDE, QUE ES LA MITAD DEL ASUNTO ────────────────
//
// En PRODUCCIÓN (gooals.app) y con la red limitada a «4G lento», que es lo que
// tiene la gente. Medir en local con fibra dice que todo va bien SIEMPRE, y por
// eso no sirve: la fibra tapa a la vez las dos cosas que hacen lenta una app,
// el peso de lo que baja y el número de viajes de ida y vuelta.
//
// Los valores son los que Chrome llama «Slow 4G»: 1,6 Mb/s de bajada y 562 ms
// de latencia. Esa latencia es la que suele doler: cada petición empieza
// pagando medio segundo, así que treinta peticiones en fila son quince
// segundos aunque no pesen nada.
//
// ── QUÉ MIDE DE CADA PANTALLA ─────────────────────────────
//
//   · cuánto tarda hasta que SE VE EL CONTENIDO, no hasta que responde el
//     servidor. Son dos números: el que mide el navegador solo (LCP, el
//     elemento más grande que se pinta) y el de mirar a que aparezca de verdad
//     lo que esa pantalla tiene que enseñar.
//   · cuántas peticiones hace y cuántos BYTES bajan, separando lo que viene del
//     caché de lo que viaja de verdad.
//   · las cinco peticiones más lentas, con su tamaño.
//
// Lo que NO mide y hay que contar leyendo el código: cuántas consultas a la
// base hay detrás. Desde el navegador no se ven — una Server Action puede hacer
// una consulta o nueve y por fuera es la misma petición.
//
// ── LA CUENTA DE PRUEBA ───────────────────────────────────
//
// Crea UNA y la borra al terminar, por id. Le marca gooals, así que MUEVE
// `veces_completado`: por eso al final lanza el recuento, que es lo que manda
// CLAUDE.md después de cualquier limpieza de datos de prueba.
import { createClient } from '@supabase/supabase-js'
import { abrirNavegador, UA_ANDROID } from './lib/navegador.mjs'
import { limpiar } from './comprobar-pantallas.mjs'

const BASE = process.env.BASE ?? 'https://www.gooals.app'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const dormir = ms => new Promise(r => setTimeout(r, ms))
const kb = n => (n / 1024).toFixed(0).padStart(5) + ' KB'

// ── Entrar, con la paciencia de un móvil ──────────────────
//
// El `entrar()` del arnés de pantallas no vale aquí: sus esperas están hechas
// para localhost con fibra —3,5 s para que cargue la portada— y con la red
// limitada la página todavía no existe cuando él va a escribir. El primer
// síntoma es raro y despista: «Access is denied for this document» al tocar
// `localStorage`, que es lo que contesta un documento en blanco.
//
// Así que aquí se ESPERA A QUE APAREZCA cada cosa en vez de contar segundos, y
// al final se comprueba que de verdad hay sesión. Sin esa última comprobación,
// un login fallido mediría las pantallas de alguien que no ha entrado — que
// cargan rapidísimo, porque son la portada cinco veces.
async function entrarDespacio(nav, email, clave) {
  await nav.limpiarSesion()
  await nav.ir(BASE + '/', { espera: 0 })

  const hayFormulario = await esperarContenido(nav,
    `document.querySelector('input[type=email]') && document.querySelector('input[type=password]')`, 60000)
  if (hayFormulario === null) throw new Error('la portada no enseñó el formulario en 60 s')

  await nav.ejecutar(`(() => {
    const c = [...document.querySelectorAll('input')]
    const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true})) }
    set(c.find(i => i.type === 'email'), ${JSON.stringify(email)})
    set(c.find(i => i.type === 'password'), ${JSON.stringify(clave)})
    document.querySelector('form button[type=submit]').click()
  })()`)

  // La señal de que entró es que la app LO LLEVA a /inicio.
  //
  // El primer intento buscaba la sesión en `localStorage`, y estaba vacío
  // siempre: este proyecto usa `@supabase/ssr`, que la guarda en COOKIES para
  // que el servidor pueda leerla. La comprobación decía que no había entrado
  // cuando sí había entrado — y una comprobación equivocada da exactamente el
  // mismo rojo que un fallo de verdad.
  const dentro = await esperarContenido(nav,
    `location.pathname.startsWith('/inicio') || location.pathname.startsWith('/onboarding')`, 90000)
  if (dentro === null) throw new Error('no se abrió sesión en 90 s: todo lo de después mediría la portada')
}

// ── Medir una pantalla ────────────────────────────────────

/**
 * Espera a que aparezca lo que esa pantalla tiene que enseñar y devuelve
 * CUÁNDO apareció, contando desde que empezó a cargar.
 *
 * Se mira cada 150 ms, así que el número trae hasta 150 ms de más. Para
 * ordenar culpables sobra: lo que se busca es si una pantalla tarda 3 s o 14.
 */
async function esperarContenido(nav, condicion, tope = 45000) {
  const hasta = Date.now() + tope
  while (Date.now() < hasta) {
    const cuando = await nav.ejecutar(`(() => { try { return (${condicion}) ? performance.now() : null } catch { return null } })()`)
    if (cuando) return Math.round(cuando)
    await dormir(150)
  }
  return null
}

/**
 * Espera a que la pantalla DEJE DE PEDIR COSAS.
 *
 * La primera versión esperaba 4 segundos fijos y daba números falsos: las
 * fotos que todavía estaban bajando no se contaban, así que Descubrir —que es
 * una pantalla de fotos— salía con «Image 0 KB» y parecía la más ligera de
 * todas. Un número que sale bajo porque se dejó de mirar antes de tiempo es
 * peor que no tenerlo: señala al inocente.
 */
async function esperarRedTranquila(nav, quieto = 2500, tope = 30000) {
  const hasta = Date.now() + tope
  let cuantas = nav.cuentaDeRed().length
  let desde = Date.now()
  while (Date.now() < hasta) {
    await dormir(400)
    const ahora = nav.cuentaDeRed().length
    if (ahora !== cuantas) { cuantas = ahora; desde = Date.now() }
    else if (Date.now() - desde >= quieto) return
  }
}

async function medir(nav, nombre, url, condicion) {
  nav.empezarAContar()
  await nav.ir(url, { espera: 0 })
  const visto = await esperarContenido(nav, condicion)
  await esperarRedTranquila(nav)

  const lcp = await nav.ejecutar(`new Promise(ok => {
    let v = 0
    try {
      new PerformanceObserver(l => { for (const e of l.getEntries()) v = e.startTime })
        .observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {}
    setTimeout(() => ok(Math.round(v)), 300)
  })`)

  // Cuántas fotos hay puestas en la pantalla y cuántas se han llegado a
  // descargar. Es lo que contesta «¿se piden todas de golpe o según bajas?».
  const fotos = await nav.ejecutar(`(() => {
    const t = [...document.querySelectorAll('img')]
    return {
      enElDom: t.length,
      cargadas: t.filter(i => i.complete && i.naturalWidth > 0).length,
      conLazy: t.filter(i => i.loading === 'lazy').length,
      // A qué tamaño se ven de verdad, que es con lo que hay que comparar los
      // 1024×1536 que se bajan.
      medidas: t.filter(i => i.naturalWidth > 0).slice(0, 4).map(i =>
        Math.round(i.getBoundingClientRect().width) + 'x' + Math.round(i.getBoundingClientRect().height) +
        ' (el fichero es ' + i.naturalWidth + 'x' + i.naturalHeight + ')'),
    }
  })()`)

  const red = nav.cuentaDeRed()
  const bajado = red.filter(p => !p.delCache)
  const porTipo = {}
  for (const p of bajado) porTipo[p.tipo] = (porTipo[p.tipo] ?? 0) + p.bytes

  // Las peticiones se reparten en tres montones, porque cuestan por motivos
  // distintos y mezclarlas esconde a los dos culpables a la vez:
  //   · las FOTOS, que son bytes;
  //   · el PREFETCH de Next (`?_rsc=`), que son viajes de ida y vuelta a otras
  //     rutas que ni siquiera estás mirando;
  //   · y lo demás.
  const esFoto = p => /supabase\.co\/storage/.test(p.url)
  const esPrefetch = p => p.url.includes('_rsc=')
  const monton = f => {
    const l = bajado.filter(f)
    return { n: l.length, bytes: l.reduce((a, p) => a + p.bytes, 0) }
  }

  return {
    nombre,
    visto,
    lcp,
    peticiones: red.length,
    deCache: red.length - bajado.length,
    bytes: bajado.reduce((a, p) => a + p.bytes, 0),
    porTipo,
    fotos,
    montones: {
      fotos: monton(esFoto),
      prefetch: monton(esPrefetch),
      resto: monton(p => !esFoto(p) && !esPrefetch(p)),
    },
    lentas: [...red].sort((a, b) => (b.ms ?? 0) - (a.ms ?? 0)).slice(0, 5),
    fallos: red.filter(p => p.fallo),
  }
}

function imprimir(m) {
  console.log(`\n── ${m.nombre} ─────────────────────────────`)
  console.log(`   se ve el contenido a los ${m.visto === null ? 'NO APARECIÓ en 45 s' : (m.visto / 1000).toFixed(1) + ' s'}` +
    `   (lo más grande que se pinta: ${(m.lcp / 1000).toFixed(1)} s)`)
  console.log(`   ${m.peticiones} peticiones, ${m.deCache} del caché   ·   bajan ${(m.bytes / 1024).toFixed(0)} KB`)
  const z = m.montones
  console.log(`   de eso: fotos ${z.fotos.n} peticiones y ${(z.fotos.bytes / 1024).toFixed(0)} KB` +
    `  ·  prefetch de otras rutas ${z.prefetch.n} peticiones y ${(z.prefetch.bytes / 1024).toFixed(0)} KB` +
    `  ·  resto ${z.resto.n} y ${(z.resto.bytes / 1024).toFixed(0)} KB`)
  console.log(`   imágenes en pantalla: ${m.fotos.enElDom} puestas, ${m.fotos.cargadas} descargadas, ${m.fotos.conLazy} con carga diferida`)
  for (const t of m.fotos.medidas) console.log(`     se ve a ${t}`)
  console.log('   las cinco más lentas:')
  for (const p of m.lentas) {
    console.log(`     ${String(p.ms ?? '?').padStart(6)} ms  ${kb(p.bytes)}  ${p.tipo.padEnd(8)} ${acortar(p.url)}`)
  }
  if (m.fallos.length) console.log('   FALLARON: ' + m.fallos.map(f => acortar(f.url) + ' (' + f.fallo + ')').join(', '))
}

const acortar = u => u.length <= 78 ? u : u.slice(0, 48) + '…' + u.slice(-28)

// ── La siembra ────────────────────────────────────────────

async function crearCuenta() {
  const email = `vel-${Date.now()}@gooals-prueba.invalid`
  const clave = `Pr${Math.random().toString(36).slice(2)}!9x`
  const { data: u, error } = await s.auth.admin.createUser({ email, password: clave, email_confirm: true })
  if (error) throw new Error(error.message)
  const { error: eP } = await s.from('profiles').insert({
    id: u.user.id, nombre: 'Medida Velocidad', email,
    username: `vel_${Date.now()}`.slice(0, 20),
    onboarding_completado: true, intereses: ['viajes', 'deporte', 'gastronomia'],
  })
  if (eP) throw new Error('profiles: ' + eP.message)
  return { id: u.user.id, email, clave }
}

/**
 * Le añade gooals conseguidos hasta llegar a `total`.
 *
 * Devuelve cuántos tiene y EL TÍTULO DEL ÚLTIMO, que es lo que luego se espera
 * a ver en pantalla. Esperar a un rótulo fijo como «Conseguidos» no vale: ese
 * texto está pintado desde el primer momento, así que la medida salía igual
 * con 15 gooals que con 220 —1,9 s las tres veces— y parecía que la lista no
 * costaba nada. Lo que hay que esperar es a un dato que SOLO puede estar si la
 * consulta ya volvió.
 */
async function ponerGooals(userId, total, yaPuestos) {
  const { data, error } = await s.from('gooals_v2')
    .select('id, titulo, puntos').eq('activo', true).eq('estado', 'verificado')
    .order('id').range(yaPuestos, total - 1)
  if (error) throw new Error(error.message)
  for (const g of data) {
    const { error: e } = await s.from('user_gooals').insert({
      user_id: userId, gooal_id: g.id, estado: 'completado', visibilidad: 'amigos',
      puntos_ganados: g.puntos, completado_at: new Date().toISOString(),
    })
    if (e) throw new Error('user_gooals: ' + e.message)
  }
  // El cebo, comprobado: sin esto, una siembra que no entró daría una medida
  // de una lista vacía y parecería que el perfil va rapidísimo.
  const { count } = await s.from('user_gooals').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if (count !== total) throw new Error(`la siembra no cuadra: pedía ${total} y hay ${count}`)
  return { total, titulo: data[data.length - 1].titulo }
}

/**
 * Una amiga que publica en el muro.
 *
 * Sin esto el muro de una cuenta recién creada está VACÍO, y medir un estado
 * vacío no mide nada: el caso vacío casi siempre va rápido. La primera vuelta
 * de esto dejó el muro sin sembrar y el guion dijo «NO APARECIÓ en 45 s» — que
 * leído deprisa parece «el muro no carga» y era «el muro no tenía nada».
 */
async function sembrarMuro(userId) {
  const email = `vel-amiga-${Date.now()}@gooals-prueba.invalid`
  const nombre = 'Amiga Del Muro'
  const { data: u, error } = await s.auth.admin.createUser({ email, password: `Pr${Math.random().toString(36).slice(2)}!9x`, email_confirm: true })
  if (error) throw new Error(error.message)
  const { error: eP } = await s.from('profiles').insert({
    id: u.user.id, nombre, email, username: `amiga_${Date.now()}`.slice(0, 20),
    onboarding_completado: true, intereses: ['viajes'],
  })
  if (eP) throw new Error('profiles amiga: ' + eP.message)

  for (const [a, b] of [[userId, u.user.id], [u.user.id, userId]]) {
    const { error: e } = await s.from('follows').insert({ follower_id: a, following_id: b })
    if (e) throw new Error('follows: ' + e.message)
  }

  const { data: g, error: eG } = await s.from('gooals_v2')
    .select('id, puntos').eq('activo', true).eq('estado', 'verificado').order('id', { ascending: false }).limit(1)
  if (eG) throw new Error(eG.message)
  const { data: ug, error: eU } = await s.from('user_gooals').insert({
    user_id: u.user.id, gooal_id: g[0].id, estado: 'completado', visibilidad: 'amigos',
    puntos_ganados: g[0].puntos, completado_at: new Date().toISOString(),
  }).select('id').single()
  if (eU) throw new Error('user_gooals amiga: ' + eU.message)

  const { error: ePost } = await s.from('muro_posts').insert({
    user_id: u.user.id, user_gooal_id: ug.id, gooal_id: g[0].id,
    puntos: g[0].puntos, descripcion: 'Un post para que el muro tenga algo que enseñar.', likes: 0,
  })
  if (ePost) throw new Error('muro_posts: ' + ePost.message)

  // Y se comprueba que el cebo entró, que es la otra mitad: un post que no se
  // inserta deja una medida que pasa sin mirar nada.
  const { count } = await s.from('muro_posts').select('id', { count: 'exact', head: true }).eq('user_id', u.user.id)
  if (count !== 1) throw new Error('el post del muro no entró')
  return { id: u.user.id, nombre }
}

// ── El recorrido ──────────────────────────────────────────

const creadas = []
let nav = null
try {
  console.log(`midiendo ${BASE} con la red a «4G lento» (1,6 Mb/s, 562 ms)\n`)

  const yo = await crearCuenta()
  creadas.push(yo.id)
  let { total: puestos, titulo } = await ponerGooals(yo.id, 15, 0)
  const amiga = await sembrarMuro(yo.id)
  creadas.push(amiga.id)
  console.log(`cuenta de prueba creada, con ${puestos} gooals conseguidos, una amiga y un post en el muro`)

  nav = await abrirNavegador({ ancho: 390, alto: 844, ua: UA_ANDROID, puerto: 9371 })
  await nav.limitarRed()
  await entrarDespacio(nav, yo.email, yo.clave)
  console.log('dentro.\n')

  // ── LAS CONDICIONES, QUE SON LA MEDIDA ──────────────────
  //
  // Cada una espera a UN DATO que solo puede estar en pantalla si la consulta
  // ya volvió, nunca a un rótulo fijo. Y las fotos se esperan CARGADAS
  // (`naturalWidth > 0`), no puestas: un <img> existe en el documento mucho
  // antes de que la foto haya bajado, y esperar al elemento mide el HTML, no
  // lo que ve la persona.
  const unaFotoCargada = n => `[...document.querySelectorAll('img')].filter(i => /catalogo/.test(i.src) && i.complete && i.naturalWidth > 0).length >= ${n}`
  const pantallas = [
    ['Tú (inicio)', '/inicio', unaFotoCargada(1)],
    ['Descubrir', '/explorar?tab=descubrir', unaFotoCargada(1)],
    ['Buscar (la rejilla)', '/explorar', unaFotoCargada(4)],
    ['Tus listas (perfil)', '/perfil', `document.body.innerText.includes(${JSON.stringify(titulo)})`],
    ['Muro', '/muro', `document.body.innerText.includes(${JSON.stringify(amiga.nombre)})`],
  ]

  const medidas = []
  for (const [nombre, ruta, condicion] of pantallas) {
    const m = await medir(nav, nombre, BASE + ruta, condicion)
    medidas.push(m)
    imprimir(m)
  }

  // ── La ficha de un gooal, que no es una navegación ──────
  await nav.ir(BASE + '/explorar?tab=descubrir', { espera: 12000 })
  nav.empezarAContar()
  const abrio = await nav.ejecutar(`(() => {
    const img = document.querySelector('img[src*="catalogo"]')
    if (!img) return 'no hay ninguna tarjeta'
    let n = img
    for (let i = 0; i < 8 && n; i++, n = n.parentElement) {
      if (n.onclick || n.tagName === 'BUTTON' || n.getAttribute('role') === 'button') { n.click(); return 'ok' }
    }
    img.click(); return 'ok'
  })()`)
  const t0 = Date.now()
  const vistoFicha = abrio === 'ok'
    ? await esperarContenido(nav, `document.body.innerText.includes('Añadir a mi lista') || document.body.innerText.includes('Ya lo conseguiste') || document.body.innerText.includes('Ya lo hice')`, 20000)
    : null
  await dormir(3000)
  const redFicha = nav.cuentaDeRed()
  console.log('\n── La ficha de un gooal (al tocar una tarjeta) ───')
  console.log(`   ${abrio === 'ok' ? 'abierta' : abrio}` +
    `   se ve a los ${vistoFicha === null ? '?' : ((Date.now() - t0) / 1000).toFixed(1) + ' s'}`)
  console.log(`   ${redFicha.length} peticiones nuevas   ·   bajan ${(redFicha.filter(p => !p.delCache).reduce((a, p) => a + p.bytes, 0) / 1024).toFixed(0)} KB`)
  for (const p of [...redFicha].sort((a, b) => (b.ms ?? 0) - (a.ms ?? 0)).slice(0, 5)) {
    console.log(`     ${String(p.ms ?? '?').padStart(6)} ms  ${kb(p.bytes)}  ${p.tipo.padEnd(8)} ${acortar(p.url)}`)
  }

  // ── Y el perfil según cuántos gooals tenga ──────────────
  //
  // La pregunta no es «¿va lento?», es «¿a partir de cuántos?». Con un número
  // solo no se puede contestar: hacen falta varios y ver la curva.
  console.log('\n\n══ EL PERFIL SEGÚN EL TAMAÑO DE LA LISTA ══════════')
  // Se espera al título del ÚLTIMO gooal sembrado, que es el que solo puede
  // estar en pantalla si llegó la lista entera. Con un rótulo fijo la medida
  // salía idéntica con 15 y con 220 y parecía que crecer no costaba nada.
  const curva = [{ n: puestos, ...(await medir(nav, `perfil con ${puestos}`, BASE + '/perfil', `document.body.innerText.includes(${JSON.stringify(titulo)})`)) }]
  for (const total of [80, 220]) {
    const r = await ponerGooals(yo.id, total, puestos)
    puestos = r.total
    titulo = r.titulo
    const m = await medir(nav, `perfil con ${total}`, BASE + '/perfil', `document.body.innerText.includes(${JSON.stringify(titulo)})`)
    curva.push({ n: total, ...m })
  }
  console.log('\n   gooals   se ve a los   peticiones   bajan   fotos pedidas')
  for (const c of curva) {
    console.log(`   ${String(c.n).padStart(6)}   ${(c.visto === null ? 'NO SE VIO' : (c.visto / 1000).toFixed(1) + ' s').padStart(11)}   ` +
      `${String(c.peticiones).padStart(10)}   ${(c.bytes / 1024).toFixed(0).padStart(5)} KB   ` +
      `${String(c.montones.fotos.n).padStart(6)} (${(c.montones.fotos.bytes / 1024).toFixed(0)} KB)`)
  }

  // ── La lista de culpables ───────────────────────────────
  console.log('\n\n══ DE PEOR A MEJOR ════════════════════════════════')
  console.log('   se ve a los   bajan      peticiones   pantalla')
  for (const m of [...medidas].sort((a, b) => (b.visto ?? 1e9) - (a.visto ?? 1e9))) {
    console.log(`   ${(m.visto === null ? 'NO SE VIO' : (m.visto / 1000).toFixed(1) + ' s').padStart(11)}   ` +
      `${(m.bytes / 1024).toFixed(0).padStart(5)} KB   ${String(m.peticiones).padStart(10)}   ${m.nombre}`)
  }
} finally {
  if (nav) await nav.cerrar()
  await limpiar(creadas)
  console.log('\ncuenta de prueba borrada.')
  // NO dice «hay que recontar». Lo decía, y era una falsa alarma: la siembra
  // inserta en `user_gooals` directamente con la clave de servicio, así que no
  // pasa por `sincronizarVecesConseguido` y el contador del catálogo NI SE
  // ENTERA. Comprobado las dos veces que se ha lanzado: 0 descuadres.
  //
  // Un aviso que sale siempre y nunca es verdad se deja de leer, y el día que
  // avise de algo real tampoco lo leerá nadie. Si alguna vez esta siembra pasa
  // a marcar gooals POR LA APP, entonces sí hay que recontar y hay que volver
  // a poner el aviso aquí.
}
