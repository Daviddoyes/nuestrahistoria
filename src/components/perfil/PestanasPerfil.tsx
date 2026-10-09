'use client'

export type PestanaPerfil = 'conseguidos' | 'pendientes' | 'comun'

type Props = {
  activa: PestanaPerfil
  /**
   * La tercera solo en el perfil de otra persona: en el tuyo, "en común" no
   * tiene con quién.
   */
  conComun: boolean
  onCambiar: (pestana: PestanaPerfil) => void
}

/**
 * Las pestañas del perfil: dos en el tuyo, tres en el de otra persona.
 *
 * Sin números a propósito. En el perfil ajeno los dos primeros estarían a
 * cuatro dedos de las mismas cifras en su universo; y el de "en común" sería
 * engañoso, porque ahí dentro no hay una lista sino tres.
 */
export default function PestanasPerfil({ activa, conComun, onCambiar }: Props) {
  const pestanas: { id: PestanaPerfil; texto: string }[] = [
    { id: 'conseguidos', texto: 'Conseguidos' },
    { id: 'pendientes', texto: 'Pendientes' },
    ...(conComun ? [{ id: 'comun' as const, texto: 'En común' }] : []),
  ]

  return (
    <div role="tablist" style={{ display: 'flex', borderBottom: '1px solid #2A2E2C' }}>
      {pestanas.map(({ id, texto }) => {
        const esActiva = id === activa
        return (
          <button
            key={id}
            role="tab"
            aria-selected={esActiva}
            onClick={() => onCambiar(id)}
            className="transition-colors"
            style={{
              flex: 1, minWidth: 0, height: 52,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
              color: esActiva ? '#FFFFFF' : '#7A8A85',
              // El subrayado se solapa con la línea gris de abajo en vez de sumarse a ella.
              borderBottom: `2px solid ${esActiva ? '#00D1A7' : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: esActiva ? 600 : 500, whiteSpace: 'nowrap' }}>
              {texto}
            </span>
          </button>
        )
      })}
    </div>
  )
}
