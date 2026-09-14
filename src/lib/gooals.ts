// Constantes compartidas del catálogo de gooals v2. Vive fuera de actions.ts
// porque ese módulo es 'use server' y allí todo lo exportado debe ser async.

export type CategoriaGooal = 'viajes' | 'deporte' | 'musica' | 'gastronomia' | 'cultura' | 'aventura' | 'espectaculos'
export type DificultadGooal = 'facil' | 'dificil' | 'epico'

export const CATEGORIAS: CategoriaGooal[] = [
  'viajes', 'deporte', 'musica', 'gastronomia', 'cultura', 'aventura', 'espectaculos',
]

export const CATEGORIA_LABEL: Record<CategoriaGooal, string> = {
  viajes: 'Viajes',
  deporte: 'Deporte',
  musica: 'Música',
  gastronomia: 'Gastronomía',
  cultura: 'Cultura',
  aventura: 'Aventura',
  espectaculos: 'Espectáculos',
}

export const CATEGORIA_EMOJI: Record<CategoriaGooal, string> = {
  viajes: '✈️',
  deporte: '🏃',
  musica: '🎵',
  gastronomia: '🍜',
  cultura: '🎨',
  aventura: '🧗',
  espectaculos: '🎟️',
}

export const CATEGORIA_COLOR: Record<CategoriaGooal, string> = {
  viajes: '#3B82F6',
  deporte: '#10B981',
  musica: '#EC4899',
  gastronomia: '#F59E0B',
  cultura: '#8B5CF6',
  aventura: '#FF6B35',
  espectaculos: '#EF4444',
}

/** Fondo de las cards sin imagen: degradado del color de su categoría. */
export const CATEGORIA_GRADIENTE: Record<CategoriaGooal, string> = {
  viajes: 'linear-gradient(145deg, #1E3A8A 0%, #3B82F6 100%)',
  deporte: 'linear-gradient(145deg, #064E3B 0%, #10B981 100%)',
  musica: 'linear-gradient(145deg, #831843 0%, #EC4899 100%)',
  gastronomia: 'linear-gradient(145deg, #78350F 0%, #F59E0B 100%)',
  cultura: 'linear-gradient(145deg, #4C1D95 0%, #8B5CF6 100%)',
  aventura: 'linear-gradient(145deg, #7C2D12 0%, #FF6B35 100%)',
  espectaculos: 'linear-gradient(145deg, #7F1D1D 0%, #EF4444 100%)',
}

export const DIFICULTADES: DificultadGooal[] = ['facil', 'dificil', 'epico']

export const DIFICULTAD_META: Record<DificultadGooal, { emoji: string; label: string; puntos: number; color: string }> = {
  facil: { emoji: '⚡', label: 'Fácil', puntos: 1, color: '#FFD54F' },
  dificil: { emoji: '🔥', label: 'Difícil', puntos: 5, color: '#FF6B35' },
  epico: { emoji: '💎', label: 'Épico', puntos: 10, color: '#1DE9B6' },
}

/**
 * Rango de puntos admisible para cada dificultad, como [mínimo, máximo].
 *
 * Los puntos ya no se deducen de la dificultad: dentro de un mismo nivel hay
 * retos que valen más que otros (en Espectáculos hay 'facil' de 2 y de 3). La
 * dificultad fija la banda; el valor exacto lo pone quien crea el gooal.
 */
export const BANDA_PUNTOS: Record<DificultadGooal, [number, number]> = {
  facil: [1, 3],
  dificil: [4, 7],
  epico: [8, 10],
}

/** ¿Esos puntos caen dentro de la banda de esa dificultad? */
export function puntosValidos(dificultad: string, puntos: number): boolean {
  const banda = BANDA_PUNTOS[dificultad as DificultadGooal]
  if (!banda) return false
  if (!Number.isInteger(puntos)) return false
  return puntos >= banda[0] && puntos <= banda[1]
}

/** Puntos por defecto de cada dificultad, cuando no se especifica ninguno. */
export function puntosPorDificultad(dificultad: string): number {
  return DIFICULTAD_META[dificultad as DificultadGooal]?.puntos ?? 1
}

export function esCategoria(valor: string): valor is CategoriaGooal {
  return (CATEGORIAS as string[]).includes(valor)
}

export function esDificultad(valor: string): valor is DificultadGooal {
  return (DIFICULTADES as string[]).includes(valor)
}

/** Categoría normalizada, tolerante a acentos y mayúsculas de la IA o del admin. */
export function normalizarCategoriaGooal(valor: string | null | undefined): CategoriaGooal {
  const limpio = (valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return esCategoria(limpio) ? limpio : 'aventura'
}

/** "hace 3 h", "hace 2 d"... para la cabecera de cada post del muro. */
export function hace(fecha: string): string {
  const ms = Date.now() - new Date(fecha).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.floor(horas / 24)
  if (dias < 7) return `hace ${dias} d`
  const semanas = Math.floor(dias / 7)
  if (semanas < 5) return `hace ${semanas} sem`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`
  return `hace ${Math.floor(dias / 365)} a`
}
