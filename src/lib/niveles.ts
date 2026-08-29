// Sistema de niveles de GooALS. Los tramos son inclusivos por los dos extremos
// y contiguos (10 → 11, 30 → 31...), así que ningún número de puntos cae fuera.

export type Nivel = {
  nombre: string
  minPuntos: number
  maxPuntos: number
  color: string
}

export const NIVELES: Nivel[] = [
  { nombre: 'Principiante', minPuntos: 0, maxPuntos: 10, color: '#666666' },
  { nombre: 'Explorador', minPuntos: 11, maxPuntos: 30, color: '#4CAF50' },
  { nombre: 'Aventurero', minPuntos: 31, maxPuntos: 75, color: '#2196F3' },
  { nombre: 'Nómada', minPuntos: 76, maxPuntos: 150, color: '#9C27B0' },
  { nombre: 'Leyenda', minPuntos: 151, maxPuntos: 300, color: '#FF9800' },
  { nombre: 'Épico', minPuntos: 301, maxPuntos: 99999, color: '#1DE9B6' },
]

export function calcularNivel(puntos: number): Nivel {
  return NIVELES.find(n => puntos >= n.minPuntos && puntos <= n.maxPuntos) ?? NIVELES[0]
}

export function proximoNivel(puntos: number): Nivel | null {
  const idx = NIVELES.findIndex(n => puntos >= n.minPuntos && puntos <= n.maxPuntos)
  return NIVELES[idx + 1] ?? null
}

/**
 * Progreso hacia el siguiente nivel, para la barra del perfil.
 * En el último nivel no hay meta: `porcentaje` va al 100% y `siguiente` es null.
 */
export function progresoNivel(puntos: number): {
  actual: Nivel
  siguiente: Nivel | null
  porcentaje: number
  faltan: number
} {
  const actual = calcularNivel(puntos)
  const siguiente = proximoNivel(puntos)
  if (!siguiente) return { actual, siguiente: null, porcentaje: 100, faltan: 0 }

  const recorrido = puntos - actual.minPuntos
  const tramo = siguiente.minPuntos - actual.minPuntos
  const porcentaje = tramo > 0 ? Math.min(100, Math.round((recorrido / tramo) * 100)) : 0
  return { actual, siguiente, porcentaje, faltan: Math.max(0, siguiente.minPuntos - puntos) }
}
