// Los valores del diseño, en un solo sitio.
//
// ── POR QUÉ EXISTE ESTE FICHERO ───────────────────────────
//
// Se contó antes de escribirlo, sobre `src/` el 9-10-2026:
//
//   · 6 verdes de marca distintos donde debería haber UNO: #00D1A7 (220 usos),
//     #00B893 (26), #84CC16, #009E7E, #365314 y #042019.
//   · 37 colores hex distintos en total.
//   · 18 valores distintos de margen lateral: 2, 4, 6, 7, 8, 9, 10, 11, 12, 13,
//     14, 16, 18, 20, 22, 24, 32 y 36.
//   · 19 tamaños de letra distintos.
//
// Y lo que de verdad lo justifica: **dentro de una sola pantalla**, Inicio usa
// 20px, 14px, 18px y 20px de margen lateral en cuatro contenedores seguidos.
// No es que faltara criterio: es que no había dónde ponerlo.
//
// ── CÓMO SE USA ───────────────────────────────────────────
//
// Este repo escribe los estilos en línea con `style={{}}`, no con clases. Así
// que esto son constantes que se importan, no variables CSS:
//
//   import { MARCA, MARGEN_LATERAL, RADIO } from '@/lib/estilo'
//   <div style={{ padding: `0 ${MARGEN_LATERAL}px`, background: MARCA.obsidian }}>
//
// **Un color a mano es un error, no un atajo.** Si hace falta un tono que no
// está aquí, se añade aquí con su nombre y su porqué.

import type { CategoriaGooal } from './gooals'

// ── La paleta de marca ────────────────────────────────────
export const MARCA = {
  /** El fondo de todo. Casi negro, no negro puro: el negro puro aplasta. */
  obsidian: '#0B0B0B',
  /** El acento. Es el único verde. */
  aurora: '#00D1A7',
  /** El texto principal. Blanco roto, que el blanco puro deslumbra en OLED. */
  sand: '#F5F5F2',
  /** El texto secundario y los iconos apagados. */
  stone: '#7A8A85',
} as const

// ── Las superficies, del fondo hacia arriba ───────────────
// Tres niveles y una línea. Más niveles no se distinguen en un móvil.
export const SUPERFICIE = {
  /** El fondo de la pantalla. */
  fondo: MARCA.obsidian,
  /** Una tarjeta o un panel sobre el fondo. */
  panel: '#141615',
  /** Algo elevado sobre un panel: un campo, una pastilla pulsada. */
  elevado: '#1C201E',
  /** El borde de todo lo anterior. */
  linea: '#272B29',
  /** Texto o icono desactivado: se lee, pero no llama. */
  apagado: '#4F5C58',
} as const

// ── Los seis colores de categoría ─────────────────────────
//
// Son los que ya usaba la app como segunda parada de cada degradado en
// `gooals.ts`, y los mismos del dibujo. Aquí pasan a ser la fuente: el
// degradado se construye a partir de este color, no al revés.
export const CATEGORIA_COLOR: Record<CategoriaGooal, string> = {
  deporte: '#FF6B4A',
  naturaleza: '#84CC16',
  viajes: '#38BDF8',
  eventos: '#EC4899',
  gastronomia: '#F59E0B',
  vida: '#A855F7',
}

/** El tono oscuro con el que arranca el degradado de cada categoría. */
export const CATEGORIA_SOMBRA: Record<CategoriaGooal, string> = {
  deporte: '#7F2418',
  naturaleza: '#365314',
  viajes: '#0C4A6E',
  eventos: '#831843',
  gastronomia: '#78350F',
  vida: '#4C1D95',
}

// ── El espacio ────────────────────────────────────────────
/**
 * El margen lateral de TODA pantalla. Uno solo.
 *
 * Es lo que hace que los bordes izquierdos de todo lo que hay en una pantalla
 * caigan en la misma línea. Cuando hay cuatro valores distintos, como había, no
 * se ve «desordenado»: se ve mal hecho sin saber por qué.
 */
export const MARGEN_LATERAL = 20

/** La separación vertical entre bloques, de menor a mayor. */
export const HUECO = { apretado: 6, normal: 12, bloque: 20, seccion: 32 } as const

// ── Los radios ────────────────────────────────────────────
export const RADIO = {
  /** Tarjetas, paneles, modales. */
  tarjeta: 16,
  /** Campos, botones, cualquier cosa que se pulsa y no es redonda. */
  control: 14,
  /** Pastillas y chips: redondeadas del todo. */
  pastilla: 99,
} as const

// ── Las alturas ───────────────────────────────────────────
export const ALTURA = {
  buscador: 48,
  pestanas: 52,
  fila: 74,
  /**
   * El mínimo que puede medir algo que se toca. No es una preferencia: por
   * debajo de 44 px la gente falla el toque, y en una PWA eso se nota más
   * porque no hay cursor que corrija.
   */
  tactil: 44,
} as const

// ── La letra ──────────────────────────────────────────────
//
// Una escala de ocho, no diecinueve. Sale de contar lo que se usa hoy: 13px
// (88 usos), 12px (49), 14px (48), 11px (36) y 15px (17) son el 90 % de todo.
// Los demás eran decisiones de una sola vez.
export const TEXTO = {
  /** Lo más pequeño que se permite. Debajo de 11 no se lee en el móvil. */
  micro: 11,
  pie: 12,
  cuerpo: 13,
  cuerpoGrande: 14,
  titulo: 16,
  tituloGrande: 18,
  cabecera: 22,
  numeroGrande: 28,
} as const

// ── El grosor de la letra ─────────────────────────────────
export const PESO = { normal: 400, medio: 600, fuerte: 700 } as const
