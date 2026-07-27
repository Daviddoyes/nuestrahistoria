// Genera los iconos de la PWA con el branding GooALS.
// Usa @napi-rs/canvas (binarios precompilados, sin build tools, texto fiable en
// Windows) — misma API que 'canvas'. Ejecutar desde la raíz del repo:
//   node scripts/generar-iconos.mjs
import { createCanvas } from '@napi-rs/canvas'
import { writeFileSync } from 'fs'

const NEGRO = '#0A0A0A'
const TURQUESA = '#1DE9B6'
const BLANCO = '#FFFFFF'

function iconoGrande(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = NEGRO
  ctx.fillRect(0, 0, size, size)

  const fontSize = Math.floor(size * 0.28)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = TURQUESA
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.fillText('Goo', size / 2, size * 0.38)

  ctx.fillStyle = BLANCO
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.fillText('ALS', size / 2, size * 0.65)

  return canvas.toBuffer('image/png')
}

for (const size of [192, 512]) {
  writeFileSync(`public/icon-${size}.png`, iconoGrande(size))
  console.log(`✓ icon-${size}.png generado`)
}

// Favicon 32×32 con la "G". Se escribe en public/ y en src/app/ (Next sirve el
// favicon real de la tab desde src/app/favicon.ico).
const fav = createCanvas(32, 32)
const fctx = fav.getContext('2d')
fctx.fillStyle = NEGRO
fctx.fillRect(0, 0, 32, 32)
fctx.fillStyle = TURQUESA
fctx.font = 'bold 18px sans-serif'
fctx.textAlign = 'center'
fctx.textBaseline = 'middle'
fctx.fillText('G', 16, 17)
const favBuf = fav.toBuffer('image/png')
writeFileSync('public/favicon.ico', favBuf)
writeFileSync('src/app/favicon.ico', favBuf)
console.log('✓ favicon generado (public/ + src/app/)')
