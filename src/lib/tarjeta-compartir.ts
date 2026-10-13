/**
 * LO QUE COMPARTEN LA PÁGINA DE UN GOOAL Y SU TARJETA.
 *
 * La página `/g/<id>` y la imagen `/g/<id>/tarjeta` son dos cosas distintas
 * que tienen que estar de acuerdo en tres: qué id vale, cuánto mide la
 * tarjeta y cómo se escribe su dirección. Separadas se iban a separar.
 */

/**
 * ── LAS DOS FORMAS DE NOMBRAR UN GOOAL EN UNA DIRECCIÓN ───
 *
 * `/g/<x>` acepta el CÓDIGO CORTO (`k3m9x2`) y el UUID entero, y las dos se
 * quedan PARA SIEMPRE. El uuid no es una transición que se pueda retirar
 * «cuando hayan pasado unos meses»: los enlaces repartidos antes del código
 * están en conversaciones de WhatsApp que nadie va a volver a mirar, y el día
 * que se quitara esa rama dejarían de funcionar sin que nada avisara aquí.
 *
 * Se comprueba la forma ANTES de ir a la base porque un `where id = 'hola'`
 * sobre una columna uuid es un ERROR de Postgres, no un «no encontrado».
 */
export const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * El código corto: seis caracteres del alfabeto de `fase4b.sql`.
 *
 * El alfabeto está escrito aquí ENTERO y no como `[a-z0-9]{6}` a propósito.
 * Un patrón ancho aceptaría `aeiou1` —que no puede existir— y mandaría a la
 * base a buscar algo imposible; y el día que alguien escriba `/g/abcdef`
 * probando, la respuesta correcta es «esto no es un código», no una consulta.
 */
export const ES_CODIGO = /^[23456789bcdfghjkmnpqrstvwxyz]{6}$/

/**
 * Con qué se nombra este gooal en un enlace: su código si lo tiene, y si no el
 * uuid.
 *
 * El uuid no es solo el pasado: es la red. Un gooal sin código daría
 * `/g/undefined`, que es un enlace roto, y un enlace largo siempre es mejor
 * que uno roto. Mientras `fase4b.sql` no esté pegado, ésta es además la rama
 * que funciona.
 */
export function refDeGooal(gooal: { id: string; codigo?: string | null }): string {
  return gooal.codigo?.trim() || gooal.id
}

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
export function urlDeTarjeta(ref: string, de?: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gooals.app'
  const cola = de ? `?de=${encodeURIComponent(de)}` : ''
  // Se reutiliza LA MISMA forma con la que llegó la página: si alguien abre el
  // enlace viejo con el uuid, su tarjeta también va por el uuid. Traducir aquí
  // a código obligaría a una consulta de más para no ganar nada — esta
  // dirección no la lee ninguna persona, la lee WhatsApp.
  return `${base}/g/${ref}/tarjeta${cola}`
}
