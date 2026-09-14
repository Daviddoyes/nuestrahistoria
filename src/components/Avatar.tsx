'use client'

type Props = {
  nombre: string
  foto?: string | null
  size?: number
  /** Borde de color, p. ej. el del nivel en el perfil. */
  borde?: string | null
}

/** Avatar circular con inicial de respaldo cuando no hay foto. */
export default function Avatar({ nombre, foto, size = 40, borde }: Props) {
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
        width: size, height: size, borderRadius: '50%', background: '#00D1A7',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.4), fontWeight: 700, color: '#0B0B0B',
        flexShrink: 0, ...estiloBorde,
      }}
    >
      {nombre?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}
