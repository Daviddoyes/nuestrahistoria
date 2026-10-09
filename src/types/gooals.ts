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
  /**
   * De quién es la foto del catálogo y bajo qué licencia, tal cual vienen de
   * Wikimedia Commons, y la página del archivo. 203 de las 223 licencias exigen
   * citar al autor, así que esto NO es información de adorno: donde se vea la
   * foto grande hay que pintarlo. Ver CreditoFoto.tsx.
   */
  foto_autor: string | null
  foto_licencia: string | null
  foto_origen: string | null
  activo: boolean
  /** Solo los 'verificado' se enseñan en el catálogo. */
  estado: EstadoGooal
  /** 'lugar' va al mapa; 'personal' no necesita coordenadas nunca. */
  ambito: AmbitoGooal
  veces_completado: number
  created_at: string
}

/**
 * Los dos estados de un gooal de alguien. 'completado' es lo que el usuario lee
 * como "Conseguido": en la base NO se renombra, ver src/lib/estado-gooal.ts.
 *
 * Hubo un tercero, 'vivido', para marcar algo hecho sin foto. Duró dos días:
 * desde que conseguir un gooal da puntos lleve foto o no, la única diferencia
 * entre los dos era si hay foto, y eso ya lo dice la foto. Ver supabase/fase3s.sql.
 *
 * OJO si alguna vez se amplía: el ordenador NO avisa de los sitios que dan por
 * hecho "si no es completado, entonces es pendiente". Se midió al pasar de dos
 * a tres: cero errores de compilación y ocho sitios que mentían.
 */
export type EstadoUserGooal = 'pendiente' | 'completado'

/**
 * Quién puede ver la foto de un gooal conseguido.
 *
 *   privada   solo su dueño
 *   amigos    quienes se siguen mutuamente. ES EL VALOR POR DEFECTO
 *   publica   cualquiera
 *
 * Quien decide con esto es puedeVerLaFoto(), en src/lib/permisos.ts, y es el
 * único sitio donde se decide. Lo de "amigo = os seguís los dos" también vive
 * allí: el día que haya solicitudes de amistad se cambia esa función y ya.
 */
export type VisibilidadFoto = 'privada' | 'amigos' | 'publica'

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
  /** La fila de user_gooals de la que sale. Es por lo que se piden las fotos. */
  userGooalId: string | null
  created_at: string
  /** RUTA dentro del cubo privado, no una dirección pintable. Ver Conquistado. */
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

/**
 * Lo mínimo de un gooal del catálogo para pintarlo en una lista del perfil.
 *
 * `imagen_url` es la foto del CATÁLOGO: pública, la misma para todos, y la que
 * se ve en la ficha cuando esa persona no tiene una suya o no puedes verla.
 */
export type GooalResumen = Pick<GooalV2, 'id' | 'titulo' | 'categoria' | 'dificultad' | 'puntos' | 'ciudad' | 'imagen_url'>

/**
 * Una línea de las listas del perfil: un gooal de esa persona, conseguido o
 * pendiente. Las dos pestañas pintan lo mismo, así que es un solo tipo.
 *
 * NO LLEVA NINGUNA FOTO, y eso es el motivo de que exista. Las fotos de la gente
 * viven en un cubo privado y cada una necesita una dirección FIRMADA, que se
 * pide al servidor y caduca. Una lista de títulos no firma ninguna: por eso un
 * perfil de 300 gooals cuesta lo mismo que uno de 3. Si alguna vez hay que
 * firmar algo para pintar esta lista, es que se ha colado una foto donde no va.
 */
export type LineaPerfil = {
  userGooalId: string
  gooal: GooalResumen
  /** Los que ganó si está conseguido; los que da el gooal si está pendiente. */
  puntos: number
  /**
   * Si quien mira tiene el MISMO gooal en el MISMO estado. Siempre false en el
   * perfil propio: "en común contigo mismo" no quiere decir nada.
   *
   * Viene marcado línea a línea y no como una lista aparte para que la pastilla
   * de "En común" no pueda enseñar un número que no cuadre con lo que filtra.
   */
  enComun: boolean
  /**
   * Si esa persona guardó una foto o un vídeo Y quien mira PUEDE verlo. Las dos
   * cosas juntas, a propósito: una cámara que al tocarla no lleva a ninguna foto
   * es prometer algo y no cumplirlo.
   */
  fotoVisible: boolean
  /**
   * Quién ve esa foto, para poder cambiarlo desde la ficha. Solo viaja en TU
   * perfil: en el de otra persona va null, porque ahí no hay nada que cambiar y
   * sus ajustes no son asunto de quien mira.
   */
  quienLaVe: VisibilidadFoto | null
}

/** Cuántos gooals ha conseguido alguien en una categoría. */
export type ConteoCategoria = {
  categoria: CategoriaGooal
  conseguidos: number
}

/**
 * Lo que pinta la pantalla de Inicio en una sola llamada.
 *
 * Los puntos se SUMAN de los gooals conseguidos y no se leen de
 * `profiles.puntos_totales`, que es una caché: el perfil hace lo mismo, y dos
 * pantallas enseñando totales distintos sería de las cosas que nadie entiende.
 */
export type ResumenInicio = {
  conseguidos: number
  pendientes: number
  puntos: number
  /** Los pendientes más recientes, para "Sigue con lo tuyo". */
  siguientes: { userGooalId: string; gooal: GooalResumen }[]
}

/** Lo que sale en "De lo que te interesa". */
export type SugerenciasInicio = {
  gooals: GooalResumen[]
  /** Las categorías con las que se eligieron. Vacío = no eligió ninguna en el alta. */
  categorias: CategoriaGooal[]
}

/** Un gooal con sitio, y a cuántos kilómetros está de donde estás. */
export type GooalCerca = {
  gooal: GooalResumen
  km: number
}

/**
 * Una carta de Descubrir.
 *
 * Lleva el crédito de la foto porque ahí se ve a pantalla completa, y 203 de las
 * 223 licencias de Commons exigen citar al autor.
 */
export type CartaDescubrir = {
  gooal: GooalResumen & {
    pais: string | null
    foto_autor: string | null
    foto_licencia: string | null
    foto_origen: string | null
  }
  /** Cuánta gente lo tiene pendiente y cuánta lo ha conseguido. */
  pendientes: number
  conseguidos: number
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
  conseguidos: LineaPerfil[]
  pendientes: LineaPerfil[]
  /** Las seis categorías: primero las que tienen algo, de más a menos; luego las de 0. */
  porCategoria: ConteoCategoria[]
  /**
   * Lo que dijo en el alta que le interesa, ya filtrado a las seis categorías.
   *
   * **null en el perfil ajeno, a propósito.** Lo marcado en el onboarding no es
   * algo que se haya publicado: es una respuesta que se dio para que la app
   * sugiera. En el universo eso se nota —una categoría a cero sale en gris en
   * vez de en verde— y está bien que se note: de otra persona no sabes qué le
   * apetece hasta que lo hace.
   */
  intereses: CategoriaGooal[] | null
  /**
   * Cuánta gente se sigue mutuamente con esta persona. **null en el perfil
   * ajeno**, donde la cifra que se enseña es la de seguidores.
   */
  amigos: number | null
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
