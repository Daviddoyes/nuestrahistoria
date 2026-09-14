// Tipos de la Fase 3 (gamificación).

import type { CategoriaGooal, DificultadGooal } from '@/lib/gooals'

export type Profile = {
  id: string
  nombre: string
  email: string
  username: string | null
  foto_perfil_url: string | null
  edad: number | null
  created_at: string
  onboarding_completado?: boolean
  intereses?: string[]
  con_quien_vive?: string[]
}

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
  reportes: number
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

/** Filtros de Explorar. Viajan a la query, no se aplican en el cliente. */
export type FiltrosCatalogo = {
  categoria?: CategoriaGooal | 'todos'
  dificultad?: DificultadGooal | null
  busqueda?: string
  pagina?: number
}

/** Recuadro visible del mapa, en grados. */
export type Recuadro = {
  norte: number
  sur: number
  este: number
  oeste: number
}

/** Filtros del mapa: los mismos que la lista, sin paginación. */
export type FiltrosPines = Omit<FiltrosCatalogo, 'pagina'>

/** Filtros del mapa por recuadro. Ver getGooalsMapa: hoy no se usa. */
export type FiltrosMapa = FiltrosPines & Recuadro

/**
 * Un pin del mapa: lo mínimo para dibujar un círculo de color en un sitio.
 *
 * Ni título ni puntos ni dificultad. El catálogo entero cabe en memoria
 * (3.232 pines) precisamente porque cada uno ocupa esto y no más; el resto se
 * pide por id cuando alguien abre un popup, que es de uno en uno.
 */
export type PinMapa = {
  id: string
  lat: number
  lng: number
  categoria: CategoriaGooal
}

/**
 * Un pin del mapa. Deliberadamente más pequeño que GooalV2: en una consulta
 * caben cientos de filas y `descripcion` o `imagen_url` no se pintan en el pin.
 */
export type GooalMapa = {
  id: string
  titulo: string
  categoria: CategoriaGooal
  dificultad: DificultadGooal
  puntos: number
  ciudad: string | null
  pais: string | null
  lat: number
  lng: number
}

export type EstadoSugerencia = 'pendiente' | 'aprobada' | 'rechazada'

/** Gooal propuesto por un usuario, a la espera de moderación. */
export type GooalSugerencia = {
  id: string
  user_id: string | null
  titulo: string
  categoria: CategoriaGooal
  estado: EstadoSugerencia
  gooal_id: string | null
  revisada_at: string | null
  created_at: string
}
