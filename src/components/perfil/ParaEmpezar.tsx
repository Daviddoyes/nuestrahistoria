'use client'

import { CATEGORIA_GRADIENTE } from '@/lib/gooals'
import { MARCA, TEXTO } from '@/lib/estilo'
import type { GooalResumen } from '@/types/gooals'

type Props = {
  gooals: GooalResumen[]
  onAbrir: (gooal: GooalResumen) => void
}

/**
 * Dos gooals para empezar, el día uno.
 *
 * ── POR QUÉ ESTO Y NO LA LISTA VACÍA ──────────────────────
 *
 * Debajo de las cifras va normalmente la lista de lo conseguido. El día uno esa
 * lista está vacía, y lo que se veía era media pantalla ocupada por «Aún no has
 * conseguido ningún gooal». **Una pantalla de bienvenida no puede dedicar la
 * mitad a decirte que no tienes nada.**
 *
 * Así que el día uno ese hueco lo ocupan dos gooals de verdad, elegidos por lo
 * que dijo que le interesa (y variados si no dijo nada). Dos y no seis: lo que
 * hace falta es que empiece por uno, y seis sería otra lista que repasar.
 */
export default function ParaEmpezar({ gooals, onAbrir }: Props) {
  if (gooals.length === 0) return null

  return (
    <div>
      <p style={{
        fontSize: TEXTO.micro, textTransform: 'uppercase', letterSpacing: '.075em',
        textIndent: '.075em', color: MARCA.stone, fontWeight: 500,
      }}>
        Para empezar
      </p>

      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        {gooals.map(g => (
          <button
            key={g.id}
            onClick={() => onAbrir(g)}
            aria-label={g.titulo}
            className="transition-opacity active:opacity-80"
            style={{
              flex: 1, minWidth: 0, height: 104, borderRadius: 13,
              position: 'relative', overflow: 'hidden', textAlign: 'left',
              // Sin foto, el degradado de su categoría: es lo que ya hacen las
              // tarjetas de Inicio, y así las dos nunca salen en blanco.
              background: g.imagen_url ? '#1C201E' : CATEGORIA_GRADIENTE[g.categoria],
            }}
          >
            {g.imagen_url && (
              // eslint-disable-next-line @next/next/no-img-element -- del cubo público del catálogo, ya en webp y al tamaño
              <img
                src={g.imagen_url}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            {/* El velo no es decoración: sobre una foto clara el título blanco
                desaparece, y eso pasa justo con las de nieve y playa. */}
            <span
              aria-hidden
              style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(11,11,11,.82) 0%, rgba(11,11,11,.12) 62%, rgba(11,11,11,0) 100%)',
              }}
            />
            <span
              style={{
                position: 'absolute', left: 11, right: 11, bottom: 9,
                fontSize: TEXTO.pie, fontWeight: 650, lineHeight: 1.25, color: MARCA.sand,
              }}
            >
              {g.titulo}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
