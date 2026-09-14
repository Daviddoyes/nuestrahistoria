'use client'

type Props = {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}

/** Chip de filtro por categoría. Lo comparten Explorar y el mapa, para que filtren igual. */
export default function ChipCategoria({ activo, onClick, children }: Props) {
  return (
    <button
      onClick={onClick}
      aria-pressed={activo}
      style={{
        flexShrink: 0, padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
        border: `1px solid ${activo ? '#00D1A7' : '#2A2E2C'}`,
        background: activo ? 'rgba(0,209,167,0.12)' : 'transparent',
        color: activo ? '#00D1A7' : '#A3B1AC',
        transition: 'all 0.2s', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}
