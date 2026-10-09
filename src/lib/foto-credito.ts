// De dónde viene una foto del catálogo, y qué hace falta saber de ella.
//
// Vive aquí y no dentro del panel porque lo comprueban DOS sitios: el
// formulario, para dar un mensaje claro, y la ruta de la API, que es el freno
// de verdad — una pantalla se puede saltar. Escribirlo dos veces sería
// escribirlo mal una de las dos.
//
// ── POR QUÉ ES CONDICIONAL Y NO "SIEMPRE AUTOR" ───────────
//
// Hasta octubre de 2026 todas las fotos venían de Wikimedia Commons y la regla
// era simple: autor, licencia y página, siempre. Desde que hay fotos generadas
// con IA deja de valer: una imagen generada NO tiene autor ni licencia, y
// escribir «Generada con IA» en `foto_autor` sería llamar autor a lo que no lo
// es.
//
// Lo que sí hace falta de una generada es el PROMPT: sin él, una foto que no
// gusta no se puede retocar y hay que inventarla de cero.
//
// La misma regla está en la base como restricción `gooals_v2_foto_con_autor`
// (supabase/fase3z.sql). Si cambia una, cambian las dos.

export const FUENTES_FOTO = ['commons', 'ia'] as const
export type FuenteFoto = (typeof FUENTES_FOTO)[number]

export const esFuenteFoto = (v: unknown): v is FuenteFoto =>
  typeof v === 'string' && (FUENTES_FOTO as readonly string[]).includes(v)

/** Cómo se llama cada fuente en la pantalla. */
export const NOMBRE_FUENTE: Record<FuenteFoto, string> = {
  commons: 'Wikimedia Commons',
  ia: 'Generada con IA',
}

export type DatosFoto = {
  imagen_url?: string | null
  foto_fuente?: string | null
  foto_autor?: string | null
  foto_licencia?: string | null
  foto_origen?: string | null
  foto_prompt?: string | null
}

const vacio = (v: unknown) => !v || !String(v).trim()

/**
 * Qué falta para que esta foto se pueda guardar. Devuelve el motivo en lenguaje
 * llano, o null si está bien.
 *
 * Los mensajes son para leerlos en el panel, así que dicen qué hacer y no qué
 * restricción se incumple.
 */
export function queFaltaEnLaFoto(d: DatosFoto): string | null {
  // Sin foto no hace falta nada más. Y si hay crédito sin foto, sobra: se
  // avisa, porque suele significar que se borró la dirección y se olvidó lo
  // demás.
  if (vacio(d.imagen_url)) {
    const sobra = !vacio(d.foto_autor) || !vacio(d.foto_licencia) || !vacio(d.foto_prompt)
    return sobra ? 'Hay datos de crédito pero no hay imagen. Borra el crédito o pon la dirección de la imagen.' : null
  }

  if (!esFuenteFoto(d.foto_fuente)) {
    return 'Falta decir de dónde sale la imagen: de Wikimedia Commons o generada con IA.'
  }

  if (d.foto_fuente === 'commons') {
    if (vacio(d.foto_autor)) return 'Una foto de Commons necesita el autor. Si Commons no lo declara, esa foto no se puede usar.'
    if (vacio(d.foto_licencia)) return 'Una foto de Commons necesita su licencia.'
    if (vacio(d.foto_origen)) return 'Una foto de Commons necesita el enlace a su página del fichero en Commons.'
    if (!vacio(d.foto_prompt)) return 'Una foto de Commons no lleva prompt: eso es de las generadas.'
    return null
  }

  // ia
  if (vacio(d.foto_prompt)) {
    return 'Una imagen generada necesita el prompt con el que se hizo. Sin él no se puede retocar ni volver a generar.'
  }
  if (!vacio(d.foto_autor) || !vacio(d.foto_licencia)) {
    return 'Una imagen generada no tiene autor ni licencia: deja esos dos campos vacíos.'
  }
  return null
}

/**
 * Los campos de la foto, listos para escribir en la fila.
 *
 * Normaliza a null lo vacío y BORRA el crédito entero cuando no hay imagen: una
 * fila sin foto con autor suelto es basura que la restricción no llega a ver.
 */
export function camposDeFoto(d: DatosFoto) {
  const t = (v: unknown) => (v ? String(v).trim() || null : null)
  if (vacio(d.imagen_url)) {
    return { imagen_url: null, foto_fuente: null, foto_autor: null, foto_licencia: null, foto_origen: null, foto_prompt: null }
  }
  const fuente = esFuenteFoto(d.foto_fuente) ? d.foto_fuente : null
  return {
    imagen_url: t(d.imagen_url),
    foto_fuente: fuente,
    foto_autor: fuente === 'commons' ? t(d.foto_autor) : null,
    foto_licencia: fuente === 'commons' ? t(d.foto_licencia) : null,
    foto_origen: fuente === 'commons' ? t(d.foto_origen) : null,
    foto_prompt: fuente === 'ia' ? t(d.foto_prompt) : null,
  }
}
