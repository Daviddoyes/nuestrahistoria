import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

/**
 * Trae una imagen NUESTRA y la devuelve, para que el lienzo de las pantallas de
 * compartir no quede bloqueado por CORS al dibujarla.
 *
 * ── LO QUE ERA ESTO ANTES ─────────────────────────────────
 *
 * Esta ruta hacía `fetch(searchParams.get('url'))` y devolvía lo que fuera. Sin
 * sesión y sin mirar la dirección. O sea, un proxy abierto: cualquiera, sin
 * cuenta y sin saber nada de la app, podía hacer que el servidor fuera a buscar
 * lo que le dijeran y se lo devolviera. Comprobado antes de arreglarlo: pedía
 * example.com, google.com y direcciones internas del propio servidor, y las
 * servía con un 200.
 *
 * Dos cosas malas a la vez: alguien usando nuestro servidor de Vercel para
 * pedir cosas en su nombre, y una forma de alcanzar direcciones internas que
 * desde fuera no se alcanzan.
 *
 * ── LAS DOS CERRADURAS ────────────────────────────────────
 *
 * 1. SOLO NUESTRAS DIRECCIONES. La dirección tiene que ser del almacén de
 *    nuestro propio proyecto de Supabase y de uno de nuestros cubos. Esto es lo
 *    que mata el problema de raíz: por mucho que alguien llame a esta ruta, no
 *    puede hacerle pedir nada que no sea una foto nuestra.
 * 2. SESIÓN. Lo que se proxea son fotos de gente y avatares, y quien comparte
 *    una historia siempre tiene sesión. Sin cuenta, 401.
 *
 * Van las dos, y no una. La primera impide que sirva de proxy para cualquier
 * cosa; la segunda impide que se use como puerta de atrás para las fotos. Hoy
 * esas fotos ya son públicas y la sesión protege poco, pero cuando el cubo pase
 * a privado ESTA RUTA sería justo la forma de saltarse el permiso, así que la
 * cerradura tiene que estar puesta antes.
 *
 * PENDIENTE para cuando las fotos sean privadas: además de pedir sesión, habrá
 * que comprobar que QUIEN PIDE puede ver ESA foto. Con el cubo público todavía
 * no tiene sentido, pero no se puede olvidar.
 */

/** Los cubos de los que se acepta servir algo. Ni uno más. */
const CUBOS = ['gooals-media', 'avatars', 'catalogo']

/** Un minuto es de sobra: esto se llama al abrir la pantalla de compartir. */
const TIEMPO_LIMITE_MS = 8000

/** Tope de tamaño, para que no se pueda tirar del servidor con un fichero enorme. */
const BYTES_MAXIMOS = 15 * 1024 * 1024

export async function GET(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Hace falta sesión', { status: 401 })

  const pedida = new URL(request.url).searchParams.get('url')
  if (!pedida) return new NextResponse('Falta la dirección', { status: 400 })

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return new NextResponse('Mal configurado', { status: 500 })

  // Se compara el ORIGEN ya interpretado, no el texto de la dirección: así no
  // cuela algo como "https://nuestro-proyecto.supabase.co.otro-sitio.com/...".
  let destino: URL
  try { destino = new URL(pedida) } catch { return new NextResponse('Dirección no válida', { status: 400 }) }

  const permitido = CUBOS.some(c => destino.pathname.startsWith(`/storage/v1/object/public/${c}/`))
  if (destino.origin !== new URL(base).origin || !permitido) {
    return new NextResponse('Solo se sirven imágenes de nuestro almacén', { status: 400 })
  }

  try {
    const respuesta = await fetch(destino, {
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
      // Sin redirecciones: una redirección sacaría la petición fuera de nuestro
      // almacén y se saltaría la comprobación de arriba.
      redirect: 'error',
    })
    if (!respuesta.ok) return new NextResponse('No se pudo traer la imagen', { status: 502 })

    const tipo = respuesta.headers.get('Content-Type') ?? ''
    if (!tipo.startsWith('image/')) return new NextResponse('Eso no es una imagen', { status: 400 })

    const cuerpo = await respuesta.arrayBuffer()
    if (cuerpo.byteLength > BYTES_MAXIMOS) return new NextResponse('Imagen demasiado grande', { status: 413 })

    return new NextResponse(cuerpo, {
      headers: {
        'Content-Type': tipo,
        // Privada: la respuesta depende de quién la pide, así que no la puede
        // guardar un intermediario para dársela a otro.
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return new NextResponse('No se pudo traer la imagen', { status: 502 })
  }
}
