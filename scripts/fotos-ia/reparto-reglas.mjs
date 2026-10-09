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

// ── Comparar sin sufrir ───────────────────────────────────

const sinTildes = texto => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Las palabras de un título, sin tildes, sin signos y en minúscula. */
function palabrasDe(titulo) {
  return sinTildes(titulo)
    .replace(/[«».,:;()¿?¡!'"]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/** ¿El título EMPIEZA por alguna de estas expresiones? ("dormir en", "ver") */
function empiezaPor(titulo, expresiones) {
  const p = palabrasDe(titulo)
  return expresiones.some(e => {
    const trozo = sinTildes(e).split(' ')
    return trozo.every((palabra, i) => p[i] === palabra)
  })
}

/** ¿El título CONTIENE alguna de estas palabras, entera? */
function contiene(titulo, palabras) {
  const p = new Set(palabrasDe(titulo))
  return palabras.some(palabra => {
    const trozo = sinTildes(palabra).split(' ')
    if (trozo.length === 1) return p.has(trozo[0])
    return sinTildes(titulo).includes(sinTildes(palabra))
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
  'maraton', 'marato', 'mitja', 'media maraton', 'ultra', 'trail', 'carrera',
  'gran premio', 'copa', 'mundial', 'olimpiadas', 'juegos olimpicos', 'regata',
  'concurso', 'procesion', 'correfoc', 'encierro', 'partido', 'final', 'etapa',
  'rock', 'cruilla', 'nochevieja', 'eclipse',
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
    return !MAYUSCULAS_QUE_NO_SON_SITIO.includes(sinTildes(limpia))
  })
}

/**
 * A dónde va la foto de este gooal, y por qué.
 * Devuelve { destino: 'commons' | 'ia', porque: '...' }
 */
export function destinoDe(gooal) {
  const t = gooal.titulo
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
// La primera que se cumple, gana. Y a 'espaldas' solo se llega por el final:
// ya no hay ningún valor por defecto de categoría que lleve allí.

/** a) Hay un OBJETO que ES el gooal: el diploma, el sello, el dorsal. */
const EMPIEZA_OBJETO = ['sacarte', 'sacarse', 'obtener', 'publicar', 'doctorarte']
const PALABRA_OBJETO = ['carne', 'carnet', 'diploma', 'titulo', 'certificado', 'medalla', 'trofeo', 'pasaporte', 'sello']

/** b) El gooal es ESTAR en un sitio, y el sitio es un TIPO, no un nombre. */
const EMPIEZA_LUGAR = ['dormir en', 'alojarte en', 'pasar una noche en', 'pasar un dia en', 'entrar en', 'visitar', 'pasear por']
const PALABRA_LUGAR = [
  'faro', 'castillo', 'mirador', 'monasterio', 'catedral', 'bodega', 'mercado',
  'balneario', 'termas', 'refugio', 'cabana', 'mezquita', 'templo', 'ruinas',
  'cueva', 'palacio', 'museo', 'invernadero', 'hammam', 'onsen',
]

/** c) El gooal es VER algo: importa lo que ven sus ojos. */
const EMPIEZA_VER = ['ver', 'contemplar', 'mirar', 'presenciar', 'observar']
const PALABRA_VER = [
  'amanecer', 'atardecer', 'puesta de sol', 'aurora boreal', 'auroras',
  'eclipse', 'via lactea', 'estrellas', 'lluvia de estrellas', 'niebla',
]

/** d) Se hace con las manos y se reconoce por ellas. */
const EMPIEZA_MANOS = ['cocinar', 'amasar', 'hacer pan', 'tallar', 'moldear', 'pintar', 'dibujar', 'escribir', 'tejer', 'coser', 'plantar', 'sembrar']
const PALABRA_MANOS = ['ceramica', 'alfareria', 'torno', 'caligrafia', 'origami', 'sushi', 'coctel', 'pasta fresca']

/** e) Hace falta un cuerpo, y la escala del paisaje es parte del gooal. */
const PALABRA_SILUETA = ['cumbre', 'cima', 'travesia', 'trek', 'duna', 'desierto', 'glaciar', 'canon', 'acantilado', 'dosmil', 'tresmil', 'cuatromil']

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
 * Devuelve { encuadre, por } donde `por` dice QUÉ regla ganó: 'a'..'e',
 * 'categoria' o 'ultimo-recurso'.
 *
 * Que `por` exista no es decoración: es lo que permite al guion avisar cuando
 * demasiados gooals llegan al mismo encuadre **sin que ninguna regla haya
 * casado**, que es la firma exacta del fallo del \b.
 */
export function clasificar(gooal) {
  const t = gooal.titulo
  if (empiezaPor(t, EMPIEZA_OBJETO) || contiene(t, PALABRA_OBJETO)) return { encuadre: 'objeto', por: 'a' }
  if (empiezaPor(t, EMPIEZA_LUGAR) || contiene(t, PALABRA_LUGAR)) return { encuadre: 'lugar_vacio', por: 'b' }
  if (empiezaPor(t, EMPIEZA_VER) || contiene(t, PALABRA_VER)) return { encuadre: 'primera_persona', por: 'c' }
  if (empiezaPor(t, EMPIEZA_MANOS) || contiene(t, PALABRA_MANOS)) return { encuadre: 'manos', por: 'd' }
  if (contiene(t, PALABRA_SILUETA)) return { encuadre: 'silueta_lejana', por: 'e' }
  const porCategoria = POR_CATEGORIA[gooal.categoria]
  if (porCategoria) return { encuadre: porCategoria, por: 'categoria' }
  return { encuadre: 'espaldas', por: 'ultimo-recurso' }
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
  { titulo: 'Hacer cumbre en un dosmil', categoria: 'deporte', encuadre: 'silueta_lejana' },
  { titulo: 'Cruzar un desierto en camello', categoria: 'viajes', encuadre: 'silueta_lejana' },
  { titulo: 'Comerte un escorpión', categoria: 'gastronomia', encuadre: 'plato' },
  { titulo: 'Ir a un concierto de tu grupo favorito', categoria: 'eventos', encuadre: 'contraluz' },
  { titulo: 'Aprender a tocar un instrumento', categoria: 'vida', encuadre: 'hombros' },
  { titulo: 'Correr un 10K', categoria: 'deporte', encuadre: 'espaldas' },
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
