// Tipos de la Fase 3 (gamificación). El catálogo antiguo (`gooals` +
// `gooal_lugares`) sigue en @/types/planes; esto es la arquitectura v2.

import type { CategoriaGooal, DificultadGooal } from '@/lib/gooals'

/** Fila del catálogo curado desde /admin. */
export type GooalV2 = {
  id: string
  titulo: string
  descripcion: string | null
  categoria: CategoriaGooal
  dificultad: DificultadGooal
  puntos: number
  ciudad: string | null
  pais: string | null
  imagen_url: string | null
  activo: boolean
  veces_completado: number
  created_at: string
}

export type EstadoUserGooal = 'pendiente' | 'completado'

/** El gooal de un usuario concreto: en su lista o ya conseguido. */
export type UserGooal = {
  id: string
  user_id: string
  gooal_id: string
  estado: EstadoUserGooal
  foto_url: string | null
  video_url: string | null
  descripcion: string | null
  puntos_ganados: number
  completado_at: string | null
  created_at: string
}

/** Fila de user_gooals con su gooal del catálogo ya resuelto. */
export type UserGooalConGooal = UserGooal & { gooal: GooalV2 }

/** Autor de un post o miembro de una lista de seguidores. */
export type UsuarioMini = {
  id: string
  nombre: string
  username: string | null
  foto_perfil_url: string | null
  puntos_totales?: number
  nivel?: string
}

/** Post del muro con todo lo que la card necesita, ya resuelto en el servidor. */
export type MuroPostFeed = {
  id: string
  user_id: string
  created_at: string
  foto_url: string | null
  video_url: string | null
  descripcion: string | null
  puntos: number
  likes: number
  /** Si el usuario que mira el feed ya le dio like. */
  liked: boolean
  autor: UsuarioMini
  gooal: GooalV2 | null
}

/** Porcentaje completado de una categoría, para los badges del perfil. */
export type StatCategoria = {
  categoria: CategoriaGooal
  completados: number
  total: number
  porcentaje: number
}

/** Todo lo que pinta la pestaña Perfil, propio o de otra persona. */
export type PerfilGamificado = {
  usuario: UsuarioMini
  puntos: number
  seguidores: number
  siguiendo: number
  /** null cuando es el perfil propio; true/false en el de otra persona. */
  siguiendolo: boolean | null
  esPropio: boolean
  stats: StatCategoria[]
  recientes: {
    postId: string | null
    userGooalId: string
    foto_url: string | null
    titulo: string
    puntos: number
    completado_at: string | null
  }[]
}
