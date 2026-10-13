'use client'

import { useState } from 'react'
import { urlFoto, srcSetFoto } from '@/lib/fotos'

/**
 * UNA FOTO DEL CATÁLOGO, AL TAMAÑO EN QUE SE VE.
 *
 * Es un `<img>` normal con dos cosas encima: la dirección la construye
 * `urlFoto()` —un solo sitio decide los tamaños— y, si la versión reducida
 * falla, se cae a la original.
 *
 * ── POR QUÉ EXISTE LA CAÍDA, QUE ES LA MITAD DE ESTO ──────
 *
 * Desde hoy TODAS las fotos de la app dependen de un servicio que hasta ayer
 * no usábamos: el transformador de imágenes de Supabase. Si deja de contestar
 * —un cambio de plan, una cuota agotada, una avería suya— sin esto la app se
 * quedaría ENTERA SIN FOTOS. Con esto se baja la original: la app va lenta,
 * que es exactamente como iba ayer.
 *
 * Y vive aquí y no en cada pantalla porque hacerlo en los ocho sitios sería
 * ocho oportunidades de olvidarlo en uno — y ese uno sería el que nadie mira.
 *
 * La caída es por foto, no global: si una sola imagen da problemas, las demás
 * siguen pidiendo la versión ligera.
 */
export default function FotoCatalogo({
  url, ancho, alto, alt = '', style, loading, draggable, decoding,
}: {
  /** La dirección tal como está en `gooals_v2.imagen_url`. */
  url: string
  /** Lo que mide la caja en pantalla, en píxeles de CSS. De `FOTO`, en fotos.ts. */
  ancho: number
  /** Solo si la caja tiene un alto FIJO: entonces se pide recortada. */
  alto?: number
  alt?: string
  style?: React.CSSProperties
  loading?: 'lazy' | 'eager'
  draggable?: boolean
  decoding?: 'async' | 'sync' | 'auto'
}) {
  const [haFallado, setHaFallado] = useState(false)

  // eslint-disable-next-line @next/next/no-img-element -- del cubo público y de tamaño variable; next/image no se usa en este repo
  return (
    <img
      src={haFallado ? url : urlFoto(url, ancho, alto)}
      // Sin `srcSet` cuando ya hemos caído a la original: si lo dejáramos
      // puesto, el navegador volvería a pedir la que acaba de fallar.
      srcSet={haFallado ? undefined : srcSetFoto(url, ancho, alto)}
      alt={alt}
      style={style}
      loading={loading}
      draggable={draggable}
      decoding={decoding}
      onError={() => setHaFallado(true)}
    />
  )
}
