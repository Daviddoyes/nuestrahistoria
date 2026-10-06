'use client'

type Props = {
  activo: boolean
  total: number
  enComun: number
  onCambiar: (soloEnComun: boolean) => void
}

/**
 * "Todos · N" y "En común · N", debajo de las pestañas del perfil de otra
 * persona. Lo que compartís no es un apartado aparte: es un filtro de la misma
 * lista.
 *
 * ── LA REGLA QUE LO HACE FUNCIONAR ────────────────────────
 *
 * Si no hay nada en común, esto NO SE PINTA. Y no se pinta porque el propio
 * componente se va (devuelve null), no porque quien lo usa se acuerde de
 * comprobarlo: así es IMPOSIBLE que aparezca un "En común · 0". Con pocos
 * usuarios ese es el caso más frecuente, y una pastilla vacía en un perfil
 * recién conocido sería lo primero que esa persona ve de la app.
 *
 * Se entra siempre por "Todos": un perfil se abre para saber quién es alguien, y
 * lo que compartís es lo segundo.
 */
export default function FiltroEnComun({ activo, total, enComun, onCambiar }: Props) {
  if (enComun === 0) return null

  const pastilla = (encendida: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
    minHeight: 32, padding: '6px 12px', borderRadius: 999,
    fontSize: 12, whiteSpace: 'nowrap',
    background: encendida ? 'rgba(0,209,167,0.14)' : '#1E2120',
    border: `1px solid ${encendida ? 'rgba(0,209,167,0.42)' : '#2A2E2C'}`,
    color: encendida ? '#00D1A7' : '#8B9A95',
  })

  return (
    <div role="group" aria-label="Filtrar la lista" style={{ display: 'flex', gap: 6, paddingTop: 12 }}>
      {([false, true] as const).map(soloEnComun => (
        <button
          key={String(soloEnComun)}
          onClick={() => onCambiar(soloEnComun)}
          aria-pressed={activo === soloEnComun}
          className="transition-colors"
          style={pastilla(activo === soloEnComun)}
        >
          {soloEnComun ? 'En común' : 'Todos'}
          <span style={{ fontWeight: 650 }}>{soloEnComun ? enComun : total}</span>
        </button>
      ))}
    </div>
  )
}
