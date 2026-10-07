/**
 * El sello que se pega encima de una historia de Instagram.
 *
 * Un PNG CON FONDO TRANSPARENTE que contiene solo la caja: el título del gooal,
 * el logotipo y los puntos. Ni nombre de usuario, ni fecha, ni foto.
 *
 * Que no lleve foto no es solo estética: una foto del catálogo viene de
 * Wikimedia Commons y 203 de las 223 licencias obligan a citar al autor, lo que
 * significaría imprimir el crédito dentro de la imagen que alguien se lleva a
 * su historia. Sin foto, ese problema no existe.
 *
 * ── SE DIBUJA EN UN CANVAS, NO SE CAPTURA EL DOM ──────────
 *
 * El canvas da el fondo transparente gratis y no depende de que un conversor de
 * HTML a imagen interprete bien la sombra, el radio y el SVG del logo. Lo único
 * que hay que escribir a mano es el salto de línea del título.
 *
 * ── LA LETRA, QUE ES LA TRAMPA DE VERDAD ──────────────────
 *
 * next/font registra Bebas Neue con un nombre interno generado, NO "Bebas
 * Neue": hay que leerlo de la variable CSS. Y hay que ESPERAR a que esté
 * cargada antes de dibujar, porque si no el canvas tira de la letra del sistema
 * y no da ningún error: sale un sello con otra tipografía y nadie se entera
 * hasta que lo mira.
 */

/** Todo a x3 para que se vea nítido en el móvil. */
const E = 3

const CAJA_ANCHO = 238 * E
const RELLENO_X = 22 * E
const RELLENO_ARRIBA = 20 * E
const RELLENO_ABAJO = 18 * E
const RADIO = 4 * E
const BORDE = 3 * E
/** Margen transparente alrededor, o la sombra sale cortada. */
const MARGEN = 48 * E

const HUECO_TITULO_PIE = 15 * E
const PIE_TAMANO = 11.5 * E
const INTERLINEADO = 1.02
const ESPACIADO = 0.012          // em, el letter-spacing del título
const MAX_LINEAS = 4
/** De mayor a menor. El título baja de cuerpo hasta caber en cuatro líneas. */
const TAMANOS = [29 * E, 25 * E, 22 * E]

const AURORA = '#00D1A7'
const ARENA = '#F5F5F2'
const FONDO = 'rgba(11,11,11,0.92)'

export type Sello = { blob: Blob; nombre: string }

/** "Hacer cumbre en el Kilimanjaro" -> "hacer-cumbre-en-el-kilimanjaro" */
export function slug(titulo: string): string {
  return titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'gooal'
}

/**
 * El nombre real de la letra, que next/font genera.
 *
 * Si la variable no está (porque alguien quitó la fuente del layout), se
 * devuelve el nombre de siempre y el canvas dibujará con la de sistema. No se
 * lanza un error: un sello feo es mejor que un botón que no hace nada.
 */
function familiaBebas(): string {
  const v = getComputedStyle(document.body).getPropertyValue('--font-bebas').trim()
  return v || '"Bebas Neue"'
}

/** Corta el título en líneas, partiendo las palabras que no quepan ni solas. */
function enLineas(ctx: CanvasRenderingContext2D, texto: string, ancho: number, maxLineas: number): string[] | null {
  const palabras = texto.split(/\s+/)
  const lineas: string[] = []
  let linea = ''

  const cabe = (t: string) => ctx.measureText(t).width <= ancho

  for (const palabra of palabras) {
    const prueba = linea ? `${linea} ${palabra}` : palabra
    if (cabe(prueba)) { linea = prueba; continue }
    if (linea) { lineas.push(linea); linea = '' }

    // Una palabra sola más ancha que la caja: se parte por letras. Pasa con
    // nombres largos y es lo único que no arregla bajar el cuerpo.
    let resto = palabra
    while (!cabe(resto)) {
      let corte = resto.length - 1
      while (corte > 1 && !cabe(resto.slice(0, corte))) corte--
      if (corte <= 1) break
      lineas.push(resto.slice(0, corte))
      resto = resto.slice(corte)
    }
    linea = resto
  }
  if (linea) lineas.push(linea)
  return lineas.length > maxLineas ? null : lineas
}

/** Dibuja texto con espaciado entre letras, que el canvas no tiene de serie. */
function textoEspaciado(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, espaciado: number) {
  if (!espaciado) { ctx.fillText(texto, x, y); return }
  let cursor = x
  for (const letra of texto) {
    ctx.fillText(letra, cursor, y)
    cursor += ctx.measureText(letra).width + espaciado
  }
}

function anchoEspaciado(ctx: CanvasRenderingContext2D, texto: string, espaciado: number): number {
  if (!espaciado) return ctx.measureText(texto).width
  let ancho = 0
  for (const letra of texto) ancho += ctx.measureText(letra).width + espaciado
  return ancho - espaciado
}

function caja(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, mal) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => ok(img)
    img.onerror = () => mal(new Error('no se pudo cargar ' + src))
    img.src = src
  })
}

/**
 * Dibuja el sello y devuelve el PNG.
 *
 * Se llama al ABRIR la pantalla, no al pulsar el botón: en iOS, compartir tiene
 * que ocurrir en el mismo gesto del dedo, y si hay un await generando el PNG por
 * delante, Safari lo bloquea. Con el blob ya hecho, al pulsar solo queda
 * compartirlo.
 */
export async function dibujarSello(titulo: string, puntos: number): Promise<Sello> {
  const familia = familiaBebas()

  // Esperar a la letra ANTES de medir nada: si se mide con la de sistema, los
  // saltos de línea salen calculados para otra tipografía.
  try {
    await document.fonts.load(`400 ${TAMANOS[0]}px ${familia}`)
    await document.fonts.ready
  } catch {
    // Si falla, se dibuja igual. Mejor un sello con otra letra que ninguno.
  }

  const medidor = document.createElement('canvas').getContext('2d')!
  const anchoTexto = CAJA_ANCHO - RELLENO_X * 2 - BORDE

  let tamano = TAMANOS[TAMANOS.length - 1]
  let lineas: string[] = []
  for (const t of TAMANOS) {
    medidor.font = `400 ${t}px ${familia}`
    const corte = enLineas(medidor, titulo.toUpperCase(), anchoTexto, MAX_LINEAS)
    if (corte) { tamano = t; lineas = corte; break }
  }
  if (!lineas.length) {
    medidor.font = `400 ${tamano}px ${familia}`
    lineas = (enLineas(medidor, titulo.toUpperCase(), anchoTexto, 99) ?? [titulo]).slice(0, MAX_LINEAS)
  }

  const altoTitulo = lineas.length * tamano * INTERLINEADO
  const altoCaja = RELLENO_ARRIBA + altoTitulo + HUECO_TITULO_PIE + PIE_TAMANO + RELLENO_ABAJO

  const canvas = document.createElement('canvas')
  canvas.width = CAJA_ANCHO + MARGEN * 2
  canvas.height = Math.round(altoCaja) + MARGEN * 2
  const ctx = canvas.getContext('2d')!
  // NADA de fillRect de fondo: el PNG tiene que salir transparente. Un sello con
  // fondo blanco es el fallo típico de esto y no lo ve ninguna prueba automática.

  const x = MARGEN
  const y = MARGEN

  // La caja, con su sombra.
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 34 * E
  ctx.shadowOffsetY = 14 * E
  ctx.fillStyle = FONDO
  caja(ctx, x, y, CAJA_ANCHO, altoCaja, RADIO)
  ctx.fill()
  ctx.restore()

  // El filo izquierdo, recortado al radio de la caja.
  ctx.save()
  caja(ctx, x, y, CAJA_ANCHO, altoCaja, RADIO)
  ctx.clip()
  ctx.fillStyle = AURORA
  ctx.fillRect(x, y, BORDE, altoCaja)
  ctx.restore()

  // El título.
  ctx.fillStyle = ARENA
  ctx.font = `400 ${tamano}px ${familia}`
  ctx.textBaseline = 'alphabetic'
  const espaciado = tamano * ESPACIADO
  const izquierda = x + BORDE + RELLENO_X
  let linea = y + RELLENO_ARRIBA + tamano * 0.82
  for (const l of lineas) {
    textoEspaciado(ctx, l, izquierda, linea, espaciado)
    linea += tamano * INTERLINEADO
  }

  // El pie: el logotipo a la izquierda, los puntos a la derecha. Nada más.
  const basePie = y + altoCaja - RELLENO_ABAJO - PIE_TAMANO * 0.15
  const derecha = x + CAJA_ANCHO - RELLENO_X

  ctx.font = `700 ${PIE_TAMANO}px ${getComputedStyle(document.body).getPropertyValue('--font-poppins').trim() || 'Poppins'}`
  ctx.fillStyle = AURORA
  const texto = `${puntos} ${puntos === 1 ? 'punto' : 'puntos'}`
  ctx.fillText(texto, derecha - ctx.measureText(texto).width, basePie)

  // El logotipo de verdad, el mismo que la cabecera de la app. Al 50%, como la
  // maqueta: el pie es discreto y el título es lo que manda.
  try {
    const logo = await cargarImagen('/marca/gooals-logotipo-oscuro.svg')
    const alto = PIE_TAMANO * 0.95
    const ancho = alto * (logo.naturalWidth / logo.naturalHeight || 3414 / 1015)
    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.drawImage(logo, izquierda, basePie - alto * 0.86, ancho, alto)
    ctx.restore()
  } catch {
    // Sin logo antes que con un logo roto.
  }

  const blob = await new Promise<Blob>((ok, mal) => {
    canvas.toBlob(b => (b ? ok(b) : mal(new Error('toBlob falló'))), 'image/png')
  })
  return { blob, nombre: `gooals-${slug(titulo)}.png` }
}

export type Salida = 'copiado' | 'compartir' | 'descargado'

/**
 * Los tres caminos, en orden: portapapeles, hoja de compartir, descarga.
 *
 * Cae de uno a otro sin avisar —a nadie le importa que el portapapeles no
 * estuviera disponible— pero SÍ se dice qué ha pasado al final: no es lo mismo
 * tener que ir a pegarlo que ir a buscarlo a la galería.
 */
export async function sacarSello({ blob, nombre }: Sello, titulo: string): Promise<Salida> {
  try {
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      return 'copiado'
    }
  } catch { /* al siguiente */ }

  try {
    const fichero = new File([blob], nombre, { type: 'image/png' })
    if (navigator.canShare?.({ files: [fichero] })) {
      await navigator.share({ files: [fichero], title: titulo })
      return 'compartir'
    }
  } catch { /* al siguiente */ }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return 'descargado'
}
