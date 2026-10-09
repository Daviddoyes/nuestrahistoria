// CÓMO SE DECIDE LA FOTO DE UN GOOAL. Dos preguntas, en este orden:
//
//   1. ¿La foto tiene que ENSEÑAR EL SITIO?  → Commons o IA
//   2. Si va a IA, ¿qué encuadre?            → el orden a→f
//
// ── POR QUÉ ESTO NO SON EXPRESIONES REGULARES ─────────────
//
// Esto empezó siendo regex escritas dentro de plantillas, y ahí `\b` no es un
// límite de palabra: es el carácter de retroceso. Los trece límites de palabra
// de las reglas se convirtieron en basura, ninguna regla casó, **todo cayó en
// 'espaldas'** —que era justo el fallo que se estaba arreglando— y el guion lo
// imprimió en verde.
//
// Cuatro fallos de la misma familia en una semana dicen que el formato es el
// problema, no el cuidado. Así que aquí no hay ni una barra invertida: listas
// de palabras normales, y la comparación la hace código que se lee.

import { NO_SABE_HACERLO } from './decisiones.mjs'
//
// ── Y POR QUÉ AQUÍ NO SE QUITAN LAS TILDES ────────────────
//
// Se quitaban, y «Probar la carne de cocodrilo» salió clasificado como un
// documento: sin tildes, **carne y carné son la misma palabra**. En este repo
// ya estaba escrito que quitar tildes no arregla el par marató/maratón; esto
// es el otro filo del mismo cuchillo, y es peor, porque rompe palabras que
// estaban bien. Así que se compara la palabra REAL, con su tilde, y las listas
// de abajo van acentuadas.

/** Las palabras de un título, en minúscula, sin signos, CON sus tildes. */
function palabrasDe(titulo) {
  return titulo.toLowerCase()
    .replace(/[«».,:;()¿?¡!'"]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/** ¿El título EMPIEZA por alguna de estas expresiones? ("dormir en", "ver") */
function empiezaPor(titulo, expresiones) {
  const p = palabrasDe(titulo)
  return expresiones.some(e => {
    const trozo = e.toLowerCase().split(' ')
    return trozo.every((palabra, i) => p[i] === palabra)
  })
}

/** ¿El título CONTIENE alguna de estas palabras, entera? */
function contiene(titulo, palabras) {
  const p = new Set(palabrasDe(titulo))
  return palabras.some(palabra => {
    const trozo = palabra.toLowerCase().split(' ')
    if (trozo.length === 1) return p.has(trozo[0])
    return titulo.toLowerCase().includes(palabra.toLowerCase())
  })
}

// ══ PREGUNTA 1 · COMMONS O IA ═════════════════════════════
//
// **No lo decide el nombre propio. Lo decide si la foto tiene que enseñar el
// sitio.**
//
//   · Hay que enseñarlo —el gooal ES ver ese sitio, y se reconoce—: la Sagrada
//     Família, el Coliseo, el Taj Mahal. Van a COMMONS, porque la IA no acierta
//     un edificio real: hace uno parecido y falso.
//   · El sitio solo está en el título y la foto puede ser la acción de cerca:
//     bucear en las Medes, correr la Mitja, bañarte en unos gorgs. Van a IA con
//     encuadre cerrado.
//
// ── POR QUÉ NO VALÍA "NOMBRE PROPIO → COMMONS" ────────────
//
// Porque daba por hecho que Commons tiene foto del sitio concreto. La tiene de
// un edificio famoso; no la tiene de una cala, de una ferrata ni de una carrera
// de pueblo. Medido: esa regla devolvía 62 gooals a Commons, **y esos 62 habían
// ido a IA precisamente porque en Commons no había nada**.
//
// Y una fiesta tampoco es un edificio: a nadie le hace falta reconocer el
// recinto del Glastonbury para entender «Ir al Glastonbury».

/** Verbos de ESTAR Y VER: el sitio no es dónde pasa, es lo que pasa. */
const VERBOS_DE_VER = [
  'ver', 'visitar', 'contemplar', 'mirar', 'entrar en', 'pasear por',
  'recorrer', 'cruzar', 'subir a', 'subir al', 'asomarte a',
]

/** Lo que es un ACONTECIMIENTO y no un sitio: no hay recinto que reconocer. */
const ES_UN_ACONTECIMIENTO = [
  'festival', 'fiesta', 'festa', 'feria', 'fira', 'carnaval', 'aplec', 'patum',
  'maratón', 'marató', 'mitja', 'media maratón', 'ultra', 'trail', 'carrera',
  'gran premio', 'copa', 'mundial', 'olimpiadas', 'juegos olímpicos', 'regata',
  'concurso', 'procesión', 'correfoc', 'encierro', 'partido', 'final', 'etapa',
  'rock', 'cruïlla', 'nochevieja', 'eclipse',
]

/** Las mayúsculas que NO son un sitio: marcas, niveles, pruebas, meses. */
const MAYUSCULAS_QUE_NO_SON_SITIO = [
  'michelin', 'ironman', 'hyrox', 'c1', 'b2', 'open', 'water', 'gr', 'pr',
  'erasmus', 'dakar', 'motogp', 'nba', 'tour', 'grand', 'slam', 'champions',
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** ¿El título nombra algo con nombre propio, quitando lo que no es un sitio? */
export function tieneNombrePropio(titulo) {
  const crudas = titulo.split(/\s+/).slice(1)   // la primera siempre va en mayúscula
  return crudas.some(cruda => {
    const limpia = cruda.replace(/[«».,:;()¿?¡!]/g, '')
    if (limpia.length < 2) return false
    if (limpia[0] !== limpia[0].toUpperCase() || limpia[0] === limpia[0].toLowerCase()) return false
    return !MAYUSCULAS_QUE_NO_SON_SITIO.includes(limpia.toLowerCase())
  })
}

/**
 * A dónde va la foto de este gooal, y por qué.
 * Devuelve { destino: 'commons' | 'ia', porque: '...' }
 */
export function destinoDe(gooal) {
  const t = gooal.titulo
  // Lo que el modelo no sabe hacer se queda con su Commons, aunque por lo
  // demás le tocara IA. Ver NO_SABE_HACERLO en decisiones.mjs.
  if (NO_SABE_HACERLO[t]) {
    return { destino: 'commons', porque: 'el modelo no sabe hacer este sujeto: ver NO_SABE_HACERLO' }
  }
  if (contiene(t, ES_UN_ACONTECIMIENTO)) {
    return { destino: 'ia', porque: 'es un acontecimiento, no un sitio que reconocer' }
  }
  if (!tieneNombrePropio(t)) {
    return { destino: 'ia', porque: 'no nombra ningún sitio concreto' }
  }
  if (empiezaPor(t, VERBOS_DE_VER)) {
    return { destino: 'commons', porque: 'el gooal ES ver ese sitio: la foto tiene que enseñarlo' }
  }
  return { destino: 'ia', porque: 'el sitio solo está en el título; la foto puede ser la acción de cerca' }
}

// ══ PREGUNTA 2 · EL ENCUADRE, EN ESTE ORDEN ═══════════════
//
// La primera que se cumple, gana. Y si no se cumple ninguna, NO HAY SALIDA: el
// guion falla con el nombre del gooal. Ver `clasificar`.

/**
 * EL VERBO MANDA SOBRE EL SITIO, y va antes que todo lo demás.
 *
 * «Comer en el mercado de Chatuchak» salía como 'lugar_vacio' y su escena pedía
 * un mercado de comida COMPLETAMENTE VACÍO. El problema no era la palabra
 * «mercado»: era el orden. **Lo que haces decide el encuadre; dónde lo haces
 * solo decide el decorado.**
 */
const EMPIEZA_COMIDA = ['comer', 'comerte', 'cenar', 'desayunar', 'almorzar', 'merendar', 'probar', 'degustar', 'catar']

/** a) Hay un OBJETO que ES el gooal: el diploma, el sello, el dorsal. */
const EMPIEZA_OBJETO = ['sacarte', 'sacarse', 'obtener', 'publicar', 'doctorarte']
const PALABRA_OBJETO = ['carné', 'carnet', 'diploma', 'título', 'certificado', 'medalla', 'trofeo', 'pasaporte', 'sello']

/** b) El gooal es ESTAR en un sitio, y el sitio es un TIPO, no un nombre. */
const EMPIEZA_LUGAR = ['dormir en', 'alojarte en', 'pasar una noche en', 'pasar un día en', 'entrar en', 'visitar', 'pasear por']
const PALABRA_LUGAR = [
  'faro', 'castillo', 'mirador', 'monasterio', 'catedral', 'bodega', 'mercado',
  'balneario', 'termas', 'refugio', 'cabaña', 'mezquita', 'templo', 'ruinas',
  'cueva', 'palacio', 'museo', 'invernadero', 'hammam', 'onsen',
]

/** c) El gooal es VER algo: importa lo que ven sus ojos. */
const EMPIEZA_VER = ['ver', 'contemplar', 'mirar', 'presenciar', 'observar']
const PALABRA_VER = [
  'amanecer', 'atardecer', 'puesta de sol', 'aurora boreal', 'auroras',
  'eclipse', 'vía láctea', 'estrellas', 'lluvia de estrellas', 'niebla',
]

/** d) Se hace con las manos y se reconoce por ellas. */
const EMPIEZA_MANOS = ['cocinar', 'amasar', 'hacer pan', 'tallar', 'moldear', 'pintar', 'dibujar', 'escribir', 'tejer', 'coser', 'plantar', 'sembrar']
const PALABRA_MANOS = ['cerámica', 'alfarería', 'torno', 'caligrafía', 'origami', 'sushi', 'cóctel', 'pasta fresca']

// La regla e) se retiró con el encuadre al que llevaba: daba
// 'silueta_lejana' a cumbres, travesías y desiertos, y ese encuadre ya no
// existe (la razón, en ENCUADRES de estilos.mjs). Sus gooals están
// decididos uno a uno en decisiones.mjs.

/**
 * El encuadre que le toca a una categoría CUANDO YA SE HA DECIDIDO que el gooal
 * necesita un cuerpo humano (el paso e).
 *
 * Deporte, naturaleza y viajes ya NO están: tenían 'espaldas' y son las tres
 * categorías más grandes. Un valor por defecto que cubre el 78 % del catálogo
 * no es un valor por defecto, es la decisión.
 */
const POR_CATEGORIA = { gastronomia: 'plato', eventos: 'contraluz', vida: 'hombros' }

/**
 * Devuelve { encuadre, por } donde `por` dice QUÉ regla ganó: 'comida',
 * 'a'..'e', 'categoria' — o `encuadre: null` y `por: 'sin-decidir'`.
 *
 * ── NO HAY ÚLTIMO RECURSO, Y ESE ES EL CAMBIO ─────────────
 *
 * Antes, lo que no casaba con nada caía en 'espaldas'. Por eso 'espaldas' era
 * el 41 % del catálogo: no porque le fuera a 107 gooals, sino porque **había
 * una salida**. Quitada la salida, no puede volver.
 *
 * Es el mismo candado que el de los créditos de las fotos: lo que no se ha
 * decidido no pasa, en vez de pasar con la opción cómoda. Lo que no case aquí
 * tiene que estar escrito a mano en ENCUADRE_DE, con su nombre y apellido.
 */
export function clasificar(gooal) {
  const t = gooal.titulo
  // El verbo primero: lo que haces manda sobre dónde lo haces.
  if (empiezaPor(t, EMPIEZA_COMIDA)) {
    return { encuadre: POR_CATEGORIA[gooal.categoria] ?? 'plato', por: 'comida' }
  }
  if (empiezaPor(t, EMPIEZA_OBJETO) || contiene(t, PALABRA_OBJETO)) return { encuadre: 'objeto', por: 'a' }
  if (empiezaPor(t, EMPIEZA_LUGAR) || contiene(t, PALABRA_LUGAR)) return { encuadre: 'lugar_vacio', por: 'b' }
  if (empiezaPor(t, EMPIEZA_VER) || contiene(t, PALABRA_VER)) return { encuadre: 'primera_persona', por: 'c' }
  if (empiezaPor(t, EMPIEZA_MANOS) || contiene(t, PALABRA_MANOS)) return { encuadre: 'manos', por: 'd' }
  const porCategoria = POR_CATEGORIA[gooal.categoria]
  if (porCategoria) return { encuadre: porCategoria, por: 'categoria' }
  return { encuadre: null, por: 'sin-decidir' }
}

// ══ EL CONTROL NEGATIVO ═══════════════════════════════════
//
// Quince títulos con el encuadre que DEBEN dar, escritos a mano mirando cada
// uno. Si el clasificador falla UNO, el guion que lo use tiene que fallar
// entero y no imprimir ningún reparto.
//
// **Un reparto que sale con las reglas rotas es peor que ninguno, porque
// parece un resultado.** Esto es lo que habría cazado el fallo del \b en el
// primer segundo, sin saber nada de \b.
export const CONTROL = [
  { titulo: 'Sacarte el C1 de inglés', categoria: 'vida', encuadre: 'objeto' },
  { titulo: 'Publicar un libro', categoria: 'vida', encuadre: 'objeto' },
  { titulo: 'Dormir en un faro', categoria: 'viajes', encuadre: 'lugar_vacio' },
  { titulo: 'Visitar un castillo', categoria: 'viajes', encuadre: 'lugar_vacio' },
  { titulo: 'Pasar una noche en un refugio de montaña', categoria: 'naturaleza', encuadre: 'lugar_vacio' },
  { titulo: 'Ver una aurora boreal', categoria: 'naturaleza', encuadre: 'primera_persona' },
  { titulo: 'Ver un amanecer desde la montaña', categoria: 'naturaleza', encuadre: 'primera_persona' },
  { titulo: 'Hacer cerámica en un torno', categoria: 'vida', encuadre: 'manos' },
  { titulo: 'Cocinar una paella a leña', categoria: 'gastronomia', encuadre: 'manos' },
  // Los dos de 'silueta_lejana' se cambian con el encuadre: el dosmil está
  // decidido a mano, y el otro comprueba que una decisión escrita gana a
  // cualquier regla.
  { titulo: 'Hacer cumbre en un dosmil', categoria: 'deporte', encuadre: 'objeto' },
  { titulo: 'Probar el fugu', categoria: 'gastronomia', encuadre: 'plato' },
  { titulo: 'Comerte un escorpión', categoria: 'gastronomia', encuadre: 'plato' },
  { titulo: 'Ir a un concierto de tu grupo favorito', categoria: 'eventos', encuadre: 'contraluz' },
  { titulo: 'Aprender a tocar un instrumento', categoria: 'vida', encuadre: 'hombros' },
  // Los dos que cazaron defectos de verdad, y se quedan de guardia:
  // el verbo mandando sobre el sitio, y carne con y sin tilde.
  { titulo: 'Comer en el mercado de Chatuchak', categoria: 'gastronomia', encuadre: 'plato' },
  { titulo: 'Probar la carne de cocodrilo', categoria: 'gastronomia', encuadre: 'plato' },
]

/** Lanza si alguno falla, con la lista entera de los que fallan. */
export function comprobarControl(encuadreDe) {
  const fallan = CONTROL
    .map(c => ({ ...c, salio: encuadreDe({ titulo: c.titulo, categoria: c.categoria, ambito: 'personal' }) }))
    .filter(c => c.salio !== c.encuadre)
  if (fallan.length === 0) return CONTROL.length
  const detalle = fallan.map(c => `   ${c.titulo}  →  salió ${c.salio}, debía ser ${c.encuadre}`).join('\n')
  throw new Error(`EL CONTROL FALLA en ${fallan.length} de ${CONTROL.length}. No se imprime ningún reparto:\n${detalle}`)
}
