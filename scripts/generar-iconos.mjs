// Genera todos los iconos de la app a partir del icono de marca.
//
//   node scripts/generar-iconos.mjs
//
// Fuente única: public/marca/gooals-icono.svg (la diana en Aurora). Si la marca cambia, se
// cambia ese SVG y se vuelve a ejecutar esto; no se retocan PNG a mano.
//
// Usa sharp, que ya viene instalado con Next (no es dependencia directa).

import sharp from 'sharp'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const FUENTE = 'public/marca/gooals-icono.svg'
const FONDO = '#0B0B0B'

/**
 * Ancho del dibujo respecto al lado del icono.
 *
 * 0.78 y no menos: a 16 px, que es como se ve en la pestaña del navegador, con
 * el 62 % anterior el anillo de la diana se quedaba fino y no se leía. Probado
 * en una pestaña de Chrome de verdad a 16, 32 y 48.
 */
const ANCHO_NORMAL = 0.78
/**
 * En el "maskable" Android recorta el icono en círculo, gota o squircle, y solo
 * garantiza visible el 80 % central. Sube con el normal, pero se queda por
 * debajo de ese 80 %: la diana es un círculo, así que con 0.65 entra entera
 * aunque el recorte sea el más agresivo.
 */
const ANCHO_MASKABLE = 0.65

/**
 * Centrado óptico: cuánto se sube el dibujo, en fracción del lado.
 * Con la diana va a 0: es un círculo, así que el centro geométrico y el óptico
 * son el mismo. Lo necesitaba el logo anterior, más pesado por abajo.
 */
const SUBIDA_OPTICA = Number(process.env.SUBIDA_OPTICA ?? 0)

const original = readFileSync(FUENTE, 'utf8')
const [vx, vy, vw] = original.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
const contenido = original.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')

/**
 * Caja real del dibujo en unidades del viewBox. El lienzo del SVG trae margen
 * alrededor y no es cuadrado: hay que centrar el dibujo, no el lienzo.
 */
async function medirDibujo() {
  const render = 2000
  const { info } = await sharp(Buffer.from(original), { density: (72 * render) / vw })
    .trim({ threshold: 1 })
    .png()
    .toBuffer({ resolveWithObject: true })
  const k = vw / render
  return {
    x: vx - info.trimOffsetLeft * k,
    y: vy - info.trimOffsetTop * k,
    w: info.width * k,
    h: info.height * k,
  }
}

/** SVG cuadrado de 512 con fondo sólido y el dibujo centrado al ancho pedido. */
function svgCuadrado(caja, ancho) {
  const L = 512
  const w = L * ancho
  const h = (w * caja.h) / caja.w
  const x = (L - w) / 2
  const y = (L - h) / 2 - L * SUBIDA_OPTICA
  const r = (n) => +n.toFixed(2)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${L}" role="img" aria-label="gooals">
  <rect width="${L}" height="${L}" fill="${FONDO}"/>
  <svg x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" viewBox="${r(caja.x)} ${r(caja.y)} ${r(caja.w)} ${r(caja.h)}">${contenido}</svg>
</svg>
`
}

/** PNG opaco (sin canal alfa) del lado pedido. */
function png(svg, lado) {
  // Se rasteriza al doble y se reduce: bordes más limpios en los tamaños pequeños.
  return sharp(Buffer.from(svg), { density: (72 * lado * 2) / 512 })
    .resize(lado, lado)
    .flatten({ background: FONDO })
    .png()
    .toBuffer()
}

/**
 * PNG para meter dentro del .ico. Igual de opaco a la vista (el fondo va
 * pintado), pero CON canal alfa: el formato ICO exige RGBA en sus PNG internos,
 * y sin él Next rompe el build ("The PNG is not in RGBA format").
 */
function pngParaIco(svg, lado) {
  return sharp(Buffer.from(svg), { density: (72 * lado * 2) / 512 })
    .resize(lado, lado)
    .ensureAlpha()
    .png()
    .toBuffer()
}

/**
 * .ico de verdad con varias imágenes PNG dentro. El anterior era un PNG
 * renombrado a .ico, que algunos navegadores y Windows no leen.
 */
function ico(pngs) {
  const cabecera = Buffer.alloc(6)
  cabecera.writeUInt16LE(0, 0)
  cabecera.writeUInt16LE(1, 2)
  cabecera.writeUInt16LE(pngs.length, 4)
  let desplazamiento = 6 + 16 * pngs.length
  const entradas = pngs.map(({ lado, datos }) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(lado >= 256 ? 0 : lado, 0)
    e.writeUInt8(lado >= 256 ? 0 : lado, 1)
    e.writeUInt8(0, 2)
    e.writeUInt8(0, 3)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(datos.length, 8)
    e.writeUInt32LE(desplazamiento, 12)
    desplazamiento += datos.length
    return e
  })
  return Buffer.concat([cabecera, ...entradas, ...pngs.map((p) => p.datos)])
}

const caja = await medirDibujo()
const normal = svgCuadrado(caja, ANCHO_NORMAL)
const maskable = svgCuadrado(caja, ANCHO_MASKABLE)

mkdirSync('public/icons', { recursive: true })

// Pestaña del navegador. Next los detecta en src/app/ y pone las etiquetas.
writeFileSync('src/app/icon.svg', normal)
writeFileSync(
  'src/app/favicon.ico',
  ico(await Promise.all([16, 32, 48].map(async (lado) => ({ lado, datos: await pngParaIco(normal, lado) }))))
)

// iPhone: pantalla de inicio. Opaco: iOS pinta de negro la transparencia.
writeFileSync('src/app/apple-icon.png', await png(normal, 180))

// Android (manifiesto).
writeFileSync('public/icons/icon-192.png', await png(normal, 192))
writeFileSync('public/icons/icon-512.png', await png(normal, 512))
writeFileSync('public/icons/icon-maskable-512.png', await png(maskable, 512))

console.log('Caja del dibujo (unidades del SVG):', Object.fromEntries(Object.entries(caja).map(([k, v]) => [k, +v.toFixed(1)])))
console.log('✓ src/app/icon.svg')
console.log('✓ src/app/favicon.ico (16, 32, 48)')
console.log('✓ src/app/apple-icon.png (180)')
console.log('✓ public/icons/icon-192.png, icon-512.png, icon-maskable-512.png')
