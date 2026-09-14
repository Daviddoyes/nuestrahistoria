'use client'

import { CATEGORIA_COLOR, CATEGORIA_LABEL } from '@/lib/gooals'
import type { ConteoCategoria } from '@/types/gooals'

type Props = { conteos: ConteoCategoria[] }

/**
 * Cuántos gooals hay en cada categoría, en una fila deslizable. Las de 0 se
 * quedan al final y apagadas, no se quitan: "Música 0" invita a probar algo nuevo.
 */
export default function PastillasCategorias({ conteos }: Props) {
  return (
    // Sangra hasta los bordes de la pantalla para que se note que desliza.
    <div style={{ position: 'relative', margin: '0 -20px' }}>
      <div
        role="group"
        aria-label="Gooals conquistados por categoría"
        style={{
          display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none',
          // A la derecha, 8 px más que el degradado: al llegar al final la última
          // pastilla queda entera y no medio tapada.
          padding: '0 32px 2px 20px',
        }}
      >
        {conteos.map(({ categoria, conquistados }) => {
          const vacia = conquistados === 0
          return (
            <span
              key={categoria}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                background: '#161817', border: '1px solid #2A2E2C', borderRadius: 999,
                padding: '5px 10px', fontSize: 11, color: '#FFFFFF', whiteSpace: 'nowrap',
              }}
            >
              <span
                aria-hidden
                style={{ width: 7, height: 7, borderRadius: '50%', background: CATEGORIA_COLOR[categoria], opacity: vacia ? 0.45 : 1 }}
              />
              {CATEGORIA_LABEL[categoria]}
              <span style={{ fontWeight: 700, color: vacia ? '#7A8A85' : '#FFFFFF' }}>{conquistados}</span>
            </span>
          )
        })}
      </div>

      {/* Sin este degradado la fila parece cortada por un fallo, no algo que se desliza. */}
      <span
        aria-hidden
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 24, pointerEvents: 'none',
          background: 'linear-gradient(to left, #0B0B0B, rgba(11,11,11,0))',
        }}
      />
    </div>
  )
}
