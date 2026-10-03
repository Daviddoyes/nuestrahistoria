// Sistema de niveles de GooALS. Los tramos son inclusivos por los dos extremos
// y contiguos (4 → 5, 24 → 25...), así que ningún número de puntos cae fuera.
//
// La curva está cargada al principio a propósito: el primer nivel se alcanza
// con cuatro o cinco gooals fáciles —la primera tarde— y a partir de ahí cada
// escalón cuesta entre dos y tres veces el anterior. Donde se pierde a la gente
// es en los primeros minutos, no en el año dos.
//
// AQUÍ DECÍA que un onboarding típico, con quince experiencias ya marcadas, deja
// a alguien recién llegado en Explorador. Nunca fue verdad: en el onboarding,
// para marcar algo como ya hecho había que subir una foto en ese momento, y
// eso no lo hace casi nadie. Se entraba en Principiante con 0 puntos.
//
// Con el estado 'vivido' por fin se puede decir "esto ya lo hice" sin foto,
// pero NO da puntos: los puntos los da la prueba, siempre. Así que se sigue
// entrando en Principiante con 0, y es a propósito. Lo que se llena desde el
// primer día es el perfil y los gooals en común, que es lo que conecta a dos
// personas; el nivel se gana aparte.

export type Nivel = {
  nombre: string
  minPuntos: number
  maxPuntos: number
  color: string
}

export const NIVELES: Nivel[] = [
  { nombre: 'Principiante', minPuntos: 0, maxPuntos: 4, color: '#7A8A85' },
  { nombre: 'Explorador', minPuntos: 5, maxPuntos: 24, color: '#38BDF8' },
  { nombre: 'Aventurero', minPuntos: 25, maxPuntos: 74, color: '#84CC16' },
  { nombre: 'Nómada', minPuntos: 75, maxPuntos: 174, color: '#F59E0B' },
  { nombre: 'Leyenda', minPuntos: 175, maxPuntos: 399, color: '#A855F7' },
  { nombre: 'Épico', minPuntos: 400, maxPuntos: 99999, color: '#00D1A7' },
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
