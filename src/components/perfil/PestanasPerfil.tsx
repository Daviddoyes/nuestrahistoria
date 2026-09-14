'use client'

export type PestanaPerfil = 'conquistados' | 'pendientes'

type Props = {
  activa: PestanaPerfil
  conquistados: number
  pendientes: number
  onCambiar: (pestana: PestanaPerfil) => void
}

/** "Conquistados · N" y "Pendientes · N", mitad y mitad. */
export default function PestanasPerfil({ activa, conquistados, pendientes, onCambiar }: Props) {
  const pestanas: { id: PestanaPerfil; texto: string }[] = [
    { id: 'conquistados', texto: `Conquistados · ${conquistados}` },
    { id: 'pendientes', texto: `Pendientes · ${pendientes}` },
  ]

  return (
    <div role="tablist" style={{ display: 'flex', borderBottom: '1px solid #2A2E2C' }}>
      {pestanas.map(p => {
        const esActiva = p.id === activa
        return (
          <button
            key={p.id}
            role="tab"
            aria-selected={esActiva}
            onClick={() => onCambiar(p.id)}
            className="transition-colors"
            style={{
              flex: 1, height: 44, fontSize: 14,
              fontWeight: esActiva ? 600 : 500,
              color: esActiva ? '#FFFFFF' : '#7A8A85',
              // El subrayado se solapa con la línea gris de abajo en vez de sumarse a ella.
              borderBottom: `2px solid ${esActiva ? '#00D1A7' : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            {p.texto}
          </button>
        )
      })}
    </div>
  )
}
