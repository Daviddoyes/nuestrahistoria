// Constantes compartidas del catálogo de gooals v2. Vive fuera de actions.ts
// porque ese módulo es 'use server' y allí todo lo exportado debe ser async.

import { Award, Dumbbell, Landmark, Mountain, Ticket, UtensilsCrossed, type LucideIcon } from 'lucide-react'

/**
 * Las seis categorías. La base solo acepta estas (gooals_v2_categoria_valida, en
 * supabase/fase3g.sql). Para repartir un gooal nuevo:
 *   lo que VES o DÓNDE ESTÁS  -> naturaleza
 *   HACER la actividad        -> deporte
 *   el TÍTULO que consigues   -> vida (cursos, certificaciones)
 */
export type CategoriaGooal = 'viajes' | 'naturaleza' | 'eventos' | 'deporte' | 'gastronomia' | 'vida'
export type DificultadGooal = 'facil' | 'dificil' | 'epico'
/** Solo los 'verificado' se enseñan en el catálogo. */
export type EstadoGooal = 'borrador' | 'verificado'
/** 'lugar' va al mapa (aunque aún le falte el pin); 'personal' no necesita coordenadas nunca. */
export type AmbitoGooal = 'lugar' | 'personal'

export const CATEGORIAS: CategoriaGooal[] = [
  'viajes', 'naturaleza', 'eventos', 'deporte', 'gastronomia', 'vida',
]

export const CATEGORIA_LABEL: Record<CategoriaGooal, string> = {
  viajes: 'Viajes',
  naturaleza: 'Naturaleza',
  eventos: 'Eventos',
  deporte: 'Deporte',
  gastronomia: 'Gastronomía',
  vida: 'Vida',
}

/**
 * Icono de cada categoría. Iconos de trazo y no emojis: un emoji cambia de
 * dibujo y de color según el móvil, y no se puede teñir con el color de la
 * categoría. Se pintan con IconoCategoria, que fija el grosor del trazo.
 */
export const CATEGORIA_ICONO: Record<CategoriaGooal, LucideIcon> = {
  viajes: Landmark,
  naturaleza: Mountain,
  eventos: Ticket,
  deporte: Dumbbell,
  gastronomia: UtensilsCrossed,
  vida: Award,
}

/** Grosor del trazo de los iconos de categoría: más fino que el 2 de lucide, a juego con Poppins. */
export const TRAZO_ICONO_CATEGORIA = 1.75

export const CATEGORIA_COLOR: Record<CategoriaGooal, string> = {
  viajes: '#38BDF8',
  naturaleza: '#84CC16',
  eventos: '#EC4899',
  deporte: '#FF6B4A',
  gastronomia: '#F59E0B',
  vida: '#A855F7',
}

/** Fondo de las cards sin imagen: degradado del color de su categoría. */
export const CATEGORIA_GRADIENTE: Record<CategoriaGooal, string> = {
  viajes: 'linear-gradient(145deg, #0C4A6E 0%, #38BDF8 100%)',
  naturaleza: 'linear-gradient(145deg, #365314 0%, #84CC16 100%)',
  eventos: 'linear-gradient(145deg, #831843 0%, #EC4899 100%)',
  deporte: 'linear-gradient(145deg, #7F2418 0%, #FF6B4A 100%)',
  gastronomia: 'linear-gradient(145deg, #78350F 0%, #F59E0B 100%)',
  vida: 'linear-gradient(145deg, #4C1D95 0%, #A855F7 100%)',
}

/**
 * Cuántos gooals conquistados hay en cada categoría, con las seis siempre
 * presentes: primero las que tienen algo (de más a menos), luego las de 0.
 *
 * Las de 0 no se quitan a propósito. "Vida 0" es lo que empuja a probar algo
 * distinto, y la app va de haber probado muchas cosas, no de profundizar en una.
 *
 * Sustituye a los porcentajes por categoría, que necesitaban el total del
 * catálogo: se pedía entero sin paginar, la base cortaba en 1.000 filas de casi
 * 5.000 y los porcentajes salían mal. Contando solo lo del usuario no hace falta.
 */
export function contarPorCategoria(
  conquistados: { gooal: { categoria: CategoriaGooal } }[]
): { categoria: CategoriaGooal; conquistados: number }[] {
  const cuenta = new Map<CategoriaGooal, number>(CATEGORIAS.map(c => [c, 0]))
  for (const c of conquistados) {
    if (cuenta.has(c.gooal.categoria)) cuenta.set(c.gooal.categoria, (cuenta.get(c.gooal.categoria) ?? 0) + 1)
  }
  // El desempate por el orden de CATEGORIAS evita que dos categorías empatadas
  // bailen de sitio entre una carga y otra.
  return CATEGORIAS
    .map(categoria => ({ categoria, conquistados: cuenta.get(categoria) ?? 0 }))
    .sort((a, b) => b.conquistados - a.conquistados || CATEGORIAS.indexOf(a.categoria) - CATEGORIAS.indexOf(b.categoria))
}

export const DIFICULTADES: DificultadGooal[] = ['facil', 'dificil', 'epico']

export const DIFICULTAD_META: Record<DificultadGooal, { emoji: string; label: string; color: string }> = {
  facil: { emoji: '⚡', label: 'Fácil', color: '#FFD54F' },
  dificil: { emoji: '🔥', label: 'Difícil', color: '#FF6B4A' },
  epico: { emoji: '💎', label: 'Épico', color: '#00D1A7' },
}

/** Escala de puntos de un gooal. */
export const PUNTOS_MIN = 1
export const PUNTOS_MAX = 10

/**
 * Qué puntos corresponden a cada dificultad, como [mínimo, máximo].
 *
 * La dificultad ya NO se escribe: se deduce de los puntos. Esta tabla vive en
 * tres sitios y tienen que coincidir:
 *   - aquí, que es lo que usa la app
 *   - scripts/seed-gooals/generar_sql.py (BANDA), lo que se siembra
 *   - el disparador de supabase/fase3f.sql, que la recalcula en la base
 */
export const BANDA_PUNTOS: Record<DificultadGooal, [number, number]> = {
  facil: [1, 3],
  dificil: [4, 7],
  epico: [8, 10],
}

/**
 * Los puntos si son válidos (entero de 1 a 10); si no, null.
 * Acepta lo que llegue de un formulario o de una petición: "5", 5, 5.0.
 */
export function puntosEnEscala(valor: unknown): number | null {
  const n = typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor
  if (typeof n !== 'number' || !Number.isInteger(n)) return null
  return n >= PUNTOS_MIN && n <= PUNTOS_MAX ? n : null
}

/**
 * LA dificultad de un gooal. Única fuente en el código: nadie la escribe a mano.
 * Devuelve null si los puntos están fuera de escala.
 */
export function dificultadDePuntos(puntos: number): DificultadGooal | null {
  for (const d of DIFICULTADES) {
    const [min, max] = BANDA_PUNTOS[d]
    if (Number.isInteger(puntos) && puntos >= min && puntos <= max) return d
  }
  return null
}

/**
 * Si un gooal va al mapa ('lugar') o no necesita coordenadas nunca ('personal').
 *
 * No basta con "tiene coordenadas": Troya o el Cotopaxi son sitios aunque aún no
 * tengan pin. Con ciudad, o con país en viajes y naturaleza, es un lugar. En el
 * resto un país suele ser el origen de un plato ("Probar ceviche peruano") o de
 * nada en concreto, no un sitio al que ir; lo fino se corrige a mano en el panel.
 *
 * Solo en viajes y naturaleza porque son las dos categorías de sitios: ahí un
 * país sin ciudad sigue siendo un lugar ("Vuelo en globo sobre Capadocia"). La
 * repiten los scripts de siembra (insertar.mjs, generar_sql.py): si cambia
 * aquí, cambia allí.
 */
export function ambitoDeGooal(g: {
  categoria: string
  ciudad?: string | null
  pais?: string | null
  lat?: number | null
}): AmbitoGooal {
  if (g.lat != null) return 'lugar'
  if (g.ciudad) return 'lugar'
  if (g.pais && (g.categoria === 'viajes' || g.categoria === 'naturaleza')) return 'lugar'
  return 'personal'
}

export function esCategoria(valor: string): valor is CategoriaGooal {
  return (CATEGORIAS as string[]).includes(valor)
}

/**
 * Categoría normalizada, tolerante a acentos y mayúsculas de la IA o del admin.
 * Lo que no se reconoce va a viajes, la categoría más grande, y nunca a un nombre
 * que la base rechazaría.
 */
export function normalizarCategoriaGooal(valor: string | null | undefined): CategoriaGooal {
  const limpio = (valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return esCategoria(limpio) ? limpio : 'viajes'
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
