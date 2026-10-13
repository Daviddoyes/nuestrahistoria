/**
 * El @usuario: cómo se escribe y cómo se inventa uno a partir de un nombre.
 *
 * ── POR QUÉ ESTO ES UN MÓDULO Y NO UNA FUNCIÓN EN CADA SITIO ──
 *
 * La misma generación estaba copiada en dos: `genUsername` del onboarding y
 * una línea suelta dentro de `getProfile`. Dos copias es la señal de que falta
 * un módulo — y aquí además las dos tenían el mismo defecto, que es lo que
 * pasa cuando se arregla una.
 *
 * ── LAS REGLAS, Y DÓNDE MANDAN DE VERDAD ──────────────────
 *
 * Esto es la cara amable: comprueba y propone. Quien manda es el disparador de
 * `supabase/fase4a.sql`, que vive en la base y por tanto también caza lo que
 * se escriba desde la consola del navegador. Si alguna vez las dos no dicen lo
 * mismo, la que vale es la de la base — y entonces es que hay que cambiar ésta.
 */

/** Entre 3 y 20, que es lo que acepta el disparador. */
export const USERNAME_MIN = 3
export const USERNAME_MAX = 20

/**
 * Los acentos se CONVIERTEN, no se borran.
 *
 * El generador de antes hacía `[^a-z0-9_]` → fuera, y eso deja «Català» en
 * `catal` y «Fariña» en `faria`, que no son el nombre de nadie. Son 9 de los
 * 56 perfiles de hoy: no es un caso raro aquí.
 */
function sinAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Propone un @usuario a partir de un nombre. SIN sufijo al azar.
 *
 * Los 16 que se generaron con uno —`david_3b72`, `hugo_1aw6`— son imposibles
 * de teclear y por eso la búsqueda por @usuario no servía para ellos. El
 * número solo aparece si hace falta, y entonces es `_2`, `_3`…, que se recuerda
 * y se dicta por teléfono.
 */
export function proponerUsername(nombre: string): string {
  // Un nombre que es un email —hay dos— se corta por la arroba: lo que
  // identifica a esa persona está delante.
  const base = sinAcentos((nombre ?? '').split('@')[0] ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')   // todo lo demás, incluidos espacios y emojis
    .replace(/_+/g, '_')           // sin dos seguidos
    .replace(/^_+|_+$/g, '')       // ni al principio ni al final
    .slice(0, USERNAME_MAX)
    .replace(/_+$/, '')            // el recorte puede dejar uno al final

  // Tiene que empezar por letra: un nombre que empieza por cifra, o del que no
  // queda nada utilizable, cae en el genérico.
  if (!/^[a-z]/.test(base) || base.length < USERNAME_MIN) return 'usuario'
  return base
}

/**
 * El que de verdad se guarda: el propuesto, y si ya está cogido, con `_2`,
 * `_3`… hasta encontrar hueco.
 *
 * `estaLibre` lo decide quien llama —en el navegador es la función
 * `username_libre()` de la base— porque este módulo no sabe de consultas.
 */
export async function proponerUsernameLibre(
  nombre: string,
  estaLibre: (candidato: string) => Promise<boolean>,
  intentos = 50,
): Promise<string> {
  const base = proponerUsername(nombre)
  if (await estaLibre(base)) return base

  for (let n = 2; n <= intentos; n++) {
    // El sufijo no puede empujar el nombre fuera del largo máximo.
    const cola = `_${n}`
    const candidato = base.slice(0, USERNAME_MAX - cola.length).replace(/_+$/, '') + cola
    if (await estaLibre(candidato)) return candidato
  }

  // Y si ni con cincuenta: no se devuelve algo que va a chocar. Quien llama
  // decide qué hacer, pero no se le miente diciendo que esto es válido.
  throw new Error('No se ha encontrado ningún nombre de usuario libre para «' + nombre + '».')
}

/**
 * ¿Vale este @usuario? Devuelve el motivo, o null si está bien.
 *
 * Los mensajes son los mismos que los del disparador a propósito: ver dos
 * textos distintos para la misma regla hace dudar de cuál es la regla.
 */
export function motivoInvalido(username: string): string | null {
  const u = (username ?? '').trim().toLowerCase()
  if (!u) return 'El nombre de usuario no puede estar vacío.'
  if (u.length < USERNAME_MIN || u.length > USERNAME_MAX) {
    return `El nombre de usuario tiene que medir entre ${USERNAME_MIN} y ${USERNAME_MAX} caracteres.`
  }
  if (!/^[a-z][a-z0-9_]*[a-z0-9]$/.test(u) || u.includes('__')) {
    return 'El nombre de usuario solo puede llevar letras sin acentos, números y guiones bajos; tiene que empezar por una letra y no acabar en guion bajo.'
  }
  return null
}
