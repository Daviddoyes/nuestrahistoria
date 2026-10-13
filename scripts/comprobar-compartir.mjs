// ¿FUNCIONA EL BOTÓN DE COMPARTIR? Un sí/no medido, en un navegador de verdad.
//
//   npm run compartir
//
// Lo que comprueba, que es lo que no se ve compilando:
//
//   1. que el botón SALE en la ficha de un gooal
//   2. que al pulsarlo se llama a `navigator.share` DENTRO del gesto (se
//      sustituye por un espía: en un navegador sin ventana no existe)
//   3. que la dirección que manda lleva el @usuario de quien está dentro,
//      que es la mitad del encargo
//   4. y que esa dirección, pedida SIN SESIÓN, contesta 200 y firma con ese
//      nombre — o sea, que el enlace que se acaba de generar funciona
//
// Crea UNA cuenta de prueba y la borra al terminar, por id. No marca ningún
// gooal a propósito: así no mueve `veces_completado` y no hay que recontar.
import { createClient } from '@supabase/supabase-js'
import { abrirNavegador, UA_ANDROID } from './lib/navegador.mjs'
import { entrar, limpiar } from './comprobar-pantallas.mjs'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const dormir = ms => new Promise(r => setTimeout(r, ms))

let fallos = 0
const comprobar = (bien, texto, detalle = '') => {
  console.log(`  ${bien ? 'SI ' : 'NO '} ${texto}${detalle ? '   → ' + detalle : ''}`)
  if (!bien) fallos++
}

const creadas = []
let nav = null
try {
  // ── La cuenta ───────────────────────────────────────────
  const email = `comp-${Date.now()}@gooals-prueba.invalid`
  const clave = `Pr${Math.random().toString(36).slice(2)}!9x`
  const usuario = `prueba_compartir_${Date.now()}`.slice(0, 20)
  const { data: u, error } = await s.auth.admin.createUser({ email, password: clave, email_confirm: true })
  if (error) throw new Error(error.message)
  creadas.push(u.user.id)
  const { error: eP } = await s.from('profiles').insert({
    id: u.user.id, nombre: 'Prueba Compartir', email, username: usuario,
    onboarding_completado: true, intereses: ['viajes'],
  })
  if (eP) throw new Error('profiles: ' + eP.message)
  console.log(`cuenta de prueba: @${usuario}`)

  // Un gooal publicado cualquiera, de los que tienen foto.
  const { data: gooals, error: eG } = await s.from('gooals_v2')
    .select('id, titulo').eq('estado', 'verificado').not('imagen_url', 'is', null).order('id').limit(1)
  if (eG) throw new Error(eG.message)
  const gooal = gooals[0]
  console.log(`gooal:            «${gooal.titulo}»\n`)

  // ── El navegador ────────────────────────────────────────
  nav = await abrirNavegador({ ancho: 390, alto: 844, ua: UA_ANDROID, puerto: 9361 })
  await entrar(nav, email, clave)

  await nav.ir(`${BASE}/explorar?tab=descubrir`, { espera: 8000 })

  // Se abre la ficha pulsando la tarjeta del gooal. Más fiable que buscarla
  // por posición: se busca por su título, que es lo que se ve.
  const abierta = await nav.ejecutar(`(() => {
    const t = ${JSON.stringify(gooal.titulo)}
    const el = [...document.querySelectorAll('*')].reverse().find(n =>
      n.children.length === 0 && n.textContent.trim() === t)
    if (!el) return 'no encuentro el título en pantalla'
    let n = el
    for (let i = 0; i < 8 && n; i++, n = n.parentElement) {
      if (n.onclick || n.tagName === 'BUTTON' || n.getAttribute('role') === 'button') { n.click(); return 'ok' }
    }
    el.click()
    return 'ok (he pulsado el texto)'
  })()`)
  console.log('abrir la ficha: ' + abierta)
  await dormir(2500)

  // ── El espía ────────────────────────────────────────────
  // En un navegador sin ventana `navigator.share` no existe, así que el botón
  // se iría al portapapeles y no probaríamos el camino de verdad. Se pone uno
  // falso que apunta lo que recibe Y SI HABÍA GESTO: eso último es lo que de
  // verdad falla en un iPhone.
  await nav.ejecutar(`(() => {
    window.__compartido = null
    navigator.share = async datos => {
      window.__compartido = { ...datos, gesto: navigator.userActivation ? navigator.userActivation.isActive : null }
    }
  })()`)

  // El botón se marca para poder señalarlo, y se pulsa CON UN DEDO DE VERDAD
  // (`nav.pulsar`), no con `.click()`. Es la diferencia entera de esta prueba:
  // un `.click()` escrito en JavaScript no cuenta como gesto de la persona, y
  // entonces la comprobación del gesto no podría salir bien NUNCA — una prueba
  // cuyo resultado esperado es imposible no falla, confunde.
  const marcado = await nav.ejecutar(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Compartir')
    if (!b) return 'NO ESTÁ el botón'
    b.id = 'boton-compartir-prueba'
    return 'ok'
  })()`)
  comprobar(marcado === 'ok', 'el botón «Compartir» está en la ficha', marcado)
  if (marcado === 'ok') await nav.pulsar('#boton-compartir-prueba')
  await dormir(1200)

  const compartido = await nav.ejecutar('window.__compartido')
  comprobar(Boolean(compartido), 'al pulsarlo se abre el share sheet del sistema')
  if (compartido) {
    console.log('      lo que manda: ' + JSON.stringify(compartido))
    comprobar(compartido.url?.includes(`/g/${gooal.id}`), 'la dirección es la del gooal')
    comprobar(compartido.url?.includes(`?de=${usuario}`), 'y lleva MI @usuario', compartido.url)
    comprobar(compartido.title === gooal.titulo, 'el título va de asunto')
    comprobar(compartido.text === undefined, 'y no manda texto suelto, que duplicaría la tarjeta')
    comprobar(compartido.gesto !== false, 'se llama DENTRO del gesto (lo que exige Safari)')

    // ── Y lo último: que ese enlace funcione sin cuenta ───
    const ruta = compartido.url.replace(/^https?:\/\/[^/]+/, '')
    const r = await fetch(BASE + ruta)
    const html = await r.text()
    comprobar(r.ok, 'el enlace generado contesta 200 sin sesión', String(r.status))
    comprobar(html.includes('Prueba Compartir'), 'y la página firma con quien lo manda')
    comprobar(
      html.includes(`/g/${gooal.id}/tarjeta?de=${usuario}`),
      'y enlaza su tarjeta, con la firma dentro',
    )
    comprobar(!/@gooals-prueba\.invalid/.test(html), 'sin que aparezca ningún correo en el HTML')
  }

  // ── Y EL ORDENADOR, QUE NO TIENE SHARE SHEET ──────────
  //
  // En un portátil `navigator.share` no existe, así que el botón se va al
  // portapapeles. Ese camino lo va a usar David cada vez que pruebe algo, y
  // si fallara saldría una línea roja de error en vez de un «copiado».
  // El share sheet se quita PONIÉNDOLO a undefined, no con `delete`: `share`
  // vive en el prototipo, así que borrarlo de la instancia hace reaparecer el
  // de Edge, que sin ventana se queda colgado — y entonces el botón parece no
  // hacer nada y la prueba acusa al código. Costó un rato.
  //
  // El portapapeles aquí es el DE VERDAD, que es mejor prueba que un doble.
  console.log('\nsin share sheet (como en un ordenador):')
  await nav.ejecutar('navigator.share = undefined')
  await nav.pulsar('#boton-compartir-prueba')
  await dormir(900)
  const tras = await nav.ejecutar(`(() => {
    const b = document.getElementById('boton-compartir-prueba')
    return {
      boton: b ? b.textContent.trim() : '(no está)',
      rojo: document.body.innerText.includes('No se ha podido compartir'),
    }
  })()`)
  comprobar(tras.boton === 'Enlace copiado', 'el enlace se copia y el botón lo dice', tras.boton)
  comprobar(!tras.rojo, 'sin ningún error')

  // ── Y SI EL PORTAPAPELES NO DEJA ──────────────────────
  //
  // Pasa de verdad: en una pestaña sin foco el navegador lo prohíbe. Lo que
  // NO puede pasar es que el botón se quede MUDO — una acción que no hace
  // nada y no dice nada es la peor de las tres.
  //
  // El doble se instala con `defineProperty` porque `navigator.clipboard` es
  // de solo lectura: asignarlo a secas no da ningún error y no cambia nada,
  // que es como esta prueba estuvo un rato diciendo cosas falsas.
  console.log('\ny si el portapapeles no deja:')
  await nav.ejecutar(`Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async () => { throw new DOMException('Document is not focused.', 'NotAllowedError') } },
  })`)
  await dormir(2500)   // a que se apague el «Enlace copiado» de antes
  await nav.pulsar('#boton-compartir-prueba')
  await dormir(900)
  const mudo = await nav.ejecutar(`document.body.innerText.includes('No se ha podido compartir')`)
  comprobar(mudo === true, 'se dice que no se ha podido, en vez de no hacer nada')

  await nav.captura('Claude outputs/6-boton-compartir.png')
  console.log('\ncaptura: Claude outputs/6-boton-compartir.png')
} finally {
  if (nav) await nav.cerrar()
  await limpiar(creadas)
  console.log('\ncuenta de prueba borrada.')
}

console.log(fallos === 0 ? '\nTODO BIEN.' : `\nHAY ${fallos} COMPROBACIÓN(ES) QUE NO PASAN.`)
process.exit(fallos === 0 ? 0 : 1)
