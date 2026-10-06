'use client'

export type PestanaPerfil = 'conseguidos' | 'pendientes'

type Props = {
  activa: PestanaPerfil
  onCambiar: (pestana: PestanaPerfil) => void
}

/**
 * Las dos pestañas del perfil, mitad y mitad.
 *
 * Sin números: los dos están justo encima, en las tres cifras. Cuando los
 * llevaban, la misma pantalla decía "34" dos veces a cuatro dedos de distancia.
 */
export default function PestanasPerfil({ activa, onCambiar }: Props) {
  const pestanas: { id: PestanaPerfil; texto: string }[] = [
    { id: 'conseguidos', texto: 'Conseguidos' },
    { id: 'pendientes', texto: 'Pendientes' },
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
