// Recalcular gooals_v2.veces_completado contra la verdad, que es user_gooals.
//
// El contador se actualiza al conseguir un gooal, pero NO cuando se borra una
// fila: al limpiar mis cuentas de prueba, las filas se fueron y el número se
// quedó. Dice que 7 gooals los ha conseguido alguien y de verdad son 3.
import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const escribir = process.argv.includes('--escribir')

// La verdad: cuántas filas 'completado' hay por gooal. Paginado, que ya me mordió.
const reales = new Map()
for (let desde = 0; ; desde += 1000) {
  const { data, error } = await s.from('user_gooals').select('gooal_id, estado').order('id').range(desde, desde + 999)
  if (error) throw new Error(error.message)
  for (const f of data) if (f.estado === 'completado') reales.set(f.gooal_id, (reales.get(f.gooal_id) ?? 0) + 1)
  if (data.length < 1000) break
}

// Lo que dice el contador.
const guardados = []
for (let desde = 0; ; desde += 1000) {
  const { data, error } = await s.from('gooals_v2').select('id, titulo, veces_completado').order('id').range(desde, desde + 999)
  if (error) throw new Error(error.message)
  guardados.push(...data)
  if (data.length < 1000) break
}
console.log('gooals leídos:', guardados.length, '· con alguien que lo ha conseguido de verdad:', reales.size)

const mal = guardados
  .map(g => ({ ...g, real: reales.get(g.id) ?? 0 }))
  .filter(g => (g.veces_completado ?? 0) !== g.real)

console.log('\nCONTADORES QUE NO CUADRAN:', mal.length)
for (const g of mal) console.log(`  «${g.titulo}»  dice ${g.veces_completado} · son ${g.real}`)

if (!escribir) { console.log('\nEN SECO. Para arreglarlo: --escribir'); process.exit(0) }

let hechos = 0
for (const g of mal) {
  const { error } = await s.from('gooals_v2').update({ veces_completado: g.real }).eq('id', g.id)
  if (error) { console.error('fallo en', g.titulo, error.message); continue }
  hechos++
}
console.log('\narreglados:', hechos)

// Releer de la base, que es lo único que lo demuestra.
const quedan = []
for (let desde = 0; ; desde += 1000) {
  const { data } = await s.from('gooals_v2').select('id, titulo, veces_completado').order('id').range(desde, desde + 999)
  quedan.push(...data)
  if (data.length < 1000) break
}
const siguenMal = quedan.filter(g => (g.veces_completado ?? 0) !== (reales.get(g.id) ?? 0))
console.log('vuelven a leerse', quedan.length, '· siguen sin cuadrar:', siguenMal.length)
const conAlguien = quedan.filter(g => (g.veces_completado ?? 0) > 0)
console.log('gooals con veces_completado > 0 ahora:', conAlguien.length, JSON.stringify(conAlguien.map(g => `${g.titulo} (${g.veces_completado})`)))
