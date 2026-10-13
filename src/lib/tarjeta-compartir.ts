/**
 * LO QUE COMPARTEN LA PÁGINA DE UN GOOAL Y SU TARJETA.
 *
 * La página `/g/<id>` y la imagen `/g/<id>/tarjeta` son dos cosas distintas
 * que tienen que estar de acuerdo en tres: qué id vale, cuánto mide la
 * tarjeta y cómo se escribe su dirección. Separadas se iban a separar.
 */

/**
 * Un uuid, para no ir a la base con cualquier cosa que venga en la URL: un
 * `where id = 'hola'` sobre una columna uuid es un ERROR de Postgres, no un
 * «no encontrado».
 */
export const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 1200×630 es la medida que piden WhatsApp, Telegram, iMessage y X, y la que
 * recortan todos igual. El panel de la foto se queda con 500 de los 1200.
 *
 * ── POR QUÉ 500 Y NO LA TARJETA ENTERA ────────────────────
 *
 * Las fotos del catálogo son VERTICALES (1024×1536) y se juzgaron en una
 * tarjeta casi cuadrada. Una foto a sangre en 1200×630 se queda con una tira
 * del 35 % de su alto: ninguna de las 506 se aprobó mirando esa forma. Con un
 * panel de 500×630 se conserva el 86 %, que sí se parece a lo que se aprobó.
 */
export const TARJETA = { ancho: 1200, alto: 630, panelFoto: 500 } as const

/**
 * La dirección de la tarjeta de un gooal, ABSOLUTA.
 *
 * Open Graph no admite rutas relativas: un `/g/x/tarjeta` en un `og:image` lo
 * descarta WhatsApp sin decir nada, y el enlace sale sin imagen.
 *
 * El `?de=` viaja también aquí porque la tarjeta lo FIRMA, y porque una
 * imagen de Open Graph no recibe los parámetros de la página: el fichero
 * `opengraph-image.tsx` solo recibe `params`, nunca `searchParams` (está en
 * `node_modules/next/dist/docs/.../opengraph-image.md`). Por eso la tarjeta es
 * una ruta propia y no ese fichero.
 */
export function urlDeTarjeta(id: string, de?: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gooals.app'
  const cola = de ? `?de=${encodeURIComponent(de)}` : ''
  return `${base}/g/${id}/tarjeta${cola}`
}
