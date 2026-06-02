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

export type PlanParticipante = {
  id: string
  plan_id: string
  user_id: string
  nombre_usuario: string | null
  estado: 'owner' | 'invitado' | 'aceptado' | 'pendiente'
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
