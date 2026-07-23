export type ConQuien = 'solo' | 'pareja' | 'amigos' | 'todos'

export type Plan = {
  id: string
  titulo: string
  descripcion: string | null
  creado_por: string
  pareja_codigo: string
  estado: string
  foto_url: string | null
  historia_descripcion: string | null
  fecha_momento: string | null
  con_quien: ConQuien
  orden: number
  created_at: string
  publico?: boolean
  descripcion_publica?: string | null
  /** URLs de los momentos, en orden cronológico. Se congela al completar el plan. */
  momentos_urls?: string[] | null
  categoria?: string | null
}

export type NewPlan = Omit<Plan, 'id' | 'created_at'>

export type TipoAcceso = 'owner' | 'pareja' | 'amigos'

export type Profile = {
  id: string
  nombre: string
  email: string
  username: string | null
  foto_perfil_url: string | null
  edad: number | null
  plan: 'free' | 'premium'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  onboarding_completado?: boolean
  intereses?: string[]
  con_quien_vive?: string[]
}

export type CategoriaExperiencia = 'viajes' | 'deporte' | 'gastronomia' | 'cultura' | 'aventura' | 'musica'
export type Dificultad = 'facil' | 'medio' | 'dificil'

/** Fila de la biblioteca de experiencias curada desde /admin. */
export type Experiencia = {
  id: string
  titulo: string
  descripcion: string | null
  categoria: string
  subcategoria: string | null
  ciudad: string | null
  pais: string | null
  lugar_nombre: string | null
  lugar_direccion: string | null
  dificultad: string | null
  duracion: string | null
  tags: string[] | null
  latitud: number | null
  longitud: number | null
  es_generico: boolean
  verificada: boolean
  veces_anadida: number
  created_at: string
}

/** Experiencia recién generada por la IA, aún sin guardar (sin id). */
export type ExperienciaGenerada = Omit<Experiencia, 'id' | 'verificada' | 'veces_anadida' | 'created_at'>

export type PlanParticipante = {
  id: string
  plan_id: string
  user_id: string
  nombre_usuario: string | null
  estado: 'owner' | 'invitado' | 'aceptado' | 'pendiente' | 'solicitado' | 'rechazado'
  foto_url: string | null
  historia_descripcion: string | null
  fecha_momento: string | null
  created_at: string
}

export type InvitacionPendiente = {
  participante_id: string
  plan_id: string
  plan_titulo: string
  invitado_por: string
}

export type SolicitudPendiente = {
  participante_id: string
  plan_id: string
  plan_titulo: string
  nombre_usuario: string
  foto_perfil_url: string | null
}

export type PlanMomento = {
  id: string
  plan_id: string
  user_id: string
  nombre_usuario: string | null
  foto_url: string
  descripcion: string | null
  created_at: string
}

export type Notificacion = {
  id: string
  user_id: string
  tipo: string
  mensaje: string
  plan_id: string | null
  leida: boolean
  created_at: string
}

/** Plan público completado, tal y como se muestra en la pestaña Explorar. */
export type PlanExplorar = Plan & {
  autor_nombre: string
  autor_username: string | null
  autor_foto: string | null
  es_mio: boolean
}

export type PublicPlan = {
  id: string
  titulo: string
  descripcion: string | null
  descripcion_publica: string | null
  creador_nombre: string
  creador_username: string | null
  creador_foto: string | null
  participantes: { nombre: string; foto: string | null }[]
  // Viewer context, computed server-side
  loggedIn: boolean
  viewerEstado: 'participante' | 'solicitado' | 'ninguno'
}
