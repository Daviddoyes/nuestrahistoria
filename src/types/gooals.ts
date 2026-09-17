// Tipos de la Fase 3 (gamificación).

import type { AmbitoGooal, CategoriaGooal, DificultadGooal, EstadoGooal } from '@/lib/gooals'

export type Profile = {
  id: string
  nombre: string
  email: string
  username: string | null
  foto_perfil_url: string | null
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
  /**
   * La regla del reparto en seis categorías no estaba segura: la categoría es la
   * mejor apuesta y el gooal se ve igual. Solo sirve para repasarlo en el panel.
   */
  categoria_dudosa: boolean
  /** Solo lectura: la calcula la base a partir de los puntos. Ver dificultadDePuntos. */
  dificultad: DificultadGooal
  puntos: number
  ciudad: string | null
  pais: string | null
  imagen_url: string | null
  activo: boolean
  /** Solo los 'verificado' se enseñan en el catálogo. */
  estado: EstadoGooal
  /** 'lugar' va al mapa; 'personal' no necesita coordenadas nunca. */
  ambito: AmbitoGooal
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

/** Lo mínimo de un gooal del catálogo para pintarlo en una lista del perfil. */
export type GooalResumen = Pick<GooalV2, 'id' | 'titulo' | 'categoria' | 'dificultad' | 'puntos' | 'ciudad'>

/** Un gooal conquistado, con su prueba. */
export type Conquistado = {
  userGooalId: string
  /** null si al completarlo no llegó a crearse el post del muro. */
  postId: string | null
  foto_url: string | null
  video_url: string | null
  puntos: number
  completado_at: string | null
  gooal: GooalResumen
}

export type Pendiente = {
  userGooalId: string
  gooal: GooalResumen
}

/** Cuántos gooals ha conquistado alguien en una categoría. */
export type ConteoCategoria = {
  categoria: CategoriaGooal
  conquistados: number
}

/**
 * Lo que comparten quien mira y la persona del perfil. Viaja solo una muestra:
 * la tarjeta pinta 4 miniaturas y 5 títulos, y el resto es un número.
 */
export type EnComun = {
  totalConquistados: number
  /** Versión de la OTRA persona (su foto), las más recientes primero. */
  conquistados: Conquistado[]
  totalPendientes: number
  pendientes: GooalResumen[]
}

/** Todo lo que pinta el perfil, propio o de otra persona. */
export type PerfilCompleto = {
  usuario: UsuarioMini
  esPropio: boolean
  /** null cuando es el perfil propio; true/false en el de otra persona. */
  siguiendolo: boolean | null
  seguidores: number
  siguiendo: number
  puntos: number
  conquistados: Conquistado[]
  pendientes: Pendiente[]
  /** Las seis categorías: primero las que tienen algo, de más a menos; luego las de 0. */
  porCategoria: ConteoCategoria[]
  /** null en el perfil propio. */
  enComun: EnComun | null
}

/**
 * Cómo de fiable es el pin de un gooal (columna geo).
 *   fiable        el geocodificador encontró el sitio y es conocido
 *   revisar       lo encontró pero el sitio es poco conocido (el pin suele estar bien)
 *   solo-ciudad   no encontró el sitio: el pin es el centro del municipio
 *   sin-resultado no encontró nada: no hay pin
 *   rehacer       se cambió la ciudad o el país en el panel con el pin ya puesto:
 *                 el pin puede apuntar al sitio equivocado y hay que rehacerlo
 *   (null)        nadie lo ha buscado todavía: un lugar recién creado o importado,
 *                 o un personal, que no va al mapa nunca
 */
export type GeoGooal = 'fiable' | 'revisar' | 'solo-ciudad' | 'sin-resultado' | 'rehacer'

/**
 * En qué punto está el repaso de un título (tabla `gooals_revision`).
 *
 *   ok          la IA lo dio por bueno: no hay nada que decidir
 *   pendiente   hay propuesta esperando decisión
 *   aceptado    se aplicó la propuesta tal cual
 *   editado     se aplicó un título escrito a mano
 *   descartado  el título se queda como estaba
 */
export type EstadoRevision = 'ok' | 'pendiente' | 'aceptado' | 'editado' | 'descartado'

/**
 * Qué clase de trabajo es.
 *   traduccion  el gooal está bien y el título está mal escrito (inglés a
 *               medias, tildes, falta el verbo). Mecánico: se confirma en bloque.
 *   criterio    rompe una de las cinco reglas. Se decide de una en una.
 */
export type TipoRevision = 'traduccion' | 'criterio'

/** Lo que la IA opina de un título, con su propuesta de recambio. */
export type RevisionGooal = {
  /**
   * El título tal como estaba al juzgarlo. Si ya no coincide con el actual, es
   * que alguien lo cambió después y la propuesta se hizo sobre otro texto.
   */
  titulo_original: string
  /** Cuál de las cinco reglas de `@/lib/criterio-gooals` rompe. null si cumple. */
  regla: number | null
  motivo: string | null
  titulo_propuesto: string | null
  estado: EstadoRevision
  tipo: TipoRevision
  titulo_final: string | null
}

/** Un gooal tal como lo trabaja el panel de admin: la fila completa y cuánta gente lo tiene. */
export type GooalAdmin = GooalV2 & {
  lat: number | null
  lng: number | null
  geo: GeoGooal | null
  /** Con qué texto buscarlo en el mapa cuando el título no basta. Lo trae la importación CSV. */
  geo_consulta: string | null
  /** Personas que lo tienen en su lista, pendiente o conquistado. Si es > 0 no se puede borrar. */
  enListas: number
  /** Personas que lo han conquistado. */
  conquistados: number
  /** Lo que la IA opina de su título. null si aún no le ha tocado el repaso. */
  revision: RevisionGooal | null
}

/** Filtros de la lista de trabajo del panel. */
export type FiltrosAdmin = {
  busqueda: string
  estado: EstadoGooal | 'todos'
  categoria: CategoriaGooal | 'todas'
  ambito: AmbitoGooal | 'todos'
  /** Solo los de ámbito lugar que aún no tienen coordenadas. */
  sinPin: boolean
  /** Solo los que el reparto en seis categorías dejó marcados como dudosos. */
  categoriaDudosa: boolean
  /**
   * Qué parte del repaso se está mirando. Son dos colas distintas y no se
   * mezclan: las traducciones se confirman en bloque, el criterio se decide de
   * una en una.
   */
  repaso: 'ninguno' | 'traducciones' | 'decidir'
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
