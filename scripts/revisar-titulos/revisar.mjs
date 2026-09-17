// Repasa los títulos del catálogo con las cinco reglas del criterio editorial.
//
// La IA JUZGA Y PROPONE; no cambia nada. Todo lo que saca se guarda en la tabla
// gooals_revision, y las propuestas se aceptan, se reescriben o se descartan
// desde el panel (/admin/gooals, filtro "Con propuesta").
//
// Se puede parar con Ctrl+C y volver a lanzar: cada tanda se guarda al acabarla,
// y al arrancar se salta lo que ya tiene fila. Nunca pisa una decisión tomada.
//
// Uso (desde la raíz del repo):
//   node --env-file=.env.local scripts/revisar-titulos/revisar.mjs --muestra 200
//   node --env-file=.env.local scripts/revisar-titulos/revisar.mjs            (todo lo que quede)
//
// Ver README.md, al lado de este fichero.

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { criterioParaPrompt } from '../../src/lib/criterio-gooals.ts'

// ── Ajustes ────────────────────────────────────────────────
const POR_TANDA = 50          // títulos por llamada
const MODELO = 'claude-opus-5'
const ESFUERZO = 'low'
const REINTENTOS = 3
const ESPERA_REINTENTO = 4000
const PAGINA = 1000           // PostgREST corta ahí: toda lectura se pagina

const args = process.argv.slice(2)
const valor = (nombre, porDefecto) => {
  const i = args.indexOf(nombre)
  return i >= 0 && args[i + 1] ? args[i + 1] : porDefecto
}
const muestra = Number(valor('--muestra', '0')) || 0
const porTanda = Number(valor('--tanda', String(POR_TANDA))) || POR_TANDA
const modelo = valor('--modelo', MODELO)
const esfuerzo = valor('--esfuerzo', ESFUERZO)
const seco = args.includes('--seco')
// Volver a juzgar también lo ya repasado. Sirve para comparar dos criterios
// sobre los MISMOS títulos. Sin --seco no pisa nada: al guardar se ignoran los
// gooals que ya tienen fila.
const rehacer = args.includes('--rehacer')

// ── Lo que se le pide a la IA ──────────────────────────────
// La respuesta viene validada contra este esquema: nada de limpiar ```json.
// Solo vuelven los títulos que FALLAN. Los buenos no ocupan tokens de salida,
// que es lo que de verdad cuesta en una pasada de 4.726.
const SCHEMA = {
  type: 'object',
  properties: {
    fallos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          n: { type: 'integer' },
          // Sin minimum/maximum: el esquema de las respuestas validadas no los
          // admite (la API responde 400). El rango se comprueba al leer la
          // respuesta, que es donde de todas formas hay que desconfiar.
          regla: { type: 'integer' },
          motivo: { type: 'string' },
          propuesta: { type: 'string' },
          // La autopregunta, obligatoria y por escrito: ¿la propuesta es el
          // MISMO gooal? Obligarla a contestar esto en cada fila es lo que
          // frena el invento; si se le deja implícita, sube el listón sin darse
          // cuenta. Un false aquí tira la propuesta y deja el título señalado.
          mismo: { type: 'boolean' },
          // Qué clase de trabajo es. Separa la cola mecánica (traducir) de la
          // que hay que pensar (criterio). Ver fase3k-traducciones.sql.
          tipo: { type: 'string', enum: ['traduccion', 'criterio'] },
        },
        required: ['n', 'regla', 'motivo', 'propuesta', 'mismo', 'tipo'],
        additionalProperties: false,
      },
    },
  },
  required: ['fallos'],
  additionalProperties: false,
}

function prompt(lote) {
  const lista = lote
    .map((g, i) => `${i + 1} | ${g.categoria} | ${[g.ciudad, g.pais].filter(Boolean).join(', ') || 'sin lugar'} | ${g.titulo}`)
    .join('\n')

  return `Eres quien decide qué entra en el catálogo de GooALS. Repasas títulos ya escritos y señalas los que hay que reescribir.

${criterioParaPrompt()}

Aquí van ${lote.length} títulos del catálogo, uno por línea, con el formato:
número | categoría | lugar | título

${lista}

Devuelve SOLO los que NO cumplen las reglas. Los que están bien no los devuelvas: el catálogo es en su mayoría correcto.

LA REGLA QUE MANDA SOBRE TODAS LAS DEMÁS
Una propuesta es EL MISMO GOOAL CON MEJOR TÍTULO. Nada más.
La persona que lo haga tiene que acabar haciendo exactamente lo mismo que habría hecho con el título original.
Si arreglar el título te obliga a cambiar lo que la persona hace, NO PROPONES.
- Prohibido subir el listón: ni más lejos, ni más largo, ni más difícil, ni más raro.
- Prohibido bajarlo: tampoco lo conviertas en algo más fácil.
- Prohibido inventar lo que no estaba: lugares, marcas, cifras, distancias, tiempos, niveles o certificados que el original no mencione.
Ejemplos de lo que NO se hace, todos reales:
  "Saltar en cama elástica" -> "Hacer un salto mortal en cama elástica"   (sube el listón)
  "Hacer tu primera dominada supina" -> "Hacer 10 dominadas seguidas"     (se inventa una cifra)
  "Visitar viñedos de Champagne" -> "Visitar las bodegas Moët & Chandon"  (se inventa una marca)
  "Hacer senderismo" -> "Hacer el Camino de Santiago"                     (es otro gooal)
  "Hacer 5 días de surf seguidos" -> "Coger una ola de pie"               (es otro gooal, además más fácil)
Ejemplos de lo que SÍ se hace, también reales:
  "Cantar en un karaoke delante de desconocidos" -> "Cantar en un karaoke"
  "Ascender el Cotopaxi con aclimatacion" -> "Ascender el Cotopaxi"
  "Safari nocturno" -> "Hacer un safari nocturno"
Quitar lo que sobra casi siempre es la respuesta correcta. Sustituir casi nunca lo es.

LA EXCEPCIÓN A LA CAUTELA: QUITAR PALABRAS
Si el arreglo consiste SOLO en quitar palabras del título original, hazlo sin dudar y no lo dejes sin propuesta. Quitar nunca cambia lo que la persona hace, así que ahí la cautela de arriba no aplica.
  "Pasar una semana en liveaboard de buceo" -> "Hacer un liveaboard de buceo"
  "Hacer bikepacking de un fin de semana" -> "Hacer una ruta de bikepacking"
  "Hacer 50 toques alternando ambos pies" -> "Hacer 50 toques con el balón"
Vale también añadir el verbo que falta, poner las tildes o traducir al español un título a medias en inglés: eso tampoco cambia el gooal.
  "Safari nocturno" -> "Hacer un safari nocturno"
  "Visitar Oaxaca historic center" -> "Visitar el centro histórico de Oaxaca"

NO CAMBIES NUNCA EL VERBO DE LA ACCIÓN
Lo que hace la persona se queda como está. Si el título dice "Comer en", la propuesta dice "Comer en".
  MAL: "Comer en Mercado de Surquillo" -> "Visitar el Mercado de Surquillo"   (comer no es visitar)
  BIEN: "Comer en Mercado de Surquillo" -> "Comer en el Mercado de Surquillo"
Añadir el verbo que falta sí vale; sustituir uno por otro, no.

LOS NOMBRES PROPIOS NO SE TRADUCEN
Se traduce la parte GENÉRICA del nombre, no el nombre.
  "Falls" -> "cascadas" · "Museum" -> "Museo" · "Botanical Garden" -> "Jardín Botánico" · "Fortress" -> "fortaleza"
  "Visitar Kuang Si Falls" -> "Visitar las cascadas de Kuang Si"       (Kuang Si se queda)
  "Visitar Estonian National Museum" -> "Visitar el Museo Nacional de Estonia"
Se quedan tal cual, enteros: Golden Gate, Central Park, Times Square, Royal Opera House, Empire State Building y cualquier nombre que en español se diga en inglés.
  MAL: "Cardamom Mountains" -> "montes Cardamomo"      (Cardamom es parte del nombre)
  MAL: "Fish River Canyon" -> "Cañón del Río Fish"     (Fish River es el nombre del río)
Si dudas de si una palabra es nombre propio o descripción, NO TRADUZCAS: deja el título sin propuesta y pon tipo "criterio".

ANTES DE DEJAR UN TÍTULO SIN PROPUESTA, COMPRUEBA ESTO EN ORDEN
1. ¿Basta con QUITAR palabras del original para que cumpla? Si basta, esa es la propuesta y has terminado.
2. ¿Basta con añadir el verbo que falta, poner las tildes o traducir al español lo que esté en inglés? Si basta, esa es la propuesta y has terminado.
3. Solo si ninguna de las dos cosas arregla el título, lo dejas sin propuesta.
Un título con una coletilla SIEMPRE se arregla quitándola, por corriente que te parezca el gooal que queda debajo. Que el resultado sea poco lucido no es asunto tuyo: eso lo decide una persona.

ANTES DE DAR POR BUENA UNA PROPUESTA, PREGÚNTATE
"¿Lo que hace la persona con mi título es exactamente lo mismo que hacía con el original?"
Si la respuesta no es un sí rotundo, deja "propuesta" vacía y pon "mismo" en false. No pasa nada por no tener recambio: el título queda señalado y lo arregla una persona. Es mucho peor colar un gooal distinto.

Para cada uno que falle:
- n: el número de la línea, tal cual.
- regla: 1 a 5. Si rompe varias, la más grave.
- motivo: una frase corta en español llano, sin jerga, que diga qué falla. Nada de repetir el enunciado de la regla: explica qué pasa CON ESTE título.
- propuesta: el título corregido, o cadena vacía si no hay arreglo que conserve el mismo gooal. En español, en infinitivo, menos de 70 caracteres, y cumpliendo las cinco reglas.
- mismo: true solo si la propuesta es exactamente el mismo gooal que el original. false si has dejado la propuesta vacía, o si dudas.
- tipo: "traduccion" cuando lo ÚNICO que falla es cómo está escrito el título —está medio en inglés, le faltan tildes o le falta el verbo— y tu propuesta solo arregla eso. "criterio" en todo lo demás: cuando el título rompe una regla de fondo, cuando dudas, y siempre que dejes la propuesta vacía. Un "traduccion" se va a confirmar en bloque sin mirarlo de cerca, así que en la duda pon "criterio".

Más cosas sobre la propuesta:
- Si el título ya nombra un sitio y solo está mal escrito o incompleto, arréglalo (regla 3). Si el título NO nombra ningún sitio, no le pongas uno: eso es inventar.
- Si el original ya es lo mejor posible, NO lo devuelvas.

Sé exigente, pero no caprichoso. Un título corto, sencillo o poco lucido NO es un fallo si es concreto y se demuestra con una foto. No cambies un título solo para que suene mejor. Si dudas, déjalo pasar.

Y no juzgues NUNCA si un gooal es "impresionante", "rutinario", "corriente" o "poco memorable". La regla 1 pregunta si la foto es inconfundible, no si el reto es grande. Un gooal modesto y concreto está bien. La única excepción es la comida, y ahí la línea está en el MATIZ de la regla 1: un plato corriente de otro país se señala sin propuesta (no tiene arreglo posible cambiando el título), y una rareza se deja en paz.`
}

// ── Utilidades ─────────────────────────────────────────────
const dormir = ms => new Promise(r => setTimeout(r, ms))
const num = n => n.toLocaleString('es-ES')

/**
 * Un título reducido a lo que lo hace único, para comparar dos entre sí: sin
 * tildes, sin mayúsculas, sin signos y sin espacios de más. Así "Ir al Primavera
 * Sound" y "ir al primavera sound." son el mismo título.
 */
const clave = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

/** El verbo con el que empieza un título, si empieza por uno (infinitivo). */
const verboDe = titulo => {
  const primera = clave(titulo).split(' ')[0] ?? ''
  return /(ar|er|ir)$/.test(primera) && primera.length > 3 ? primera : null
}

/**
 * ¿La propuesta cambia lo que hace la persona?
 *
 * Solo mira el verbo de cabeza: "Comer en el mercado" y "Visitar el mercado" no
 * son el mismo gooal aunque el sitio sea el mismo. Añadir el verbo que faltaba
 * ("Safari nocturno" → "Hacer un safari nocturno") no cuenta: ahí antes no había.
 */
const cambiaElVerbo = (original, propuesta) => {
  const antes = verboDe(original)
  const despues = verboDe(propuesta)
  return Boolean(antes && despues && antes !== despues)
}

/** Lee una tabla entera en páginas de 1.000: PostgREST corta ahí y no avisa. */
async function leerTodo(service, tabla, columnas, orden) {
  const filas = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await service.from(tabla).select(columnas)
      .order(orden, { ascending: true }).range(desde, desde + PAGINA - 1)
    if (error) throw new Error(`leyendo ${tabla}: ${error.message}`)
    filas.push(...data)
    if (data.length < PAGINA) return filas
  }
}

// ── La pasada ──────────────────────────────────────────────
async function main() {
  for (const clave of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY']) {
    if (!process.env[clave]) {
      console.error(`Falta ${clave}. Lánzalo con: node --env-file=.env.local scripts/revisar-titulos/revisar.mjs`)
      process.exit(1)
    }
  }

  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const anthropic = new Anthropic()

  console.log('Leyendo el catálogo...')
  // Por id: es aleatorio de hecho, así que una muestra sale repartida entre
  // categorías. Por título saldrían 200 seguidos empezando por "A".
  const catalogo = await leerTodo(service, 'gooals_v2', 'id, titulo, categoria, ciudad, pais', 'id')

  // Lo ya repasado es lo que hace que la pasada se pueda reanudar. Si la tabla no
  // existe, se dice con todas las letras en vez de fallar con jerga de Postgres.
  let yaHechos = new Set()
  try {
    yaHechos = new Set((await leerTodo(service, 'gooals_revision', 'gooal_id', 'gooal_id')).map(r => r.gooal_id))
  } catch (e) {
    if (!seco) {
      console.error(`No se pudo leer la tabla gooals_revision. ¿Has pegado supabase/fase3k.sql en Supabase?\n  ${e.message}`)
      process.exit(1)
    }
    console.log('Aviso: no se pudo leer gooals_revision. En seco no importa, no se iba a guardar nada.')
  }

  let cola = rehacer ? catalogo.slice() : catalogo.filter(g => !yaHechos.has(g.id))
  console.log(`Catálogo: ${num(catalogo.length)} · ya repasados: ${num(yaHechos.size)} · por repasar: ${num(cola.length)}`)
  if (muestra) cola = cola.slice(0, muestra)
  if (cola.length === 0) { console.log('Nada que hacer.'); return }

  const tandas = Math.ceil(cola.length / porTanda)
  console.log(`Ahora: ${num(cola.length)} títulos en ${tandas} tandas de ${porTanda}, con ${modelo} (esfuerzo ${esfuerzo}).`)
  if (seco) console.log('EN SECO: no se guarda nada en la base.')
  if (rehacer) console.log('REHACIENDO: se juzga también lo que ya tenía repaso.')

  const resumen = {
    juzgados: 0, señalados: 0, propuestas: 0, sinArreglo: 0, duplicadas: 0,
    traducciones: 0, verboCambiado: 0, entrada: 0, salida: 0, tandasFallidas: 0,
  }
  const paraMirarConCalma = []

  // Todos los títulos que ya existen, para que ninguna propuesta repita uno.
  // Se llena con el catálogo entero, no solo con la muestra.
  const yaEnElCatalogo = new Set(catalogo.map(g => clave(g.titulo)))

  // Y con las propuestas que ya están esperando decisión. Si no, dos pasadas
  // distintas pueden proponer el mismo título nuevo para dos gooals distintos y
  // el choque no se ve hasta que David acepta el segundo. Pasó de verdad con
  // "Hacer bikepacking de un fin de semana" y "...de una noche".
  try {
    for (const r of await leerTodo(service, 'gooals_revision', 'titulo_propuesto', 'gooal_id')) {
      if (r.titulo_propuesto) yaEnElCatalogo.add(clave(r.titulo_propuesto))
    }
  } catch { /* sin tabla ya se ha avisado arriba */ }

  for (let t = 0; t < tandas; t++) {
    const lote = cola.slice(t * porTanda, (t + 1) * porTanda)
    let fallos = null

    for (let intento = 1; intento <= REINTENTOS; intento++) {
      try {
        const res = await anthropic.messages.create({
          model: modelo,
          max_tokens: 16000,
          output_config: { effort: esfuerzo, format: { type: 'json_schema', schema: SCHEMA } },
          messages: [{ role: 'user', content: prompt(lote) }],
        })
        if (res.stop_reason === 'refusal') throw new Error('respuesta rechazada')
        const texto = res.content.find(b => b.type === 'text')?.text
        if (!texto) throw new Error(`respuesta vacía (${res.stop_reason})`)
        resumen.entrada += res.usage?.input_tokens ?? 0
        resumen.salida += res.usage?.output_tokens ?? 0
        fallos = JSON.parse(texto).fallos ?? []
        break
      } catch (e) {
        if (intento === REINTENTOS) {
          // La tanda no se guarda: al volver a lanzar el script se reintenta
          // entera, porque sus gooals siguen sin fila en gooals_revision.
          console.error(`  tanda ${t + 1}: falló ${REINTENTOS} veces (${e.message}). Se salta; se reintentará al relanzar.`)
          resumen.tandasFallidas++
        } else {
          await dormir(ESPERA_REINTENTO * intento)
        }
      }
    }
    if (fallos === null) continue

    // Lo que devuelve la IA no se cree a ciegas. Un fallo bien señalado se
    // guarda aunque su propuesta se caiga: el título queda marcado para mirarlo
    // a mano, que es mejor que colar un gooal distinto.
    const porGooal = new Map()
    const deLaTanda = { sinArreglo: 0, duplicadas: 0, traducciones: 0, verboCambiado: 0 }
    for (const f of fallos) {
      const g = lote[f.n - 1]
      if (!g) continue
      if (!(f.regla >= 1 && f.regla <= 5)) continue

      let propuesta = String(f.propuesta ?? '').trim().slice(0, 200)
      let motivo = String(f.motivo ?? '').trim().slice(0, 400) || null

      // La autopregunta: si ella misma dice que no es el mismo gooal, su
      // propuesta no vale, por buena que suene.
      if (f.mismo !== true) propuesta = ''
      if (propuesta === g.titulo.trim()) propuesta = ''

      // Y la comprobación que NO depende de que se porte bien: un título que ya
      // existe daría puntos dos veces por el mismo recuerdo.
      if (propuesta && yaEnElCatalogo.has(clave(propuesta))) {
        motivo = `${motivo ?? ''} (proponía «${propuesta}», pero ese título ya existe en el catálogo)`.trim().slice(0, 500)
        propuesta = ''
        deLaTanda.duplicadas++
      }

      if (!propuesta) deLaTanda.sinArreglo++
      // Dos títulos distintos no pueden acabar con el mismo nombre, ni siquiera
      // dentro de la misma tanda.
      else yaEnElCatalogo.add(clave(propuesta))

      // Una traducción se confirma en bloque, casi sin mirarla, así que el carril
      // rápido se gana: sin propuesta no es traducción, y cambiar el verbo de la
      // acción ("Comer en" → "Visitar el") tampoco lo es, lo diga ella o no.
      let tipo = f.tipo === 'traduccion' ? 'traduccion' : 'criterio'
      if (!propuesta) tipo = 'criterio'
      else if (cambiaElVerbo(g.titulo, propuesta)) { tipo = 'criterio'; deLaTanda.verboCambiado++ }
      if (tipo === 'traduccion') deLaTanda.traducciones++

      porGooal.set(g.id, {
        gooal_id: g.id,
        titulo_original: g.titulo,
        cumple: false,
        regla: f.regla,
        motivo,
        titulo_propuesto: propuesta || null,
        estado: 'pendiente',
        tipo,
        tanda: t + 1,
        modelo,
      })
    }

    // Con tipo explícito aunque para un 'ok' no signifique nada: al guardar en
    // bloque, las filas a las que les falta una columna la reciben como NULL en
    // vez de coger el valor por defecto, y la tanda entera se cae.
    const filas = lote.map(g => porGooal.get(g.id) ?? {
      gooal_id: g.id,
      titulo_original: g.titulo,
      cumple: true,
      estado: 'ok',
      tipo: 'criterio',
      tanda: t + 1,
      modelo,
    })

    if (!seco) {
      // ignoreDuplicates: si una fila ya existe (relanzado a la vez, o una
      // decisión ya tomada), se respeta la que hay. Nunca se pisa.
      const { error } = await service.from('gooals_revision').upsert(filas, { onConflict: 'gooal_id', ignoreDuplicates: true })
      if (error) { console.error(`  tanda ${t + 1}: no se pudo guardar (${error.message})`); resumen.tandasFallidas++; continue }
    }

    const conPropuesta = [...porGooal.values()].filter(p => p.titulo_propuesto).length
    // Los contadores de la tanda solo se suman si la tanda se ha guardado: si no,
    // contarían trabajo que no existe en la base.
    for (const k of Object.keys(deLaTanda)) resumen[k] += deLaTanda[k]
    resumen.juzgados += lote.length
    resumen.señalados += porGooal.size
    resumen.propuestas += conPropuesta
    console.log(`  tanda ${t + 1}/${tandas} · ${lote.length} títulos · ${porGooal.size} señalados · ${conPropuesta} con propuesta`)
    if (seco) for (const p of porGooal.values()) {
      console.log(p.titulo_propuesto
        ? `      «${p.titulo_original}» → «${p.titulo_propuesto}» (regla ${p.regla}: ${p.motivo})`
        : `      «${p.titulo_original}» → SIN ARREGLO (regla ${p.regla}: ${p.motivo})`)
    }
    for (const id of porGooal.keys()) paraMirarConCalma.push(id)
  }

  // ── Cuadre ───────────────────────────────────────────────
  console.log(`\nJuzgados: ${num(resumen.juzgados)} · señalados: ${num(resumen.señalados)} (${resumen.juzgados ? Math.round(resumen.señalados / resumen.juzgados * 100) : 0}%)`)
  console.log(`  con propuesta: ${num(resumen.propuestas)} · señalados sin arreglo: ${num(resumen.sinArreglo)} (de ellos, ${num(resumen.duplicadas)} porque la propuesta ya existía en el catálogo)`)
  console.log(`  traducciones (se confirman en bloque): ${num(resumen.traducciones)} · por decidir de una en una: ${num(resumen.señalados - resumen.traducciones)}`)
  if (resumen.verboCambiado) console.log(`  propuestas que cambiaban el verbo y NO van al bloque: ${num(resumen.verboCambiado)}`)
  console.log(`Tokens: ${num(resumen.entrada)} de entrada · ${num(resumen.salida)} de salida`)
  if (resumen.tandasFallidas) console.log(`Tandas sin guardar: ${resumen.tandasFallidas}. Vuelve a lanzar el script y se reintentan.`)

  // Los delicados: propuestas sobre gooals que alguien ya tiene en su perfil.
  // Se lee user_gooals entera y se cruza aquí, en vez de preguntar por una lista
  // de cientos de ids: esa consulta viaja en la URL y se pasa de largo.
  if (paraMirarConCalma.length) {
    const conPropuesta = new Set(paraMirarConCalma)
    const suyos = await leerTodo(service, 'user_gooals', 'gooal_id, estado', 'id')
    const tocados = new Set(suyos.filter(f => conPropuesta.has(f.gooal_id)).map(f => f.gooal_id))
    const conquistados = new Set(suyos.filter(f => f.estado === 'completado' && conPropuesta.has(f.gooal_id)).map(f => f.gooal_id))
    console.log(`Propuestas sobre gooals que alguien tiene: ${tocados.size} (${conquistados.size} ya conquistados). Salen marcados en el panel.`)
  }

  const quedan = catalogo.length - yaHechos.size - resumen.juzgados
  if (quedan > 0) console.log(`\nQuedan ${num(quedan)} títulos sin repasar. Vuelve a lanzarlo cuando quieras: sigue por donde iba.`)
  console.log(seco ? '\nEn seco: no se ha guardado nada.' : '\nListo. En el panel: /admin/gooals → "Traducciones" y "Por decidir".')
}

main().catch(e => { console.error('\nERROR:', e.message); process.exit(1) })
