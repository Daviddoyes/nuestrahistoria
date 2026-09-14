'use client'

import { DIFICULTAD_META, PUNTOS_MAX, PUNTOS_MIN, dificultadDePuntos } from '@/lib/gooals'

type Props = {
  valor: number
  onCambiar: (puntos: number) => void
  /** Botones más pequeños, para las tarjetas de sugerencias. */
  compacto?: boolean
}

const ESCALA = Array.from({ length: PUNTOS_MAX - PUNTOS_MIN + 1 }, (_, i) => PUNTOS_MIN + i)

/**
 * Se eligen los PUNTOS y la dificultad se deduce sola. No hay selector de
 * dificultad a propósito: con los dos por separado se podía guardar un "fácil"
 * de 9 puntos. Cada botón lleva el color de la dificultad que le toca.
 */
export default function SelectorPuntos({ valor, onCambiar, compacto }: Props) {
  const dificultad = dificultadDePuntos(valor)
  const meta = dificultad ? DIFICULTAD_META[dificultad] : null
  const lado = compacto ? 28 : 34

  return (
    <div>
      <div role="radiogroup" aria-label="Puntos" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {ESCALA.map(p => {
          const color = DIFICULTAD_META[dificultadDePuntos(p) ?? 'facil'].color
          const activo = p === valor
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => onCambiar(p)}
              style={{
                width: lado, height: lado, borderRadius: 8, fontSize: compacto ? 11 : 13, fontWeight: 700,
                border: `1px solid ${activo ? color : '#2A2E2C'}`,
                background: activo ? `${color}29` : 'transparent',
                color: activo ? color : '#7A8A85',
                cursor: 'pointer',
              }}
            >
              {p}
            </button>
          )
        })}
      </div>
      <p style={{ fontSize: 11, marginTop: 5, color: meta?.color ?? '#7A8A85' }}>
        {meta ? `${meta.emoji} ${meta.label}` : 'Elige de 1 a 10 puntos'}
      </p>
    </div>
  )
}
