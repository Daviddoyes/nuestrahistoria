'use client'

import { useEffect } from 'react'
import { calcularNivel } from '@/lib/niveles'
import type { ResultadoCompletado } from './CompletarGooalModal'

type Props = {
  resultado: ResultadoCompletado
  onClose: () => void
}

/** Overlay de celebración tras completar un gooal. Se cierra solo a los 3,2 s. */
export default function CelebracionPuntos({ resultado, onClose }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200)
    return () => clearTimeout(t)
  }, [onClose])

  const nivel = calcularNivel(resultado.puntosTotales)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm px-8"
      onClick={onClose}
      role="status"
      aria-live="polite"
    >
      <div className="celebracion-pop flex flex-col items-center text-center">
        <span style={{ fontSize: 64, lineHeight: 1 }}>🎉</span>
        <p className="fuente-titular" style={{ fontSize: 40, fontWeight: 700, color: '#00D1A7', marginTop: 16, lineHeight: 1 }}>
          +{resultado.puntosGanados} puntos ganados!
        </p>
        <p style={{ fontSize: 14, color: '#A3B1AC', marginTop: 12 }}>
          Ya llevas <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{resultado.puntosTotales} pts</span>
        </p>

        {resultado.subioDeNivel && (
          <div
            style={{
              marginTop: 22, padding: '10px 18px', borderRadius: 999,
              background: `${nivel.color}22`, border: `1px solid ${nivel.color}`,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: nivel.color }}>
              ¡Nuevo nivel: {resultado.nivel}!
            </p>
          </div>
        )}

        <p style={{ fontSize: 11, color: '#7A8A85', marginTop: 28 }}>Toca para continuar</p>
      </div>
    </div>
  )
}
