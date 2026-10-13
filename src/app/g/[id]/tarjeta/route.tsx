import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { NextRequest } from 'next/server'
import { getGooalPublico, quienComparte } from '@/lib/actions'
import { CATEGORIA_COLOR, CATEGORIA_SOMBRA, CATEGORIA_LABEL, DIFICULTAD_META } from '@/lib/gooals'
import { TARJETA } from '@/lib/tarjeta-compartir'

/**
 * LA TARJETA DE UN GOOAL COMPARTIDO: la imagen que sale en WhatsApp.
 *
 * ── POR QUÉ ES UNA RUTA Y NO `opengraph-image.tsx` ────────
 *
 * Porque la tarjeta tiene que saber QUIÉN manda el gooal, y eso viaja en el
 * `?de=` de la URL. Una imagen de Open Graph hecha con el fichero de Next
 * recibe `params` y NADA MÁS: no hay `searchParams`. Está comprobado en
 * `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`,
 * que lista los dos únicos argumentos. Con ese fichero la firma era
 * imposible, así que la tarjeta es una ruta propia y `generateMetadata` la
 * enlaza a mano con `urlDeTarjeta()`.
 *
 * Y es UNA sola fuente: no hay ADEMÁS un `opengraph-image.tsx`. Dos cosas
 * poniendo la misma etiqueta es el fallo de siempre — gana una en silencio.
 *
 * ── POR QUÉ LA FOTO SE RECORTA AQUÍ, CON SHARP ────────────
 *
 * Dos razones, y cada una sola ya bastaría:
 *
 * 1. `ImageResponse` dibuja con satori, que NO LEE WEBP. Las 506 fotos del
 *    catálogo son .webp, todas (medido sobre la base, no supuesto). Sin
 *    convertir no habría tarjeta con foto ninguna.
 * 2. El recorte tiene que ir ANCLADO ARRIBA, y en CSS eso depende de que
 *    satori haga caso a `object-position`. Con `extract()` de sharp el
 *    recorte son números que se pueden mirar, no una propiedad que puede
 *    estar o no estar.
 *
 * Y por eso `sharp` pasó a estar DECLARADA en el package.json. Estaba
 * instalada, pero como dependencia opcional de Next: funcionaba en local y el
 * día que Next cambiara de árbol habría desaparecido, con esta ruta fallando
 * solo en producción y solo al compartir algo.
 */

export const runtime = 'nodejs'

/** El ancho del logotipo para un alto dado (viewBox 3414×1015). */
const LOGO_PROPORCION = 3414 / 1015
const LOGO_ALTO = 34

/** El lado del isotipo que llena el panel cuando el gooal no tiene foto. */
const ISOTIPO_LADO = 96

/**
 * LAS LETRAS DE LA TARJETA, que son las de la app y no las que le toquen.
 *
 * Sin esto satori dibuja con su letra por defecto, que no es ninguna de las
 * dos de gooals: la tarjeta sale correcta y con cara de no ser nuestra. Y no
 * da ningún aviso, como siempre.
 *
 * ── POR QUÉ FICHEROS EN `assets/` Y NO `next/font` ────────
 *
 * `next/font/google` deja en `.next` ficheros .woff2, y satori NO LEE woff2
 * (solo ttf, otf y woff). Así que las dos letras viven en el repo, se leen con
 * `process.cwd()` —que es lo que documenta Next para esto— y se cargan una
 * sola vez, no en cada tarjeta.
 *
 * Inter va en su versión variable: así cubre el latino entero y no hay que
 * preguntarse si un acento o una ñ están en el subconjunto. Medido sobre los
 * 541 títulos, las ciudades y los 56 nombres de perfil: hoy no hay una sola
 * letra fuera del latino básico, pero un nombre de perfil lo escribe una
 * persona y mañana puede llevar cualquier cosa.
 */
type Fuente = { name: string; data: Buffer; weight: 400 | 600 | 700; style: 'normal' }

let fuentesLeidas: Promise<Fuente[]> | null = null

function fuentes(): Promise<Fuente[]> {
  // Se guardan en memoria: la función sirve muchas tarjetas con el mismo
  // proceso y leer un megabyte de disco en cada una no tiene ningún sentido.
  if (!fuentesLeidas) {
    fuentesLeidas = (async () => {
      try {
        const [normal, media, titular] = await Promise.all([
          readFile(join(process.cwd(), 'assets/fuentes/Inter-400.woff')),
          readFile(join(process.cwd(), 'assets/fuentes/Inter-600.woff')),
          readFile(join(process.cwd(), 'assets/fuentes/Poppins-Bold.ttf')),
        ])
        return [
          { name: 'Inter', data: normal, weight: 400, style: 'normal' },
          { name: 'Inter', data: media, weight: 600, style: 'normal' },
          { name: 'Poppins', data: titular, weight: 700, style: 'normal' },
        ] as Fuente[]
      } catch (e) {
        // Sin letras la tarjeta sale con la de satori: fea, pero sale. Una
        // imagen que desaparece por sus tipografías es peor que una con la
        // letra equivocada — el enlace se quedaría sin previsualización.
        console.error('tarjeta: no se han podido leer las letras de assets/fuentes', e)
        return []
      }
    })()
  }
  return fuentesLeidas
}

export async function GET(
  peticion: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const de = peticion.nextUrl.searchParams.get('de') ?? undefined

  // El mismo resolvedor que la página: código corto o uuid, y nada más.
  const gooal = await getGooalPublico(id)

  // Un gooal que no existe no tiene tarjeta: la página de `/g/<id>` ya no pone
  // la etiqueta `og:image` en ese caso, así que aquí solo llega un enlace
  // viejo. Un 404 es la respuesta honesta — una tarjeta de marca haría creer
  // que el gooal sigue ahí.
  if (!gooal) return new Response('No existe', { status: 404 })

  const quien = await quienComparte(de)
  const dificultad = DIFICULTAD_META[gooal.dificultad]
  const donde = [gooal.ciudad, gooal.pais].filter(Boolean).join(', ')

  const foto = gooal.imagen_url
    ? await recortarAnclandoArriba(gooal.imagen_url, TARJETA.panelFoto, TARJETA.alto)
    : null
  const logo = await marcaPng(peticion.nextUrl.origin, 'gooals-logotipo-oscuro.svg', LOGO_ALTO)
  // El isotipo solo hace falta cuando no hay foto, y entonces llena el panel
  // del degradado. Pedirlo siempre sería una conversión de más en la mayoría
  // de las tarjetas, que sí tienen foto.
  const isotipo = foto ? null : await marcaPng(peticion.nextUrl.origin, 'gooals-icono-negro.svg', ISOTIPO_LADO)

  // El tamaño del título sale de su longitud porque el hueco es fijo: 588 px
  // de ancho y tres líneas. El título más largo del catálogo tiene 57
  // caracteres («Visitar la Iglesia del Salvador sobre la Sangre Derramada») y
  // a 58 px se saldría. Medido sobre los 541 publicados, no a ojo.
  const tamanoTitulo = gooal.titulo.length <= 28 ? 58 : gooal.titulo.length <= 44 ? 48 : 40

  const imagen = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0B0B0B', fontFamily: 'Inter' }}>
        {/* ── EL PANEL DE LA FOTO ─────────────────────────
            Sin foto NO se queda en blanco: le toca el degradado de su
            categoría con el nombre dentro, igual que la página y la ficha.
            Nadie recibe un hueco gris de parte de un amigo. */}
        <div
          style={{
            width: TARJETA.panelFoto,
            height: TARJETA.alto,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // El fondo se mete con `...` y no como `clave: undefined`: satori
            // recorre las claves del objeto y le pasa el valor a un analizador
            // de CSS, así que una clave con `undefined` revienta la imagen
            // entera con un «Cannot read properties of undefined». No da un
            // aviso: devuelve un 500 y el enlace sale sin tarjeta.
            ...(foto
              ? { background: '#161817' }
              : {
                  backgroundImage: `linear-gradient(145deg, ${CATEGORIA_SOMBRA[gooal.categoria]} 0%, ${CATEGORIA_COLOR[gooal.categoria]} 100%)`,
                }),
          }}
        >
          {foto ? (
            <img src={foto} width={TARJETA.panelFoto} height={TARJETA.alto} alt="" />
          ) : (
            // ── SIN FOTO: EL DEGRADADO Y LA MARCA, NADA MÁS ──
            //
            // Aquí estuvo el NOMBRE de la categoría, como en la ficha de
            // dentro, y en una tarjeta no valía por dos motivos a la vez:
            // la pastilla de al lado ya lo dice —la misma palabra dos veces en
            // la misma imagen— y en verde oscuro sobre verde no se leía.
            //
            // Queda la marca, que es lo único que ese hueco puede aportar. Va
            // el ISOTIPO, no el logotipo: el logotipo ya está arriba a la
            // derecha y repetirlo sería caer en lo mismo que se acaba de
            // quitar.
            //
            // (Se probó también el icono de la categoría, y NO SE PUEDE: los
            // iconos de lucide-react son componentes de cliente y satori dibuja
            // en el servidor. El error solo sale al pedir la imagen, nunca al
            // compilar. Copiar el trazo a mano sería una segunda versión del
            // mismo dibujo, que es justo lo que se separa con el tiempo.)
            isotipo && (
              <img src={isotipo} width={ISOTIPO_LADO} height={ISOTIPO_LADO} alt="" style={{ opacity: 0.22 }} />
            )
          )}
        </div>

        {/* ── EL PANEL DEL TEXTO ──────────────────────────
            Tres bloques separados a lo alto: la marca y quién lo manda
            arriba, el gooal en medio, y lo que es abajo. */}
        <div
          style={{
            width: TARJETA.ancho - TARJETA.panelFoto,
            height: TARJETA.alto,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '52px 56px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {logo ? (
              <img src={logo} height={LOGO_ALTO} width={Math.round(LOGO_ALTO * LOGO_PROPORCION)} alt="gooals" />
            ) : (
              // Si el logotipo no se puede traer, la tarjeta sale igual con la
              // palabra: una imagen que falla entera por su marca es peor que
              // una sin logotipo.
              <div style={{ fontSize: 30, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-.02em' }}>gooals</div>
            )}
            {/* Solo si el @usuario existe de verdad. Si no, la tarjeta no
                firma nada en nombre de nadie. */}
            {quien && (
              <div style={{ display: 'flex', fontSize: 27, color: '#00D1A7', marginTop: 22, fontWeight: 600 }}>
                {quien.nombre} te propone
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                // Poppins es la letra de los titulares de marca de la app
                // (la clase `.fuente-titular`). El resto de la tarjeta va en
                // Inter, igual que el resto de pantallas.
                fontFamily: 'Poppins',
                fontSize: tamanoTitulo,
                lineHeight: 1.12,
                fontWeight: 700,
                color: '#FFFFFF',
                letterSpacing: '-.02em',
              }}
            >
              {gooal.titulo}
            </div>
            {donde && (
              <div style={{ display: 'flex', fontSize: 24, color: '#7A8A85', marginTop: 16 }}>{donde}</div>
            )}
          </div>

          {/* ── LAS DOS PASTILLAS ───────────────────────────
              SIN LOS PUNTOS, A PROPÓSITO. Esta imagen la ve sobre todo quien
              NO tiene la app: «6 pts» es vocabulario de dentro, y a un
              desconocido no le dice absolutamente nada. Los puntos sí están en
              la página, que la ve alguien que ya ha pulsado el enlace.

              Y solo la categoría lleva color: en la app cada dificultad tiene
              el suyo, y «deporte» y «difícil» son EXACTAMENTE el mismo
              #FF6B4A, así que juntas se leían como una cosa repetida. Quien
              recibe esto tampoco conoce el código de colores. */}
          <div style={{ display: 'flex', gap: 12 }}>
            <Pastilla color={CATEGORIA_COLOR[gooal.categoria]}>{CATEGORIA_LABEL[gooal.categoria]}</Pastilla>
            <Pastilla color="#C8D2CF" fondo="rgba(255,255,255,.07)">{dificultad.label}</Pastilla>
          </div>
        </div>
      </div>
    ),
    { width: TARJETA.ancho, height: TARJETA.alto, fonts: await fuentes() }
  )

  // ── CUÁNTO SE GUARDA, QUE DEPENDE DE SI SALIÓ BIEN ──────
  //
  // Un año si la tarjeta tiene su foto: WhatsApp y Telegram la piden una vez
  // por enlace y no cambia nunca. Pero si la foto NO se pudo traer, la que ha
  // salido es la tarjeta del degradado, y guardarla un año sería congelar un
  // fallo de red durante un año en todos los intermediarios. Un minuto, y el
  // siguiente que comparta la arregla.
  const cache =
    gooal.imagen_url && !foto
      ? 'public, max-age=60'
      : 'public, immutable, no-transform, max-age=31536000'
  const cabeceras = new Headers(imagen.headers)
  cabeceras.set('cache-control', cache)
  return new Response(imagen.body, { status: imagen.status, headers: cabeceras })
}

function Pastilla({ color, fondo, children }: { color: string; fondo?: string; children: string }) {
  return (
    <div
      style={{
        display: 'flex',
        fontSize: 20,
        color,
        backgroundColor: fondo ?? `${color}22`,
        borderRadius: 999,
        padding: '9px 20px',
      }}
    >
      {children}
    </div>
  )
}

/**
 * Recorta la foto a la medida del panel, ANCLANDO EL RECORTE ARRIBA.
 *
 * ── EL ANCLAJE, QUE ES LA DECISIÓN ────────────────────────
 *
 * Centrar el recorte es lo que haría cualquiera y es lo que NO vale aquí. Las
 * fotos del catálogo están compuestas con el asunto en los dos tercios de
 * arriba —es la regla con la que se eligieron las 506—, así que la ventana se
 * centra en el centro de ESA región (a un tercio del alto), no en el de la
 * foto. Si la ventana no cabe, se pega arriba, que es la misma intención
 * llevada al límite.
 *
 * Vale para cualquier proporción, también para las fotos de Commons, que no
 * son 1024×1536 como las generadas.
 *
 * Devuelve null si la foto no se pudo traer o leer, y lo DICE por el registro:
 * un fallo que no se cuenta es un fallo que nadie arregla.
 */
async function recortarAnclandoArriba(url: string, ancho: number, alto: number): Promise<string | null> {
  try {
    const respuesta = await fetch(url)
    if (!respuesta.ok) {
      console.error(`tarjeta: la foto respondió ${respuesta.status} — ${url}`)
      return null
    }
    const bytes = Buffer.from(await respuesta.arrayBuffer())
    const { width: w, height: h } = await sharp(bytes).metadata()
    if (!w || !h) {
      console.error(`tarjeta: no se han podido leer las medidas de ${url}`)
      return null
    }

    // La ventana es el trozo de la foto ORIGINAL que acaba llenando el panel.
    const escala = Math.max(ancho / w, alto / h)
    const ventanaAncho = Math.min(w, Math.round(ancho / escala))
    const ventanaAlto = Math.min(h, Math.round(alto / escala))
    const izquierda = Math.round((w - ventanaAncho) / 2)
    // El centro de los dos tercios de arriba está a h/3, no a h/2.
    const arriba = Math.max(0, Math.min(h - ventanaAlto, Math.round(h / 3 - ventanaAlto / 2)))

    const png = await sharp(bytes)
      .extract({ left: izquierda, top: arriba, width: ventanaAncho, height: ventanaAlto })
      .resize(ancho, alto)
      .png()
      .toBuffer()
    return `data:image/png;base64,${png.toString('base64')}`
  } catch (e) {
    console.error(`tarjeta: la foto no se pudo preparar — ${url}`, e)
    return null
  }
}

/**
 * Una pieza de la marca, rasterizada a PNG para que satori no tenga que
 * interpretar el SVG (que lleva transformaciones y grupos anidados).
 *
 * Se pide por HTTP al propio origen de la petición, no se lee del disco: los
 * ficheros de `public/` se SIRVEN, pero no viajan dentro de la función en
 * Vercel, así que un `readFile` funcionaría en local y fallaría al publicar.
 * Al 3× para que no se vea blanda.
 */
async function marcaPng(origen: string, fichero: string, alto: number): Promise<string | null> {
  try {
    const respuesta = await fetch(`${origen}/marca/${fichero}`)
    if (!respuesta.ok) {
      console.error(`tarjeta: ${fichero} respondió ${respuesta.status}`)
      return null
    }
    const png = await sharp(Buffer.from(await respuesta.arrayBuffer()))
      .resize({ height: alto * 3 })
      .png()
      .toBuffer()
    return `data:image/png;base64,${png.toString('base64')}`
  } catch (e) {
    console.error(`tarjeta: ${fichero} no se pudo preparar`, e)
    return null
  }
}
