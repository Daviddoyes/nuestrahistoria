'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import { CATEGORIA_GRADIENTE } from '@/lib/gooals'
import type { Conquistado } from '@/types/gooals'
import BotonVerMas, { POR_TANDA } from './BotonVerMas'

type Props = {
  conquistados: Conquistado[]
  onAbrir: (conquistado: Conquistado) => void
}

/** Rejilla de 3 columnas con la prueba de cada gooal conquistado. */
export default function RejillaConquistados({ conquistados, onAbrir }: Props) {
  // Se pinta de 60 en 60: con cientos de fotos a la vez el móvil se atasca.
  const [visibles, setVisibles] = useState(POR_TANDA)

  return (
    <>
      {/* Llega hasta los bordes de la pantalla: con 2 px de separación, el margen
          lateral del perfil haría que la rejilla pareciera un recuadro suelto. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, margin: '0 -20px' }}>
        {conquistados.slice(0, visibles).map(c => (
          <button
            key={c.userGooalId}
            onClick={() => onAbrir(c)}
            aria-label={`${c.gooal.titulo}${c.video_url ? ' (vídeo)' : ''}`}
            className="active:opacity-70 transition-opacity"
            style={{
              position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden', display: 'block', width: '100%',
              background: CATEGORIA_GRADIENTE[c.gooal.categoria],
            }}
          >
            {c.foto_url && (
              // eslint-disable-next-line @next/next/no-img-element -- fotos de Storage de tamaño variable
              <img
                src={c.foto_url}
                alt=""
                loading="lazy"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}

            <span
              aria-hidden
              style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 60%)' }}
            />

            {c.video_url && (
              <Play
                aria-hidden
                className="w-3.5 h-3.5"
                fill="#FFFFFF"
                style={{ position: 'absolute', top: 7, right: 7, color: '#FFFFFF', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
              />
            )}

            <span
              style={{
                position: 'absolute', left: 6, right: 6, bottom: 6,
                fontSize: 10, lineHeight: 1.25, color: '#FFFFFF', textAlign: 'left',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              } as React.CSSProperties}
            >
              {c.gooal.titulo}
            </span>
          </button>
        ))}
      </div>

      <BotonVerMas total={conquistados.length} visibles={visibles} onVerMas={() => setVisibles(v => v + POR_TANDA)} />
    </>
  )
}
