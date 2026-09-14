'use client'

/** Cuántos elementos se pintan de golpe en las listas del perfil. */
export const POR_TANDA = 60

type Props = {
  total: number
  visibles: number
  onVerMas: () => void
}

/** "Ver más" de las listas del perfil. No se pinta si ya se ve todo. */
export default function BotonVerMas({ total, visibles, onVerMas }: Props) {
  const restantes = total - visibles
  if (restantes <= 0) return null

  return (
    <button
      onClick={onVerMas}
      className="active:bg-[#1E2120] transition-colors"
      style={{
        width: '100%', minHeight: 44, marginTop: 12, borderRadius: 12,
        border: '1px solid #2A2E2C', fontSize: 13, fontWeight: 600, color: '#A3B1AC',
      }}
    >
      Ver más ({restantes})
    </button>
  )
}
