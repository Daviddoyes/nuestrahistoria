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
    <div
      role="group"
      aria-label="Gooals conquistados por categoría"
      style={{
        display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none',
        // Sangra hasta los bordes de la pantalla para que se note que desliza.
        margin: '0 -20px', padding: '0 20px 2px',
      }}
    >
      {conteos.map(({ categoria, conquistados }) => {
        const vacia = conquistados === 0
        return (
          <span
            key={categoria}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7,
              background: '#161817', border: '1px solid #2A2E2C', borderRadius: 999,
              padding: '7px 12px', fontSize: 13, color: '#FFFFFF', whiteSpace: 'nowrap',
            }}
          >
            <span
              aria-hidden
              style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORIA_COLOR[categoria], opacity: vacia ? 0.45 : 1 }}
            />
            {CATEGORIA_LABEL[categoria]}
            <span style={{ fontWeight: 700, color: vacia ? '#7A8A85' : '#FFFFFF' }}>{conquistados}</span>
          </span>
        )
      })}
    </div>
  )
}
