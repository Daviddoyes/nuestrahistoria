// ¿Se sale algo por el lado en algún móvil? Un sí/no medido, no una captura.
//
//   npm run pantallas
//
// ── POR QUÉ ESTO EXISTE ───────────────────────────────────
//
// Porque probar a mano en siete anchos y cuatro altos no lo hace nadie, y
// porque un elemento que se sale por la derecha **no da ningún error**: la
// pantalla se ve bien en el móvil en el que miras y mal en el de otro.
//
// ── Y LO MÁS IMPORTANTE: SIEMBRA EL CASO EXTREMO ──────────
//
// Con los datos de hoy esto pasaría entero en verde y no habría servido para
// nada: el catálogo no tiene a nadie con 120 gooals en una categoría ni con un
// nombre de los que parten una cabecera. **El caso que rompe no es el normal.**
//
// Así que crea una cuenta de prueba a propósito: 120 gooals en una categoría,
// nombre y usuario largos, sin foto, con pendientes, con un amigo que comparte
// gooals en los tres cruces de "en común" y con un post en el muro. Al terminar
// las borra las dos, por id y una a una.
//
// Lo que NO hace: tocar nada que no haya creado él.
import { createClient } from '@supabase/supabase-js'
import { abrirNavegador, UA_ANDROID } from './lib/navegador.mjs'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const PUERTO = 9351

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const dormir = ms => new Promise(r => setTimeout(r, ms))

// ── Los móviles que hay que soportar ──────────────────────
// 320 y 568 son el suelo que todavía existe (un iPhone SE viejo); 393 es el
// iPhone 16 Pro; 360 es la mayoría de los Android.
const ANCHOS = [320, 360, 375, 390, 393, 412, 430]
const ALTOS = [568, 667, 844, 932]

/**
 * Lo que mide el navegador en cada pantalla.
 *
 * Dos formas de detectarlo, porque una sola no basta:
 *
 * 1. `scrollWidth > innerWidth` del documento. Es la clásica, pero **aquí se
 *    queda corta**: el área que hace scroll es un div de dentro de AppShell, no
 *    el documento, así que un desborde dentro de ella no mueve este número.
 * 2. Recorrer TODOS los elementos y mirar su rectángulo. Esta es la que vale.
 *
 * Y una exclusión imprescindible: lo que vive dentro de algo que se desliza a
 * lo ancho a propósito (las tiras de tarjetas) **sobresale por diseño**. Si no
 * se excluye, el informe se llena de falsos positivos y se deja de mirar, que
 * es la forma más segura de tirar una comprobación a la basura.
 */
const MEDIR = `(() => {
  const ancho = window.innerWidth
  const fuera = []

  const seDesliza = el => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX
      if (ox === 'auto' || ox === 'scroll') return true
    }
    return false
  }

  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    const porLaDerecha = r.right - ancho
    const porLaIzquierda = -r.left
    if (porLaDerecha <= 0.5 && porLaIzquierda <= 0.5) continue
    if (seDesliza(el)) continue

    // Quién es, en una línea que se pueda buscar en el repo.
    const quien = el.tagName.toLowerCase()
      + (el.id ? '#' + el.id : '')
      + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/ +/).slice(0, 2).join('.') : '')
    fuera.push({
      quien,
      texto: (el.textContent || '').trim().slice(0, 40),
      derecha: Math.round(porLaDerecha * 10) / 10,
      izquierda: Math.round(porLaIzquierda * 10) / 10,
    })
  }

  // De un elemento que se sale, sus hijos se salen también: se queda el de más
  // arriba de cada rama para que el informe diga una cosa y no veinte.
  const sueltos = fuera.filter((f, i) => !fuera.some((g, j) => j < i && f.quien === g.quien && f.derecha === g.derecha))

  return {
    documento: Math.round(document.documentElement.scrollWidth - ancho),
    fuera: sueltos.slice(0, 8),
    cuantos: fuera.length,
  }
})()`

// ── La siembra ────────────────────────────────────────────

/** Una fila por insert, nombrando visibilidad siempre, y mirando el error. */
async function marcar(userId, gooal, estado) {
  const fila = { user_id: userId, gooal_id: gooal.id, estado, visibilidad: 'amigos' }
  if (estado === 'completado') {
    fila.puntos_ganados = gooal.puntos
    fila.completado_at = new Date().toISOString()
  }
  const { error } = await s.from('user_gooals').insert(fila)
  if (error) throw new Error(`user_gooals ${estado}: ${error.message}`)
}

async function crearCuenta(nombre, usuario) {
  const email = `pant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@gooals-prueba.invalid`
  const clave = `Pr${Math.random().toString(36).slice(2)}!9x`
  const { data: u, error } = await s.auth.admin.createUser({ email, password: clave, email_confirm: true })
  if (error) throw new Error(error.message)
  const { error: eP } = await s.from('profiles').insert({
    id: u.user.id, nombre, email, username: usuario.slice(0, 20),
    onboarding_completado: true, intereses: ['viajes', 'deporte', 'gastronomia'],
  })
  if (eP) throw new Error('profiles: ' + eP.message)
  return { id: u.user.id, email, clave }
}

async function gooalsDe(categoria, cuantos, desde = 0) {
  const { data, error } = await s.from('gooals_v2')
    .select('id, puntos').eq('activo', true).eq('estado', 'verificado').eq('categoria', categoria)
    .order('id').range(desde, desde + cuantos - 1)
  if (error) throw new Error(error.message)
  if (data.length !== cuantos) throw new Error(`en ${categoria} pedía ${cuantos} y hay ${data.length}`)
  return data
}

/**
 * El caso extremo, que es el único que sirve. Devuelve las dos cuentas creadas
 * y con cuál hay que entrar.
 */
export async function sembrarExtremo(creadas) {
  // Nombre y usuario largos a propósito: son los que parten una cabecera.
  const yo = await crearCuenta(
    'Maria del Carmen Etxeberria Goikoetxea',
    `mariadelcarmenetxe${Date.now()}`,
  )
  creadas.push(yo.id)

  const viajes = await gooalsDe('viajes', 120)
  for (const g of viajes) await marcar(yo.id, g, 'completado')
  for (const [cat, n] of [['deporte', 14], ['naturaleza', 7], ['gastronomia', 3], ['vida', 1]]) {
    for (const g of await gooalsDe(cat, n)) await marcar(yo.id, g, 'completado')
  }
  // Eventos se queda a cero: hace falta una burbuja vacía en el dibujo.
  const pendientes = await gooalsDe('eventos', 9)
  for (const g of pendientes) await marcar(yo.id, g, 'pendiente')

  // La amiga, para las tres filas de "en común" y para el muro.
  const ella = await crearCuenta('Ariadna Puigdemont', `ariadnapuig${Date.now()}`)
  creadas.push(ella.id)
  for (const g of pendientes.slice(0, 4)) await marcar(ella.id, g, 'pendiente')          // juntos
  const suyos = await gooalsDe('naturaleza', 5, 50)
  for (const g of suyos) await marcar(ella.id, g, 'completado')
  for (const g of suyos.slice(0, 2)) await marcar(yo.id, g, 'pendiente')                 // ella ya lo hizo
  for (const g of viajes.slice(0, 6)) await marcar(ella.id, g, 'completado')             // los dos

  for (const [a, b] of [[yo.id, ella.id], [ella.id, yo.id]]) {
    const { error } = await s.from('follows').insert({ follower_id: a, following_id: b })
    if (error) throw new Error('follows: ' + error.message)
  }

  const { data: suya } = await s.from('user_gooals')
    .select('id, gooal_id, puntos_ganados').eq('user_id', ella.id).eq('estado', 'completado').limit(1)
  const { error: ePost } = await s.from('muro_posts').insert({
    user_id: ella.id, user_gooal_id: suya[0].id, gooal_id: suya[0].gooal_id,
    puntos: suya[0].puntos_ganados, descripcion: 'Una descripción larga para ver si el muro aguanta un texto que no cabe en una línea.', likes: 0,
  })
  if (ePost) throw new Error('muro_posts: ' + ePost.message)

  // El cebo, comprobado. Si no entró, lo de abajo pasaría sin mirar nada.
  const { count } = await s.from('user_gooals').select('id', { count: 'exact', head: true }).eq('user_id', yo.id)
  if (count !== 120 + 14 + 7 + 3 + 1 + 9 + 2) throw new Error('la siembra no cuadra: ' + count)

  const { data: p } = await s.from('profiles').select('username').eq('id', ella.id).single()
  return { yo, usuarioDeElla: p.username }
}

export async function limpiar(creadas) {
  for (const id of creadas) {
    await s.from('muro_posts').delete().eq('user_id', id)
    await s.from('follows').delete().eq('follower_id', id)
    await s.from('follows').delete().eq('following_id', id)
    await s.from('user_gooals').delete().eq('user_id', id)
    await s.from('profiles').delete().eq('id', id)
    const { error } = await s.auth.admin.deleteUser(id)
    if (error) console.error('   NO se pudo borrar ' + id + ': ' + error.message)
  }
}

export async function entrar(nav, email, clave) {
  await nav.limpiarSesion()
  await nav.ir(BASE + '/', { espera: 3500 })
  await nav.ejecutar('localStorage.clear(); sessionStorage.clear()')
  await nav.ir(BASE + '/', { espera: 3500 })
  await nav.ejecutar(`(() => {
    const c = [...document.querySelectorAll('input')]
    const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true})) }
    set(c.find(i => i.type === 'email'), ${JSON.stringify(email)})
    set(c.find(i => i.type === 'password'), ${JSON.stringify(clave)})
    document.querySelector('form button[type=submit]').click()
  })()`)
  await dormir(9000)
}

// ── El recorrido ──────────────────────────────────────────

async function main() {
  const creadas = []
  let nav = null
  let problemas = 0
  try {
    console.log('Sembrando el caso extremo (120 gooals en una categoría, nombre largo, sin foto)...')
    const { yo, usuarioDeElla } = await sembrarExtremo(creadas)

    nav = await abrirNavegador({ ancho: 390, alto: 844, ua: UA_ANDROID, puerto: PUERTO })
    await entrar(nav, yo.email, yo.clave)

    const pantallas = [
      { nombre: 'Tú (entrada)', url: '/inicio' },
      { nombre: 'Buscar · Descubrir', url: '/explorar?tab=descubrir' },
      { nombre: 'Tus listas', url: '/perfil' },
      { nombre: 'Perfil ajeno · En común', url: `/perfil?u=${usuarioDeElla}`, enComun: true },
      { nombre: 'Muro', url: '/muro' },
    ]

    for (const p of pantallas) {
      console.log(`\n── ${p.nombre} ──`)
      await nav.ir(BASE + p.url, { espera: 7000 })
      if (p.enComun) {
        await nav.ejecutar(`[...document.querySelectorAll('[role=tab]')].find(t => t.textContent.trim() === 'En común')?.click()`)
        await dormir(1500)
      }

      for (const ancho of ANCHOS) {
        for (const alto of ALTOS) {
          await nav.tamano(ancho, alto)
          await dormir(350)
          const m = await nav.ejecutar(MEDIR)
          if (m.fuera.length === 0 && m.documento <= 0) continue
          problemas++
          console.log(`  ${ancho}x${alto}  ${m.cuantos} elemento(s) fuera` + (m.documento > 0 ? ` · el documento se pasa ${m.documento}px` : ''))
          for (const f of m.fuera) {
            const lado = f.derecha > 0.5 ? `+${f.derecha}px por la derecha` : `${f.izquierda}px por la izquierda`
            console.log(`      ${f.quien.padEnd(34)} ${lado.padEnd(26)} ${JSON.stringify(f.texto)}`)
          }
        }
      }
      if (problemas === 0) console.log('  nada se sale en ninguno de los 28 tamaños')
    }

    const quejas = nav.consolaDe().filter(l => /error|Error|EXCEPCION|use server/.test(l))
    if (quejas.length) {
      problemas++
      console.log('\n── LA CONSOLA DEL NAVEGADOR DIJO ALGO ──')
      for (const q of quejas.slice(0, 10)) console.log('   ' + q)
    }
  } finally {
    if (nav) await nav.cerrar()
    await limpiar(creadas)
  }

  console.log(problemas === 0
    ? '\nTODO CABE en los 7 anchos y los 4 altos.'
    : `\nHAY ${problemas} combinación(es) con algo fuera de la pantalla. Arriba está qué y cuánto.`)
  process.exit(problemas === 0 ? 0 : 1)
}

// Solo si se ejecuta directamente: la siembra también la usa el guion que
// prueba los candidatos del techo del universo.
if (process.argv[1] && process.argv[1].endsWith('comprobar-pantallas.mjs')) await main()
