// Los intereses del alta pasan a ser las seis categorías del catálogo.
//
//   node --env-file=.env.local scripts/migrar-intereses.mjs            (en seco)
//   node --env-file=.env.local scripts/migrar-intereses.mjs --escribir
//
// Hasta el 7-10-2026 el alta preguntaba por otra lista —viajes, gastronomia,
// musica, deporte, cultura— y en el código vivía una tabla puente que la
// traducía a las categorías de verdad. Preguntar algo que luego no sirve para
// nada es peor que no preguntarlo: "música" y "cultura" no eran categorías de
// nada, así que no se podían usar para sugerir.
//
// Este guion pasa por la tabla puente los perfiles que ya respondieron, UNA
// última vez. Después la tabla se borra del onboarding, para no dejar un tercer
// vocabulario rondando el repo.
import { createClient } from '@supabase/supabase-js'

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const escribir = process.argv.includes('--escribir')

/** La tabla puente que había en src/app/onboarding/page.tsx. Su último uso. */
const PUENTE = {
  viajes: ['viajes', 'naturaleza'],
  gastronomia: ['gastronomia'],
  musica: ['eventos'],
  deporte: ['deporte'],
  cultura: ['viajes', 'eventos'],
}

const CATEGORIAS = ['viajes', 'naturaleza', 'eventos', 'deporte', 'gastronomia', 'vida']

// Paginado: profiles son 53 hoy, pero un select sin range corta en 1.000 sin avisar.
const perfiles = []
for (let desde = 0; ; desde += 1000) {
  const { data, error } = await s.from('profiles')
    .select('id, nombre, intereses').order('id').range(desde, desde + 999)
  if (error) throw new Error(error.message)
  perfiles.push(...data)
  if (data.length < 1000) break
}
const { count } = await s.from('profiles').select('id', { count: 'exact', head: true })
console.log('perfiles leídos:', perfiles.length, 'de', count, perfiles.length === count ? '✓' : '¡FALTAN!')

const cambios = []
let yaEstaban = 0, vacios = 0, desconocidos = new Set()

for (const p of perfiles) {
  const viejos = Array.isArray(p.intereses) ? p.intereses : []
  if (!viejos.length) { vacios++; continue }

  // EL PUENTE MANDA, aunque la palabra coincida con una categoría.
  //
  // Todo lo guardado hasta hoy es vocabulario VIEJO: el alta nueva no se ha
  // desplegado y nadie ha respondido con las categorías. Y el "viajes" viejo no
  // es el "viajes" de ahora: la pantalla decía "Viajes y aventura" y el puente
  // lo repartía entre viajes Y naturaleza. Mirando primero si la palabra es una
  // categoría, a toda esa gente se le perdía naturaleza sin que se notara: la
  // migración habría parecido impecable porque los nombres cuadran.
  //
  // Lo que no esté en ninguno de los dos sitios NO se tira en silencio: se anota
  // y el guion se para.
  const nuevos = new Set()
  for (const v of viejos) {
    if (PUENTE[v]) for (const c of PUENTE[v]) nuevos.add(c)
    else if (CATEGORIAS.includes(v)) nuevos.add(v)
    else desconocidos.add(v)
  }
  const lista = CATEGORIAS.filter(c => nuevos.has(c))   // orden estable
  if (JSON.stringify(lista) === JSON.stringify(viejos)) { yaEstaban++; continue }
  cambios.push({ id: p.id, nombre: p.nombre, de: viejos, a: lista })
}

console.log('\nperfiles sin intereses:', vacios, '· ya en categorías:', yaEstaban, '· a migrar:', cambios.length)
if (desconocidos.size) {
  console.error('\nPARA: hay intereses que no son categoría ni están en el puente:')
  console.error(' ', [...desconocidos].join(' · '))
  console.error('Si se migra así, esos se perderían sin que nadie se entere.')
  process.exit(1)
}

for (const c of cambios.slice(0, 8)) console.log(`  ${c.nombre}: [${c.de}] -> [${c.a}]`)
if (cambios.length > 8) console.log(`  ... y ${cambios.length - 8} más`)

if (!escribir) { console.log('\nEN SECO. Para hacerlo: --escribir'); process.exit(0) }

let hechos = 0
for (const c of cambios) {
  const { error } = await s.from('profiles').update({ intereses: c.a }).eq('id', c.id)
  if (error) { console.error('fallo con', c.nombre, error.message); continue }
  hechos++
}
console.log('\nmigrados:', hechos)

// Releer de la base, que es lo único que lo demuestra.
const despues = []
for (let desde = 0; ; desde += 1000) {
  const { data } = await s.from('profiles').select('intereses').order('id').range(desde, desde + 999)
  despues.push(...data)
  if (data.length < 1000) break
}
const fuera = new Set()
let conIntereses = 0
for (const p of despues) {
  const i = Array.isArray(p.intereses) ? p.intereses : []
  if (i.length) conIntereses++
  for (const x of i) if (!CATEGORIAS.includes(x)) fuera.add(x)
}
console.log('releídos', despues.length, '· con intereses:', conIntereses)
console.log('intereses que NO son una categoría:', fuera.size ? [...fuera].join(' · ') : 'ninguno ✓')
const cuenta = {}
for (const p of despues) for (const x of (Array.isArray(p.intereses) ? p.intereses : [])) cuenta[x] = (cuenta[x] ?? 0) + 1
console.log('reparto ahora:', JSON.stringify(cuenta))
