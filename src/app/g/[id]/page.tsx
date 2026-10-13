import type { Metadata } from 'next'
import Link from 'next/link'
import { getGooalV2, quienComparte } from '@/lib/actions'
import { CATEGORIA_LABEL, CATEGORIA_GRADIENTE, CATEGORIA_COLOR, DIFICULTAD_META } from '@/lib/gooals'
import Logotipo from '@/components/Logotipo'
import CreditoFoto from '@/components/CreditoFoto'
import { ES_UUID, TARJETA, urlDeTarjeta } from '@/lib/tarjeta-compartir'

/**
 * LA PÁGINA PÚBLICA DE UN GOOAL. Funciona SIN CUENTA, y ése es el punto.
 *
 * Hasta hoy un gooal no tenía dirección: se abría en una ficha encima de la
 * pantalla donde estuvieras. Así no había nada que mandar por WhatsApp.
 *
 * ── POR QUÉ NO PIDE SESIÓN, QUE ES LA DECISIÓN ────────────
 *
 * Si quien recibe el enlace se encuentra un login, la cadena se rompe justo
 * donde empezaba a servir: alguien le ha mandado ESTO, no «una app». Así que
 * aquí se ve el gooal entero —foto, título, categoría, puntos, descripción— y
 * el registro se ofrece DESPUÉS, cuando ya hay algo que querer.
 *
 * `/g/` está en la lista pública de `src/proxy.ts` de forma explícita.
 *
 * ── Y POR QUÉ NO ENSEÑA NADA MÁS ──────────────────────────
 *
 * Ni cuánta gente lo ha conseguido ni quiénes: eso vive en tablas cerradas a
 * `anon`, y traerlo con la clave de servicio para una página pública sería
 * forzar la puerta de atrás de lo que la RLS cierra por delante.
 *
 * El catálogo sí es público —`gooals_v2` es la única tabla con lectura
 * abierta— así que lo que se pinta aquí es exactamente lo que cualquiera podría
 * leer de todos modos.
 */

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ de?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params
  const { de } = await searchParams
  const gooal = ES_UUID.test(id) ? await getGooalV2(id) : null
  if (!gooal) return { title: 'gooals' }

  const quien = await quienComparte(de)
  return {
    title: `${gooal.titulo} · gooals`,
    description: gooal.descripcion ?? 'Un gooal de gooals.',
    openGraph: {
      title: quien ? `${quien.nombre} te propone: ${gooal.titulo}` : gooal.titulo,
      description: gooal.descripcion ?? 'Elige retos de verdad, consíguelos y demuéstralo con una foto.',
      siteName: 'gooals',
      locale: 'es_ES',
      type: 'website',
      // La imagen la dibuja `tarjeta/route.tsx`, y se enlaza A MANO porque
      // tiene que llevar el `?de=`: el fichero `opengraph-image.tsx` de Next
      // no recibe los parámetros de la URL, solo los de la ruta, así que con
      // él la firma de quién lo manda era imposible. El porqué entero está en
      // `src/lib/tarjeta-compartir.ts`.
      // Y va el @usuario YA COMPROBADO, no el `de` que venía en la URL: si
      // alguien escribe un nombre inventado, la dirección de la tarjeta sale
      // sin `?de=` y no hay nada que firmar.
      images: [{
        url: urlDeTarjeta(id, quien ? quien.username : undefined),
        width: TARJETA.ancho,
        height: TARJETA.alto,
        alt: gooal.titulo,
      }],
    },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function GooalPublicoPage({ params, searchParams }: Props) {
  const { id } = await params
  const { de } = await searchParams

  // El id se valida antes de ir a la base: un `where id = 'hola'` con una
  // columna uuid es un error de Postgres, no un «no encontrado».
  const gooal = ES_UUID.test(id) ? await getGooalV2(id) : null

  // ── EL GOOAL QUE YA NO ESTÁ ─────────────────────────────
  //
  // No un error seco. Quien llega aquí viene de un mensaje de un amigo, y un
  // 404 en blanco es la peor primera impresión que puede tener de la app.
  if (!gooal) {
    return (
      <main style={ENVOLTORIO}>
        <div style={{ ...CAJA, textAlign: 'center' }}>
          {/* El logotipo es un <img> de bloque, así que el `textAlign` del
              padre no lo centra: necesita su propio flex, igual que arriba. */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Logotipo alto={22} />
          </div>
          <h1 style={{ ...TITULO, marginTop: 22 }}>Este gooal ya no está</h1>
          <p style={PIE}>
            Puede que lo hayan quitado del catálogo, o que el enlace llegara cortado.
            Hay unos cuantos miles más.
          </p>
          <Link href="/" style={{ ...BOTON, marginTop: 24 }}>Ver los demás</Link>
        </div>
      </main>
    )
  }

  const quien = await quienComparte(de)
  const dificultad = DIFICULTAD_META[gooal.dificultad]
  const donde = [gooal.ciudad, gooal.pais].filter(Boolean).join(', ')

  return (
    <main style={ENVOLTORIO}>
      <div style={CAJA}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 18 }}>
          <Logotipo alto={20} />
        </div>

        {/* ── QUIÉN LO MANDA ──────────────────────────────
            Va ARRIBA y no debajo de la foto: «alguien te propone esto» es lo
            que hace que esta página no sea un anuncio. Y solo si el @usuario
            existe de verdad — si no, la página no firma nada en nombre de
            nadie. */}
        {quien && (
          <p style={{
            textAlign: 'center', fontSize: 14, color: '#7A8A85',
            marginBottom: 14, lineHeight: 1.4,
          }}>
            <strong style={{ color: '#FFFFFF', fontWeight: 650 }}>{quien.nombre}</strong>
            {' '}te propone este gooal
          </p>
        )}

        {/* ── LA FOTO, O SU SITIO ─────────────────────────
            Un gooal sin foto NO se queda en blanco: le toca el degradado de su
            categoría, que es lo que ya hace la ficha de dentro. Así la página
            se ve igual de acabada con foto y sin ella, y nadie recibe un hueco
            gris de parte de un amigo. */}
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '4 / 5',
          borderRadius: 18, overflow: 'hidden',
          background: gooal.imagen_url ? '#161817' : CATEGORIA_GRADIENTE[gooal.categoria],
        }}>
          {gooal.imagen_url && (
            // eslint-disable-next-line @next/next/no-img-element -- del cubo público, de tamaño variable
            <img
              src={gooal.imagen_url}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          {!gooal.imagen_url && (
            <span style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 62, fontWeight: 800, color: 'rgba(11,11,11,.22)',
              letterSpacing: '-.04em',
            }}>
              {CATEGORIA_LABEL[gooal.categoria]}
            </span>
          )}
          {/* El crédito va SIEMPRE que la foto se vea grande: 203 de las 223
              licencias de Commons exigen citar al autor, así que esto no es
              cortesía. Ver CreditoFoto.tsx. */}
          {gooal.imagen_url && (
            <div style={{ position: 'absolute', left: 14, right: 14, bottom: 6, display: 'flex', justifyContent: 'flex-end' }}>
              <CreditoFoto autor={gooal.foto_autor} licencia={gooal.foto_licencia} origen={gooal.foto_origen} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
          <span style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em',
            color: CATEGORIA_COLOR[gooal.categoria],
            background: `${CATEGORIA_COLOR[gooal.categoria]}22`,
            borderRadius: 999, padding: '5px 11px',
          }}>
            {CATEGORIA_LABEL[gooal.categoria]}
          </span>
          <span style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em',
            color: dificultad.color, background: `${dificultad.color}22`,
            borderRadius: 999, padding: '5px 11px',
          }}>
            {dificultad.label} · {gooal.puntos} pts
          </span>
        </div>

        <h1 style={{ ...TITULO, marginTop: 14 }}>{gooal.titulo}</h1>
        {donde && <p style={{ ...PIE, marginTop: 6 }}>{donde}</p>}
        {gooal.descripcion && <p style={{ ...PIE, marginTop: 12 }}>{gooal.descripcion}</p>}

        {/* ── Y SOLO AHORA SE OFRECE ENTRAR ───────────────
            Un botón y no dos: dos caminos a la misma pantalla no son dos
            opciones, son una duda. */}
        <Link href="/" style={{ ...BOTON, marginTop: 26 }}>Guárdalo en tu lista</Link>
        <p style={{ ...PIE, marginTop: 14, textAlign: 'center', fontSize: 13 }}>
          gooals es una lista de retos de verdad: eliges los que quieres vivir,
          los consigues y lo demuestras con una foto.
        </p>
      </div>
    </main>
  )
}

// Estilos en línea, como en todo el repo. Aquí van en constantes porque la
// página tiene dos salidas —el gooal y el «ya no está»— y las dos comparten
// envoltorio: copiarlo sería tener dos páginas que se van separando.
const ENVOLTORIO: React.CSSProperties = {
  minHeight: '100dvh', background: '#0B0B0B',
  display: 'flex', justifyContent: 'center',
  padding: '28px 18px calc(32px + env(safe-area-inset-bottom, 0px))',
}

const CAJA: React.CSSProperties = { width: '100%', maxWidth: 440 }

const TITULO: React.CSSProperties = {
  fontSize: 26, lineHeight: 1.18, fontWeight: 700,
  color: '#FFFFFF', letterSpacing: '-.02em',
}

const PIE: React.CSSProperties = { fontSize: 15, lineHeight: 1.5, color: '#7A8A85' }

const BOTON: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '100%', minHeight: 52, borderRadius: 14,
  background: '#00D1A7', color: '#0B0B0B',
  fontSize: 15, fontWeight: 650, textDecoration: 'none',
}
