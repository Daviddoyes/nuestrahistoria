// GENERA UNA TANDA DE IMÁGENES. No sube nada: deja los ficheros en una carpeta.
//
//   node --env-file=.env.local scripts/fotos-ia/generar.mjs <carpeta> <fichero-con-los-títulos>
//
// ── POR QUÉ UN RECHAZO NO PUEDE SER UN HUECO ──────────────
//
// El filtro de seguridad de OpenAI rechaza escenas por lo que PARECEN: «alguien
// colgando boca abajo, en sombra» se leyó como otra cosa y devolvió un 400.
// Eso NO es «este gooal no tiene foto», y si acaba en el mismo saco que los
// demás fallos se va a leer así.
//
// Es la misma forma del fallo de `candidatas.mjs`, que devolvía null ante
// cualquier error y hacía que un 429 se leyera como «no hay candidatas».
//
// Por eso aquí hay tres sacos y no uno:
//
//   hechas      la imagen está
//   rechazadas  el filtro dijo que no, CON SU MOTIVO. No se reintenta sola:
//               una escena rechazada hay que REESCRIBIRLA, repetirla da igual.
//   falladas    cualquier otra cosa (red, saldo, un 500)
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { construirPrompt, encuadreDe, TAMANO, MODELO, CALIDAD } from './estilos.mjs'
import { crearFrenos, esFreno, CODIGOS_DEFINITIVOS } from '../lib/frenos.mjs'

const CLAVE = process.env.OPENAI_API_KEY
if (!CLAVE) { console.error('PARA: falta OPENAI_API_KEY en .env.local'); process.exit(1) }
if (CLAVE.startsWith('NEXT_PUBLIC')) { console.error('PARA: esa clave es pública'); process.exit(1) }

const [carpeta, lista] = process.argv.slice(2)
if (!carpeta || !lista) {
  console.error('Uso: generar.mjs <carpeta de salida> <json con los gooals>')
  process.exit(1)
}

const gooals = JSON.parse(readFileSync(lista, 'utf8'))
mkdirSync(carpeta, { recursive: true })

const frenos = crearFrenos({
  alFrenar: (f, i, ritmo) => console.log(`   freno (${f}), intento ${i + 1}, ritmo ${ritmo} ms`),
})

const hechas = []
const rechazadas = []
const falladas = []

for (const [i, gooal] of gooals.entries()) {
  const encuadre = encuadreDe(gooal)
  const prompt = construirPrompt(gooal, 'A', i)
  console.log(`\n${i + 1}/${gooals.length}  ${gooal.titulo}  [${encuadre}]`)

  await frenos.antesDePedir()
  const r = await frenos.intentar(async () => {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + CLAVE },
      body: JSON.stringify({ model: MODELO, prompt, size: TAMANO, quality: CALIDAD, n: 1 }),
    })
    if (res.ok) return { datos: await res.json() }
    const texto = await res.text()
    // Un 429 no siempre es un freno: también lo devuelve quedarse sin saldo,
    // y eso no se arregla esperando nunca. Por eso se mira el cuerpo.
    const definitivo = [...CODIGOS_DEFINITIVOS].find(c => texto.includes(c))
    if (definitivo) return { definitivo, texto }
    // El rechazo del filtro NO se reintenta: repetir la misma escena da el
    // mismo rechazo. Hay que reescribirla.
    if (res.status === 400 && texto.includes('safety')) return { rechazo: texto }
    if (esFreno(res.status)) return { freno: res.status }
    return { error: res.status + ' ' + texto.slice(0, 200) }
  })

  if (r.definitivo) {
    console.error('   PARA, esto no se arregla esperando: ' + r.definitivo)
    falladas.push({ titulo: gooal.titulo, motivo: r.definitivo })
    break
  }
  if (r.rechazo) {
    const motivo = (r.rechazo.match(/"message": "([^"]+)"/) ?? [])[1] ?? r.rechazo.slice(0, 200)
    console.error('   RECHAZADA POR EL FILTRO. Hay que reescribir la escena, no repetirla.')
    rechazadas.push({ titulo: gooal.titulo, encuadre, motivo, prompt })
    continue
  }
  if (r.error || r.agotado) {
    console.error('   falló: ' + (r.error ?? r.motivo))
    falladas.push({ titulo: gooal.titulo, motivo: r.error ?? r.motivo })
    continue
  }

  const fichero = `${carpeta}/${String(i + 1).padStart(2, '0')}-${encuadre}.png`
  writeFileSync(fichero, Buffer.from(r.datos.data[0].b64_json, 'base64'))
  hechas.push({ ...gooal, encuadre, fichero, prompt })
  console.log('   ' + fichero)
}

writeFileSync(`${carpeta}/tanda.json`,
  JSON.stringify({ hechas, rechazadas, falladas }, null, 1), 'utf8')

console.log(`\n── LA TANDA ──`)
console.log(`  hechas:     ${hechas.length} de ${gooals.length}`)
console.log(`  frenazos:   ${frenos.frenazos}`)
console.log(`  coste:      ${(hechas.length * 0.0656).toFixed(2)} $`)

// Las rechazadas van APARTE y con su motivo: no son gooals sin foto, son
// escenas que hay que reescribir.
if (rechazadas.length) {
  console.log(`\n  RECHAZADAS POR EL FILTRO (${rechazadas.length}) — hay que REESCRIBIR la escena:`)
  for (const x of rechazadas) console.log(`    ${x.titulo}  [${x.encuadre}]\n      ${x.motivo}`)
}
if (falladas.length) {
  console.log(`\n  FALLADAS POR OTRA COSA (${falladas.length}):`)
  for (const x of falladas) console.log(`    ${x.titulo}: ${x.motivo}`)
}
if (!rechazadas.length && !falladas.length) console.log('  ni rechazos del filtro ni fallos')
