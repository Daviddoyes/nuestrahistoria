'use client'

import { MARCA, SUPERFICIE } from '@/lib/estilo'

type Props = {
  nombre: string
  foto?: string | null
  size?: number
  /** Borde de color, p. ej. el del nivel en el perfil. */
  borde?: string | null
  /**
   * Sin foto, el respaldo va en gris en vez de en verde de marca.
   *
   * Hace falta donde el avatar NO es lo que hay que mirar. En el universo del
   * perfil, un disco aurora de 88 px era lo más fuerte de la pantalla: se comía
   * el aro del nivel, que es del mismo verde y se dibuja justo encima, y le
   * quitaba el protagonismo a las burbujas, que son lo que esa pantalla cuenta.
   * Y no es un caso raro: la mayoría de las cuentas no tienen foto todavía.
   */
  neutro?: boolean
}

/** Avatar circular con inicial de respaldo cuando no hay foto. */
export default function Avatar({ nombre, foto, size = 40, borde, neutro }: Props) {
  const estiloBorde = borde ? { border: `${Math.max(2, Math.round(size / 26))}px solid ${borde}` } : {}

  if (foto) {
    return (
      <img
        src={foto}
        alt={nombre}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          flexShrink: 0, background: '#2A2E2C', ...estiloBorde,
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: neutro ? SUPERFICIE.elevado : MARCA.aurora,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.4), fontWeight: 700,
        color: neutro ? MARCA.stone : MARCA.obsidian,
        flexShrink: 0, ...estiloBorde,
      }}
    >
      {nombre?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}
