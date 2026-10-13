// ¿LAS FOTOS REDUCIDAS SALEN BIEN? Un sí/no medido contra Supabase.
//
//   npm run fotos
//
// ── POR QUÉ EXISTE ESTO ───────────────────────────────────
//
// Porque una dirección de transformación mal construida NO DA ERROR: devuelve
// 200, devuelve una imagen, pesa menos — y está mal.
//
// Pasó el 13-10-2026, escribiendo esto mismo: `?width=440` a secas sobre una
// foto de 1024×1536 devuelve 440×1536, que no es la foto reducida sino una
// TIRA RECORTADA por los lados. Todo parecía correcto: la app compilaba, las
// imágenes se veían, pesaban menos. Lo único que lo delató fue mirar las
// medidas del fichero que llegaba.
//
// Así que esto pide cada tamaño de verdad y comprueba la PROPORCIÓN:
//
//   · donde se pide un alto (la caja es fija), la proporción tiene que ser la
//     de esa caja;
//   · donde no, la de la foto original — porque lo que se quería era
//     reducirla, no recortarla.
//
// Importa `urlFoto` DEL MÓDULO DE VERDAD. Una copia de la fórmula aquí dentro
// comprobaría la copia, que es justo lo que no sirve de nada.
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const { urlFoto, FOTO } = await import('../src/lib/fotos.ts')

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const CUANTAS = Number(process.env.CUANTAS ?? 8)

const { data, error } = await s.from('gooals_v2')
  .select('titulo, imagen_url').eq('estado', 'verificado').not('imagen_url', 'is', null)
  .order('id').limit(CUANTAS)
if (error) throw new Error(error.message)

let fallos = 0
let sumaOriginal = 0
const sumaPorSitio = {}

for (const g of data) {
  const bruto = Buffer.from(await (await fetch(g.imagen_url)).arrayBuffer())
  const original = await sharp(bruto).metadata()
  sumaOriginal += bruto.length
  console.log(`\n${g.titulo.slice(0, 46)}   ${original.width}x${original.height}  ${(bruto.length / 1024).toFixed(0)} KB`)

  for (const [sitio, medida] of Object.entries(FOTO)) {
    const r = await fetch(urlFoto(g.imagen_url, medida.ancho, medida.alto), { headers: { Accept: 'image/webp,*/*' } })
    if (!r.ok) {
      fallos++
      console.log(`   ${sitio.padEnd(18)}HTTP ${r.status} — no ha devuelto imagen`)
      continue
    }
    const b = Buffer.from(await r.arrayBuffer())
    const m = await sharp(b).metadata()
    sumaPorSitio[sitio] = (sumaPorSitio[sitio] ?? 0) + b.length

    const esperada = medida.alto ? medida.ancho / medida.alto : original.width / original.height
    const real = m.width / m.height
    const bien = Math.abs(real - esperada) < 0.02
    if (!bien) fallos++
    console.log(`   ${sitio.padEnd(18)}${(m.width + 'x' + m.height).padEnd(11)}${(b.length / 1024).toFixed(0).padStart(4)} KB   ` +
      (bien ? 'proporción OK' : `PROPORCIÓN MAL: ${real.toFixed(3)} y tenía que ser ${esperada.toFixed(3)}`))

    // Y que de verdad sea más ligera. Una transformación que devuelve algo más
    // pesado que la original es una transformación que no está sirviendo para
    // nada, aunque la proporción cuadre.
    if (b.length >= bruto.length) {
      fallos++
      console.log(`   ${' '.repeat(18)}PESA MÁS QUE LA ORIGINAL`)
    }
  }
}

console.log(`\n── LAS ${data.length} JUNTAS ──`)
console.log('   originales:        ' + (sumaOriginal / 1024).toFixed(0).padStart(5) + ' KB')
for (const [sitio, b] of Object.entries(sumaPorSitio)) {
  console.log('   ' + sitio.padEnd(19) + (b / 1024).toFixed(0).padStart(5) + ' KB   -> ' + (sumaOriginal / b).toFixed(1) + ' veces menos')
}
console.log(fallos === 0 ? '\nTODAS BIEN.' : `\n${fallos} COMPROBACIÓN(ES) QUE NO PASAN.`)
process.exit(fallos === 0 ? 0 : 1)
