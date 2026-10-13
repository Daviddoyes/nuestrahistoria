// LA REVISIÓN PANTALLA POR PANTALLA, EN UN MÓVIL DE VERDAD.
//
//   npm run revision
//
// ── QUÉ ES Y QUÉ NO ES ────────────────────────────────────
//
// `npm run pantallas` mide UNA cosa —si algo se sale por el lado— en 28
// tamaños, y lo hace muy bien. Lo que NO caza está escrito en su propio
// comentario: que algo quede demasiado alto, que una tarjeta salga casi
// cuadrada, que un texto se corte, que una pantalla esté vacía cuando no
// debería. Eso «sigue siendo de mirar», y mirar es esto.
//
// Esto no mide: ABRE cada pantalla en producción, con una cuenta con datos de
// verdad, y guarda una captura de cada una para verlas una a una.
//
// ── POR QUÉ LOS DATOS IMPORTAN MÁS QUE LAS PANTALLAS ──────
//
// Una cuenta recién creada enseña el estado vacío de todo, y el estado vacío
// casi siempre está bien. Así que la cuenta trae: gooals conseguidos y
// pendientes repartidos por categorías, una amiga a la que sigue y que la
// sigue, un post en el muro, y —esto es lo que no existe en producción— UN
// GOOAL CON FOTO PROPIA.
//
// De los 24 gooals conseguidos de la app entera, uno tiene foto, y es el de
// David. O sea que la pantalla «conseguido con tu foto» no la ha visto nadie
// más nunca. Aquí se ve.
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { abrirNavegador, UA_ANDROID } from './lib/navegador.mjs'
import { limpiar } from './comprobar-pantallas.mjs'

const BASE = process.env.BASE ?? 'https://www.gooals.app'
const CARPETA = 'Claude outputs/revision'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const dormir = ms => new Promise(r => setTimeout(r, ms))

/** Los dos móviles: el común y el corto, que es donde ya sabemos que algo falla. */
const MOVILES = [
  { nombre: '390x844', ancho: 390, alto: 844 },
  { nombre: '375x667', ancho: 375, alto: 667 },
]

async function esperar(nav, condicion, tope = 45000) {
  const hasta = Date.now() + tope
  while (Date.now() < hasta) {
    const ok = await nav.ejecutar(`(() => { try { return Boolean(${condicion}) } catch { return false } })()`)
    if (ok) return true
    await dormir(200)
  }
  return false
}

// ── La cuenta, con todo lo que hace falta ver ─────────────

async function crearCuenta(nombre, usuario) {
  const email = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}@gooals-prueba.invalid`
  const clave = `Pr${Math.random().toString(36).slice(2)}!9x`
  const { data: u, error } = await s.auth.admin.createUser({ email, password: clave, email_confirm: true })
  if (error) throw new Error(error.message)
  const { error: eP } = await s.from('profiles').insert({
    id: u.user.id, nombre, email, username: usuario.slice(0, 20),
    onboarding_completado: true, intereses: ['viajes', 'deporte', 'gastronomia'],
  })
  if (eP) throw new Error('profiles: ' + eP.message)
  return { id: u.user.id, email, clave, nombre }
}

async function gooalsDe(categoria, cuantos) {
  const { data, error } = await s.from('gooals_v2')
    .select('id, titulo, puntos').eq('activo', true).eq('estado', 'verificado')
    .eq('categoria', categoria).not('imagen_url', 'is', null).order('id').limit(cuantos)
  if (error) throw new Error(error.message)
  return data
}

async function marcar(userId, g, estado) {
  const fila = { user_id: userId, gooal_id: g.id, estado, visibilidad: 'amigos' }
  if (estado === 'completado') {
    fila.puntos_ganados = g.puntos
    fila.completado_at = new Date().toISOString()
  }
  const { data, error } = await s.from('user_gooals').insert(fila).select('id').single()
  if (error) throw new Error(`user_gooals ${estado}: ${error.message}`)
  return data.id
}

/**
 * Le sube una foto de verdad a uno de sus gooals.
 *
 * No es un adorno de la prueba: es el ÚNICO caso que no existe en producción
 * más que para David, así que es el que nadie ha mirado nunca en una pantalla
 * que no sea la suya.
 */
async function ponerleFoto(userId, userGooalId) {
  const jpg = await sharp({
    create: { width: 1200, height: 1600, channels: 3, background: '#2E5C4A' },
  }).composite([{
    input: Buffer.from(
      `<svg width="1200" height="1600"><rect width="1200" height="1600" fill="#2E5C4A"/>` +
      `<circle cx="600" cy="620" r="260" fill="#F2C14E"/>` +
      `<rect x="0" y="1100" width="1200" height="500" fill="#1B3A2E"/>` +
      `<text x="600" y="1380" font-size="90" fill="#FFFFFF" text-anchor="middle" font-family="sans-serif">foto de prueba</text></svg>`),
  }]).jpeg({ quality: 82 }).toBuffer()

  const ruta = `${userId}/${userGooalId}.jpg`
  const { error } = await s.storage.from('logros-privados').upload(ruta, jpg, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error('subir la foto: ' + error.message)
  const { error: eU } = await s.from('user_gooals').update({ foto_url: ruta }).eq('id', userGooalId)
  if (eU) throw new Error('foto_url: ' + eU.message)

  // El cebo comprobado: si la foto no quedó apuntada, la pantalla que se quiere
  // mirar sería otra vez la de sin foto y la revisión pasaría sin ver nada.
  const { data } = await s.from('user_gooals').select('foto_url').eq('id', userGooalId).single()
  if (data?.foto_url !== ruta) throw new Error('la foto no quedó apuntada en la fila')
  return ruta
}

const creadas = []
let nav = null
try {
  mkdirSync(CARPETA, { recursive: true })

  const yo = await crearCuenta('David Doyes', `revision${Date.now()}`)
  creadas.push(yo.id)

  const viajes = await gooalsDe('viajes', 9)
  const deporte = await gooalsDe('deporte', 5)
  const natura = await gooalsDe('naturaleza', 4)
  const gastro = await gooalsDe('gastronomia', 3)
  let conFoto = null
  for (const [i, g] of [...viajes, ...deporte, ...natura, ...gastro].entries()) {
    const id = await marcar(yo.id, g, i < 14 ? 'completado' : 'pendiente')
    if (i === 0) conFoto = { id, titulo: g.titulo }
  }
  await ponerleFoto(yo.id, conFoto.id)

  const ella = await crearCuenta('Meritxell Samsó', `amiga${Date.now()}`)
  creadas.push(ella.id)
  for (const [a, b] of [[yo.id, ella.id], [ella.id, yo.id]]) {
    const { error } = await s.from('follows').insert({ follower_id: a, following_id: b })
    if (error) throw new Error('follows: ' + error.message)
  }
  const suyos = await gooalsDe('eventos', 4)
  const suyoId = await marcar(ella.id, suyos[0], 'completado')
  for (const g of suyos.slice(1)) await marcar(ella.id, g, 'completado')
  for (const g of viajes.slice(0, 3)) await marcar(ella.id, g, 'completado')
  const { error: ePost } = await s.from('muro_posts').insert({
    user_id: ella.id, user_gooal_id: suyoId, gooal_id: suyos[0].id,
    puntos: suyos[0].puntos, likes: 0,
    descripcion: 'Después de dos intentos y una tormenta, por fin. Valió cada paso.',
  })
  if (ePost) throw new Error('muro_posts: ' + ePost.message)

  const { data: perfilElla } = await s.from('profiles').select('username').eq('id', ella.id).single()
  console.log(`cuenta: ${yo.nombre}  ·  14 conseguidos (uno con foto), 7 pendientes, una amiga y un post\n`)

  // ── El recorrido ────────────────────────────────────────
  nav = await abrirNavegador({ ancho: 390, alto: 844, ua: UA_ANDROID, puerto: 9381 })

  const hayFoto = `[...document.querySelectorAll('img')].some(i => i.complete && i.naturalWidth > 0)`
  const hayTexto = n => `document.body.innerText.trim().length > ${n}`

  const pantallas = [
    { n: '01-portada', url: '/', listo: `document.querySelector('input[type=email]')`, sinSesion: true },
    { n: '02-tu', url: '/inicio', listo: hayFoto },
    { n: '03-descubrir', url: '/explorar?tab=descubrir', listo: hayFoto },
    { n: '04-buscar', url: '/explorar', listo: hayFoto },
    { n: '05-mapa', url: '/mapa', listo: hayTexto(40) },
    { n: '06-tus-listas', url: '/perfil', listo: hayTexto(120) },
    { n: '07-perfil-ajeno', url: `/perfil?u=${perfilElla.username}`, listo: hayTexto(120) },
    { n: '08-muro', url: '/muro', listo: `document.body.innerText.includes('Meritxell')` },
    { n: '09-publica', url: `/g/${viajes[0].id}`, listo: hayTexto(80), sinSesion: true },
  ]

  // Sin sesión primero, que es lo que ve alguien nuevo.
  await nav.limpiarSesion()
  for (const p of pantallas.filter(x => x.sinSesion)) {
    for (const m of MOVILES) {
      await nav.tamano(m.ancho, m.alto)
      await nav.ir(BASE + p.url, { espera: 0 })
      await esperar(nav, p.listo)
      await dormir(2500)
      await nav.captura(`${CARPETA}/${p.n}-${m.nombre}.png`)
    }
    console.log('  ' + p.n + '  (sin sesión)')
  }

  // Y ahora dentro.
  await nav.tamano(390, 844)
  await nav.ir(BASE + '/', { espera: 0 })
  await esperar(nav, `document.querySelector('input[type=email]')`, 60000)
  await nav.ejecutar(`(() => {
    const c = [...document.querySelectorAll('input')]
    const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true})) }
    set(c.find(i => i.type === 'email'), ${JSON.stringify(yo.email)})
    set(c.find(i => i.type === 'password'), ${JSON.stringify(yo.clave)})
    document.querySelector('form button[type=submit]').click()
  })()`)
  if (!await esperar(nav, `location.pathname.startsWith('/inicio')`, 60000)) {
    throw new Error('no entró: todo lo de después serían capturas de la portada')
  }
  console.log('  dentro.')

  for (const p of pantallas.filter(x => !x.sinSesion)) {
    for (const m of MOVILES) {
      await nav.tamano(m.ancho, m.alto)
      await nav.ir(BASE + p.url, { espera: 0 })
      const salio = await esperar(nav, p.listo)
      await dormir(3000)
      await nav.captura(`${CARPETA}/${p.n}-${m.nombre}.png`)
      if (!salio) console.log('     ' + p.n + ' ' + m.nombre + ': NO llegó a enseñar lo que se esperaba')
    }
    console.log('  ' + p.n)
  }

  // ── La ficha, que no es una navegación ──────────────────
  for (const m of MOVILES) {
    await nav.tamano(m.ancho, m.alto)
    await nav.ir(BASE + '/perfil', { espera: 0 })
    await esperar(nav, `document.body.innerText.includes(${JSON.stringify(conFoto.titulo.slice(0, 24))})`)
    await dormir(1500)
    await nav.ejecutar(`(() => {
      const t = ${JSON.stringify(conFoto.titulo.slice(0, 24))}
      const el = [...document.querySelectorAll('*')].reverse().find(n => n.children.length === 0 && n.textContent.includes(t))
      let n = el
      for (let i = 0; i < 8 && n; i++, n = n.parentElement) {
        if (n.onclick || n.tagName === 'BUTTON' || n.getAttribute('role') === 'button') { n.click(); return }
      }
      el?.click()
    })()`)
    await esperar(nav, `document.body.innerText.includes('Compartir')`, 20000)
    await dormir(2500)
    await nav.captura(`${CARPETA}/10-ficha-con-mi-foto-${m.nombre}.png`)
  }
  console.log('  10-ficha-con-mi-foto')

  // ── Y OTRA VUELTA CON EL BANNER PUESTO ─────────────────
  //
  // Desde el 13-10-2026 el banner de instalar solo sale en la SEGUNDA visita o
  // tras el primer gooal conseguido. Un navegador recién abierto es la primera
  // visita, así que sin esto las capturas no lo enseñarían NUNCA — y la mitad
  // de lo que había que revisar es justo que ya no tapa nada.
  //
  // Es el estado vacío otra vez: lo que pasa en verde sería el caso sin banner,
  // que es el que no importaba.
  console.log('\n── otra vuelta, forzando que salga el banner ──')
  await nav.ejecutar(`(() => {
    localStorage.setItem('install-visitas', '5')
    localStorage.removeItem('install-dismissed')
    sessionStorage.removeItem('install-sesion-contada')
  })()`)

  const conBanner = [
    ['02-tu', '/inicio', hayFoto],
    ['03-descubrir', '/explorar?tab=descubrir', hayFoto],
    ['04-buscar', '/explorar', hayFoto],
  ]
  for (const [n, url, listo] of conBanner) {
    for (const m of MOVILES) {
      await nav.tamano(m.ancho, m.alto)
      await nav.ir(BASE + url, { espera: 0 })
      await esperar(nav, listo)
      await dormir(3000)
      await nav.captura(`${CARPETA}/${n}-CON-BANNER-${m.nombre}.png`)
    }
    console.log('  ' + n + ' con banner')
  }

  // ── Y DONDE NO DEBE SALIR, QUE NO SALGA ────────────────
  //
  // Con el contador puesto a cinco: si apareciera aquí sería un fallo.
  //
  // SE HACE SIN SESIÓN, y esto no es un detalle: con sesión, `/` REDIRIGE a
  // `/inicio`, así que la comprobación miraba otra pantalla y cantaba un fallo
  // que no existía. Por eso ahora se mira también la RUTA en la que acabó, no
  // solo lo que pone en el texto — una comprobación que no sabe en qué página
  // está no comprueba nada.
  await nav.limpiarSesion()
  for (const [n, url] of [['01-portada', '/'], ['09-publica', `/g/${viajes[0].id}`]]) {
    await nav.tamano(375, 667)
    await nav.ir(BASE + url, { espera: 0 })
    await esperar(nav, hayTexto(60))
    await nav.ejecutar(`(() => {
      localStorage.setItem('install-visitas', '5')
      localStorage.removeItem('install-dismissed')
      sessionStorage.removeItem('install-sesion-contada')
    })()`)
    await nav.ir(BASE + url, { espera: 0 })
    await esperar(nav, hayTexto(60))
    await dormir(2500)
    const r = await nav.ejecutar(`({ ruta: location.pathname, sale: document.body.innerText.includes('Instala GooALS') })`)
    console.log(`  ${n}: acabó en ${r.ruta} · ¿sale el banner? ${r.sale ? 'SÍ — ESTO ES UN FALLO' : 'no, correcto'}`)
    await nav.captura(`${CARPETA}/${n}-CON-BANNER-375x667.png`)
  }

  console.log(`\ncapturas en ${CARPETA}/`)
} finally {
  if (nav) await nav.cerrar()
  // Las fotos subidas se van con la cuenta: el cubo no tiene limpieza
  // automática, así que se borran aquí a mano, por ruta.
  for (const id of creadas) {
    const { data: suyas } = await s.storage.from('logros-privados').list(id)
    if (suyas?.length) await s.storage.from('logros-privados').remove(suyas.map(f => `${id}/${f.name}`))
  }
  await limpiar(creadas)
  console.log('cuentas y fotos de prueba borradas.')
}
