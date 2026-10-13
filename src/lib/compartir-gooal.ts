/**
 * COMPARTIR UN GOOAL: el enlace y el share sheet del sistema.
 *
 * Esto es el lado del navegador. La página que recibe a quien pulse el enlace
 * está en `src/app/g/[id]/page.tsx`, y la imagen que sale en el chat en
 * `src/app/g/[id]/tarjeta/route.tsx`.
 */

/** Lo que puede pasar al compartir, para que la pantalla sepa qué decir. */
export type ResultadoCompartir = 'compartido' | 'copiado' | 'cancelado' | 'error'

/**
 * La dirección pública de un gooal, con quién lo manda si se sabe.
 *
 * `ref` es con lo que se nombra el gooal: su código corto (`k3m9x2`) o, si
 * todavía no tiene, su uuid. Lo decide `refDeGooal()`. Importa porque este
 * enlace es **lo único que ve alguien antes de decidir si pulsa** —la tarjeta
 * con la foto la ve después, y solo si pulsa—, y con el uuid entero son 71
 * caracteres que WhatsApp parte en dos líneas y parecen spam.
 *
 * Va el @USUARIO y nunca el id de la cuenta ni el correo: esta dirección se
 * pega en un chat, se reenvía y acaba en sitios que no controlamos. Un @usuario
 * ya es público —sale en cada perfil— y además es legible, así que quien lo
 * recibe entiende de quién viene con solo mirar la URL.
 */
export function enlaceDeGooal(ref: string, miUsuario?: string | null): string {
  const base =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? 'https://gooals.app')
  return `${base}/g/${ref}${miUsuario ? `?de=${encodeURIComponent(miUsuario)}` : ''}`
}

/**
 * Abre el share sheet del sistema con el enlace del gooal.
 *
 * ── POR QUÉ NO SE PIDE NADA AQUÍ DENTRO ───────────────────
 *
 * `navigator.share` solo funciona si se llama DENTRO del gesto de la persona.
 * En cuanto hay un `await` de red por delante, Safari da por terminada la
 * activación y contesta `NotAllowedError` — en iOS, que es justo donde más se
 * comparte. Por eso el @usuario llega ya resuelto como argumento: quien llama
 * lo pide al abrir la ficha, no al pulsar.
 *
 * ── Y POR QUÉ SOLO VA LA DIRECCIÓN, SIN TEXTO ─────────────
 *
 * Si se manda también un `text`, WhatsApp escribe las dos cosas: una frase
 * nuestra y debajo el enlace. La frase ya la cuenta la tarjeta, que se ve más
 * grande y mejor, así que sobra. El `title` lo usan algunas apps como asunto
 * (el correo, por ejemplo) y las demás lo ignoran sin molestar.
 */
export async function compartirGooal(
  ref: string,
  titulo: string,
  miUsuario?: string | null
): Promise<ResultadoCompartir> {
  const url = enlaceDeGooal(ref, miUsuario)

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: titulo, url })
      return 'compartido'
    } catch (e) {
      // Cerrar el share sheet NO es un fallo: es la respuesta «ahora no». Si se
      // tratara como error, cada vez que alguien se arrepiente le saldría una
      // línea roja diciendo que algo ha ido mal.
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelado'
      // Cualquier otra cosa sí lo es, y entonces queda el portapapeles: en un
      // ordenador no hay share sheet, y ahí copiar es la forma normal.
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    return 'copiado'
  } catch {
    return 'error'
  }
}
