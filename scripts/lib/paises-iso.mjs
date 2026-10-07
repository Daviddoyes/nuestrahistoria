/**
 * El país de un gooal, en español y sin acentos, traducido a código ISO.
 *
 * ── VIVE AQUÍ Y EN NINGÚN OTRO SITIO ──────────────────────
 *
 * La usan dos cosas: el geocodificador de los pines (¿el pin cae en el país que
 * dice el gooal?) y el cruce de coordenadas de las fotos del catálogo (¿la foto
 * está hecha en el país que dice el gooal?). Dos copias serían dos
 * comprobaciones que un día dejan de coincidir sin que nadie se entere, y de
 * eso va la cicatriz más cara de este repo: una tabla escrita con los 43 países
 * de las filas que se estaban tocando, cuando en el catálogo había 65. Los 22
 * que faltaban pasaron sin que nadie les comprobara el país, y el informe decía
 * igualmente que todo estaba comprobado.
 *
 * Hace falta porque el gooal dice "República Checa" y los servicios devuelven
 * "Czechia": comparar nombres no funciona en ningún idioma. El código de dos
 * letras no depende del idioma.
 *
 * ── LA REGLA, SIEMPRE ─────────────────────────────────────
 *
 * Un país que no esté aquí NO se da por bueno a ciegas: la respuesta se
 * RECHAZA y sale en el informe como "no se pudo comprobar", para añadirlo a
 * mano. Un rechazo visible siempre es mejor que un pase a ciegas. Y quien use
 * esta tabla contrasta antes que cubre TODOS los datos que va a mirar, no solo
 * los que está tocando.
 *
 * Algunos valores llevan dos códigos ("gl dk"): territorios que un servicio
 * devuelve con el código del país y otro con el del territorio. Vale cualquiera.
 */
export const ISO = {
  'alemania': 'de', 'antartida': 'aq', 'argentina': 'ar', 'australia': 'au',
  'austria': 'at', 'belgica': 'be', 'birmania': 'mm', 'bolivia': 'bo',
  'botsuana': 'bw', 'brasil': 'br', 'camboya': 'kh', 'canada': 'ca',
  'catar': 'qa', 'chile': 'cl', 'china': 'cn', 'colombia': 'co',
  'corea del sur': 'kr', 'croacia': 'hr', 'cuba': 'cu', 'dinamarca': 'dk',
  'ecuador': 'ec', 'egipto': 'eg', 'emiratos arabes unidos': 'ae',
  'espana': 'es', 'estados unidos': 'us', 'filipinas': 'ph', 'francia': 'fr',
  'grecia': 'gr', 'groenlandia': 'gl dk', 'hungria': 'hu', 'india': 'in',
  'indonesia': 'id', 'irlanda': 'ie', 'islandia': 'is', 'islas feroe': 'fo dk',
  'israel': 'il', 'italia': 'it', 'japon': 'jp', 'jordania': 'jo',
  'kenia': 'ke', 'korea del sud': 'kr', 'maldivas': 'mv', 'marruecos': 'ma',
  'mexico': 'mx', 'monaco': 'mc', 'namibia': 'na', 'nepal': 'np',
  'noruega': 'no', 'nueva zelanda': 'nz', 'paises bajos': 'nl', 'peru': 'pe',
  'polinesia francesa': 'pf fr', 'portugal': 'pt', 'reino unido': 'gb',
  'republica checa': 'cz', 'rusia': 'ru', 'singapur': 'sg',
  'sudafrica': 'za', 'suecia': 'se', 'suiza': 'ch', 'tailandia': 'th',
  'tanzania': 'tz', 'turquia': 'tr', 'vietnam': 'vn', 'zambia': 'zm',
}
