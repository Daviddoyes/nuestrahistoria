'use client'

import Link from 'next/link'
import { CATEGORIA_COLOR } from '@/lib/gooals'
import type { GooalResumen } from '@/types/gooals'

// La fila de tarjetas de gooals que se desliza, y la cabecera de su sección.
//
// Vivían dentro de la pantalla de entrada. Salen aquí porque el mapa las
// necesita para "Cerca de ti", y la alternativa era copiarlas: en este repo la
// segunda copia ya es la señal de que algo tiene que ser un módulo.

export function CabeceraTira({ titulo, enlace, texto }: { titulo: string; enlace: string; texto: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>{titulo}</h2>
      <Link href={enlace} style={{ fontSize: 12, color: '#00D1A7', whiteSpace: 'nowrap' }}>{texto}</Link>
    </div>
  )
}

/**
 * Una fila que se desliza. Sangra hasta los bordes de la pantalla para que se
 * note que hay más a la derecha; si acabara en el margen, parecería cortada.
 */
export default function Tira({
  gooals, distancias, onAbrir,
}: {
  gooals: GooalResumen[]
  distancias?: number[]
  onAbrir: (gooal: GooalResumen) => void
}) {
  return (
    <div style={{ margin: '0 -20px' }}>
      <div
        style={{
          display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none',
          padding: '0 20px 4px',
        }}
      >
        {gooals.map((g, i) => (
          <Tarjeta
            key={g.id}
            gooal={g}
            km={distancias?.[i]}
            onAbrir={() => onAbrir(g)}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Una tarjeta de las tiras de Inicio.
 *
 * ── LA QUE NO TIENE FOTO ES MÁS ESTRECHA ──────────────────
 *
 * Misma altura, menos ancho. Una foto es información y un degradado de color no
 * lo es, así que no deberían ocupar lo mismo en pantalla: de los 536 gooals
 * publicados solo 221 tienen foto, y según tus intereses te puede tocar una tira
 * entera de rectángulos de colores con el título abajo y mucho vacío en medio.
 *
 * Más estrecha y no más baja a propósito: en una fila horizontal el ojo sigue
 * una línea, y un borde inferior irregular se lee como roto. Un ancho distinto
 * no rompe nada.
 *
 * Y no imita a la que sí tiene foto: la barrita de su categoría, el título
 * arriba y grande llenando el hueco, y los puntos abajo.
 */
function Tarjeta({ gooal, km, onAbrir }: { gooal: GooalResumen; km?: number; onAbrir: () => void }) {
  const conFoto = Boolean(gooal.imagen_url)

  const marco: React.CSSProperties = {
    flex: conFoto ? '0 0 152px' : '0 0 118px',
    height: 132, borderRadius: 14, position: 'relative', overflow: 'hidden',
    border: '1px solid #2A2E2C', textAlign: 'left',
  }

  if (!conFoto) {
    return (
      <button
        onClick={onAbrir}
        aria-label={gooal.titulo}
        className="active:opacity-80 transition-opacity"
        style={{ ...marco, background: '#161817', display: 'flex' }}
      >
        <span aria-hidden style={{ width: 3, flexShrink: 0, background: CATEGORIA_COLOR[gooal.categoria] }} />
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '10px 10px 9px' }}>
          {/* La letra crece cuando el título es corto, para llenar el hueco en
              vez de dejar medio recuadro vacío. Es el mismo truco que ya usa la
              imagen que se comparte en Stories. */}
          <span
            style={{
              flex: 1, minWidth: 0,
              fontSize: gooal.titulo.length <= 18 ? 15.5 : gooal.titulo.length <= 34 ? 13.5 : 12.5,
              lineHeight: 1.26, color: '#FFFFFF', fontWeight: 600,
              // Un título largo en 118 px parte palabras antes que desbordar.
              overflowWrap: 'anywhere',
              display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            } as React.CSSProperties}
          >
            {gooal.titulo}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00D1A7' }}>
              {gooal.puntos} {gooal.puntos === 1 ? 'pt' : 'pts'}
            </span>
            {km !== undefined && (
              <span style={{ fontSize: 10.5, color: '#7A8A85' }}>{km < 1 ? 'aquí' : `${km} km`}</span>
            )}
          </span>
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={onAbrir}
      aria-label={gooal.titulo}
      className="active:opacity-80 transition-opacity"
      style={{ ...marco, background: '#161817' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- fotos del catálogo de tamaño variable */}
      <img
        src={gooal.imagen_url!}
        alt=""
        loading="lazy"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {/* El velo sube más que antes: el título manda sobre la foto, porque es lo
          que hace decidir. Si no cabe, mejor menos foto. */}
      <span
        aria-hidden
        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(5,6,6,0.96) 42%, rgba(5,6,6,0) 88%)' }}
      />
      <span
        style={{
          position: 'absolute', top: 7, right: 7, fontSize: 10, fontWeight: 700,
          background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.13)',
          borderRadius: 20, padding: '3px 7px', color: '#00D1A7',
        }}
      >
        {gooal.puntos}
      </span>
      {km !== undefined && (
        <span
          style={{
            position: 'absolute', top: 7, left: 7, fontSize: 10, fontWeight: 600,
            background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.13)',
            borderRadius: 20, padding: '3px 7px', color: '#FFFFFF',
          }}
        >
          {km < 1 ? 'aquí' : `${km} km`}
        </span>
      )}
      <span
        style={{
          position: 'absolute', left: 9, right: 9, bottom: 8,
          fontSize: 11.5, lineHeight: 1.28, color: '#FFFFFF', fontWeight: 500,
          display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        } as React.CSSProperties}
      >
        {gooal.titulo}
      </span>
    </button>
  )
}
