/** Clave de localStorage con el destino al que iba alguien antes de tener que entrar. */
export const CLAVE_DESTINO_PENDIENTE = 'post_login_redirect'

/**
 * Barras invertidas y caracteres de control (U+0000 a U+001F y U+007F).
 * Escritos como \u para que el fichero siga siendo texto legible.
 */
const CARACTERES_PELIGROSOS = /[\\\u0000-\u001F\u007F]/

/**
 * El destino guardado, solo si es seguro seguirlo; si no, null.
 *
 * Tiene que ser una ruta DENTRO de la app. Si no, el login sirve para colar una
 * redirección a otra web (la persona entra en gooals.app y acaba en una copia
 * falsa). Se exige:
 *   - que empiece por "/"
 *   - que NO empiece por "//": "//otrositio.com" empieza por "/" y el navegador
 *     lo trata como otra web
 *   - que no lleve barras invertidas ni caracteres de control: los navegadores
 *     leen "\" como "/" y se saltan tabuladores y saltos de línea, así que
 *     "/\otrositio.com" o "/<tabulador>/otrositio.com" acaban siendo "//otrositio.com"
 *   - que no empiece por "/plan/": eran las páginas de planes de la v1, las
 *     únicas que guardaban este valor, y ya no existen
 */
export function destinoSeguro(valor: string | null): string | null {
  if (!valor) return null
  if (!valor.startsWith('/')) return null
  if (valor.startsWith('//')) return null
  if (CARACTERES_PELIGROSOS.test(valor)) return null
  if (valor.startsWith('/plan/')) return null
  return valor
}

/**
 * Lee y BORRA el destino pendiente. Se borra aunque no sea válido: un valor
 * inservible no debe quedarse ahí interfiriendo en cada entrada.
 */
export function tomarDestinoPendiente(): string | null {
  try {
    const valor = localStorage.getItem(CLAVE_DESTINO_PENDIENTE)
    if (valor !== null) localStorage.removeItem(CLAVE_DESTINO_PENDIENTE)
    return destinoSeguro(valor)
  } catch {
    // localStorage puede no estar disponible (modo privado estricto): sin destino.
    return null
  }
}
