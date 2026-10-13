/**
 * EL ÚNICO SITIO QUE CONSTRUYE LA DIRECCIÓN DE UNA FOTO.
 *
 * Las fotos del catálogo son de 1024×1536 y pesan 189 KB de media. En la
 * rejilla de Buscar se ven a 179×179. Hasta el 13-10-2026 se bajaban enteras:
 * **doce veces más píxeles de los que caben**, y esa rejilla tardaba 16,2
 * segundos en verse en un móvil con 4G lento.
 *
 * Supabase sabe redimensionarlas él mismo con un parámetro en la dirección.
 * Esto lo construye, y lo construye AQUÍ y no en cada pantalla:
 *
 * > Si cada sitio decide su tamaño por su cuenta, en tres meses hay cuatro
 * > ideas distintas de cuánto mide la rejilla. Es lo mismo que pasaba con los
 * > colores antes de `estilo.ts`.
 *
 * ── LAS DOS DECISIONES QUE LLEVA DENTRO ───────────────────
 *
 * LA CALIDAD ES 70, elegida MIRANDO tres fotos a 358×358 —el tamaño real de
 * una tarjeta en una pantalla de 2x— a 60, 70 y 80: una de detalle fino
 * (Copacabana, con barcas y tejados), una de degradado limpio (el Big Ben
 * contra el cielo) y una oscura (la cabaña con la vela), que son los tres
 * sitios donde se nota una compresión mala. A ese tamaño no distingo 70 de 80,
 * y 80 cuesta un 25 % más. Hacia abajo, 60 ahorra 3 KB sobre 70 en la peor de
 * las tres, y es el lado en el que, si me equivoco, se ve.
 *
 * Y EL ALTO ES OPCIONAL, que no es un capricho de la firma: cuando la caja
 * tiene un alto FIJO —la rejilla cuadrada, una miniatura— se pide la foto ya
 * recortada a esa caja, que es lo que iba a hacer el navegador de todas formas
 * y ahorra casi tres veces más (doce fotos: 166 KB así, frente a 454
 * reduciéndolas enteras). Cuando el alto depende de la pantalla, se pide la
 * foto entera reducida, porque recortarla a un alto que luego no es el que
 * tiene la caja se ve.
 */

/** Medido mirando, no por defecto. Ver el porqué arriba. */
const CALIDAD = 70

/** Lo que hay entre el dominio y el nombre del fichero en una URL pública. */
const PUBLICA = '/storage/v1/object/public/'
const TRANSFORMA = '/storage/v1/render/image/public/'

/**
 * La dirección de una foto del catálogo al tamaño en que se va a ver.
 *
 * `ancho` y `alto` van en píxeles de CSS: lo que mide la caja en pantalla, no
 * lo que mide el fichero. El 2x lo pone `srcSetFoto()`.
 *
 * Devuelve la dirección TAL CUAL si no es una foto pública de nuestro
 * almacén —una imagen de fuera, una ya transformada, una cadena vacía—, en vez
 * de fabricar una dirección que no existe. Que no sepamos encogerla no es
 * razón para romperla.
 */
export function urlFoto(foto: string | null | undefined, ancho: number, alto?: number): string {
  if (!foto || !foto.includes(PUBLICA)) return foto ?? ''

  // ── SIEMPRE VAN LAS TRES COSAS, Y ESTO NO ES ADORNO ───────
  //
  // `?width=440` A SECAS NO REDUCE LA FOTO: LE RECORTA LOS LADOS. Pedir solo
  // el ancho sobre una foto de 1024×1536 devuelve 440×1536 —una tira
  // estrecha— porque el modo por defecto es «rellena esta caja», y la caja
  // hereda el alto original. No da ningún error: devuelve 200, pesa menos y
  // la imagen está mal. Lo descubrí mirando las medidas del fichero que
  // llegaba, no la documentación.
  //
  // Para reducir sin recortar hacen falta ancho, alto y `resize=contain`. Como
  // casi nunca sabemos el alto, se le da uno imposible de alcanzar —cuatro
  // veces el ancho, que cubre hasta una foto cuatro veces más alta que ancha—
  // y `contain` se encarga: encaja la foto dentro sin deformarla y sin
  // agrandarla nunca.
  const limite = alto ?? Math.round(ancho * 4)
  const modo = alto ? 'cover' : 'contain'
  const parametros = [
    `width=${Math.round(ancho)}`,
    `height=${Math.round(limite)}`,
    `resize=${modo}`,
    `quality=${CALIDAD}`,
  ]
  return foto.replace(PUBLICA, TRANSFORMA) + '?' + parametros.join('&')
}

/**
 * Lo mismo, para pantallas normales y para las de doble densidad.
 *
 * Casi todos los móviles son de 2x o 3x, así que el 1x casi no se usa — pero
 * cuesta una cadena de texto y es lo que hace que un portátil no se baje el
 * doble de lo que necesita.
 *
 * El tamaño que se le pasa es el de un móvil de 390 px de ancho, que es el
 * común. En uno de 430 la misma tarjeta mide algo más y la foto de 2x se queda
 * en 1,8x: no se nota, y la alternativa —`sizes` con porcentajes del ancho de
 * la ventana en cada sitio— es justo la clase de cuenta que acaba distinta en
 * cada pantalla.
 */
export function srcSetFoto(foto: string | null | undefined, ancho: number, alto?: number): string {
  if (!foto || !foto.includes(PUBLICA)) return ''
  return `${urlFoto(foto, ancho, alto)} 1x, ${urlFoto(foto, ancho * 2, alto ? alto * 2 : undefined)} 2x`
}

/**
 * LOS TAMAÑOS DE CADA SITIO, todos juntos para poder compararlos.
 *
 * Están en píxeles de CSS en un móvil de 390, que es donde se midieron. El que
 * lleva alto es porque su caja lo tiene FIJO; los que no, porque su caja crece
 * con la pantalla y pedir un alto obligaría a estirar.
 */
export const FOTO = {
  /** La rejilla de Buscar: cuadrada y medida en producción, 179×179. */
  rejilla: { ancho: 179, alto: 179 },
  /** La tarjeta grande de Descubrir. Es `flex:1`, así que el alto varía. */
  descubrir: { ancho: 360 },
  /** Las tarjetas de la tira horizontal: 152 de ancho, alto según el texto. */
  tira: { ancho: 152 },
  /** Las dos de «Para empezar», con 104 de alto fijo. */
  paraEmpezar: { ancho: 190, alto: 104 },
  /** La miniatura de la lista del onboarding: 54×54 clavados. */
  miniatura: { ancho: 54, alto: 54 },
  /** La cabecera de la ficha y la página pública: todo el ancho. */
  cabecera: { ancho: 440 },
  /** Lo que se baja el servidor para dibujar la tarjeta de WhatsApp. */
  tarjetaCompartir: { ancho: 688 },
} as const
