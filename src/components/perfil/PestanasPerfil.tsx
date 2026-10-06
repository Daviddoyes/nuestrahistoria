'use client'

export type PestanaPerfil = 'conquistados' | 'pendientes'

type Props = {
  activa: PestanaPerfil
  conquistados: number
  pendientes: number
  onCambiar: (pestana: PestanaPerfil) => void
}

/**
 * Las dos pestañas del perfil, mitad y mitad.
 *
 * El número va debajo y no al lado: "Conseguidos · 128" en una línea se corta en
 * pantallas estrechas.
 */
export default function PestanasPerfil({ activa, conquistados, pendientes, onCambiar }: Props) {
  const pestanas: { id: PestanaPerfil; texto: string; cuantos: number }[] = [
    { id: 'conquistados', texto: 'Conseguidos', cuantos: conquistados },
    { id: 'pendientes', texto: 'Pendientes', cuantos: pendientes },
  ]

  return (
    <div role="tablist" style={{ display: 'flex', borderBottom: '1px solid #2A2E2C' }}>
      {pestanas.map(({ id, texto, cuantos }) => {
        const esActiva = id === activa
        return (
          <button
            key={id}
            role="tab"
            aria-selected={esActiva}
            aria-label={`${texto}: ${cuantos}`}
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
            <span aria-hidden style={{ fontSize: 13, fontWeight: esActiva ? 600 : 500, whiteSpace: 'nowrap' }}>
              {texto}
            </span>
            <span aria-hidden style={{ fontSize: 12, fontWeight: 700, color: esActiva ? '#00D1A7' : '#7A8A85' }}>
              {cuantos}
            </span>
          </button>
        )
      })}
    </div>
  )
}
